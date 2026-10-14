import { CorrugatedOrder, FactorySettings } from '../types/order';
import { STAGE_CONFIG } from './whatsapp';
import { getProductCatalogItem, formatProductSpecsSummary } from './productCatalog';

/**
 * Compresses an uploaded image File to a reasonable dimension (max 1400px) and JPEG quality (0.85)
 * so it uploads fast and renders crisp on WhatsApp & mobile browsers.
 */
export async function compressImageFileToDataUrl(file: File, maxWidth = 1400, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) {
        reject(new Error('Failed to read image file'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = () => reject(new Error('File reading error'));
    reader.readAsDataURL(file);
  });
}

export interface UploadedPhotoResult {
  /** Direct raw image URL (e.g. https://domain/api/photos/CB-8942_a1b2c3d4.jpg) */
  rawPhotoUrl: string;
  /** Standalone full-screen photo viewer URL (e.g. https://domain/api/photo-view/CB-8942_a1b2c3d4.jpg) */
  photoViewUrl: string;
  /** File object for Web Share API or clipboard */
  file?: File;
}

/**
 * Builds a portable order snapshot payload to store on the server so that when a customer
 * opens the tracker link or photo link on their own phone, the order & photo are always available.
 */
export function buildOrderSnapshotPayload(
  order: CorrugatedOrder,
  settings: FactorySettings,
  overridePhotoUrl?: string
) {
  const productItem = getProductCatalogItem(order.productType);
  const subCategoryName = order.productSubCategory || productItem.subCategories[0]?.title || 'Standard';
  const productSpecsSummary = order.productSpecsSummary || formatProductSpecsSummary(order);
  const stageInfo = STAGE_CONFIG[order.currentStage];

  return {
    orderId: order.id,
    customerName: order.customerName,
    customerCompany: order.customerCompany,
    customerPhone: order.customerPhone,
    productTitle: productItem.title,
    subCategory: subCategoryName,
    productSpecsSummary,
    boxStyle: order.boxStyle,
    dimensions: order.dimensions,
    ply: order.ply,
    flute: order.flute,
    paperSpecs: order.paperSpecs,
    quantity: order.quantity,
    currentStage: order.currentStage,
    stageTitle: stageInfo?.title || order.currentStage,
    expectedDeliveryDate: order.expectedDeliveryDate,
    deliveryAddress: order.deliveryAddress,
    photoUrl: overridePhotoUrl || order.stageHistory?.[order.stageHistory.length - 1]?.photoUrl || '',
    stageNotes: order.stageHistory?.[order.stageHistory.length - 1]?.notes || '',
    updatedBy: order.operatorInCharge || 'Plant QA Console',
    companyName: settings.companyName,
    contactNumber: settings.contactNumber,
    salesPersonName: order.salesPersonName,
    salesPersonPhone: order.salesPersonPhone,
    logistics: order.logistics,
    stageHistory: order.stageHistory,
  };
}

/**
 * Uploads a photo (either File or base64 dataUrl) to our server `/api/upload-photo`
 * and returns a short, clean, clickable `https://.../api/photos/...` URL that opens ONLY the image
 * (never the internal dashboard, and never a huge broken base64 string).
 */
export async function uploadStagePhotoToServer(
  fileOrDataUrl: File | string,
  order: CorrugatedOrder,
  settings: FactorySettings,
  stageTitle?: string
): Promise<UploadedPhotoResult> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  let dataUrl = '';
  let originalFile: File | undefined;

  if (typeof fileOrDataUrl === 'string') {
    dataUrl = fileOrDataUrl;
    // If it's already an external https URL or already uploaded /api/photos/ URL
    if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
      syncOrderSnapshotToServer(order, settings, dataUrl);
      return {
        rawPhotoUrl: dataUrl,
        photoViewUrl: dataUrl,
      };
    }
    if (dataUrl.startsWith('/api/photos/')) {
      const fullRaw = `${origin}${dataUrl}`;
      const filename = dataUrl.replace('/api/photos/', '');
      return {
        rawPhotoUrl: fullRaw,
        photoViewUrl: `${origin}/api/photo-view/${filename}`,
      };
    }
  } else {
    originalFile = fileOrDataUrl;
    dataUrl = await compressImageFileToDataUrl(fileOrDataUrl);
  }

  try {
    const stageInfo = STAGE_CONFIG[order.currentStage];
    const snapshot = buildOrderSnapshotPayload(order, settings);

    const response = await fetch('/api/upload-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataUrl,
        orderId: order.id,
        stage: stageTitle || stageInfo?.title || order.currentStage,
        caption: `${order.customerCompany} • ${stageTitle || stageInfo?.title || 'Stage Verification'}`,
        snapshot,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const rawPhotoUrl = data.photoUrl.startsWith('http') ? data.photoUrl : `${origin}${data.photoUrl}`;
      const photoViewUrl = data.viewUrl
        ? (data.viewUrl.startsWith('http') ? data.viewUrl : `${origin}${data.viewUrl}`)
        : rawPhotoUrl;

      return {
        rawPhotoUrl,
        photoViewUrl,
        file: originalFile,
      };
    }
  } catch (err) {
    console.error('Server photo upload fallback:', err);
  }

  // Fallback if offline
  return {
    rawPhotoUrl: dataUrl,
    photoViewUrl: dataUrl,
    file: originalFile,
  };
}

/**
 * Syncs an order's state to the server so that when a customer clicks the tracking link
 * on their mobile phone, the order and its photos load seamlessly.
 */
export async function syncOrderSnapshotToServer(
  order: CorrugatedOrder,
  settings: FactorySettings,
  overridePhotoUrl?: string
): Promise<void> {
  try {
    const snapshot = buildOrderSnapshotPayload(order, settings, overridePhotoUrl);
    await fetch('/api/order-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    });
  } catch {
    // Non-blocking sync
  }
}

/**
 * Converts a photo URL or base64 data URI into a Blob/File so it can be:
 * 1) Copied directly to the system clipboard (for Ctrl+V / Paste directly into WhatsApp Web!)
 * 2) Shared as a native image file via navigator.share({ files: [file] }) on mobile!
 */
export async function urlOrDataUrlToBlob(photoUrl: string): Promise<Blob | null> {
  if (!photoUrl) return null;
  try {
    const resp = await fetch(photoUrl);
    return await resp.blob();
  } catch {
    return null;
  }
}

/**
 * Copies the actual image to the user's clipboard as PNG so they can simply press
 * Ctrl+V (or Cmd+V) inside WhatsApp Web / Desktop chat to send the real photo!
 */
export async function copyImageToClipboard(photoUrl: string): Promise<boolean> {
  if (!photoUrl || typeof navigator === 'undefined' || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
    return false;
  }

  try {
    // Convert any image (JPEG/WebP/DataURL) onto a canvas and export as image/png
    // because browsers require image/png for navigator.clipboard.write()
    const pngBlob = await new Promise<Blob | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 800;
        canvas.height = img.naturalHeight || img.height || 600;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((b) => resolve(b), 'image/png');
      };
      img.onerror = () => resolve(null);
      img.src = photoUrl;
    });

    if (!pngBlob) return false;

    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': pngBlob,
      }),
    ]);
    return true;
  } catch (err) {
    console.warn('Clipboard image write failed:', err);
    return false;
  }
}

/**
 * Shares the actual image file + WhatsApp caption text using the device's native share sheet
 * (Mobile Android/iOS or macOS/Windows). When the user selects WhatsApp, it attaches the REAL photo!
 */
export async function shareImageFileWithText(
  photoUrl: string,
  orderId: string,
  messageText: string
): Promise<boolean> {
  if (!photoUrl || typeof navigator === 'undefined' || !navigator.share) {
    return false;
  }

  try {
    const blob = await urlOrDataUrlToBlob(photoUrl);
    if (blob) {
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const file = new File([blob], `Order_${orderId}_Photo.${ext}`, { type: blob.type || 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Order #${orderId} Photo Proof`,
          text: messageText,
        });
        return true;
      }
    }

    // Fallback to text share if file share is not supported
    await navigator.share({
      title: `Order #${orderId} Update`,
      text: messageText,
    });
    return true;
  } catch {
    return false;
  }
}
