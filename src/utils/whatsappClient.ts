import { CorrugatedOrder, FactorySettings, InAppChatMessage } from '../types/order';
import { syncOrderSnapshotToServer } from './photoUpload';

const LOCAL_WA_MESSAGES_KEY = 'corrutrack_inapp_whatsapp_messages_v1';

export function getLocalWhatsAppMessages(): InAppChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_WA_MESSAGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalWhatsAppMessage(msg: InAppChatMessage): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalWhatsAppMessages();
    const updated = [msg, ...existing.filter((m) => m.id !== msg.id)].slice(0, 250);
    localStorage.setItem(LOCAL_WA_MESSAGES_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

export async function fetchInAppWhatsAppMessages(orderId?: string): Promise<InAppChatMessage[]> {
  try {
    const url = orderId
      ? `/api/whatsapp/messages?orderId=${encodeURIComponent(orderId)}`
      : '/api/whatsapp/messages';
    const resp = await fetch(url);
    if (resp.ok) {
      const serverList: InAppChatMessage[] = await resp.json();
      const localList = getLocalWhatsAppMessages();
      const map = new Map<string, InAppChatMessage>();
      for (const m of [...serverList, ...localList]) {
        map.set(m.id, m);
      }
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return orderId
        ? merged.filter((m) => m.orderId.toUpperCase() === orderId.toUpperCase())
        : merged;
    }
  } catch {
    // fallback to local
  }
  const local = getLocalWhatsAppMessages();
  return orderId
    ? local.filter((m) => m.orderId.toUpperCase() === orderId.toUpperCase())
    : local;
}

export interface DirectSendResult {
  ok: boolean;
  realExternalDelivered: boolean;
  deliveryWarning?: string;
  waSessionStatus?: 'disconnected' | 'initializing' | 'qr_ready' | 'connected' | 'error';
  connectedPhone?: string | null;
  message?: InAppChatMessage;
  providerUsed: string;
  error?: string;
}

/**
 * Sends a WhatsApp message (and optional photo) directly from INSIDE the application
 * via `/api/whatsapp/send` without opening any external browser tab or webpage!
 */
export async function sendDirectInAppWhatsApp(params: {
  order: CorrugatedOrder;
  settings: FactorySettings;
  recipientRole: string;
  recipientName: string;
  recipientPhone: string;
  message: string;
  photoUrl?: string;
}): Promise<DirectSendResult> {
  const { order, settings, recipientRole, recipientName, recipientPhone, message, photoUrl } = params;

  // Ensure the order snapshot + photo is synced to the server first
  syncOrderSnapshotToServer(order, settings, photoUrl);

  try {
    const resp = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        recipientRole,
        recipientName,
        recipientPhone,
        message,
        photoUrl,
        gatewayConfig: settings.whatsappGateway,
        webhookUrl: settings.webhookUrl,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.message) {
        saveLocalWhatsAppMessage(data.message);
      }
      return {
        ok: true,
        realExternalDelivered: Boolean(data.realExternalDelivered),
        deliveryWarning: data.deliveryWarning,
        waSessionStatus: data.waSessionStatus,
        connectedPhone: data.connectedPhone,
        message: data.message,
        providerUsed: data.providerUsed || 'Built-In App Messenger',
      };
    } else {
      const errData = await resp.json().catch(() => ({}));
      return {
        ok: false,
        realExternalDelivered: false,
        deliveryWarning: errData.error || `Server error HTTP ${resp.status}`,
        providerUsed: 'Failed',
        error: errData.error,
      };
    }
  } catch (err) {
    console.warn('Direct API send fallback:', err);
  }

  // Fallback local message record
  const fallbackMsg: InAppChatMessage = {
    id: `wa-local-${Date.now()}`,
    orderId: order.id,
    recipientRole,
    recipientName,
    recipientPhone,
    direction: 'outbound',
    message,
    photoUrl,
    status: 'delivered',
    providerUsed: 'Built-In App Messenger (Phone Not Linked Yet)',
    timestamp: new Date().toISOString(),
  };
  saveLocalWhatsAppMessage(fallbackMsg);

  return {
    ok: true,
    realExternalDelivered: false,
    deliveryWarning:
      'WhatsApp Phone is not linked yet! Scan the QR Code in the In-App WhatsApp workspace to deliver messages to real phones.',
    message: fallbackMsg,
    providerUsed: 'Built-In App Messenger (Phone Not Linked Yet)',
  };
}
