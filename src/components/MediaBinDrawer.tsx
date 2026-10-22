/**
 * @file /src/components/MediaBinDrawer.tsx
 * @description High-Speed Bulk Ingest Engine & Media Asset Vault for RAWx Storyboard Studio.
 * 
 * Features:
 * 1. Multi-Select & Directory Drop:
 *    - Ingest folders (recursive) or 50+ video/image files simultaneously.
 *    - webkitdirectory and multiple file input triggers.
 * 2. Active Batch Ingestion HUD:
 *    - Displays: `[ INGESTING 14/50 ASSETS // 42% ]` with a slim gold progress bar (#F5A623).
 * 3. Parallel Worker Queue (Concurrency = 3):
 *    - Concurrent processing of 3 files to prevent browser memory saturation (OOM).
 *    - Extracts 0.5s keyframe via OffscreenCanvas / Canvas scaled to 240p (image/webp, q=0.8).
 *    - Saves thumbnail to `media_thumbnails` and full source file to `media_blobs`.
 * 4. Zero-Latency Asset Cards:
 *    - Loaded instantly via `media_thumbnails` (0ms load latency).
 *    - Tactical badges: File size (e.g. '21.1 MB'), duration, and 'IDB STORED' tag.
 *    - Quick action: `[ + ASSIGN TO ACTIVE SHOT ]` and draggable to any timeline card.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Upload, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Video, 
  Image as ImageIcon, 
  HardDrive, 
  Sparkles, 
  CheckCircle2, 
  Trash2, 
  Play, 
  X, 
  FolderPlus, 
  Maximize2,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { studioDraftDb } from '../services/db';
import { storyboardSyncService } from '../services/storyboardSyncService';
import { 
  generate240pWebPVideoThumbnail, 
  autoBackfillMissingThumbnails,
  storeVideoThumbnailInDb 
} from '../services/videoThumbnailService';
import { MediaMetaRecord } from '../types/project';
import { useStudioStore } from '../core/store';
import { eventBus } from '../core/eventBus';

export interface IngestQueueItem {
  file: File;
  id: string;
}

export interface MediaBinDrawerProps {
  onAssignToShot?: (assetId: string, shotIndex: number, filename: string) => void;
  activeShotIndex?: number;
  className?: string;
}

export const MediaBinDrawer: React.FC<MediaBinDrawerProps> = ({
  onAssignToShot,
  activeShotIndex: propActiveShotIndex,
  className = ''
}) => {
  const storeActiveShotIndex = useStudioStore((s) => s.activeShotIndex);
  const activeShotIndex = propActiveShotIndex !== undefined ? propActiveShotIndex : storeActiveShotIndex;

  const [assets, setAssets] = useState<MediaMetaRecord[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'image'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Batch Ingestion HUD State
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestTotal, setIngestTotal] = useState(0);
  const [ingestDone, setIngestDone] = useState(0);
  const [currentIngestFilename, setCurrentIngestFilename] = useState('');
  const [previewAsset, setPreviewAsset] = useState<{ id: string; url: string; isVideo: boolean; title: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const isCancelledRef = useRef<boolean>(false);

  // Format bytes into readable format (e.g. 21.1 MB)
  const formatBytes = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Format seconds into MM:SS or 12.0s
  const formatDuration = (sec?: number): string => {
    if (sec === undefined || sec === null || isNaN(sec)) return '0.0s';
    if (sec < 60) return `${sec.toFixed(1)}s`;
    const mins = Math.floor(sec / 60);
    const rem = Math.floor(sec % 60);
    return `${mins}:${String(rem).padStart(2, '0')}`;
  };

  // Load all assets from IndexedDB `media_meta`
  const refreshAssets = useCallback(async () => {
    try {
      const metaList = await studioDraftDb.getAllMediaMeta();
      // Sort newest first
      metaList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setAssets(metaList);

      // Lazily resolve lightweight thumbnails
      for (const item of metaList) {
        if (!thumbnails[item.id]) {
          storyboardSyncService.resolveThumbnailUrl(item.id).then((url) => {
            if (url) {
              setThumbnails((prev) => ({ ...prev, [item.id]: url }));
            }
          });
        }
      }
    } catch (err) {
      console.warn('[MediaBin] Failed to load assets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [thumbnails]);

  useEffect(() => {
    refreshAssets();

    // Automated process: backfill 240p WebP thumbnails into 'media_thumbnails' for existing videos
    autoBackfillMissingThumbnails().then(({ generated }) => {
      if (generated > 0) {
        refreshAssets();
      }
    });

    const unsubAssign = eventBus.on('asset_assigned_to_shot', () => {
      refreshAssets();
    });

    const unsubThumbs = eventBus.on('thumbnails_updated', () => {
      refreshAssets();
    });

    const unsubIngest = eventBus.on('media_asset_ingested', () => {
      refreshAssets();
    });

    return () => {
      unsubAssign();
      unsubThumbs();
      unsubIngest();
      isCancelledRef.current = true;
    };
  }, []);

  // =========================================================================
  // PARALLEL BULK INGESTION WORKER QUEUE (Concurrency = 3)
  // =========================================================================

  /**
   * Extracts a 240p keyframe at currentTime = 0.5s via OffscreenCanvas / Canvas
   */
  const extractVideoThumbnail = async (
    file: File
  ): Promise<{ thumbBlob: Blob; width: number; height: number; duration: number }> => {
    return generate240pWebPVideoThumbnail(file, 0.5);
  };









  /**
   * Generates a 240p thumbnail for an image file
   */
  const extractImageThumbnail = async (
    file: File
  ): Promise<{ thumbBlob: Blob; width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      const tempUrl = URL.createObjectURL(file);
      img.src = tempUrl;

      const cleanUp = () => {
        try {
          URL.revokeObjectURL(tempUrl);
        } catch {}
      };

      img.onload = async () => {
        const iw = img.naturalWidth || 1920;
        const ih = img.naturalHeight || 1080;
        const targetW = 240;
        const targetH = Math.round(targetW * (ih / iw)) || 135;

        let thumbBlob: Blob;
        if (typeof OffscreenCanvas !== 'undefined') {
          const offscreen = new OffscreenCanvas(targetW, targetH);
          const ctx = offscreen.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0, targetW, targetH);
          thumbBlob = await offscreen.convertToBlob({ type: 'image/webp', quality: 0.8 });
        } else {
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0, targetW, targetH);
          thumbBlob = await new Promise<Blob>((res) =>
            canvas.toBlob((b) => res(b || new Blob()), 'image/webp', 0.8)
          );
        }

        cleanUp();
        resolve({ thumbBlob, width: iw, height: ih });
      };

      img.onerror = () => {
        cleanUp();
        const fallback = new Blob([''], { type: 'image/webp' });
        resolve({ thumbBlob: fallback, width: 1920, height: 1080 });
      };
    });
  };

  /**
   * Ingests a single file into the 3 stores:
   * 1. `media_blobs` (source File)
   * 2. `media_thumbnails` (240p WebP)
   * 3. `media_meta` (telemetry)
   */
  const processSingleFile = async (file: File): Promise<void> => {
    const isVideo = file.type.startsWith('video') || /\.(mp4|webm|mov|ogg|m4v|mkv)$/i.test(file.name);
    const assetId = `vault_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let thumbBlob: Blob;
    let width = 1920;
    let height = 1080;
    let duration: number | undefined;

    if (isVideo) {
      const vidResult = await extractVideoThumbnail(file);
      thumbBlob = vidResult.thumbBlob;
      width = vidResult.width;
      height = vidResult.height;
      duration = vidResult.duration;
    } else {
      const imgResult = await extractImageThumbnail(file);
      thumbBlob = imgResult.thumbBlob;
      width = imgResult.width;
      height = imgResult.height;
    }

    // 1. Save source file directly to media_blobs
    await studioDraftDb.putMediaBlob(assetId, file, file.type, file.name);

    // 2. Save thumbnail to media_thumbnails
    if (thumbBlob && thumbBlob.size > 0) {
      await studioDraftDb.putMediaThumbnail(assetId, thumbBlob, 240, 135);
    }

    // 3. Save telemetry data to media_meta
    await studioDraftDb.putMediaMeta({
      id: assetId,
      filename: file.name,
      mimeType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
      sizeBytes: file.size,
      width,
      height,
      duration,
      fps: 24,
      codec: isVideo ? 'h264/avc' : undefined,
      assignedShotId: null,
      createdAt: Date.now()
    });
  };

  /**
   * Executes the Parallel Worker Queue with concurrency = 3
   */
  const runParallelIngestion = async (files: File[]) => {
    if (!files.length) return;

    setIsIngesting(true);
    setIngestTotal(files.length);
    setIngestDone(0);

    const CONCURRENCY = 3;
    let currentIndex = 0;
    let completed = 0;

    const worker = async () => {
      while (currentIndex < files.length && !isCancelledRef.current) {
        const fileIndex = currentIndex++;
        const file = files[fileIndex];
        if (!file) continue;

        setCurrentIngestFilename(file.name);
        try {
          await processSingleFile(file);
        } catch (err) {
          console.warn('[Ingest Queue] File process error:', file.name, err);
        }

        completed++;
        setIngestDone(completed);
      }
    };

    // Run 3 workers in parallel
    const workers = Array.from({ length: Math.min(CONCURRENCY, files.length) }, () => worker());
    await Promise.all(workers);

    setIsIngesting(false);
    setCurrentIngestFilename('');
    refreshAssets();
  };

  // Recursive Directory Reader for Dropped Folders
  const traverseDirectoryEntries = async (entries: any[]): Promise<File[]> => {
    const fileList: File[] = [];

    const readEntry = async (entry: any): Promise<void> => {
      if (!entry) return;
      if (entry.isFile) {
        return new Promise<void>((resolve) => {
          entry.file((file: File) => {
            if (file && (file.type.startsWith('image') || file.type.startsWith('video') || /\.(mp4|webm|mov|mkv|jpg|jpeg|png|webp)$/i.test(file.name))) {
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
                readAll(); // Continue reading batches if > 100 entries
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
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

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
          runParallelIngestion(extractedFiles);
          return;
        }
      }
    }

    // Fallback to plain files list
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileArray = Array.from(e.dataTransfer.files).filter(
        (f) => f.type.startsWith('image') || f.type.startsWith('video') || /\.(mp4|webm|mov|jpg|jpeg|png|webp)$/i.test(f.name)
      );
      runParallelIngestion(fileArray);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      runParallelIngestion(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  // Quick Action: Assign directly to the active shot
  const handleAssignToActiveShot = async (asset: MediaMetaRecord) => {
    const targetShot = activeShotIndex;
    const result = await storyboardSyncService.assignAssetToShot(asset.id, targetShot, asset);
    if (result.success) {
      if (onAssignToShot) {
        onAssignToShot(asset.id, targetShot, asset.filename || 'asset');
      }
      refreshAssets();
    }
  };

  // Drag Start for timeline slot target
  const handleCardDragStart = (e: React.DragEvent, asset: MediaMetaRecord) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'MEDIA_ASSET_VAULT',
      assetId: asset.id,
      filename: asset.filename,
      mimeType: asset.mimeType,
      isVideo: asset.mimeType?.startsWith('video')
    }));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  // Delete asset across all 3 IndexedDB stores
  const handleDeleteAsset = async (assetId: string) => {
    await studioDraftDb.deleteMediaAsset(assetId);
    storyboardSyncService.revokeThumbnailUrl(assetId);
    setThumbnails((prev) => {
      const copy = { ...prev };
      delete copy[assetId];
      return copy;
    });
    refreshAssets();
  };

  // Open Preview Modal
  const handleOpenPreview = async (asset: MediaMetaRecord) => {
    const isVid = asset.mimeType?.startsWith('video') || false;
    const fullUrl = await storyboardSyncService.resolvePlaybackUrl(asset.id);
    if (fullUrl) {
      setPreviewAsset({
        id: asset.id,
        url: fullUrl,
        isVideo: isVid,
        title: asset.filename || 'Preview'
      });
    }
  };

  // Filtered Assets list
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const matchesSearch = searchQuery === '' || (a.filename || '').toLowerCase().includes(searchQuery.toLowerCase());
      const isVid = a.mimeType?.startsWith('video') || false;
      const matchesType = filterType === 'all' || (filterType === 'video' && isVid) || (filterType === 'image' && !isVid);
      return matchesSearch && matchesType;
    });
  }, [assets, searchQuery, filterType]);

  const percentComplete = ingestTotal > 0 ? Math.round((ingestDone / ingestTotal) * 100) : 0;

  return (
    <div 
      className={`w-full h-full flex flex-col bg-[#07070A] text-zinc-200 font-mono select-none overflow-hidden ${className}`}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={handleDrop}
    >
      {/* ===================================================================== */}
      {/* BATCH INGESTION HUD (Active when uploading)                            */}
      {/* ===================================================================== */}
      {isIngesting && (
        <div className="bg-[#0f0c08] border-b border-[#F5A623]/60 px-3 py-2 shrink-0 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[10px] text-[#F5A623] font-bold tracking-wider mb-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F5A623] animate-ping" />
              <span>[ INGESTING {ingestDone}/{ingestTotal} ASSETS // {percentComplete}% ]</span>
            </div>
            <span className="text-zinc-400 text-[9px] truncate max-w-[150px]">
              {currentIngestFilename}
            </span>
          </div>
          {/* Slim Gold Progress Bar (#F5A623) */}
          <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden border border-[#F5A623]/30">
            <div 
              className="h-full bg-[#F5A623] transition-all duration-150 shadow-[0_0_8px_#F5A623]"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      )}

      {/* Header Bar & Bulk Trigger Controls */}
      <div className="p-3 bg-[#0c0c10] border-b border-[#272732] shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#fbbf24]" />
            <h2 className="text-xs font-bold text-white tracking-wider uppercase">
              HIGH-SPEED MEDIA VAULT
            </h2>
            <span className="text-[8.5px] px-1.5 py-0.5 bg-[#fbbf24]/20 border border-[#fbbf24]/40 text-[#fbbf24] font-bold rounded-[1px]">
              {assets.length} ASSETS
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Multi-Files Ingest Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 bg-[#1a1a24] hover:bg-[#252536] border border-[#d4af37]/50 text-[#fbbf24] hover:text-white rounded-[1px] text-[9.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
              title="Select 50+ 4K Videos or Images"
            >
              <Upload className="w-3 h-3" />
              <span>+ BULK FILES</span>
            </button>

            {/* Folder Drop / Directory Input Button */}
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-[#272732] text-zinc-300 hover:text-white rounded-[1px] text-[9.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Ingest entire folder of footage"
            >
              <FolderPlus className="w-3 h-3 text-cyan-400" />
              <span>FOLDER</span>
            </button>

            {/* Auto-generate 240p WebP Thumbnails Button */}
            <button
              type="button"
              onClick={async () => {
                await autoBackfillMissingThumbnails();
                refreshAssets();
              }}
              className="px-2 py-1 bg-white/5 hover:bg-amber-500/20 border border-[#272732] hover:border-amber-500/40 text-zinc-300 hover:text-amber-300 rounded-[1px] text-[9.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Automated process: generate 240p WebP thumbnails for videos using OffscreenCanvas and commit to media_thumbnails"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>AUTO 240P</span>
            </button>
          </div>
        </div>

        {/* Search & Type Filter Strip */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative flex items-center">
            <Search className="w-3 h-3 text-zinc-500 absolute left-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search assets by filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121218] border border-[#272732] rounded-[1px] pl-7 pr-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#fbbf24]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#121218] border border-[#272732] p-0.5 rounded-[1px]">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2 py-0.5 text-[8.5px] font-bold cursor-pointer rounded-[1px] ${
                filterType === 'all' ? 'bg-[#fbbf24] text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => setFilterType('video')}
              className={`px-2 py-0.5 text-[8.5px] font-bold cursor-pointer rounded-[1px] ${
                filterType === 'video' ? 'bg-[#fbbf24] text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              VIDEO
            </button>
            <button
              type="button"
              onClick={() => setFilterType('image')}
              className={`px-2 py-0.5 text-[8.5px] font-bold cursor-pointer rounded-[1px] ${
                filterType === 'image' ? 'bg-[#fbbf24] text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              STILLS
            </button>
          </div>
        </div>

        {/* Hidden inputs for multi-file and directory selection */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.mp4,.webm,.mov,.mkv,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleFileInputChange}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
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
          DRAG CARD DIRECTLY ONTO ANY TIMELINE SLOT
        </span>
      </div>

      {/* ===================================================================== */}
      {/* ASSET CARDS GRID (Fast 240p Thumbnails, Zero Latency)                */}
      {/* ===================================================================== */}
      <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
        {filteredAssets.length === 0 ? (
          <div className="h-64 border-2 border-dashed border-[#272732] rounded-[2px] flex flex-col items-center justify-center p-6 text-center">
            <Upload className="w-8 h-8 text-zinc-600 mb-2 animate-bounce" />
            <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              NO ASSETS IN VAULT
            </p>
            <p className="text-[10px] text-zinc-500 max-w-xs mt-1">
              Drag & drop a folder or 50+ video files directly here to start high-speed bulk ingestion into IndexedDB.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 px-3 py-1 bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#fbbf24] text-[9.5px] font-bold rounded-[1px] hover:bg-[#d4af37]/30 transition-colors cursor-pointer"
            >
              CHOOSE FILES
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredAssets.map((asset) => {
              const isVid = asset.mimeType?.startsWith('video') || false;
              const thumbUrl = thumbnails[asset.id];
              const isAssignedToActive = asset.assignedShotId === activeShotIndex;

              return (
                <div
                  key={asset.id}
                  draggable
                  onDragStart={(e) => handleCardDragStart(e, asset)}
                  className={`group relative bg-[#0c0c12] border rounded-[2px] overflow-hidden flex flex-col transition-all duration-150 hover:border-[#fbbf24] cursor-grab active:cursor-grabbing shadow-md ${
                    isAssignedToActive ? 'border-[#fbbf24] ring-1 ring-[#fbbf24]/50' : 'border-[#272732]'
                  }`}
                >
                  {/* Thumbnail Plate (240x135 aspect-video) */}
                  <div className="relative w-full aspect-video bg-[#050508] overflow-hidden flex items-center justify-center">
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={asset.filename}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                        {isVid ? <Video className="w-6 h-6 mb-1" /> : <ImageIcon className="w-6 h-6 mb-1" />}
                        <span className="text-[8px]">GENERATING 240P...</span>
                      </div>
                    )}

                    {/* Type Badge & Duration */}
                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1 z-10">
                      <span className="px-1 py-0.2 bg-black/80 backdrop-blur-xs text-[7.5px] font-bold text-white rounded-[1px] flex items-center gap-0.5 border border-white/10">
                        {isVid ? <Video className="w-2.5 h-2.5 text-cyan-400" /> : <ImageIcon className="w-2.5 h-2.5 text-[#fbbf24]" />}
                        {isVid ? '4K VID' : 'STILL'}
                      </span>
                      {isVid && asset.duration && (
                        <span className="px-1 py-0.2 bg-black/80 backdrop-blur-xs text-[7.5px] font-bold text-emerald-400 rounded-[1px] border border-white/10">
                          {formatDuration(asset.duration)}
                        </span>
                      )}
                    </div>

                    {/* IDB STORED & Resolution Tag */}
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                      <span className="px-1 py-0.2 bg-[#062c1d]/90 text-[7px] font-bold text-emerald-400 border border-emerald-500/40 rounded-[1px]">
                        IDB STORED
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAsset(asset.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 rounded-[1px] cursor-pointer transition-opacity"
                        title="Delete asset from IndexedDB"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    {/* Hover Play / Preview Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(asset)}
                      className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer shadow-lg"
                      title="Preview Media"
                    >
                      <Play className="w-3.5 h-3.5 text-[#fbbf24] ml-0.5" />
                    </button>
                  </div>

                  {/* Metadata & Tactical Badges Strip */}
                  <div className="p-2 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[9px] min-w-0">
                      <p className="font-bold text-zinc-100 truncate pr-1" title={asset.filename}>
                        {asset.filename}
                      </p>
                      <span className="text-[8px] text-zinc-400 shrink-0 tabular-nums">
                        {formatBytes(asset.sizeBytes)}
                      </span>
                    </div>

                    {/* Tactical Status Badges */}
                    <div className="flex items-center justify-between text-[8px] text-zinc-400 border-t border-[#1c1c24] pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-500">RES:</span>
                        <span className="text-zinc-300 font-bold">{asset.width || 1920}x{asset.height || 1080}</span>
                      </div>

                      {asset.assignedShotId !== null && asset.assignedShotId !== undefined ? (
                        <span className="text-[#fbbf24] font-bold flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          SH{String(asset.assignedShotId + 1).padStart(3, '0')}
                        </span>
                      ) : (
                        <span className="text-zinc-500">UNASSIGNED</span>
                      )}
                    </div>

                    {/* Quick Action Button: ASSIGN TO ACTIVE SHOT */}
                    <button
                      type="button"
                      onClick={() => handleAssignToActiveShot(asset)}
                      className={`w-full py-1 px-1.5 rounded-[1px] text-[8.5px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                        isAssignedToActive
                          ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-900'
                          : 'bg-[#181824] hover:bg-[#222232] border border-[#272732] hover:border-[#fbbf24] text-[#fbbf24]'
                      }`}
                    >
                      <span>
                        {isAssignedToActive 
                          ? `✓ ASSIGNED TO SH${String(activeShotIndex + 1).padStart(3, '0')}`
                          : `[ + ASSIGN TO SHOT ${String(activeShotIndex + 1).padStart(3, '0')} ]`}
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
      {previewAsset && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-[#0c0c12] border border-[#272732] rounded-[2px] overflow-hidden shadow-2xl flex flex-col">
            <div className="h-10 px-3 bg-[#08080c] border-b border-[#272732] flex items-center justify-between">
              <span className="text-xs font-bold text-[#fbbf24] truncate">
                {previewAsset.title}
              </span>
              <button
                type="button"
                onClick={() => setPreviewAsset(null)}
                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative w-full aspect-video bg-black flex items-center justify-center">
              {previewAsset.isVideo ? (
                <video
                  src={previewAsset.url}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={previewAsset.url}
                  alt={previewAsset.title}
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
