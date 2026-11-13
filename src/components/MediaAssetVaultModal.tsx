/**
 * @file /src/components/MediaAssetVaultModal.tsx
 * @description Glassmorphic Media Asset Vault Drawer/Modal accessible directly from
 * the bottom toolbar MEDIA trigger. Browses both IndexedDB master assets and OPFS
 * media_vault files, provides live hover video preview, storage meter, batch file/folder
 * ingestion, and 1-click [ASSIGN TO ACTIVE SHOT], [APPEND TO TIMELINE], [DELETE].
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  HardDrive,
  X,
  Search,
  Upload,
  FolderUp,
  Film,
  Image as ImageIcon,
  Music,
  Trash2,
  PlusSquare,
  CheckCircle2,
  FolderOpen,
  Sparkles
} from 'lucide-react';
import { studioDraftDb, VaultMediaItem } from '../services/db';
import { opfsMediaStorage } from '../services/media/opfsMediaStorage';
import { saveShotMediaBlob, getShotMediaKey } from '../services/handfilmMediaVault';
import { useStudioStore } from '../core/store';
import { eventBus } from '../core/eventBus';
import { AnthologyFrame } from '../types/anthology';
import { GeminiFlowStudio } from './media/GeminiFlowStudio';

type VaultFilterType = 'ALL' | 'VIDEO' | 'IMAGE' | 'AUDIO';
type VaultModalMode = 'VAULT' | 'AI_STUDIO';

interface UnifiedVaultAsset {
  id: string;
  source: 'IDB' | 'OPFS';
  name: string;
  mimeType: string;
  kind: 'VIDEO' | 'IMAGE' | 'AUDIO';
  size: number;
  blob: Blob;
  previewUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  resolution?: string;
  createdAt: number;
  assignedShotIndex?: number;
}

export interface MediaAssetVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentIndex: number;
  currentFrame?: AnthologyFrame | null;
  onAssignToActiveShot?: (blob: Blob, name: string, mimeType: string) => Promise<void> | void;
}

function classifyMime(mime: string, name: string): 'VIDEO' | 'IMAGE' | 'AUDIO' {
  const m = (mime || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (m.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|avi)$/i.test(n)) return 'VIDEO';
  if (m.startsWith('audio/') || /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(n)) return 'AUDIO';
  return 'IMAGE';
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let val = bytes;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx += 1;
  }
  return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export const MediaAssetVaultModal: React.FC<MediaAssetVaultModalProps> = ({
  isOpen,
  onClose,
  currentIndex,
  currentFrame,
  onAssignToActiveShot
}) => {
  const [vaultMode, setVaultMode] = useState<VaultModalMode>('VAULT');
  const [assets, setAssets] = useState<UnifiedVaultAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<VaultFilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [hoveredAssetId, setHoveredAssetId] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState<{ usedBytes: number; quotaBytes: number; percent: number }>({
    usedBytes: 0,
    quotaBytes: 1024 * 1024 * 1024,
    percent: 0
  });
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const opfsObjectUrlsRef = useRef<string[]>([]);

  const showToast = useCallback((msg: string) => {
    setStatusNotice(msg);
    window.setTimeout(() => {
      setStatusNotice((cur) => (cur === msg ? null : cur));
    }, 2800);
  }, []);

  const revokeOpfsUrls = useCallback(() => {
    for (const url of opfsObjectUrlsRef.current) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
    opfsObjectUrlsRef.current = [];
  }, []);

  const loadVaultAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const [idbItems, quota] = await Promise.all([
        studioDraftDb.getMasterVaultMedia().catch(() => [] as VaultMediaItem[]),
        studioDraftDb.getStorageEstimate().catch(() => ({ usedBytes: 0, quotaBytes: 1024 * 1024 * 1024, percent: 0 }))
      ]);

      setStorageInfo({
        usedBytes: quota.usedBytes || 0,
        quotaBytes: quota.quotaBytes || 1024 * 1024 * 1024,
        percent: quota.percent || 0
      });

      const unified: UnifiedVaultAsset[] = [];
      const seenNames = new Set<string>();

      for (const item of idbItems) {
        if (!item?.blob) continue;
        const previewUrl = studioDraftDb.getActiveMediaUrl(item.id, item.blob) || item.thumbnailUrl || '';
        const kind = classifyMime(item.mimeType, item.name);
        seenNames.add(`${item.name}_${item.size}`);
        unified.push({
          id: item.id,
          source: 'IDB',
          name: item.name,
          mimeType: item.mimeType || item.blob.type || 'application/octet-stream',
          kind,
          size: item.size || item.blob.size,
          blob: item.blob,
          previewUrl,
          thumbnailUrl: item.thumbnailUrl,
          duration: item.duration,
          resolution: item.resolution,
          createdAt: item.createdAt || Date.now(),
          assignedShotIndex: item.assignedShotIndex
        });
      }

      revokeOpfsUrls();
      try {
        const root = await opfsMediaStorage.getRootDirectory();
        if (root) {
          const vaultDir = await root.getDirectoryHandle('media_vault', { create: false }).catch(() => null);
          if (vaultDir) {
            for await (const [entryName, handle] of (vaultDir as any).entries()) {
              if (handle?.kind !== 'file') continue;
              const file: File = await handle.getFile();
              const dedupeKey = `${entryName}_${file.size}`;
              if (seenNames.has(dedupeKey)) continue;
              const url = URL.createObjectURL(file);
              opfsObjectUrlsRef.current.push(url);
              unified.push({
                id: `opfs:${entryName}`,
                source: 'OPFS',
                name: entryName,
                mimeType: file.type || 'application/octet-stream',
                kind: classifyMime(file.type, entryName),
                size: file.size,
                blob: file,
                previewUrl: url,
                createdAt: file.lastModified || Date.now()
              });
            }
          }
        }
      } catch {
        // Ignore OPFS read issues gracefully
      }

      unified.sort((a, b) => b.createdAt - a.createdAt);
      setAssets(unified);
    } finally {
      setIsLoading(false);
    }
  }, [revokeOpfsUrls]);

  useEffect(() => {
    if (!isOpen) return;
    void loadVaultAssets();
    const unsubVaultUpdate = eventBus.on('media:vault_updated', () => {
      void loadVaultAssets();
    });
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      unsubVaultUpdate();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, loadVaultAssets, onClose]);

  useEffect(() => {
    return () => {
      revokeOpfsUrls();
    };
  }, [revokeOpfsUrls]);

  const handleIngestFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) =>
      /\.(mp4|webm|mov|m4v|mkv|png|jpe?g|webp|gif|mp3|wav|ogg|aac|flac|m4a)$/i.test(f.name) ||
      f.type.startsWith('video/') ||
      f.type.startsWith('image/') ||
      f.type.startsWith('audio/')
    );
    if (validFiles.length === 0) {
      showToast('NO SUPPORTED MEDIA FILES FOUND');
      return;
    }

    setIsLoading(true);
    try {
      for (const file of validFiles) {
        await studioDraftDb.saveMediaToVault(file).catch(() => null);
        // Also mirror into OPFS media_vault if OPFS is available
        try {
          const root = await opfsMediaStorage.getRootDirectory();
          if (root) {
            const vaultDir = await root.getDirectoryHandle('media_vault', { create: true });
            const fh = await vaultDir.getFileHandle(file.name, { create: true });
            const writable = await fh.createWritable();
            await writable.write(file);
            await writable.close();
          }
        } catch {}
      }
      await loadVaultAssets();
      showToast(`INGESTED ${validFiles.length} ${validFiles.length === 1 ? 'ASSET' : 'ASSETS'} INTO VAULT`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignActive = async (asset: UnifiedVaultAsset) => {
    const file = asset.blob instanceof File ? asset.blob : new File([asset.blob], asset.name, { type: asset.mimeType });
    if (onAssignToActiveShot) {
      await onAssignToActiveShot(file, asset.name, asset.mimeType);
    } else {
      const shotKey = getShotMediaKey(currentFrame, currentIndex);
      const entry = await saveShotMediaBlob(shotKey, file, asset.name);
      useStudioStore.getState().setShotMediaEntry(shotKey, entry);
    }
    if (asset.source === 'IDB') {
      await studioDraftDb.assignMediaToShot(asset.id, currentIndex).catch(() => {});
    }
    showToast(`ASSIGNED "${asset.name}" → SHOT #${String(currentIndex + 1).padStart(2, '0')}`);
    onClose();
  };

  const handleAppendTimeline = async (asset: UnifiedVaultAsset) => {
    eventBus.emit('media:append_to_timeline', {
      name: asset.name,
      mimeType: asset.mimeType,
      blob: asset.blob,
      durationSec: asset.duration || 12.0
    });
    showToast(`APPENDED "${asset.name}" TO TIMELINE`);
  };

  const handleDeleteAsset = async (asset: UnifiedVaultAsset) => {
    if (asset.source === 'IDB') {
      await studioDraftDb.deleteVaultMedia(asset.id).catch(() => {});
    } else if (asset.source === 'OPFS') {
      try {
        const root = await opfsMediaStorage.getRootDirectory();
        const vaultDir = await root?.getDirectoryHandle('media_vault', { create: false }).catch(() => null);
        await vaultDir?.removeEntry(asset.name);
      } catch {}
    }
    setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    showToast(`DELETED "${asset.name}"`);
  };

  const filteredAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return assets.filter((a) => {
      if (filter !== 'ALL' && a.kind !== filter) return false;
      if (q && !a.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [assets, filter, searchQuery]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      data-testid="media-asset-vault-modal"
      className="fixed inset-0 z-[9995] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files?.length) {
            void handleIngestFiles(e.dataTransfer.files);
          }
        }}
        className={`w-full max-w-5xl max-h-[88vh] bg-[#0B0B0D]/96 border rounded-xl shadow-[0_28px_90px_rgba(0,0,0,0.96)] flex flex-col overflow-hidden font-mono text-[#F4F4F5] animate-modal-slide-up transition-colors ${
          isDragOver ? 'border-[#F59E0B] ring-2 ring-[#F59E0B]/40' : 'border-white/[0.1]'
        }`}
      >
        {/* Header Bar */}
        <div className="px-4 py-3 border-b border-white/[0.08] bg-[#111216]/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/45 flex items-center justify-center text-[#F59E0B]">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold tracking-[0.14em] uppercase text-[#F4F4F5]">
                MEDIA ASSET VAULT <span className="text-[#F59E0B]">// OPFS + INDEXEDDB</span>
              </h2>
              <p className="text-[10px] text-[#8E8E93] tabular-nums">
                Active Target: SHOT #{String(currentIndex + 1).padStart(2, '0')} · {assets.length} Stored Assets
              </p>
            </div>
          </div>

          {/* Storage Meter + Ingestion + Close */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex flex-col items-end gap-1 px-2.5 py-1 rounded bg-[#141417] border border-white/[0.07] tabular-nums">
              <div className="flex items-center gap-2 text-[9px] text-[#8E8E93]">
                <span>VAULT QUOTA</span>
                <span className="text-[#F59E0B] font-bold">
                  {formatBytes(storageInfo.usedBytes)} / {formatBytes(storageInfo.quotaBytes)}
                </span>
              </div>
              <div className="w-36 h-1 rounded-full bg-[#0B0B0D] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#F59E0B] to-[#38BDF8]"
                  style={{ width: `${Math.max(3, Math.min(100, storageInfo.percent || 4))}%` }}
                />
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*,image/*,audio/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) void handleIngestFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error webkitdirectory is supported in Chromium/WebView2
              webkitdirectory=""
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) void handleIngestFiles(e.target.files);
                e.target.value = '';
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-7 px-2.5 rounded bg-[#F59E0B] hover:bg-[#FBBF24] text-[#0B0B0D] text-[10px] font-black tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>ADD FILES</span>
            </button>

            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="h-7 px-2.5 rounded bg-[#141417] hover:bg-[#1B1B22] border border-white/[0.1] hover:border-[#F59E0B]/60 text-[#F4F4F5] text-[10px] font-bold tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <FolderUp className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span className="hidden sm:inline">ADD FOLDER</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Media Asset Vault"
              className="w-7 h-7 rounded bg-[#141417] hover:bg-white/10 border border-white/[0.08] text-[#8E8E93] hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Prominent Top Segmented Mode Switcher */}
        <div className="px-4 py-2 border-b border-white/[0.08] bg-[#0E0F13] flex items-center justify-between gap-3 shrink-0">
          <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-[#141417] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setVaultMode('VAULT')}
              className={`h-7 px-3 rounded-md text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 cursor-pointer transition-all ${
                vaultMode === 'VAULT'
                  ? 'bg-[#F59E0B] text-[#0B0B0D] shadow-[0_0_16px_rgba(245,158,11,0.28)]'
                  : 'text-[#8E8E93] hover:text-[#F4F4F5]'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>PROJECT VAULT</span>
            </button>
            <button
              type="button"
              onClick={() => setVaultMode('AI_STUDIO')}
              className={`h-7 px-3 rounded-md text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 cursor-pointer transition-all ${
                vaultMode === 'AI_STUDIO'
                  ? 'bg-gradient-to-r from-[#F59E0B] to-[#38BDF8] text-[#0B0B0D] shadow-[0_0_18px_rgba(56,189,248,0.28)]'
                  : 'text-[#8E8E93] hover:text-[#F4F4F5]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>✨ GEMINI &amp; GOOGLE FLOW AI</span>
            </button>
          </div>
          <span className="hidden sm:inline text-[9.5px] text-[#8E8E93] tabular-nums">
            {vaultMode === 'AI_STUDIO'
              ? 'Server-Proxied Imagen / Flow 24fps Studio'
              : `${filteredAssets.length} Local Vault Items`}
          </span>
        </div>

        {vaultMode === 'AI_STUDIO' ? (
          <div className="flex-1 min-h-0 overflow-hidden">
            <GeminiFlowStudio
              activeShotIndex={currentIndex}
              currentFrame={currentFrame}
              onPushToActiveShot={onAssignToActiveShot}
              onVaultAssetSaved={() => {
                void loadVaultAssets();
              }}
            />
          </div>
        ) : (
          <>
            {/* Filter & Search Toolbar */}
            <div className="px-4 py-2 border-b border-white/[0.07] bg-[#0B0B0D]/90 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1">
                {(['ALL', 'VIDEO', 'IMAGE', 'AUDIO'] as VaultFilterType[]).map((tab) => {
                  const isAct = filter === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setFilter(tab)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-colors border ${
                        isAct
                          ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#F59E0B]'
                          : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5]'
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 flex-1 max-w-xs h-7 px-2.5 rounded bg-[#141417] border border-white/[0.08] focus-within:border-[#F59E0B]/70">
                <Search className="w-3.5 h-3.5 text-[#8E8E93]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter vault assets..."
                  className="w-full bg-transparent text-[10.5px] text-[#F4F4F5] placeholder:text-[#8E8E93] focus:outline-none"
                />
              </div>
            </div>

            {/* Status Notice Banner */}
            {statusNotice && (
              <div className="px-4 py-1.5 bg-[#F59E0B]/15 border-b border-[#F59E0B]/40 text-[10px] font-bold text-[#F59E0B] flex items-center gap-1.5 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{statusNotice}</span>
              </div>
            )}

            {/* Asset Grid Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="py-16 text-center text-xs text-[#8E8E93]">SCANNING OPFS &amp; INDEXEDDB VAULT...</div>
              ) : filteredAssets.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/[0.12] hover:border-[#F59E0B]/60 rounded-xl p-10 text-center cursor-pointer transition-colors space-y-2"
                >
                  <FolderOpen className="w-8 h-8 text-[#F59E0B] mx-auto opacity-80" />
                  <div className="text-xs font-bold text-[#F4F4F5]">DROP VIDEO, IMAGE, OR AUDIO FILES HERE</div>
                  <div className="text-[10px] text-[#8E8E93]">
                    Or click ADD FILES / ADD FOLDER above to store persistent local media in OPFS &amp; IndexedDB
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredAssets.map((asset) => {
                    const isHover = hoveredAssetId === asset.id;
                    return (
                      <div
                        key={asset.id}
                        onMouseEnter={() => setHoveredAssetId(asset.id)}
                        onMouseLeave={() => setHoveredAssetId((cur) => (cur === asset.id ? null : cur))}
                        className="rounded-lg bg-[#141417] border border-white/[0.08] hover:border-[#F59E0B]/55 overflow-hidden flex flex-col transition-all"
                      >
                        {/* Preview Viewport with Live Hover Video */}
                        <div className="relative aspect-video bg-[#08090C] overflow-hidden">
                          {asset.kind === 'VIDEO' && isHover ? (
                            <video
                              src={asset.previewUrl}
                              muted
                              loop
                              autoPlay
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : asset.kind === 'IMAGE' ? (
                            <img
                              src={asset.previewUrl || asset.thumbnailUrl}
                              alt={asset.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : asset.thumbnailUrl ? (
                            <img
                              src={asset.thumbnailUrl}
                              alt={asset.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#8E8E93]">
                              {asset.kind === 'VIDEO' ? (
                                <Film className="w-8 h-8 text-[#38BDF8]" />
                              ) : asset.kind === 'AUDIO' ? (
                                <Music className="w-8 h-8 text-[#A855F7]" />
                              ) : (
                                <ImageIcon className="w-8 h-8 text-[#F59E0B]" />
                              )}
                            </div>
                          )}

                          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 border border-white/10 text-[8.5px] font-bold text-[#F59E0B]">
                            {asset.kind} · {asset.source}
                          </div>
                          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 border border-white/10 text-[8.5px] tabular-nums text-[#F4F4F5]">
                            {formatBytes(asset.size)}
                          </div>
                        </div>

                        {/* Metadata + Action Buttons */}
                        <div className="p-2.5 flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-[#F4F4F5] truncate" title={asset.name}>
                              {asset.name}
                            </span>
                            {typeof asset.duration === 'number' && (
                              <span className="text-[9px] text-[#8E8E93] tabular-nums shrink-0">
                                {asset.duration.toFixed(1)}s
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => void handleAssignActive(asset)}
                              className="flex-1 py-1 px-1.5 rounded bg-[#F59E0B]/15 hover:bg-[#F59E0B] text-[#F59E0B] hover:text-[#0B0B0D] border border-[#F59E0B]/50 text-[9px] font-black tracking-wider cursor-pointer transition-colors truncate"
                            >
                              ASSIGN TO ACTIVE SHOT
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleAppendTimeline(asset)}
                              title="Append as new shot on timeline"
                              className="p-1.5 rounded bg-[#0B0B0D] hover:bg-[#38BDF8]/20 border border-white/[0.08] hover:border-[#38BDF8]/60 text-[#38BDF8] cursor-pointer transition-colors"
                            >
                              <PlusSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteAsset(asset)}
                              title="Delete asset from vault"
                              className="p-1.5 rounded bg-[#0B0B0D] hover:bg-red-500/20 border border-white/[0.08] hover:border-red-500/60 text-[#8E8E93] hover:text-red-400 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
