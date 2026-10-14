import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  FolderPlus,
  Upload,
  RefreshCw,
  Search,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Folder,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Download,
  Database,
  Layers,
  ArrowRight,
  LogOut,
  FolderOpen
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  logoutGoogle,
  initAuth,
  getCurrentUser,
  getAccessToken,
  DRIVE_SCOPES,
} from '../utils/googleAuth';
import {
  DriveFile,
  listDriveFiles,
  getOrCreateCorruTrackFolder,
  createDriveFolder,
  uploadFileToDrive,
  deleteDriveFile,
  exportOrdersCsvToDrive,
  exportJobCardToDrive,
  CORRUTRACK_FOLDER_NAME,
} from '../utils/googleDrive';
import { CorrugatedOrder } from '../types/order';

interface GoogleDriveHubProps {
  orders: CorrugatedOrder[];
  onUpdateOrder?: (order: CorrugatedOrder) => void;
  onOpenOrderModal?: (orderId: string) => void;
}

export const GoogleDriveHub: React.FC<GoogleDriveHubProps> = ({
  orders,
  onUpdateOrder,
  onOpenOrderModal,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'job_cards' | 'csv' | 'images' | 'folders'>('all');
  const [corruTrackFolder, setCorruTrackFolder] = useState<DriveFile | null>(null);

  // Status and feedback banners
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Destructive Confirmation Modal state (MANDATORY per Workspace Integration Skill)
  const [fileToDelete, setFileToDelete] = useState<DriveFile | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Export Confirmation Modal state
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Create Folder Modal state
  const [showFolderModal, setShowFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);

  // Upload Modal / Trigger state
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Quick Job Card Export state
  const [selectedOrderIdForExport, setSelectedOrderIdForExport] = useState<string>(
    orders.length > 0 ? orders[0].id : ''
  );
  const [isExportingJobCard, setIsExportingJobCard] = useState<boolean>(false);

  // Attach to Order Modal state
  const [fileToAttach, setFileToAttach] = useState<DriveFile | null>(null);
  const [targetOrderId, setTargetOrderId] = useState<string>(orders.length > 0 ? orders[0].id : '');

  // Check auth state on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setHasToken(!!token);
      },
      () => {
        const u = getCurrentUser();
        setCurrentUser(u);
        getAccessToken().then((t) => setHasToken(!!t));
      }
    );

    getAccessToken().then((token) => {
      if (token) {
        setHasToken(true);
        setCurrentUser(getCurrentUser());
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Fetch files when authenticated
  const loadFiles = async () => {
    setIsLoadingFiles(true);
    setFeedback(null);
    try {
      // Find or create CorruTrack root folder
      try {
        const folder = await getOrCreateCorruTrackFolder();
        setCorruTrackFolder(folder);
      } catch (fErr) {
        console.warn('Could not initialize CorruTrack folder:', fErr);
      }

      // Fetch files
      const fetched = await listDriveFiles({ pageSize: 40 });
      setFiles(fetched);
    } catch (err: any) {
      console.error('Error fetching Drive files:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to load files from Google Drive. Please re-authenticate.',
      });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (hasToken) {
      loadFiles();
    }
  }, [hasToken]);

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setFeedback(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setHasToken(true);
        setFeedback({
          type: 'success',
          message: `Successfully connected Google Drive for ${res.user.email || 'user'}!`,
        });
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Google sign-in was cancelled or encountered an issue.',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Google Logout
  const handleLogout = async () => {
    await logoutGoogle();
    setCurrentUser(null);
    setHasToken(false);
    setFiles([]);
    setCorruTrackFolder(null);
    setFeedback({
      type: 'info',
      message: 'Signed out of Google Drive.',
    });
  };

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];

    setIsUploading(true);
    setFeedback(null);
    try {
      const parentFolderId = corruTrackFolder ? corruTrackFolder.id : undefined;
      const uploaded = await uploadFileToDrive(file, file.name, file.type || 'application/octet-stream', parentFolderId);
      setFeedback({
        type: 'success',
        message: `Uploaded "${uploaded.name}" to Google Drive successfully!`,
      });
      await loadFiles();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to upload file to Google Drive',
      });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Create Folder Handler
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      const parentFolderId = corruTrackFolder ? corruTrackFolder.id : undefined;
      const created = await createDriveFolder(newFolderName.trim(), parentFolderId);
      setFeedback({
        type: 'success',
        message: `Created folder "${created.name}" in Google Drive.`,
      });
      setShowFolderModal(false);
      setNewFolderName('');
      await loadFiles();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to create folder on Google Drive.',
      });
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Export Work Orders Manifest Handler
  const handleExportAllOrders = async () => {
    setIsExporting(true);
    try {
      const parentFolderId = corruTrackFolder ? corruTrackFolder.id : undefined;
      const uploaded = await exportOrdersCsvToDrive(orders, parentFolderId);
      setFeedback({
        type: 'success',
        message: `Exported ${orders.length} orders to Google Drive as "${uploaded.name}"!`,
      });
      setShowExportModal(false);
      await loadFiles();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to export orders to Google Drive.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Export Individual Job Card Handler
  const handleExportSingleJobCard = async () => {
    const order = orders.find((o) => o.id === selectedOrderIdForExport);
    if (!order) return;
    setIsExportingJobCard(true);
    try {
      const parentFolderId = corruTrackFolder ? corruTrackFolder.id : undefined;
      const uploaded = await exportJobCardToDrive(order, parentFolderId);
      setFeedback({
        type: 'success',
        message: `Job Card for ${order.id} saved to Google Drive as "${uploaded.name}"!`,
      });
      await loadFiles();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to export job card to Google Drive.',
      });
    } finally {
      setIsExportingJobCard(false);
    }
  };

  // Confirm and Execute Destructive File Deletion (MANDATORY per Workspace Integration Skill)
  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDriveFile(fileToDelete.id);
      setFeedback({
        type: 'success',
        message: `Permanently removed "${fileToDelete.name}" from Google Drive.`,
      });
      setFileToDelete(null);
      await loadFiles();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to delete file from Google Drive.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Attach File to Order Handler
  const handleConfirmAttach = () => {
    if (!fileToAttach || !targetOrderId || !onUpdateOrder) return;
    const target = orders.find((o) => o.id === targetOrderId);
    if (!target) return;

    const existing = target.driveAttachments || [];
    const updated = {
      ...target,
      driveAttachments: [
        ...existing,
        {
          fileId: fileToAttach.id,
          fileName: fileToAttach.name,
          fileUrl: fileToAttach.webViewLink || `https://drive.google.com/file/d/${fileToAttach.id}/view`,
          mimeType: fileToAttach.mimeType,
          uploadedAt: new Date().toISOString(),
        },
      ],
    };

    onUpdateOrder(updated);
    setFeedback({
      type: 'success',
      message: `Attached "${fileToAttach.name}" to Order ${target.id}!`,
    });
    setFileToAttach(null);
  };

  // Filter and search logic
  const filteredFiles = files.filter((f) => {
    if (searchQuery.trim()) {
      if (!f.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
    }

    if (activeFilter === 'folders') {
      return f.mimeType === 'application/vnd.google-apps.folder';
    }
    if (activeFilter === 'job_cards') {
      return f.name.toLowerCase().includes('jobcard') || f.mimeType.includes('html') || f.name.toLowerCase().includes('spec');
    }
    if (activeFilter === 'csv') {
      return f.mimeType.includes('csv') || f.name.toLowerCase().endsWith('.csv') || f.mimeType.includes('spreadsheet');
    }
    if (activeFilter === 'images') {
      return f.mimeType.startsWith('image/');
    }

    return true;
  });

  const getFileIcon = (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="w-5 h-5 text-amber-400" />;
    }
    if (file.mimeType.includes('csv') || file.mimeType.includes('spreadsheet')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
    }
    if (file.mimeType.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-blue-400" />;
    }
    return <FileText className="w-5 h-5 text-neutral-400" />;
  };

  const formatFileSize = (bytesStr?: string) => {
    if (!bytesStr) return '—';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Google Drive Workspace Hub</h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Cloud Storage
                </span>
              </div>
              <p className="text-sm text-neutral-400 mt-0.5">
                Back up job cards, artwork files, CAD dielines, and plant production manifests directly to your Google Drive account with permission from the app's users.
              </p>
            </div>
          </div>

          {/* Authentication & User Pill */}
          <div>
            {!hasToken ? (
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoggingIn}
                className="gsi-material-button inline-flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white hover:bg-neutral-100 text-neutral-800 text-sm font-semibold shadow-md transition-all border border-neutral-200 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isLoggingIn ? 'Connecting to Drive...' : 'Sign in with Google'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-neutral-950 border border-neutral-800 rounded-lg p-2 pl-3">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Google User'}
                    className="w-8 h-8 rounded-full border border-neutral-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-amber-400 text-neutral-950 font-bold flex items-center justify-center text-xs">
                    {(currentUser?.displayName || currentUser?.email || 'G')[0].toUpperCase()}
                  </div>
                )}
                <div className="text-left">
                  <div className="text-xs font-semibold text-white truncate max-w-[150px]">
                    {currentUser?.displayName || 'Authorized Account'}
                  </div>
                  <div className="text-[11px] text-neutral-400 truncate max-w-[150px]">
                    {currentUser?.email || 'Google Drive Connected'}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Disconnect Google Drive"
                  className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-900 rounded transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 p-3 rounded-lg border text-xs flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300'
                : feedback.type === 'error'
                ? 'bg-rose-950/60 border-rose-700/50 text-rose-300'
                : 'bg-neutral-800 border-neutral-700 text-neutral-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
              {feedback.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-neutral-400 hover:text-white font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Folder Sync Quick Badge */}
        {hasToken && corruTrackFolder && (
          <div className="mt-4 pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-neutral-300">
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span>Plant Root Folder:</span>
              <span className="font-semibold text-white bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                {corruTrackFolder.name}
              </span>
            </div>
            {corruTrackFolder.webViewLink && (
              <a
                href={corruTrackFolder.webViewLink}
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
              >
                <span>Open in Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Main Controls & Actions (only active when logged in) */}
      {!hasToken ? (
        <div className="bg-neutral-900/60 border border-dashed border-neutral-800 rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
            <HardDrive className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Connect Google Drive to Activate Cloud Storage</h3>
          <p className="text-sm text-neutral-400 max-w-lg mx-auto mb-6">
            Review the card above to enable Google Drive APIs for your packaging plant. Once connected with permission, you can automatically export job cards, back up daily production schedules, and attach client dieline files.
          </p>
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoggingIn}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-semibold text-sm shadow-sm transition-all"
          >
            <HardDrive className="w-4 h-4" />
            <span>Connect Google Drive</span>
          </button>
        </div>
      ) : (
        <>
          {/* Action Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Action 1: Export Manifest */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Production Sync</span>
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                </div>
                <h4 className="text-sm font-bold text-white">Export Order Manifest (CSV)</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Upload all {orders.length} active work orders with stage, machine, and deckle specifications to Drive.
                </p>
              </div>
              <button
                onClick={() => setShowExportModal(true)}
                className="mt-4 flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-900/80 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Manifest to Drive</span>
              </button>
            </div>

            {/* Action 2: Export Single Job Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Job Card Document</span>
                  <FileText className="w-4 h-4 text-amber-400" />
                </div>
                <h4 className="text-sm font-bold text-white">Save Job Card to Drive</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Save high-resolution printable HTML specification card directly to the cloud plant folder.
                </p>
                <select
                  value={selectedOrderIdForExport}
                  onChange={(e) => setSelectedOrderIdForExport(e.target.value)}
                  className="mt-2 w-full text-xs bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-neutral-200"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id} — {o.customerName} ({o.quantity} pcs)
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleExportSingleJobCard}
                disabled={isExportingJobCard}
                className="mt-4 flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-amber-400 text-neutral-950 hover:bg-amber-300 transition-colors disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isExportingJobCard ? 'Saving...' : 'Save Job Card to Drive'}</span>
              </button>
            </div>

            {/* Action 3: Upload Artwork / CAD Dieline */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Artwork & Dieline</span>
                  <Upload className="w-4 h-4 text-blue-400" />
                </div>
                <h4 className="text-sm font-bold text-white">Upload File to Drive</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Upload customer artwork proofs, die-cut CAD files, or QC inspection images directly to Drive.
                </p>
              </div>
              <label className="mt-4 flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-blue-950 text-blue-300 border border-blue-700/50 hover:bg-blue-900/80 transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Uploading...' : 'Choose File to Upload'}</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Explorer Bar: Search, Filters, Create Folder, Refresh */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search files on Google Drive..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                    activeFilter === 'all'
                      ? 'bg-amber-400 text-neutral-950'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  All Files
                </button>
                <button
                  onClick={() => setActiveFilter('job_cards')}
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                    activeFilter === 'job_cards'
                      ? 'bg-amber-400 text-neutral-950'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  Job Cards
                </button>
                <button
                  onClick={() => setActiveFilter('csv')}
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                    activeFilter === 'csv'
                      ? 'bg-amber-400 text-neutral-950'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  Manifests (CSV)
                </button>
                <button
                  onClick={() => setActiveFilter('images')}
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                    activeFilter === 'images'
                      ? 'bg-amber-400 text-neutral-950'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  Artwork & Photos
                </button>
                <button
                  onClick={() => setActiveFilter('folders')}
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                    activeFilter === 'folders'
                      ? 'bg-amber-400 text-neutral-950'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  Folders
                </button>
              </div>

              {/* Create Folder & Refresh Buttons */}
              <div className="flex items-center gap-2 self-end md:self-auto">
                <button
                  onClick={() => setShowFolderModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span>New Folder</span>
                </button>
                <button
                  onClick={loadFiles}
                  disabled={isLoadingFiles}
                  title="Reload files from Google Drive"
                  className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingFiles ? 'animate-spin text-amber-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Files List Table */}
            <div className="mt-4 border border-neutral-800 rounded-lg overflow-hidden">
              {isLoadingFiles ? (
                <div className="p-8 text-center text-neutral-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Loading files from Google Drive...</span>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 text-xs">
                  No files found matching your search or filter. Use the buttons above to export job cards or upload artwork.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3 font-semibold">Name</th>
                        <th className="py-2.5 px-3 font-semibold">Size</th>
                        <th className="py-2.5 px-3 font-semibold">Last Modified</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {filteredFiles.map((file) => (
                        <tr key={file.id} className="hover:bg-neutral-800/40 transition-colors group">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              {getFileIcon(file)}
                              <div>
                                <div className="font-medium text-white truncate max-w-xs sm:max-w-md">
                                  {file.name}
                                </div>
                                <div className="text-[10px] text-neutral-500 font-mono">
                                  {file.mimeType}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-neutral-400 font-mono">
                            {formatFileSize(file.size)}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-400 font-mono">
                            {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Open link */}
                              {file.webViewLink && (
                                <a
                                  href={file.webViewLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Open in Google Drive"
                                  className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 rounded transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}

                              {/* Attach to Order */}
                              {file.mimeType !== 'application/vnd.google-apps.folder' && onUpdateOrder && (
                                <button
                                  onClick={() => setFileToAttach(file)}
                                  title="Attach to a Work Order"
                                  className="p-1.5 text-neutral-400 hover:text-blue-400 hover:bg-neutral-800 rounded transition-colors"
                                >
                                  <Paperclip className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete Button (MANDATORY User Confirmation Dialog) */}
                              <button
                                onClick={() => setFileToDelete(file)}
                                title="Delete file from Google Drive"
                                className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* MANDATORY USER CONFIRMATION MODAL FOR DESTRUCTIVE ACTIONS */}
      {/* ========================================================= */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Confirm Permanent Deletion</h3>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">"{fileToDelete.name}"</strong> from your Google Drive?
            </p>
            <p className="text-[11px] text-rose-400/90 mt-2">
              This operation permanently removes this item from your cloud drive. This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteFile}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export All Orders Confirmation Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-400 mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Export Work Orders to Google Drive</h3>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              This will generate a master CSV spreadsheet containing all <strong className="text-white">{orders.length} orders</strong> (including client contacts, box specs, assigned production lines, and delivery milestones) and save it into your Google Drive plant folder.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                disabled={isExporting}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExportAllOrders}
                disabled={isExporting}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isExporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>{isExporting ? 'Exporting...' : 'Confirm & Export CSV'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <FolderPlus className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Create New Folder in Drive</h3>
            </div>
            <input
              type="text"
              placeholder="Folder name (e.g. Diemaking CAD 2026)"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full text-xs bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-400"
              autoFocus
            />
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                disabled={isCreatingFolder}
                className="px-3.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:text-white bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateFolder}
                disabled={isCreatingFolder || !newFolderName.trim()}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 transition-colors disabled:opacity-50"
              >
                {isCreatingFolder ? 'Creating...' : 'Create Folder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attach to Order Modal */}
      {fileToAttach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-blue-400 mb-3">
              <Paperclip className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Attach Google Drive File to Work Order</h3>
            </div>
            <p className="text-xs text-neutral-300 mb-2">
              Attach <strong className="text-white">"{fileToAttach.name}"</strong> to the selected order for easy shop-floor access:
            </p>
            <select
              value={targetOrderId}
              onChange={(e) => setTargetOrderId(e.target.value)}
              className="w-full text-xs bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id} — {o.customerName} ({o.boxStyle})
                </option>
              ))}
            </select>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setFileToAttach(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:text-white bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAttach}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors"
              >
                Attach File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
