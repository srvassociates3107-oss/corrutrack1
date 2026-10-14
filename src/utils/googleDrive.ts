import { getAccessToken } from './googleAuth';
import { CorrugatedOrder } from '../types/order';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  iconLink?: string;
  parents?: string[];
}

export const CORRUTRACK_FOLDER_NAME = 'CorruTrack Plant Documents';

/**
 * List files from Google Drive v3 API
 */
export async function listDriveFiles(options: {
  folderId?: string;
  query?: string;
  pageSize?: number;
}): Promise<DriveFile[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated with Google Drive. Please sign in first.');
  }

  const pageSize = options.pageSize || 50;
  const conditions = ['trashed = false'];

  if (options.folderId) {
    conditions.push(`'${options.folderId}' in parents`);
  }

  if (options.query && options.query.trim()) {
    const sanitized = options.query.replace(/'/g, "\\'");
    conditions.push(`name contains '${sanitized}'`);
  }

  const q = encodeURIComponent(conditions.join(' and '));
  const fields = encodeURIComponent(
    'files(id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, createdTime, modifiedTime, iconLink, parents)'
  );

  const url = `https://www.googleapis.com/drive/v3/files?pageSize=${pageSize}&q=${q}&fields=${fields}&orderBy=modifiedTime desc`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Failed to fetch Google Drive files (Status ${response.status})`
    );
  }

  const data = await response.json();
  return (data.files || []) as DriveFile[];
}

/**
 * Search or create the default root folder for CorruTrack
 */
export async function getOrCreateCorruTrackFolder(): Promise<DriveFile> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated with Google Drive.');
  }

  // Check if exists
  const q = encodeURIComponent(
    `name = '${CORRUTRACK_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,webViewLink)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0];
    }
  }

  // Create new folder
  return createDriveFolder(CORRUTRACK_FOLDER_NAME);
}

/**
 * Create a new folder on Google Drive
 */
export async function createDriveFolder(folderName: string, parentFolderId?: string): Promise<DriveFile> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated with Google Drive.');
  }

  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to create folder on Google Drive');
  }

  return await response.json();
}

/**
 * Upload a raw file / Blob to Google Drive using multipart upload
 */
export async function uploadFileToDrive(
  fileContent: Blob | File | string,
  fileName: string,
  mimeType: string,
  parentFolderId?: string
): Promise<DriveFile> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated with Google Drive.');
  }

  const metadata: any = {
    name: fileName,
    mimeType: mimeType,
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  let contentData: Blob;
  if (typeof fileContent === 'string') {
    contentData = new Blob([fileContent], { type: mimeType });
  } else {
    contentData = fileContent;
  }

  // Read blob content as binary/arrayBuffer for multipart payload
  const metadataBlob = new Blob(
    [
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),
      delimiter,
      `Content-Type: ${mimeType}\r\n\r\n`,
    ],
    { type: 'text/plain' }
  );

  const closeBlob = new Blob([closeDelimiter], { type: 'text/plain' });
  const multipartBlob = new Blob([metadataBlob, contentData, closeBlob], {
    type: `multipart/related; boundary=${boundary}`,
  });

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,size',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: multipartBlob,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to upload file to Google Drive');
  }

  return await response.json();
}

/**
 * Delete a file from Google Drive (MUST be wrapped with explicit confirmation UI before calling)
 */
export async function deleteDriveFile(fileId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated with Google Drive.');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to delete file from Google Drive (Status ${response.status})`);
  }
}

/**
 * Export Job Card HTML / Spec directly to Google Drive
 */
export async function exportJobCardToDrive(
  order: CorrugatedOrder,
  parentFolderId?: string
): Promise<DriveFile> {
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>CorruTrack Job Card - ${order.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #111; line-height: 1.5; }
    h1 { margin-bottom: 4px; font-size: 24px; color: #1e293b; border-bottom: 2px solid #f59e0b; padding-bottom: 8px; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background: #e2e8f0; }
    .urgent { background: #fee2e2; color: #b91c1c; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
    .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; background: #f8fafc; }
    .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 2px; }
    .value { font-size: 14px; font-weight: 600; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; }
    th { background: #f1f5f9; }
    .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
  </style>
</head>
<body>
  <h1>CorruTrack Factory Job Card: ${order.id}</h1>
  <p><strong>Customer:</strong> ${order.customerName} (${order.customerCompany || 'Standard Account'}) | <strong>Contact:</strong> ${order.customerPhone} | <strong>Date:</strong> ${new Date(order.orderDate).toLocaleDateString()}</p>
  
  <div class="grid">
    <div class="card">
      <div class="label">Box Style & Dimensions</div>
      <div class="value">${order.boxStyle} (${order.dimensions.lengthMm} x ${order.dimensions.widthMm} x ${order.dimensions.heightMm} mm)</div>
      <div class="label" style="margin-top: 8px;">Ply & Flute Type</div>
      <div class="value">${order.ply} - Flute ${order.flute}</div>
    </div>
    <div class="card">
      <div class="label">Quantity & Schedule</div>
      <div class="value">${order.quantity.toLocaleString()} Boxes | Rate: ₹${order.ratePerBox || 0}</div>
      <div class="label" style="margin-top: 8px;">Expected Delivery</div>
      <div class="value">${new Date(order.expectedDeliveryDate).toLocaleDateString()} (${order.priority})</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Paper & Board Parameters</th>
        <th>Specification</th>
        <th>Finishing & Printing</th>
        <th>Specification</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Top Liner Paper</td>
        <td>${order.paperSpecs?.topLinerGsm || 230} GSM Kraft</td>
        <td>Print Details</td>
        <td>${order.printingDetails || 'Standard'}</td>
      </tr>
      <tr>
        <td>Fluting Paper</td>
        <td>${order.paperSpecs?.flutingMediumGsm || 140} GSM</td>
        <td>Lamination</td>
        <td>${order.lamination || 'None'}</td>
      </tr>
      <tr>
        <td>Joint Type</td>
        <td>${order.jointType}</td>
        <td>Color Type</td>
        <td>${order.colorType || 'Plain / Unprinted'}</td>
      </tr>
      <tr>
        <td>Assigned Production Line</td>
        <td>${order.assignedLine || 'Auto-Allocated'}</td>
        <td>Operator in Charge</td>
        <td>${order.operatorInCharge || 'Plant Supervisor'}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Generated by CorruTrack Packaging Operations Hub • Backed up to Google Drive on ${new Date().toLocaleString()}
  </div>
</body>
</html>`;

  const fileName = `JobCard_${order.id}_${order.customerName.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
  return await uploadFileToDrive(htmlContent, fileName, 'text/html', parentFolderId);
}

/**
 * Export All Orders as CSV to Google Drive
 */
export async function exportOrdersCsvToDrive(
  orders: CorrugatedOrder[],
  parentFolderId?: string
): Promise<DriveFile> {
  const headers = [
    'Order ID',
    'Customer Name',
    'Company',
    'Phone',
    'Box Style',
    'Dimensions (LxWxH mm)',
    'Ply',
    'Flute',
    'Quantity',
    'Total Amount',
    'Current Stage',
    'Priority',
    'Order Date',
    'Delivery Date',
    'Assigned Line',
    'Equipment Status',
  ];

  const rows = orders.map((o) => [
    `"${o.id}"`,
    `"${o.customerName.replace(/"/g, '""')}"`,
    `"${(o.customerCompany || o.customerName).replace(/"/g, '""')}"`,
    `"${o.customerPhone}"`,
    `"${o.boxStyle}"`,
    `"${o.dimensions.lengthMm}x${o.dimensions.widthMm}x${o.dimensions.heightMm}"`,
    `"${o.ply}"`,
    `"${o.flute}"`,
    o.quantity,
    o.totalAmount,
    `"${o.currentStage}"`,
    `"${o.priority}"`,
    `"${new Date(o.orderDate).toISOString()}"`,
    `"${new Date(o.expectedDeliveryDate).toISOString()}"`,
    `"${o.assignedLine || 'Unassigned'}"`,
    `"${o.equipmentStatus || 'Normal'}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const fileName = `CorruTrack_WorkOrders_Manifest_${new Date().toISOString().slice(0, 10)}.csv`;

  return await uploadFileToDrive(csvContent, fileName, 'text/csv', parentFolderId);
}
