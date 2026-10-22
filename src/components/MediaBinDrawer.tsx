/**
 * @file /src/components/MediaBinDrawer.tsx
 * @description High-Capacity Bulk Upload Engine & Ultra-Responsive Media Asset Vault for RAWx Storyboard Studio.
 * 
 * Capabilities:
 * 1. File Input Direct Wiring:
 *    - Hidden file and folder input elements wired directly to [ INGEST FILES ] and [ FOLDER ].
 * 2. Global & Vault Drag-and-Drop:
 *    - Native drag/drop with recursive folder extraction (webkitGetAsEntry) and Array.from(files) fallback.
 * 3. Concurrent Ingestion Queue:
 *    - Processes dropped files in batches of 3 to eliminate UI lockups.
 *    - Live gold HUD during upload: [ INGESTING 3/18 ASSETS // 45% ].
 *    - Real-time append to local state without requiring manual refresh.
 * 4. Smart Media Manager:
 *    - Filter chips: [ ALL ], [ VIDEO ], [ STILLS ], [ AUDIO ], [ UNASSIGNED ].
 *    - Instant search input matching against item.name.
 *    - Card Telemetry: file size, resolution (4K / 1080P), duration, green IDB STORED badge.
 *    - Instant Assignment to Timeline: card click or [+ ASSIGN TO SHOT], drag with magnetic snap.
 *    - Bulk Actions Bar: [ ASSIGN TO SEQUENCE ], [ EXPORT METADATA ], [ PURGE SELECTED ].
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Upload, 
  Search, 
  Video, 
  Image as ImageIcon, 
  Music, 
  HardDrive, 
  CheckCircle2, 
  Trash2, 
  Play, 
  X, 
  FolderPlus, 
  FileText, 
  Layers, 
  CheckSquare, 
  Square,
  RefreshCw,
  Download,
  AlertTriangle
} from 'lucide-react';
import { db, VaultMediaItem } from '../services/db';
import { useStudioStore } from '../core/store';
import { eventBus } from '../core/eventBus';

export interface MediaBinDrawerProps {
  onAssignToShot?: (assetId: string, shotIndex: number, filename: string) => void;
  activeShotIndex?: number;
  className?: string;
}

export type MediaFilterType = 'ALL' | 'VIDEO' | 'STILLS' | 'AUDIO' | 'UNASSIGNED';

export const MediaBinDrawer: React.FC<MediaBinDrawerProps> = ({
  onAssignToShot,
  activeShotIndex: propActiveShotIndex,
  className = ''
}) => {
  const storeActiveShotIndex = useStudioStore((s) => s.activeShotIndex);
  const activeShotIndex = propActiveShotIndex !== undefined ? propActiveShotIndex : storeActiveShotIndex;

  const [vaultItems, setVaultItems] = useState<VaultMediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<MediaFilterType>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Batch Ingestion HUD State
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestTotal, setIngestTotal] = useState(0);
  const [ingestDone, setIngestDone] = useState(0);
  const [currentIngestFilename, setCurrentIngestFilename] = useState('');
  const [previewItem, setPreviewItem] = useState<{ id: string; url: string; isVideo: boolean; title: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const isCancelledRef = useRef<boolean>(false);

  // Format bytes into human readable format (e.g. 21.1 MB)
  const formatBytes = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Format seconds into duration label
  const formatDuration = (sec?: number): string => {
    if (sec === undefined || sec === null || isNaN(sec)) return '12.0s';
    if (sec < 60) return `${sec.toFixed(1)}s`;
    const mins = Math.floor(sec / 60);
    const rem = Math.floor(sec % 60);
    return `${mins}:${String(rem).padStart(2, '0')}`;
  };

  /**
   * Auto-Hydration on Mount:
   * Hydrates all saved assets from IndexedDB `media_vault` so nothing vanishes on reload or tab switch.
   */
  const loadStoredMedia = useCallback(async () => {
    setIsLoading(true);
    try {
      let items = await db.getAllVaultMedia();
      if (items.length === 0) {
        // Seed default starter assets so grid is never empty on clean boot
        await db.seedDefaultVaultAssets();
        items = await db.getAllVaultMedia();
      }
      setVaultItems(items);

      // Hydrate timeline slots if any shots were previously linked in IndexedDB
      const slots = await db.getAllTimelineSlots();
      for (const slot of slots) {
        const match = items.find(it => it.id === slot.mediaId);
        if (match && match.blob) {
          const url = db.getActiveMediaUrl(match.id, match.blob);
          const isVideo = match.mimeType.startsWith('video');
          useStudioStore.getState().updateShot(slot.slotIndex, {
            imageUrl: url,
            isVideo,
            title: match.name.replace(/\.[^/.]+$/, "")
          });
        }
      }
    } catch (err) {
      console.warn('[MediaBin] loadStoredMedia error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStoredMedia();

    // Prevent default browser file drop behavior that can trigger navigation on mobile Chrome / Safari
    const preventWindowDrop = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', preventWindowDrop, false);
    window.addEventListener('drop', preventWindowDrop, false);

    const unsubAssign = eventBus.on('asset_assigned_to_shot', () => {
      db.getAllVaultMedia().then(setVaultItems);
    });

    const unsubIngest = eventBus.on('media_asset_ingested', () => {
      db.getAllVaultMedia().then(setVaultItems);
    });

    const unsubDelete = eventBus.on('media_asset_deleted', () => {
      db.getAllVaultMedia().then(setVaultItems);
    });

    return () => {
      window.removeEventListener('dragover', preventWindowDrop);
      window.removeEventListener('drop', preventWindowDrop);
      unsubAssign();
      unsubIngest();
      unsubDelete();
      isCancelledRef.current = true;
    };
  }, [loadStoredMedia]);

  // =========================================================================
  // CONCURRENT INGESTION QUEUE (Batches of 3, Real-time local state append)
  // =========================================================================

  const runBatchIngestion = async (files: File[]) => {
    if (!files || files.length === 0) return;

    setIsIngesting(true);
    setIngestTotal(files.length);
    setIngestDone(0);

    const BATCH_SIZE = 3;
    for (let i = 0; i < files.length && !isCancelledRef.current; i += BATCH_SIZE) {
      const chunk = files.slice(i, i + BATCH_SIZE);
      await Promise.all(
        chunk.map(async (file) => {
          setCurrentIngestFilename(file.name);
          try {
            const savedItem = await db.saveMediaToVault(file);
            // Immediately append newly saved item into local React state in real time
            setVaultItems(prev => {
              const filtered = prev.filter(p => p.id !== savedItem.id);
              return [savedItem, ...filtered];
            });
          } catch (err) {
            console.warn('[Ingest Queue] Failed to save file:', file.name, err);
          }
        })
      );
      setIngestDone(Math.min(files.length, i + chunk.length));
    }

    setIsIngesting(false);
    setCurrentIngestFilename('');

    // Final synchronization pass with IndexedDB
    const finalVault = await db.getAllVaultMedia();
    setVaultItems(finalVault);
  };

  // Recursive Directory Reader for Dropped Folders
  const traverseDirectoryEntries = async (entries: any[]): Promise<File[]> => {
    const fileList: File[] = [];

    const readEntry = async (entry: any): Promise<void> => {
      if (!entry) return;
      if (entry.isFile) {
        return new Promise<void>((resolve) => {
          entry.file((file: File) => {
            if (file && (file.type.startsWith('image') || file.type.startsWith('video') || file.type.startsWith('audio') || /\.(mp4|webm|mov|mkv|jpg|jpeg|png|webp|mp3|wav|ogg)$/i.test(file.name))) {
              fileList.push(file);
            }
            resolve();
          }, () => resolve());
        });
      } else if (entry.isDirectory) {
        return new Promise<void>((resolve) => {
          const reader = entry.createReader();
          const readAll = () => {
            reader.readEntries(async (subEntries: any[]) => {
              if (subEntries.length === 0) {
                resolve();
              } else {
                for (const sub of subEntries) {
                  await readEntry(sub);
                }
                readAll();
              }
            }, () => resolve());
          };
          readAll();
        });
      }
    };

    for (const entry of entries) {
      await readEntry(entry);
    }

    return fileList;
  };

  // Drag and drop event handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    // 1. Directory entry check
    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const entryPromises: any[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (typeof item.webkitGetAsEntry === 'function') {
          const entry = item.webkitGetAsEntry();
          if (entry) entryPromises.push(entry);
        }
      }

      if (entryPromises.length > 0) {
        const extractedFiles = await traverseDirectoryEntries(entryPromises);
        if (extractedFiles.length > 0) {
          await runBatchIngestion(extractedFiles);
          return;
        }
      }
    }

    // 2. Direct files list fallback
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileArray = Array.from(e.dataTransfer.files);
      await runBatchIngestion(fileArray);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target.files && e.target.files.length > 0) {
      const fileArray = Array.from(e.target.files);
      await runBatchIngestion(fileArray);
      e.target.value = '';
    }
  };

  // Single Tap / Click to Assign directly to the active shot
  const handleAssignToShot = async (item: VaultMediaItem) => {
    const targetShot = activeShotIndex;
    await db.assignMediaToShot(item.id, targetShot);
    
    // Resolve durable Object URL using LRU cache
    const blobUrl = db.getActiveMediaUrl(item.id, item.blob);
    const isVid = item.mimeType?.startsWith('video') || /\.(mp4|webm|mov|mkv|ogg|m4v)$/i.test(item.name);
    
    // Update active slide in Zustand store
    try {
      useStudioStore.getState().updateShot(targetShot, {
        imageUrl: blobUrl,
        isVideo: isVid,
        title: item.name.replace(/\.[^/.]+$/, "")
      });
    } catch (err) {
      console.warn('[MediaBin] updateShot error:', err);
    }

    if (onAssignToShot) {
      onAssignToShot(item.id, targetShot, item.name);
    }

    // Re-hydrate vault items to update assigned badges
    const updated = await db.getAllVaultMedia();
    setVaultItems(updated);
  };

  // Drag Start for timeline slot target
  const handleCardDragStart = (e: React.DragEvent, item: VaultMediaItem) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'MEDIA_ASSET_VAULT',
      assetId: item.id,
      filename: item.name,
      mimeType: item.mimeType,
      isVideo: item.mimeType?.startsWith('video')
    }));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  // Delete asset across all IndexedDB stores
  const handleDeleteAsset = async (assetId: string) => {
    await db.deleteVaultMedia(assetId);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(assetId);
      return next;
    });
    const updated = await db.getAllVaultMedia();
    setVaultItems(updated);
  };

  // Open Preview Modal using LRU Cache URL
  const handleOpenPreview = (item: VaultMediaItem) => {
    const isVid = item.mimeType?.startsWith('video') || false;
    const url = db.getActiveMediaUrl(item.id, item.blob);
    if (url) {
      setPreviewItem({
        id: item.id,
        url,
        isVideo: isVid,
        title: item.name
      });
    }
  };

  // Multi-Selection Handlers
  const handleToggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  // Bulk Actions
  const handleBulkAssignToSequence = async () => {
    const selectedList = vaultItems.filter(it => selectedIds.has(it.id));
    if (selectedList.length === 0) return;

    for (let i = 0; i < selectedList.length; i++) {
      const targetSlot = (activeShotIndex + i) % 100;
      const it = selectedList[i];
      await db.assignMediaToShot(it.id, targetSlot);
      const blobUrl = db.getActiveMediaUrl(it.id, it.blob);
      const isVid = it.mimeType?.startsWith('video');
      useStudioStore.getState().updateShot(targetSlot, {
        imageUrl: blobUrl,
        isVideo: isVid,
        title: it.name.replace(/\.[^/.]+$/, "")
      });
    }

    setSelectedIds(new Set());
    const updated = await db.getAllVaultMedia();
    setVaultItems(updated);
  };

  const handleBulkExportMetadata = () => {
    const selectedList = vaultItems.filter(it => selectedIds.has(it.id));
    if (selectedList.length === 0) return;

    const manifest = selectedList.map(it => ({
      id: it.id,
      name: it.name,
      mimeType: it.mimeType,
      sizeBytes: it.size,
      sizeFormatted: formatBytes(it.size),
      resolution: it.resolution || (it.mimeType.startsWith('video') ? '4K' : 'STILL'),
      durationSec: it.duration ?? 12.0,
      createdAt: new Date(it.createdAt).toISOString(),
      assignedShotIndex: it.assignedShotIndex ?? it.shotIndex ?? null
    }));

    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `media_vault_manifest_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkPurgeSelected = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    for (const id of selectedIds) {
      await db.deleteVaultMedia(id);
    }
    setSelectedIds(new Set());
    const updated = await db.getAllVaultMedia();
    setVaultItems(updated);
  };

  // Filtered Assets list matching search and category chips
  const filteredItems = useMemo(() => {
    return vaultItems.filter((it) => {
      const matchesSearch = searchQuery === '' || (it.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      const isVid = it.mimeType?.startsWith('video') || /\.(mp4|webm|mov|mkv|ogg|m4v)$/i.test(it.name);
      const isAud = it.mimeType?.startsWith('audio') || /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(it.name);
      const isStill = !isVid && !isAud;
      const isAssigned = it.assignedShotIndex !== undefined || it.shotIndex !== undefined;

      switch (filterType) {
        case 'VIDEO':
          return isVid;
        case 'STILLS':
          return isStill;
        case 'AUDIO':
          return isAud;
        case 'UNASSIGNED':
          return !isAssigned;
        case 'ALL':
        default:
          return true;
      }
    });
  }, [vaultItems, searchQuery, filterType]);

  const percentComplete = ingestTotal > 0 ? Math.round((ingestDone / ingestTotal) * 100) : 0;

  return (
    <div 
      className={`w-full h-full flex flex-col bg-[#07070A] text-zinc-200 font-mono select-none overflow-hidden transition-all duration-200 ${
        isDraggingOver ? 'border-2 border-[#F5A623] bg-[#F5A623]/10 shadow-[0_0_24px_rgba(245,166,35,0.25)]' : 'border-transparent'
      } ${className}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ===================================================================== */}
      {/* 1. HIDDEN FILE & DIRECTORY INPUT DIRECT WIRING                        */}
      {/* ===================================================================== */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="video/*,image/*,audio/*"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        type="file"
        ref={folderInputRef}
        multiple
        {...({ webkitdirectory: "", directory: "" } as any)}
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* ===================================================================== */}
      {/* 2. LIVE GOLD BATCH INGESTION HUD                                      */}
      {/* ===================================================================== */}
      {isIngesting && (
        <div className="bg-[#0f0c08] border-b border-[#F5A623] px-3 py-2 shrink-0 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[10px] text-[#F5A623] font-bold tracking-wider mb-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F5A623] animate-ping" />
              <span>[ INGESTING {ingestDone}/{ingestTotal} ASSETS // {percentComplete}% ]</span>
            </div>
            <span className="text-zinc-400 text-[9px] truncate max-w-[160px]">
              {currentIngestFilename}
            </span>
          </div>
          {/* Slim Gold Progress Bar (#F5A623) */}
          <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden border border-[#F5A623]/40">
            <div 
              className="h-full bg-[#F5A623] transition-all duration-150 shadow-[0_0_8px_#F5A623]"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      )}

      {/* Header Bar & Multi-File Trigger Controls */}
      <div className="p-3 bg-[#0c0c10] border-b border-[#272732] shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#fbbf24]" />
            <h2 className="text-xs font-bold text-white tracking-wider uppercase">
              HIGH-SPEED MEDIA VAULT
            </h2>
            <span className="text-[8.5px] px-1.5 py-0.5 bg-[#fbbf24]/20 border border-[#fbbf24]/40 text-[#fbbf24] font-bold rounded-[1px]">
              {vaultItems.length} ASSETS
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Primary Multi-Files Ingest Button */}
            <button
              type="button"
              id="ingest-files-btn"
              onClick={() => fileInputRef.current?.click()}
              onTouchEnd={(e) => {
                e.preventDefault();
                fileInputRef.current?.click();
              }}
              className="px-2.5 py-1 bg-gradient-to-b from-[#1e1e2c] to-[#12121c] hover:from-[#28283a] hover:to-[#181824] active:scale-95 border border-[#d4af37]/60 hover:border-[#fbbf24] text-[#fbbf24] hover:text-white rounded-[2px] text-[9.5px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_8px_rgba(245,166,35,0.15)]"
              title="Ingest multiple 4K videos, images, or audio files"
            >
              <Upload className="w-3 h-3 text-[#F5A623]" />
              <span>INGEST FILES</span>
            </button>

            {/* Folder Drop / Directory Input Button */}
            <button
              type="button"
              id="ingest-folder-btn"
              onClick={() => folderInputRef.current?.click()}
              onTouchEnd={(e) => {
                e.preventDefault();
                folderInputRef.current?.click();
              }}
              className="px-2 py-1 bg-white/5 hover:bg-white/10 active:scale-95 border border-[#272732] text-zinc-300 hover:text-white rounded-[1px] text-[9.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Ingest entire folder of footage"
            >
              <FolderPlus className="w-3 h-3 text-cyan-400" />
              <span>FOLDER</span>
            </button>
          </div>
        </div>

        {/* Search Input & Real-Time Category Filter Chips */}
        <div className="flex flex-col gap-2">
          <div className="relative flex items-center">
            <Search className="w-3 h-3 text-zinc-500 absolute left-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search assets by filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121218] border border-[#272732] rounded-[1px] pl-7 pr-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#fbbf24]"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-zinc-500 hover:text-zinc-200 text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Filter Chips: [ ALL ], [ VIDEO ], [ STILLS ], [ AUDIO ], [ UNASSIGNED ] */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {(['ALL', 'VIDEO', 'STILLS', 'AUDIO', 'UNASSIGNED'] as MediaFilterType[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterType(tab)}
                className={`px-2 py-0.5 text-[8.5px] font-bold cursor-pointer rounded-[1px] transition-all whitespace-nowrap border ${
                  filterType === tab
                    ? 'bg-[#fbbf24] text-black border-[#fbbf24] shadow-[0_0_6px_rgba(251,191,36,0.3)]'
                    : 'bg-[#121218] text-zinc-400 border-[#272732] hover:text-zinc-200 hover:border-zinc-600'
                }`}
              >
                {tab === 'ALL' && 'ALL'}
                {tab === 'VIDEO' && 'VIDEO'}
                {tab === 'STILLS' && 'STILLS'}
                {tab === 'AUDIO' && 'AUDIO'}
                {tab === 'UNASSIGNED' && 'UNASSIGNED'}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-1.5 pl-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[8px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                title="Select all currently filtered assets"
              >
                {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (
                  <CheckSquare className="w-2.5 h-2.5 text-[#fbbf24]" />
                ) : (
                  <Square className="w-2.5 h-2.5 text-zinc-500" />
                )}
                <span>SELECT ALL</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Target Notification Banner: Shows active shot index for quick assignment */}
      <div className="bg-[#0b0c10] border-b border-[#1c1c24] px-3 py-1 flex items-center justify-between text-[9px] text-zinc-400 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
          <span>ACTIVE TARGET:</span>
          <span className="text-[#fbbf24] font-bold">
            SHOT {String((activeShotIndex || 0) + 1).padStart(3, '0')} (12.0s SLIDE)
          </span>
        </div>
        <span className="text-zinc-500 hidden sm:inline">
          TAP CARD OR CLICK + ASSIGN TO SHOT
        </span>
      </div>

      {/* ===================================================================== */}
      {/* 3. BULK ACTIONS BAR (Visible when items are selected)                 */}
      {/* ===================================================================== */}
      {selectedIds.size > 0 && (
        <div className="bg-[#120f06] border-b border-[#F5A623]/60 px-3 py-1.5 flex items-center justify-between shrink-0 animate-in slide-in-from-top duration-150">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#F5A623] text-black text-[8.5px] font-black rounded-[1px]">
              {selectedIds.size} SELECTED
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleBulkAssignToSequence}
              className="px-2 py-0.5 bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-[8.5px] font-bold rounded-[1px] flex items-center gap-1 cursor-pointer transition-colors"
              title="Assign selected media consecutively starting from current shot"
            >
              <Layers className="w-2.5 h-2.5" />
              <span>ASSIGN TO SEQUENCE</span>
            </button>

            <button
              type="button"
              onClick={handleBulkExportMetadata}
              className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-200 text-[8.5px] font-bold rounded-[1px] flex items-center gap-1 cursor-pointer transition-colors"
              title="Export selected assets manifest JSON"
            >
              <Download className="w-2.5 h-2.5 text-cyan-400" />
              <span>EXPORT METADATA</span>
            </button>

            <button
              type="button"
              onClick={handleBulkPurgeSelected}
              className="px-2 py-0.5 bg-red-950/90 hover:bg-red-900 border border-red-500/50 text-red-300 text-[8.5px] font-bold rounded-[1px] flex items-center gap-1 cursor-pointer transition-colors"
              title="Purge selected media from IndexedDB"
            >
              <Trash2 className="w-2.5 h-2.5" />
              <span>PURGE SELECTED</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. ASSET CARDS GRID WITH CARD TELEMETRY BADGES                        */}
      {/* ===================================================================== */}
      <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="h-64 border-2 border-dashed border-[#272732] rounded-[2px] flex flex-col items-center justify-center p-6 text-center">
            <Upload className="w-8 h-8 text-zinc-600 mb-2 animate-bounce" />
            <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              NO ASSETS IN VAULT
            </p>
            <p className="text-[10px] text-zinc-500 max-w-xs mt-1">
              Drag & drop a folder or 10+ 4K video files directly here to start high-speed bulk ingestion into IndexedDB.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onTouchEnd={(e) => {
                e.preventDefault();
                fileInputRef.current?.click();
              }}
              className="mt-3 px-3 py-1.5 bg-gradient-to-b from-[#2a2214] to-[#1a140a] border border-[#d4af37]/60 text-[#fbbf24] text-[10px] font-bold rounded-[2px] hover:from-[#3a301c] hover:to-[#221a0e] active:scale-95 transition-all cursor-pointer shadow-[0_0_12px_rgba(245,166,35,0.25)]"
            >
              INGEST FILES
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredItems.map((item) => {
              const isVid = item.mimeType?.startsWith('video') || /\.(mp4|webm|mov|mkv|ogg|m4v)$/i.test(item.name);
              const isAud = item.mimeType?.startsWith('audio') || /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(item.name);
              const assignedIndex = item.assignedShotIndex !== undefined ? item.assignedShotIndex : item.shotIndex;
              const isAssignedToActive = assignedIndex === activeShotIndex;
              const isSelected = selectedIds.has(item.id);
              const resolution = item.resolution || (isVid ? '4K' : isAud ? 'AUDIO' : 'STILL');
              const duration = formatDuration(item.duration);

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleCardDragStart(e, item)}
                  onClick={() => handleAssignToShot(item)}
                  onTouchEnd={(e) => {
                    if ((e.target as HTMLElement).tagName !== 'BUTTON' && !(e.target as HTMLElement).closest('button')) {
                      handleAssignToShot(item);
                    }
                  }}
                  className={`group relative bg-[#0c0c12] border rounded-[2px] overflow-hidden flex flex-col transition-all duration-150 hover:border-[#fbbf24] cursor-pointer shadow-md ${
                    isSelected ? 'ring-2 ring-[#fbbf24] border-[#fbbf24]' : isAssignedToActive ? 'border-[#fbbf24] ring-1 ring-[#fbbf24]/50' : 'border-[#272732]'
                  }`}
                >
                  {/* Thumbnail Plate (240x135 aspect-video) */}
                  <div className="relative w-full aspect-video bg-[#050508] overflow-hidden flex items-center justify-center">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                        {isVid ? <Video className="w-6 h-6 mb-1 text-cyan-400" /> : isAud ? <Music className="w-6 h-6 mb-1 text-purple-400" /> : <ImageIcon className="w-6 h-6 mb-1 text-[#fbbf24]" />}
                        <span className="text-[8px]">IDB STORED</span>
                      </div>
                    )}

                    {/* Top-Left: Multi-select Checkbox & Type Badge */}
                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1 z-10">
                      <button
                        type="button"
                        onClick={(e) => handleToggleSelect(e, item.id)}
                        className="p-0.5 bg-black/80 hover:bg-black rounded-[1px] border border-white/20 text-white cursor-pointer"
                        title={isSelected ? "Deselect" : "Select"}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3 h-3 text-[#fbbf24]" />
                        ) : (
                          <Square className="w-3 h-3 text-zinc-400 hover:text-white" />
                        )}
                      </button>

                      <span className="px-1 py-0.2 bg-black/80 backdrop-blur-xs text-[7.5px] font-bold text-white rounded-[1px] flex items-center gap-0.5 border border-white/10">
                        {isVid ? <Video className="w-2.5 h-2.5 text-cyan-400" /> : isAud ? <Music className="w-2.5 h-2.5 text-purple-400" /> : <ImageIcon className="w-2.5 h-2.5 text-[#fbbf24]" />}
                        {isVid ? 'VIDEO' : isAud ? 'AUDIO' : 'STILL'}
                      </span>
                    </div>

                    {/* Top-Right: IDB STORED Badge & Delete Button */}
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                      {/* Green IDB STORED Telemetry Badge */}
                      <span className="px-1.5 py-0.2 bg-[#062c1d]/95 text-[7px] font-bold text-emerald-400 border border-emerald-500/50 rounded-[1px] tracking-wider shadow-sm">
                        IDB STORED
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAsset(item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 rounded-[1px] cursor-pointer transition-opacity"
                        title="Delete asset from IndexedDB"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    {/* Bottom-Right Thumbnail Badge: Resolution & Duration */}
                    <div className="absolute bottom-1 right-1 flex items-center gap-1 z-10">
                      <span className="px-1 py-0.2 bg-black/80 text-[7px] font-bold text-amber-300 border border-amber-500/30 rounded-[1px]">
                        {resolution}
                      </span>
                      {isVid && (
                        <span className="px-1 py-0.2 bg-black/80 text-[7px] font-mono text-zinc-300 rounded-[1px]">
                          {duration}
                        </span>
                      )}
                    </div>

                    {/* Hover Play / Preview Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPreview(item);
                      }}
                      className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer shadow-lg"
                      title="Preview Media"
                    >
                      <Play className="w-3.5 h-3.5 text-[#fbbf24] ml-0.5" />
                    </button>
                  </div>

                  {/* Metadata & Status Strip */}
                  <div className="p-2 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[9px] min-w-0">
                      <p className="font-bold text-zinc-100 truncate pr-1" title={item.name}>
                        {item.name}
                      </p>
                      {/* File Size Telemetry Badge */}
                      <span className="text-[8px] text-zinc-300 bg-white/5 px-1 py-0.2 rounded border border-white/10 shrink-0 tabular-nums font-mono">
                        {formatBytes(item.size)}
                      </span>
                    </div>

                    {/* Tactical Status Badges */}
                    <div className="flex items-center justify-between text-[8px] text-zinc-400 border-t border-[#1c1c24] pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-500">MIME:</span>
                        <span className="text-zinc-300 font-bold truncate max-w-[80px]">{item.mimeType}</span>
                      </div>

                      {assignedIndex !== null && assignedIndex !== undefined ? (
                        <span className="text-[#fbbf24] font-bold flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          SH{String(assignedIndex + 1).padStart(3, '0')}
                        </span>
                      ) : (
                        <span className="text-zinc-500">UNASSIGNED</span>
                      )}
                    </div>

                    {/* Single Tap / Click Assign Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAssignToShot(item);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAssignToShot(item);
                      }}
                      className={`w-full py-1.5 px-1.5 rounded-[1px] text-[8.5px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                        isAssignedToActive
                          ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-900'
                          : 'bg-[#181824] hover:bg-[#222232] border border-[#272732] hover:border-[#F5A623] text-[#F5A623]'
                      }`}
                    >
                      <span>
                        {isAssignedToActive 
                          ? `✓ ASSIGNED TO SH${String(activeShotIndex + 1).padStart(3, '0')}`
                          : `+ ASSIGN TO SHOT ${String(activeShotIndex + 1).padStart(3, '0')}`}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* PREVIEW MODAL                                                         */}
      {/* ===================================================================== */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-[#0c0c12] border border-[#272732] rounded-[2px] overflow-hidden shadow-2xl flex flex-col">
            <div className="h-10 px-3 bg-[#08080c] border-b border-[#272732] flex items-center justify-between">
              <span className="text-xs font-bold text-[#fbbf24] truncate">
                {previewItem.title}
              </span>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative w-full aspect-video bg-black flex items-center justify-center">
              {previewItem.isVideo ? (
                <video
                  src={previewItem.url}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={previewItem.url}
                  alt={previewItem.title}
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
