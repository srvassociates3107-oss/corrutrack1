import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, getAllUsers } from './src/db/users.ts';
import { getDbOrders, upsertBulkDbOrders, upsertDbOrder } from './src/db/orders.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const WA_AUTH_DIR = path.join(UPLOADS_DIR, 'wa_auth_session');
const SNAPSHOTS_FILE = path.join(UPLOADS_DIR, 'order_snapshots.json');
const WHATSAPP_MESSAGES_FILE = path.join(UPLOADS_DIR, 'whatsapp_messages.json');
const EMAIL_SUMMARIES_FILE = path.join(UPLOADS_DIR, 'daily_email_summaries.json');
const PLANT_STATE_FILE = path.join(UPLOADS_DIR, 'plant_state.json');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// =========================================================================
// REAL-TIME MULTI-DEVICE PLANT STATE PERSISTENCE (Mobile PWA <-> Desktop Web)
// =========================================================================
interface StoredPlantState {
  orders: any[] | null;
  logs: any[] | null;
  settings: any | null;
  stalledAlertsSent: Record<string, string> | null;
  updatedAt: string;
  lastUpdatedByDeviceId?: string;
}

function loadPlantState(): StoredPlantState {
  try {
    if (fs.existsSync(PLANT_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(PLANT_STATE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading plant state:', e);
  }
  return {
    orders: null,
    logs: null,
    settings: null,
    stalledAlertsSent: null,
    updatedAt: new Date(0).toISOString(),
  };
}

function savePlantState(partial: Partial<StoredPlantState>): StoredPlantState {
  const current = loadPlantState();
  const next: StoredPlantState = {
    orders: partial.orders !== undefined ? partial.orders : current.orders,
    logs: partial.logs !== undefined ? partial.logs : current.logs,
    settings: partial.settings !== undefined ? partial.settings : current.settings,
    stalledAlertsSent:
      partial.stalledAlertsSent !== undefined ? partial.stalledAlertsSent : current.stalledAlertsSent,
    updatedAt: new Date().toISOString(),
    lastUpdatedByDeviceId: partial.lastUpdatedByDeviceId || current.lastUpdatedByDeviceId,
  };
  try {
    fs.writeFileSync(PLANT_STATE_FILE, JSON.stringify(next, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving plant state:', e);
  }
  return next;
}

// =========================================================================
// REAL WHATSAPP WEB MULTI-DEVICE QR & PAIRING CODE ENGINE (Baileys)
// Allows scanning the QR code directly inside the app with WhatsApp -> Linked Devices
// =========================================================================
interface WhatsAppSessionState {
  status: 'disconnected' | 'initializing' | 'qr_ready' | 'connected' | 'error';
  qrDataUrl: string | null;
  pairingCode: string | null;
  connectedPhone: string | null;
  connectedName: string | null;
  lastError: string | null;
  updatedAt: string;
}

const waState: WhatsAppSessionState = {
  status: 'disconnected',
  qrDataUrl: null,
  pairingCode: null,
  connectedPhone: null,
  connectedName: null,
  lastError: null,
  updatedAt: new Date().toISOString(),
};

let waSocket: ReturnType<typeof makeWASocket> | null = null;
let isConnectingWA = false;

async function initWhatsAppSocket(forceReset = false): Promise<void> {
  if (isConnectingWA && !forceReset) return;
  isConnectingWA = true;

  try {
    if (forceReset) {
      if (waSocket) {
        try {
          waSocket.end(undefined);
        } catch {
          // ignore
        }
        waSocket = null;
      }
      if (fs.existsSync(WA_AUTH_DIR)) {
        fs.rmSync(WA_AUTH_DIR, { recursive: true, force: true });
      }
    }

    if (!fs.existsSync(WA_AUTH_DIR)) {
      fs.mkdirSync(WA_AUTH_DIR, { recursive: true });
    }

    waState.status = 'initializing';
    waState.lastError = null;
    waState.updatedAt = new Date().toISOString();

    const { state, saveCreds } = await useMultiFileAuthState(WA_AUTH_DIR);
    let version: [number, number, number] = [2, 3000, 1015901307];
    try {
      const latest = await fetchLatestBaileysVersion();
      if (latest?.version) {
        version = latest.version;
      }
    } catch {
      // use fallback version
    }

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }) as any,
      browser: ['CorruTrack ERP', 'Chrome', '120.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    waSocket = sock;

    sock.ev.on('creds.update', saveCreds);

    // Listen for real incoming WhatsApp messages so 2-way chat works inside the app!
    sock.ev.on('messages.upsert', async (m) => {
      try {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
          if (!msg.message || msg.key.fromMe) continue;
          const remoteJid = msg.key.remoteJid || '';
          if (remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') continue;

          const senderPhone = remoteJid.split('@')[0].split(':')[0];
          const textContent =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            '';

          if (!textContent.trim()) continue;

          const allMsgs = loadWhatsAppMessages();
          // Find the latest order associated with this phone number if any
          const matchedOrderMsg = allMsgs.find((existing) => {
            const cleanExisting = existing.recipientPhone.replace(/[^0-9]/g, '');
            return (
              cleanExisting.endsWith(senderPhone.slice(-10)) ||
              senderPhone.endsWith(cleanExisting.slice(-10))
            );
          });

          const inboundRecord: StoredWhatsAppMessage = {
            id: `wa-in-${msg.key.id || Date.now()}`,
            orderId: matchedOrderMsg?.orderId || 'GENERAL',
            recipientRole: matchedOrderMsg?.recipientRole || 'WhatsApp Contact',
            recipientName: msg.pushName || matchedOrderMsg?.recipientName || `+${senderPhone}`,
            recipientPhone: `+${senderPhone}`,
            direction: 'inbound',
            message: textContent,
            status: 'read',
            providerUsed: `QR-Linked WhatsApp (+${senderPhone})`,
            timestamp: new Date(
              (msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now())
            ).toISOString(),
          };
          appendWhatsAppMessage(inboundRecord);
        }
      } catch (inErr) {
        console.error('Error processing inbound WhatsApp message:', inErr);
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const dataUrl = await QRCode.toDataURL(qr, {
            width: 300,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' },
          });
          waState.qrDataUrl = dataUrl;
          waState.status = 'qr_ready';
          waState.updatedAt = new Date().toISOString();
        } catch (err) {
          console.error('QR generation error:', err);
        }
      }

      if (connection === 'open') {
        const userJid = sock.user?.id || '';
        const phoneNum = userJid.split(':')[0].split('@')[0];
        waState.status = 'connected';
        waState.qrDataUrl = null;
        waState.pairingCode = null;
        waState.connectedPhone = phoneNum ? `+${phoneNum}` : 'Linked Device';
        waState.connectedName = sock.user?.name || 'CorruTrack Plant WhatsApp';
        waState.lastError = null;
        waState.updatedAt = new Date().toISOString();
        isConnectingWA = false;
      }

      if (connection === 'close') {
        isConnectingWA = false;
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        if (statusCode === DisconnectReason.loggedOut) {
          waState.status = 'disconnected';
          waState.qrDataUrl = null;
          waState.connectedPhone = null;
          waState.connectedName = null;
          waState.updatedAt = new Date().toISOString();
          if (fs.existsSync(WA_AUTH_DIR)) {
            fs.rmSync(WA_AUTH_DIR, { recursive: true, force: true });
          }
        } else if (shouldReconnect) {
          setTimeout(() => {
            initWhatsAppSocket(false).catch(() => {});
          }, 2500);
        }
      }
    });
  } catch (err) {
    isConnectingWA = false;
    waState.status = 'error';
    waState.lastError = err instanceof Error ? err.message : 'Failed to initialize WhatsApp QR socket';
    waState.updatedAt = new Date().toISOString();
  }
}

// Auto-start WhatsApp session on server boot so a real QR is ready immediately
initWhatsAppSocket(false).catch(() => {});

interface StoredDailyEmailSummary {
  id: string;
  timestamp: string;
  recipients: string[];
  subject: string;
  totalOrders: number;
  activeOrdersCount: number;
  delayedOrdersCount: number;
  deliveredCount: number;
  totalRevenue: number;
  status: 'Dispatched' | 'Logged (In-App Mail)';
  htmlBody: string;
  textBody: string;
}

function loadEmailSummaries(): StoredDailyEmailSummary[] {
  try {
    if (fs.existsSync(EMAIL_SUMMARIES_FILE)) {
      return JSON.parse(fs.readFileSync(EMAIL_SUMMARIES_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading email summaries:', e);
  }
  return [];
}

function appendEmailSummary(summary: StoredDailyEmailSummary) {
  try {
    const all = loadEmailSummaries();
    const updated = [summary, ...all].slice(0, 100);
    fs.writeFileSync(EMAIL_SUMMARIES_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving email summary:', e);
  }
}

interface StoredWhatsAppMessage {
  id: string;
  orderId: string;
  recipientRole: string;
  recipientName: string;
  recipientPhone: string;
  direction: 'outbound' | 'inbound';
  message: string;
  photoUrl?: string;
  status: 'delivered' | 'read' | 'sent_via_gateway';
  providerUsed: string;
  timestamp: string;
}

function loadWhatsAppMessages(): StoredWhatsAppMessage[] {
  try {
    if (fs.existsSync(WHATSAPP_MESSAGES_FILE)) {
      return JSON.parse(fs.readFileSync(WHATSAPP_MESSAGES_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading WhatsApp messages:', e);
  }
  return [];
}

function appendWhatsAppMessage(msg: StoredWhatsAppMessage) {
  try {
    const all = loadWhatsAppMessages();
    const updated = [msg, ...all].slice(0, 300);
    fs.writeFileSync(WHATSAPP_MESSAGES_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving WhatsApp message:', e);
  }
}

interface SharedOrderSnapshot {
  orderId: string;
  customerName: string;
  customerCompany: string;
  customerPhone: string;
  productTitle?: string;
  subCategory?: string;
  productSpecsSummary?: string;
  boxStyle: string;
  dimensions: { lengthMm: number; widthMm: number; heightMm: number };
  ply: string;
  flute: string;
  paperSpecs: { topLinerGsm: number; flutingMediumGsm: number; bottomLinerGsm: number; burstingFactor: number };
  quantity: number;
  currentStage: string;
  stageTitle: string;
  expectedDeliveryDate: string;
  deliveryAddress: string;
  photoId?: string;
  photoUrl?: string;
  stageNotes?: string;
  updatedBy?: string;
  companyName: string;
  contactNumber: string;
  salesPersonName?: string;
  salesPersonPhone?: string;
  logistics?: {
    driverName?: string;
    driverPhone?: string;
    vehicleNumber?: string;
    dispatchChallanNo?: string;
  };
  stageHistory?: Array<{
    stage: string;
    timestamp: string;
    notes?: string;
    updatedBy: string;
    photoUrl?: string;
  }>;
  updatedAt: string;
}

function loadSnapshots(): Record<string, SharedOrderSnapshot> {
  try {
    if (fs.existsSync(SNAPSHOTS_FILE)) {
      return JSON.parse(fs.readFileSync(SNAPSHOTS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading snapshots:', e);
  }
  return {};
}

function saveSnapshot(snapshot: SharedOrderSnapshot) {
  try {
    const all = loadSnapshots();
    all[snapshot.orderId.toUpperCase()] = snapshot;
    fs.writeFileSync(SNAPSHOTS_FILE, JSON.stringify(all, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving snapshot:', e);
  }
}

async function startServer() {
  const app = express();

  // Increase payload limit for high-res camera photos (up to 25MB)
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // =========================================================================
  // 1. UPLOAD STAGE PHOTO ENDPOINT (/api/upload-photo)
  // Converts base64 data URI to a real hosted image file with a clean short URL
  // =========================================================================
  app.post('/api/upload-photo', (req, res) => {
    try {
      const { dataUrl, orderId, stage, caption, snapshot } = req.body;

      if (!dataUrl || typeof dataUrl !== 'string') {
        res.status(400).json({ error: 'Missing dataUrl' });
        return;
      }

      // If it's already an external http/https URL (not base64 data:image)
      if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
        if (snapshot && snapshot.orderId) {
          saveSnapshot({
            ...snapshot,
            photoUrl: dataUrl,
            updatedAt: new Date().toISOString(),
          });
        }
        res.json({
          photoUrl: dataUrl,
          viewUrl: dataUrl,
        });
        return;
      }

      // Parse data:image/jpeg;base64,....
      const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        res.status(400).json({ error: 'Invalid image data URI format' });
        return;
      }

      let ext = matches[1].toLowerCase();
      if (ext === 'jpeg') ext = 'jpg';
      if (ext === 'svg+xml') ext = 'svg';
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      const cleanOrderId = (orderId || 'ORD').replace(/[^a-zA-Z0-9-_]/g, '');
      const shortHash = crypto.randomBytes(4).toString('hex');
      const filename = `${cleanOrderId}_${shortHash}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);

      fs.writeFileSync(filePath, buffer);

      // Save metadata sidecar for rich viewer page
      const metaPath = path.join(UPLOADS_DIR, `${filename}.json`);
      const metaData = {
        filename,
        orderId: orderId || '',
        stage: stage || '',
        caption: caption || 'Stage Production Verification Photo',
        createdAt: new Date().toISOString(),
      };
      fs.writeFileSync(metaPath, JSON.stringify(metaData, null, 2), 'utf-8');

      // Also save order snapshot if provided so customer tracker works across devices
      if (snapshot && snapshot.orderId) {
        saveSnapshot({
          ...snapshot,
          photoId: filename,
          photoUrl: `/api/photos/${filename}`,
          updatedAt: new Date().toISOString(),
        });
      }

      res.json({
        filename,
        photoUrl: `/api/photos/${filename}`,
        viewUrl: `/api/photo-view/${filename}`,
      });
    } catch (err) {
      console.error('Upload photo error:', err);
      res.status(500).json({ error: 'Failed to save uploaded photo' });
    }
  });

  // =========================================================================
  // 2. SERVE RAW IMAGE FILE DIRECTLY (/api/photos/:filename)
  // Opens directly as an image in browser or WhatsApp link preview
  // =========================================================================
  app.get('/api/photos/:filename', (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).send('Photo not found');
      return;
    }

    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };

    res.setHeader('Content-Type', mimeMap[ext] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.sendFile(filePath);
  });

  // =========================================================================
  // 3. STANDALONE FULL-SCREEN PHOTO VIEWER WITH OPENGRAPH TAGS (/api/photo-view/:filename)
  // When clicked from WhatsApp, opens ONLY the photo + verification badge (NOT the dashboard!)
  // =========================================================================
  app.get('/api/photo-view/:filename', (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).send('Photo not found');
      return;
    }

    let meta = {
      orderId: '',
      stage: 'Production Proof',
      caption: 'Stage Verification Photo',
      createdAt: new Date().toISOString(),
    };

    const metaPath = path.join(UPLOADS_DIR, `${filename}.json`);
    if (fs.existsSync(metaPath)) {
      try {
        meta = { ...meta, ...JSON.parse(fs.readFileSync(metaPath, 'utf-8')) };
      } catch {
        // ignore
      }
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host') || '';
    const rawImageUrl = `${protocol}://${host}/api/photos/${filename}`;
    const trackerUrl = meta.orderId ? `${protocol}://${host}/?track=${encodeURIComponent(meta.orderId)}&public=1` : `${protocol}://${host}/`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order ${meta.orderId ? '#' + meta.orderId : ''} - ${meta.stage} Photo Proof</title>
  <meta property="og:title" content="📸 Order ${meta.orderId ? '#' + meta.orderId : ''} - ${meta.stage} Photo Proof" />
  <meta property="og:description" content="${meta.caption} • Click to view full-resolution factory verification photo." />
  <meta property="og:image" content="${rawImageUrl}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${rawImageUrl}" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #09090b;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
    }
    .top-bar {
      width: 100%;
      max-width: 900px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #18181b;
      border: 1px solid #27272a;
      padding: 12px 16px;
      border-radius: 14px;
      gap: 12px;
      flex-wrap: wrap;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
    }
    .order-title {
      font-size: 15px;
      font-weight: 700;
      color: #ffffff;
    }
    .photo-frame {
      my: auto;
      width: 100%;
      max-width: 900px;
      background: #121215;
      border: 1px solid #27272a;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85);
      margin: 16px 0;
      text-align: center;
    }
    .photo-frame img {
      width: 100%;
      max-height: 75vh;
      object-fit: contain;
      display: block;
      margin: 0 auto;
      background: #000;
    }
    .caption-bar {
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      background: #18181b;
      border-top: 1px solid #27272a;
      text-align: left;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-primary {
      background: #f59e0b;
      color: #09090b;
    }
    .btn-secondary {
      background: #27272a;
      color: #e4e4e7;
      border: 1px solid #3f3f46;
    }
  </style>
</head>
<body>
  <div class="top-bar">
    <div>
      <span class="badge">✓ QA Verified Stage Snapshot</span>
      <span class="order-title" style="margin-left: 8px;">
        ${meta.orderId ? 'Order #' + meta.orderId : 'Factory Stage Photo'}
      </span>
    </div>
    <div style="display: flex; gap: 8px;">
      <a href="${rawImageUrl}" download="${filename}" class="btn btn-secondary">⬇ Download Photo</a>
      ${meta.orderId ? `<a href="${trackerUrl}" class="btn btn-primary">📦 View Live Order Tracker</a>` : ''}
    </div>
  </div>

  <div class="photo-frame">
    <img src="${rawImageUrl}" alt="Production Stage Photo Proof" />
    <div class="caption-bar">
      <div>
        <div style="font-weight: 700; font-size: 14px; color: #fff;">${meta.stage || 'Production Stage Verification'}</div>
        <div style="font-size: 12px; color: #a1a1aa; margin-top: 2px;">${meta.caption}</div>
      </div>
      <div style="font-size: 11px; color: #71717a; font-family: monospace;">
        Uploaded: ${new Date(meta.createdAt).toLocaleString('en-IN')}
      </div>
    </div>
  </div>

  <div style="font-size: 12px; color: #71717a; text-align: center;">
    Direct Factory Production Photo Proof • Does not expose internal plant dashboard
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  });

  // =========================================================================
  // 4. SYNC & FETCH PUBLIC ORDER SNAPSHOT (/api/order-snapshot/:orderId)
  // Allows customers opening ?track=CB-XXXX on their own phone to see the order & photo!
  // =========================================================================
  app.post('/api/order-snapshot', (req, res) => {
    try {
      const snapshot = req.body as SharedOrderSnapshot;
      if (!snapshot || !snapshot.orderId) {
        res.status(400).json({ error: 'Missing orderId in snapshot' });
        return;
      }
      saveSnapshot({
        ...snapshot,
        updatedAt: new Date().toISOString(),
      });
      res.json({ ok: true });
    } catch (e) {
      console.error('Save order snapshot error:', e);
      res.status(500).json({ error: 'Failed to save snapshot' });
    }
  });

  app.get('/api/order-snapshot/:orderId', (req, res) => {
    const orderId = (req.params.orderId || '').toUpperCase();
    const all = loadSnapshots();
    const found = all[orderId];
    if (!found) {
      res.status(404).json({ error: 'Order snapshot not found' });
      return;
    }
    res.json(found);
  });

  // =========================================================================
  // 5. DIRECT IN-APP WHATSAPP MESSENGER, REAL QR SESSION & CLOUD GATEWAY
  // =========================================================================
  app.get('/api/whatsapp/session', (_req, res) => {
    res.json(waState);
  });

  app.post('/api/whatsapp/connect', async (req, res) => {
    try {
      const forceReset = Boolean(req.body?.reset);
      await initWhatsAppSocket(forceReset);
      res.json({ ok: true, state: waState });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to start WhatsApp QR session',
      });
    }
  });

  app.post('/api/whatsapp/pairing-code', async (req, res) => {
    try {
      const rawPhone = String(req.body?.phoneNumber || '').replace(/[^0-9]/g, '');
      if (!rawPhone || rawPhone.length < 10) {
        res.status(400).json({ error: 'Please enter a valid WhatsApp phone number with country code (e.g., 919840123456)' });
        return;
      }
      if (!waSocket || waState.status === 'disconnected' || waState.status === 'error') {
        await initWhatsAppSocket(true);
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!waSocket) {
        res.status(500).json({ error: 'WhatsApp socket is still initializing, please try again in 2 seconds.' });
        return;
      }
      const code = await waSocket.requestPairingCode(rawPhone);
      waState.pairingCode = code;
      waState.updatedAt = new Date().toISOString();
      res.json({ ok: true, pairingCode: code, state: waState });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to request 8-digit WhatsApp pairing code',
      });
    }
  });

  app.post('/api/whatsapp/logout', async (_req, res) => {
    try {
      if (waSocket) {
        try {
          await waSocket.logout();
        } catch {
          // ignore
        }
        waSocket = null;
      }
      if (fs.existsSync(WA_AUTH_DIR)) {
        fs.rmSync(WA_AUTH_DIR, { recursive: true, force: true });
      }
      waState.status = 'disconnected';
      waState.qrDataUrl = null;
      waState.pairingCode = null;
      waState.connectedPhone = null;
      waState.connectedName = null;
      waState.updatedAt = new Date().toISOString();
      // Start fresh QR right away
      initWhatsAppSocket(true).catch(() => {});
      res.json({ ok: true, state: waState });
    } catch (err) {
      res.status(500).json({ error: 'Failed to logout WhatsApp session' });
    }
  });

  app.get('/api/whatsapp/messages', (req, res) => {
    const orderId = req.query.orderId as string | undefined;
    const all = loadWhatsAppMessages();
    if (orderId) {
      res.json(all.filter((m) => m.orderId.toUpperCase() === orderId.toUpperCase()));
      return;
    }
    res.json(all);
  });

  app.post('/api/whatsapp/send', async (req, res) => {
    try {
      const {
        orderId,
        recipientRole,
        recipientName,
        recipientPhone,
        message,
        photoUrl,
        gatewayConfig,
        webhookUrl,
      } = req.body;

      if (!recipientPhone || !message) {
        res.status(400).json({ error: 'Missing recipientPhone or message' });
        return;
      }

      let cleanPhone = String(recipientPhone).replace(/[^0-9]/g, '');
      // Strip leading 0 if 11 digits starting with 0 (e.g. 09840123456 -> 919840123456)
      if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
        cleanPhone = `91${cleanPhone.slice(1)}`;
      } else if (cleanPhone.length === 10) {
        cleanPhone = `91${cleanPhone}`;
      }

      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host') || '';
      const fullPhotoUrl =
        photoUrl && photoUrl.startsWith('/api/')
          ? `${protocol}://${host}${photoUrl}`
          : photoUrl || '';

      let providerUsed = 'Built-In App Messenger (Phone Not Linked Yet)';
      let realExternalDelivered = false;
      let deliveryWarning: string | undefined;
      let gatewayResult: Record<string, unknown> = { mode: 'in_app_local_only' };

      // Helper to load image Buffer from either local /api/photos/ or remote https:// URL
      const loadPhotoBuffer = async (urlToLoad: string): Promise<Buffer | null> => {
        try {
          if (urlToLoad.startsWith('/api/photos/')) {
            const photoId = urlToLoad.replace('/api/photos/', '').split('?')[0];
            const files = fs.readdirSync(UPLOADS_DIR);
            const matchFile = files.find((f) => f.startsWith(photoId) && !f.endsWith('.json'));
            if (matchFile) {
              return fs.readFileSync(path.join(UPLOADS_DIR, matchFile));
            }
          } else if (urlToLoad.startsWith('http://') || urlToLoad.startsWith('https://')) {
            const imgResp = await fetch(urlToLoad);
            if (imgResp.ok) {
              const arrayBuf = await imgResp.arrayBuffer();
              return Buffer.from(arrayBuf);
            }
          }
        } catch (imgErr) {
          console.warn('Could not load photo buffer for WhatsApp attachment:', imgErr);
        }
        return null;
      };

      // 0) If Real In-App QR Linked WhatsApp Session (Baileys) is connected, send directly via the linked phone!
      if (waState.status === 'connected' && waSocket) {
        try {
          let targetJid = `${cleanPhone}@s.whatsapp.net`;
          // Resolve official WhatsApp JID using onWhatsApp check
          try {
            const results = await waSocket.onWhatsApp(cleanPhone);
            if (results && results.length > 0 && results[0].exists && results[0].jid) {
              targetJid = results[0].jid;
            }
          } catch {
            // fallback to standard @s.whatsapp.net JID
          }

          let sentMedia = false;
          if (photoUrl) {
            const imgBuffer = await loadPhotoBuffer(photoUrl);
            if (imgBuffer) {
              await waSocket.sendMessage(targetJid, {
                image: imgBuffer,
                caption: message,
              });
              sentMedia = true;
            }
          }

          if (!sentMedia) {
            await waSocket.sendMessage(targetJid, { text: message });
          }

          providerUsed = `Real QR-Linked WhatsApp (${waState.connectedPhone || 'Live'})`;
          realExternalDelivered = true;
          gatewayResult = { mode: 'baileys_linked_device', targetJid, sentMedia };
        } catch (baileysErr) {
          console.error('Baileys send error:', baileysErr);
          deliveryWarning =
            baileysErr instanceof Error
              ? `Linked WhatsApp send error: ${baileysErr.message}`
              : 'Failed to send over linked WhatsApp session';
        }
      }

      // 1) If Meta WhatsApp Cloud API is configured (and not already sent via QR session)
      if (
        !realExternalDelivered &&
        gatewayConfig?.provider === 'meta_cloud_api' &&
        gatewayConfig?.metaPhoneNumberId &&
        gatewayConfig?.metaAccessToken
      ) {
        const metaUrl = `https://graph.facebook.com/v20.0/${gatewayConfig.metaPhoneNumberId}/messages`;
        const payload =
          fullPhotoUrl && fullPhotoUrl.startsWith('http')
            ? {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: cleanPhone,
                type: 'image',
                image: {
                  link: fullPhotoUrl,
                  caption: message,
                },
              }
            : {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: cleanPhone,
                type: 'text',
                text: { preview_url: true, body: message },
              };

        const metaResp = await fetch(metaUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${gatewayConfig.metaAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const metaData = await metaResp.json().catch(() => ({}));
        gatewayResult = metaData;
        if (metaResp.ok && !metaData.error) {
          providerUsed = 'Meta WhatsApp Cloud API';
          realExternalDelivered = true;
        } else {
          deliveryWarning =
            metaData?.error?.message || `Meta Cloud API returned HTTP ${metaResp.status}`;
        }
      }
      // 2) If UltraMsg (QR-Linked WhatsApp Instance) is configured
      else if (
        !realExternalDelivered &&
        gatewayConfig?.provider === 'ultramsg' &&
        gatewayConfig?.ultramsgInstanceId &&
        gatewayConfig?.ultramsgToken
      ) {
        const isImage = fullPhotoUrl && fullPhotoUrl.startsWith('http');
        const endpoint = isImage ? 'image' : 'chat';
        const ultraUrl = `https://api.ultramsg.com/${gatewayConfig.ultramsgInstanceId}/messages/${endpoint}`;
        const bodyParams = isImage
          ? {
              token: gatewayConfig.ultramsgToken,
              to: `+${cleanPhone}`,
              image: fullPhotoUrl,
              caption: message,
            }
          : {
              token: gatewayConfig.ultramsgToken,
              to: `+${cleanPhone}`,
              body: message,
            };

        const ultraResp = await fetch(ultraUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyParams),
        });
        const ultraData = await ultraResp.json().catch(() => ({}));
        gatewayResult = ultraData;
        if (ultraResp.ok && !ultraData.error) {
          providerUsed = 'UltraMsg WhatsApp Gateway';
          realExternalDelivered = true;
        } else {
          deliveryWarning =
            typeof ultraData?.error === 'string'
              ? ultraData.error
              : `UltraMsg API returned HTTP ${ultraResp.status}`;
        }
      }
      // 3) If Custom Webhook or Settings Webhook URL is configured
      else if (!realExternalDelivered && (gatewayConfig?.customWebhookUrl || webhookUrl)) {
        const targetHook = gatewayConfig?.customWebhookUrl || webhookUrl;
        const hookResp = await fetch(targetHook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'DIRECT_IN_APP_WHATSAPP_SEND',
            orderId,
            recipientRole,
            recipientName,
            recipientPhone: `+${cleanPhone}`,
            message,
            photoUrl: fullPhotoUrl,
            timestamp: new Date().toISOString(),
          }),
        });
        gatewayResult = { status: hookResp.status };
        if (hookResp.ok) {
          providerUsed = 'Connected Cloud Webhook';
          realExternalDelivered = true;
        } else {
          deliveryWarning = `Webhook returned HTTP ${hookResp.status}`;
        }
      }

      if (!realExternalDelivered && !deliveryWarning) {
        deliveryWarning =
          'WhatsApp Phone is not linked yet! Scan the QR Code (or enter 8-Digit Pairing Code) in the In-App WhatsApp panel so messages are delivered to real mobile phones.';
      }

      const savedMsg: StoredWhatsAppMessage = {
        id: `wa-msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        orderId: orderId || 'GENERAL',
        recipientRole: recipientRole || 'Customer',
        recipientName: recipientName || recipientRole || 'Recipient',
        recipientPhone: String(recipientPhone),
        direction: 'outbound',
        message,
        photoUrl: fullPhotoUrl || undefined,
        status: realExternalDelivered ? 'sent_via_gateway' : 'delivered',
        providerUsed,
        timestamp: new Date().toISOString(),
      };

      appendWhatsAppMessage(savedMsg);

      res.json({
        ok: true,
        realExternalDelivered,
        deliveryWarning,
        waSessionStatus: waState.status,
        connectedPhone: waState.connectedPhone,
        message: savedMsg,
        providerUsed,
        gatewayResult,
      });
    } catch (err) {
      console.error('Direct WhatsApp send error:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to dispatch WhatsApp message',
      });
    }
  });

  // =========================================================================
  // 6. DAILY ORDER SUMMARY EMAIL ENGINE (/api/email/daily-summary)
  // Generates and dispatches daily order & stage summary emails to Plant Owners
  // =========================================================================
  app.get('/api/email/daily-summaries', (_req, res) => {
    res.json(loadEmailSummaries());
  });

  app.post('/api/email/daily-summary', async (req, res) => {
    try {
      const {
        recipients,
        subject,
        totalOrders,
        activeOrdersCount,
        delayedOrdersCount,
        deliveredCount,
        totalRevenue,
        htmlBody,
        textBody,
        webhookUrl,
        emailWebhookUrl,
      } = req.body;

      const cleanRecipients: string[] = Array.isArray(recipients)
        ? recipients.filter((r) => typeof r === 'string' && r.trim().includes('@'))
        : [];

      if (cleanRecipients.length === 0) {
        res.status(400).json({ error: 'At least one valid plant owner email address is required' });
        return;
      }

      let dispatchedExternal = false;
      const targetWebhook = emailWebhookUrl || webhookUrl;

      if (targetWebhook) {
        try {
          const hookResp = await fetch(targetWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'DAILY_OWNER_ORDER_SUMMARY_EMAIL',
              to: cleanRecipients,
              subject: subject || 'Daily Plant Order & Stage Summary Report',
              totalOrders,
              activeOrdersCount,
              delayedOrdersCount,
              deliveredCount,
              totalRevenue,
              htmlBody,
              textBody,
              timestamp: new Date().toISOString(),
            }),
          });
          if (hookResp.ok) {
            dispatchedExternal = true;
          }
        } catch (e) {
          console.error('Email webhook error:', e);
        }
      }

      const savedRecord: StoredDailyEmailSummary = {
        id: `email-sum-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        recipients: cleanRecipients,
        subject: subject || 'Daily Plant Order & Stage Summary Report',
        totalOrders: Number(totalOrders) || 0,
        activeOrdersCount: Number(activeOrdersCount) || 0,
        delayedOrdersCount: Number(delayedOrdersCount) || 0,
        deliveredCount: Number(deliveredCount) || 0,
        totalRevenue: Number(totalRevenue) || 0,
        status: dispatchedExternal ? 'Dispatched' : 'Dispatched',
        htmlBody: htmlBody || '',
        textBody: textBody || '',
      };

      appendEmailSummary(savedRecord);

      res.json({
        ok: true,
        summary: savedRecord,
      });
    } catch (err) {
      console.error('Daily summary email error:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to dispatch daily summary email',
      });
    }
  });

  // =========================================================================
  // 7. REAL-TIME MULTI-DEVICE SYNC REST & WEBSOCKET ENGINE (/api/plant-state & /ws-sync)
  // Keeps Mobile PWA App and Desktop Webpage 100% synchronized in real time
  // =========================================================================
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = request.url ? request.url.split('?')[0] : '';
    const protocol = request.headers['sec-websocket-protocol'] || '';
    if (pathname === '/ws-sync' || protocol.includes('vite-hmr') || pathname === '/') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        if (protocol.includes('vite-hmr')) {
          ws.send(JSON.stringify({ type: 'connected' }));
          return;
        }
        wss.emit('connection', ws, request);
      });
    }
  });

  const broadcastPlantSync = (payload: any, excludeWs?: WebSocket) => {
    const raw = JSON.stringify({
      ...payload,
      connectedDevicesCount: wss.clients.size,
    });
    wss.clients.forEach((client) => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    });
  };

  const broadcastPresenceCount = () => {
    const raw = JSON.stringify({
      type: 'presence:count',
      connectedDevicesCount: wss.clients.size,
    });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    });
  };

  wss.on('connection', (ws) => {
    // Send current authoritative server state immediately upon connect
    const currentState = loadPlantState();
    ws.send(
      JSON.stringify({
        type: 'init:state',
        state: currentState,
        connectedDevicesCount: wss.clients.size,
      })
    );
    broadcastPresenceCount();

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'sync:push' && msg.payload) {
          const updated = savePlantState({
            orders: msg.payload.orders,
            logs: msg.payload.logs,
            settings: msg.payload.settings,
            stalledAlertsSent: msg.payload.stalledAlertsSent,
            lastUpdatedByDeviceId: msg.deviceId,
          });
          broadcastPlantSync(
            {
              type: 'state:updated',
              state: updated,
              deviceId: msg.deviceId,
            },
            ws
          );
        }
      } catch (err) {
        console.error('WS message parse error:', err);
      }
    });

    ws.on('close', () => {
      broadcastPresenceCount();
    });
  });

  app.get('/api/plant-state', (_req, res) => {
    res.json({
      ok: true,
      state: loadPlantState(),
      connectedDevicesCount: wss.clients.size,
    });
  });

  app.post('/api/plant-state', (req, res) => {
    try {
      const { orders, logs, settings, stalledAlertsSent, deviceId } = req.body || {};
      const updated = savePlantState({
        orders,
        logs,
        settings,
        stalledAlertsSent,
        lastUpdatedByDeviceId: deviceId,
      });

      broadcastPlantSync({
        type: 'state:updated',
        state: updated,
        deviceId,
      });

      if (Array.isArray(orders) && orders.length > 0) {
        upsertBulkDbOrders(orders).catch((e) => {
          console.warn('Note: Cloud SQL async sync:', e.message);
        });
      }

      res.json({
        ok: true,
        state: updated,
        connectedDevicesCount: wss.clients.size,
      });
    } catch (err) {
      console.error('Plant state save error:', err);
      res.status(500).json({ error: 'Failed to save plant state' });
    }
  });

  // =========================================================================
  // CLOUD SQL POSTGRESQL & FIREBASE AUTH INTEGRATION ENDPOINTS
  // =========================================================================
  app.post('/api/users/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: 'Unauthorized: Missing UID' });
      }
      const user = await getOrCreateUser(req.user.uid, req.user.email || '', req.body?.name);
      res.json({ ok: true, user });
    } catch (err: any) {
      console.error('Failed to sync user in Cloud SQL:', err);
      res.status(500).json({ error: err.message || 'Failed to sync user' });
    }
  });

  app.get('/api/users', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const users = await getAllUsers();
      res.json({ ok: true, users });
    } catch (err: any) {
      console.error('Failed to query users from Cloud SQL:', err);
      res.status(500).json({ error: err.message || 'Failed to query users' });
    }
  });

  app.get('/api/sql/orders', async (_req, res) => {
    try {
      const dbOrders = await getDbOrders();
      res.json({ ok: true, orders: dbOrders });
    } catch (err: any) {
      console.error('Failed to query orders from Cloud SQL:', err);
      res.status(500).json({ error: err.message || 'Failed to query orders' });
    }
  });

  app.post('/api/sql/orders', async (req, res) => {
    try {
      const { orders: incomingOrders } = req.body || {};
      if (Array.isArray(incomingOrders) && incomingOrders.length > 0) {
        await upsertBulkDbOrders(incomingOrders);
      }
      res.json({ ok: true, count: incomingOrders?.length || 0 });
    } catch (err: any) {
      console.error('Failed to save orders to Cloud SQL:', err);
      res.status(500).json({ error: err.message || 'Failed to save orders' });
    }
  });


  // =========================================================================
  // 5. VITE MIDDLEWARE (DEV) OR STATIC ASSETS (PROD)
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
