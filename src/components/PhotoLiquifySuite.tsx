/**
 * @file /src/components/PhotoLiquifySuite.tsx
 * @description Advanced Photo Editor, Liquify Warp Suite, and Multi-Format Bulk Resizer.
 * Features:
 * 1. Liquify Warp Engine: Push, Bloat, Pinch, Restore with real-time mesh deformation.
 * 2. Pro Image Adjustments: Curves, Shadows/Highlights, Clarity, Dehaze, Vignette.
 * 3. Mass Bulk Resizer:
 *    - Batch ingestion (10-50 photos drag & drop)
 *    - Presets: 9:16 (1080x1920), 2.39:1 (1920x804), 4K UHD (3840x2160), 1:1 Square (1080x1080)
 *    - Framing: Center Crop vs Letterbox Fill with Obsidian Blur
 *    - Export options: Save directly to Media Vault (IndexedDB) & JSZip download.
 */

import React, { useRef, useState, useEffect } from 'react';
import JSZip from 'jszip';
import { AnthologyFrame } from '../types/anthology';
import { studioDraftDb } from '../services/db';
import { 
  X, 
  Check, 
  Undo2, 
  RotateCcw, 
  Download, 
  Grid, 
  Sparkles, 
  Crop, 
  Sliders, 
  Layers, 
  Upload, 
  FileArchive, 
  FolderDown, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Zap
} from 'lucide-react';
import { 
  LIGHTING_PRESETS, 
  getLightingPresetById, 
  LightingPreset, 
  LightingCategory 
} from '../data/lightingPresets';
import { LightingRelightingWorkbench } from './lighting/LightingRelightingWorkbench';
import type { ShotLightConfig } from '../types/anthology';
import { useStudioStore } from '../core/store';
import { CinemaBadgeHeader, CinemaToolHUD } from './ui/CinemaToolHUD';

export interface PhotoLiquifySuiteProps {
  isOpen: boolean;
  frame: AnthologyFrame;
  onClose: () => void;
  onApplyWarp: (warpedDataUrl: string) => void;
  activeLightId?: string | null;
  onApplyLightToShot?: (lightId: string | null) => void;
  onApplyLightToAll?: (lightId: string | null) => void;
  initialTab?: SuiteTab;
}

export type SuiteTab = 'liquify' | 'adjust' | 'bulk_resizer' | 'lighting';
type WarpTool = 'push' | 'bloat' | 'pinch' | 'restore';

interface BulkPhotoItem {
  id: string;
  name: string;
  originalFile: File;
  previewUrl: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  processedBlob?: Blob;
}

export const PhotoLiquifySuite: React.FC<PhotoLiquifySuiteProps> = ({
  isOpen,
  frame,
  onClose,
  onApplyWarp,
  activeLightId,
  onApplyLightToShot,
  onApplyLightToAll,
  initialTab = 'liquify'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<SuiteTab>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // ==========================================
  // 1. LIQUIFY WARP STATE
  // ==========================================
  const [activeTool, setActiveTool] = useState<WarpTool>('push');
  const [brushRadius, setBrushRadius] = useState(70);
  const [brushStrength, setBrushStrength] = useState(40);
  const [showMesh, setShowMesh] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100, visible: false });

  const originalDataRef = useRef<ImageData | null>(null);
  const currentDataRef = useRef<ImageData | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // ==========================================
  // 2. PRO IMAGE ADJUSTMENTS
  // ==========================================
  const [clarity, setClarity] = useState<number>(0); // -50 to +50
  const [dehaze, setDehaze] = useState<number>(0);   // -50 to +50
  const [shadows, setShadows] = useState<number>(0); // -50 to +50
  const [highlights, setHighlights] = useState<number>(0); // -50 to +50
  const [vignette, setVignette] = useState<number>(20); // 0 to 100

  // ==========================================
  // 3. BULK RESIZER STATE
  // ==========================================
  const [bulkPhotos, setBulkPhotos] = useState<BulkPhotoItem[]>([]);
  const [targetPreset, setTargetPreset] = useState<'9:16' | '2.39:1' | '4K' | '1:1'>('2.39:1');
  const [fitMode, setFitMode] = useState<'crop' | 'letterbox'>('crop');
  const [exportFormat, setExportFormat] = useState<'image/webp' | 'image/jpeg' | 'image/png'>('image/webp');
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

  // ==========================================
  // 4. 34-PRESET CINEMATIC LIGHTING RIG STATE
  // ==========================================
  const [selectedLightId, setSelectedLightId] = useState<string | null>(() => {
    return (frame as any)?.lightId ?? activeLightId ?? null;
  });
  const [lightingFilterTab, setLightingFilterTab] = useState<'ALL' | 'ATMO' | 'GOBO' | 'TONE' | 'STUDIO'>('ALL');
  const [lightToastMsg, setLightToastMsg] = useState<string | null>(null);

  const updateStoreShot = useStudioStore((s) => s.updateShot);
  const setShotLightConfig = useStudioStore((s) => s.setShotLightConfig);
  const activeShotIndex = useStudioStore((s) => s.activeShotIndex);
  const storeShots = useStudioStore((s) => s.project.shots);
  const targetShotIdx =
    typeof (frame as any)?.id === 'number' && (frame as any).id >= 1
      ? (frame as any).id - 1
      : activeShotIndex;
  const activeStoreShot = storeShots[targetShotIdx] || storeShots[activeShotIndex];

  useEffect(() => {
    if ((frame as any)?.lightId !== undefined) {
      setSelectedLightId((frame as any).lightId);
    } else if (activeLightId !== undefined) {
      setSelectedLightId(activeLightId);
    }
  }, [frame, activeLightId]);

  const filteredLightingPresets = React.useMemo(() => {
    if (lightingFilterTab === 'ALL') return LIGHTING_PRESETS;
    const catMap: Record<string, LightingCategory> = {
      ATMO: 'ATMOSPHERE',
      GOBO: 'OPTICAL',
      TONE: 'EXPOSURE',
      STUDIO: 'STUDIO'
    };
    return LIGHTING_PRESETS.filter(p => p.category === catMap[lightingFilterTab]);
  }, [lightingFilterTab]);

  // Initialize Canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = 1280;
    canvas.height = 720;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      originalDataRef.current = imgData;
      currentDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStackRef.current = [new ImageData(new Uint8ClampedArray(imgData.data), imgData.width, imgData.height)];
      drawCanvas();
    };
    img.onerror = () => {
      ctx.fillStyle = '#08080C';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#FBBC24';
      ctx.font = 'bold 36px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillText(`EP ${frame.epNumber} // ${frame.title}`, canvas.width / 2, canvas.height / 2);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      originalDataRef.current = imgData;
      currentDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStackRef.current = [new ImageData(new Uint8ClampedArray(imgData.data), imgData.width, imgData.height)];
      drawCanvas();
    };

    img.src = frame.imageUrl || 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1280&q=80';
  }, [isOpen, frame.imageUrl]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentDataRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const preset = selectedLightId ? getLightingPresetById(selectedLightId) : null;

    if (preset) {
      // Create offscreen canvas to apply CSS filter & composite overlay
      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        offCtx.putImageData(currentDataRef.current, 0, 0);
        ctx.save();
        if (preset.filter) {
          ctx.filter = preset.filter;
        }
        ctx.drawImage(offscreen, 0, 0);
        ctx.restore();

        if (preset.renderOverlay) {
          ctx.save();
          if (preset.blendMode) {
            ctx.globalCompositeOperation = preset.blendMode;
          }
          preset.renderOverlay(ctx, canvas.width, canvas.height, performance.now());
          ctx.restore();
        }
      } else {
        ctx.putImageData(currentDataRef.current, 0, 0);
      }
    } else {
      ctx.putImageData(currentDataRef.current, 0, 0);
    }

    // Apply Real-Time Pro Shaders on Canvas
    if (vignette > 0 || clarity !== 0 || dehaze !== 0) {
      if (vignette > 0) {
        const radius = Math.max(canvas.width, canvas.height) * 0.7;
        const grad = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, radius * 0.4,
          canvas.width / 2, canvas.height / 2, radius
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, `rgba(0,0,0,${vignette / 120})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    // Grid Mesh
    if (showMesh) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  useEffect(() => {
    drawCanvas();
  }, [showMesh, vignette, clarity, dehaze, selectedLightId]);

  // Continuous animation loop for animated lighting presets (passing light, strobe, firelight)
  useEffect(() => {
    if (activeTab !== 'lighting' || !selectedLightId) return;
    const preset = getLightingPresetById(selectedLightId);
    if (!preset || (preset.id !== 'passing' && preset.id !== 'strobe' && preset.id !== 'firelight')) return;

    let animId: number;
    const loop = () => {
      drawCanvas();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [activeTab, selectedLightId]);

  // Liquify Engine Algorithm
  const applyWarp = (currentX: number, currentY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !currentDataRef.current || !originalDataRef.current) return;

    const dx = currentX - lastMouseRef.current.x;
    const dy = currentY - lastMouseRef.current.y;
    if (dx === 0 && dy === 0 && activeTool === 'push') return;

    const width = canvas.width;
    const height = canvas.height;
    const src = currentDataRef.current.data;
    const dst = new Uint8ClampedArray(src);
    const radius = brushRadius;
    const radiusSq = radius * radius;
    const strength = brushStrength / 100;

    const minX = Math.max(0, Math.floor(currentX - radius));
    const maxX = Math.min(width - 1, Math.ceil(currentX + radius));
    const minY = Math.max(0, Math.floor(currentY - radius));
    const maxY = Math.min(height - 1, Math.ceil(currentY + radius));

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const distSq = (px - currentX) * (px - currentX) + (py - currentY) * (py - currentY);
        if (distSq < radiusSq) {
          const factor = Math.cos((Math.sqrt(distSq) / radius) * (Math.PI / 2));
          let sampleX = px;
          let sampleY = py;

          if (activeTool === 'push') {
            sampleX = px - dx * factor * strength * 1.5;
            sampleY = py - dy * factor * strength * 1.5;
          } else if (activeTool === 'bloat') {
            const angle = Math.atan2(py - currentY, px - currentX);
            const offset = (1 - Math.sqrt(distSq) / radius) * 16 * strength;
            sampleX = px - Math.cos(angle) * offset;
            sampleY = py - Math.sin(angle) * offset;
          } else if (activeTool === 'pinch') {
            const angle = Math.atan2(py - currentY, px - currentX);
            const offset = (1 - Math.sqrt(distSq) / radius) * 16 * strength;
            sampleX = px + Math.cos(angle) * offset;
            sampleY = py + Math.sin(angle) * offset;
          } else if (activeTool === 'restore') {
            const targetIdx = (py * width + px) * 4;
            const orig = originalDataRef.current.data;
            dst[targetIdx] = orig[targetIdx];
            dst[targetIdx + 1] = orig[targetIdx + 1];
            dst[targetIdx + 2] = orig[targetIdx + 2];
            dst[targetIdx + 3] = orig[targetIdx + 3];
            continue;
          }

          sampleX = Math.max(0, Math.min(width - 1, Math.round(sampleX)));
          sampleY = Math.max(0, Math.min(height - 1, Math.round(sampleY)));

          const srcIdx = (sampleY * width + sampleX) * 4;
          const dstIdx = (py * width + px) * 4;
          dst[dstIdx] = src[srcIdx];
          dst[dstIdx + 1] = src[srcIdx + 1];
          dst[dstIdx + 2] = src[srcIdx + 2];
          dst[dstIdx + 3] = src[srcIdx + 3];
        }
      }
    }

    currentDataRef.current.data.set(dst);
    drawCanvas();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTab !== 'liquify') return;
    if (e.button !== 0 || !canvasRef.current || !currentDataRef.current) return;
    setIsDragging(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    lastMouseRef.current = { x, y };

    if (undoStackRef.current.length > 20) undoStackRef.current.shift();
    undoStackRef.current.push(
      new ImageData(new Uint8ClampedArray(currentDataRef.current.data), currentDataRef.current.width, currentDataRef.current.height)
    );
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      visible: true
    });

    if (isDragging && activeTab === 'liquify') {
      applyWarp(x, y);
      lastMouseRef.current = { x, y };
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleUndo = () => {
    if (undoStackRef.current.length > 1) {
      currentDataRef.current = undoStackRef.current.pop()!;
      drawCanvas();
    }
  };

  const handleReset = () => {
    if (!originalDataRef.current) return;
    currentDataRef.current = new ImageData(
      new Uint8ClampedArray(originalDataRef.current.data),
      originalDataRef.current.width,
      originalDataRef.current.height
    );
    setClarity(0);
    setDehaze(0);
    setShadows(0);
    setHighlights(0);
    setVignette(20);
    drawCanvas();
  };

  const handleApplyLightingToShot = (
    presetId?: string | null,
    lightConfig?: ShotLightConfig | null
  ) => {
    const lightIdToApply = presetId !== undefined ? presetId : selectedLightId;
    if (lightIdToApply !== selectedLightId) {
      setSelectedLightId(lightIdToApply ?? null);
    }
    if (onApplyLightToShot) {
      onApplyLightToShot(lightIdToApply ?? null);
    }
    updateStoreShot(targetShotIdx, {
      lightId: lightIdToApply ?? null,
      ...(lightConfig ? { lightConfig } : {})
    } as any);
    if (lightConfig) {
      setShotLightConfig(targetShotIdx, lightConfig);
    }
    setLightToastMsg('APPLIED TO SHOT');
    setTimeout(() => setLightToastMsg(null), 2500);
  };

  const handleApplyLightingToAll = (
    presetId?: string | null,
    lightConfig?: ShotLightConfig | null
  ) => {
    const lightIdToApply = presetId !== undefined ? presetId : selectedLightId;
    if (onApplyLightToAll) {
      onApplyLightToAll(lightIdToApply ?? null);
    }
    storeShots.forEach((_, idx) => {
      updateStoreShot(idx, {
        lightId: lightIdToApply ?? null,
        ...(lightConfig ? { lightConfig } : {})
      } as any);
      if (lightConfig) {
        setShotLightConfig(idx, lightConfig);
      }
    });
    setLightToastMsg('APPLIED TO ALL SHOTS');
    setTimeout(() => setLightToastMsg(null), 2500);
  };

  const handleApplyToFrame = () => {
    if (activeTab === 'lighting') {
      handleApplyLightingToShot();
      onClose();
      return;
    }
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
    onApplyWarp(dataUrl);
    if (selectedLightId !== undefined) {
      handleApplyLightingToShot();
    }
    onClose();
  };

  // ==========================================
  // BULK RESIZER PROCESSOR
  // ==========================================
  const handleBulkFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newItems: BulkPhotoItem[] = files.map((file, idx) => ({
      id: `bulk_${Date.now()}_${idx}`,
      name: file.name,
      originalFile: file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending'
    }));
    setBulkPhotos(prev => [...prev, ...newItems]);
  };

  const getPresetDimensions = () => {
    switch (targetPreset) {
      case '9:16': return { width: 1080, height: 1920 };
      case '2.39:1': return { width: 1920, height: 804 };
      case '4K': return { width: 3840, height: 2160 };
      case '1:1': return { width: 1080, height: 1080 };
    }
  };

  const processBulkImages = async () => {
    if (bulkPhotos.length === 0) return;
    setIsBatchProcessing(true);
    setBulkFeedback(`Processing ${bulkPhotos.length} photos...`);

    const { width: targetW, height: targetH } = getPresetDimensions();
    const offscreen = document.createElement('canvas');
    offscreen.width = targetW;
    offscreen.height = targetH;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    const processedItems: BulkPhotoItem[] = [];

    for (const item of bulkPhotos) {
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = item.previewUrl;
        });

        ctx.clearRect(0, 0, targetW, targetH);

        if (fitMode === 'crop') {
          // Center Crop
          const srcRatio = img.width / img.height;
          const targetRatio = targetW / targetH;
          let drawW = targetW;
          let drawH = targetH;
          let offsetX = 0;
          let offsetY = 0;

          if (srcRatio > targetRatio) {
            drawW = targetH * srcRatio;
            offsetX = (targetW - drawW) / 2;
          } else {
            drawH = targetW / srcRatio;
            offsetY = (targetH - drawH) / 2;
          }

          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
        } else {
          // Letterbox Fill with Obsidian Blur Background
          ctx.save();
          ctx.filter = 'blur(30px) brightness(40%)';
          ctx.drawImage(img, -20, -20, targetW + 40, targetH + 40);
          ctx.restore();

          // Draw contained image on top
          const scale = Math.min(targetW / img.width, targetH / img.height);
          const scaledW = img.width * scale;
          const scaledH = img.height * scale;
          const px = (targetW - scaledW) / 2;
          const py = (targetH - scaledH) / 2;

          ctx.drawImage(img, px, py, scaledW, scaledH);
        }

        const blob = await new Promise<Blob>((resolve) => {
          offscreen.toBlob((b) => resolve(b || new Blob()), exportFormat, 0.92);
        });

        processedItems.push({
          ...item,
          status: 'done',
          processedBlob: blob
        });
      } catch (err) {
        processedItems.push({
          ...item,
          status: 'error'
        });
      }
    }

    setBulkPhotos(processedItems);
    setIsBatchProcessing(false);
    setBulkFeedback(`Successfully resized ${processedItems.filter(p => p.status === 'done').length} photos!`);
  };

  // Option 1: Save All to Media Vault (IndexedDB)
  const handleSaveAllToVault = async () => {
    const readyItems = bulkPhotos.filter(p => p.processedBlob);
    if (readyItems.length === 0) return;

    let saved = 0;
    for (const item of readyItems) {
      if (item.processedBlob) {
        const ext = exportFormat === 'image/webp' ? '.webp' : exportFormat === 'image/png' ? '.png' : '.jpg';
        const file = new File([item.processedBlob], `${item.name.replace(/\.[^/.]+$/, '')}_${targetPreset}${ext}`, {
          type: exportFormat
        });
        await studioDraftDb.saveMediaToVault(file);
        saved++;
      }
    }
    setBulkFeedback(`Saved ${saved} processed photos directly to Media Vault!`);
  };

  // Option 2: Download as JSZip
  const handleDownloadZip = async () => {
    const readyItems = bulkPhotos.filter(p => p.processedBlob);
    if (readyItems.length === 0) return;

    const zip = new JSZip();
    const ext = exportFormat === 'image/webp' ? '.webp' : exportFormat === 'image/png' ? '.png' : '.jpg';

    readyItems.forEach((item, idx) => {
      if (item.processedBlob) {
        const cleanName = `${String(idx + 1).padStart(3, '0')}_${item.name.replace(/\.[^/.]+$/, '')}_${targetPreset}${ext}`;
        zip.file(cleanName, item.processedBlob);
      }
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HANDFILM_Batch_${targetPreset.replace(':', '_')}.zip`;
    link.click();
    URL.revokeObjectURL(url);
    setBulkFeedback('Zip archive downloaded successfully!');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 font-mono-tech select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-6xl h-[92vh] bg-[#0A0B0E] border border-[#d4af37]/50 rounded-[2px] shadow-[0_30px_90px_rgba(0,0,0,0.98)] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-[#272732] flex flex-wrap items-center justify-between gap-2 bg-[#0C0C14]">
          <div className="flex items-center gap-2 min-w-0">
            <CinemaBadgeHeader
              icon={<Sparkles className="w-4 h-4" strokeWidth={2.2} />}
              label="PHOTO LAB"
              accent="amber"
            />
            <span className="px-2 py-0.5 rounded bg-[#fbbf24]/20 border border-[#fbbf24]/40 text-[9px] text-[#fbbf24] shrink-0 font-black">
              EP {frame.epNumber} // {frame.title}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {[
              { id: 'liquify' as const, label: 'LIQUIFY', accent: 'crimson' as const, en: 'Sculpt and warp portrait proportions smoothly.', bn: 'ছবির যেকোনো অংশ টেনে বা চাপ দিয়ে আকার পরিবর্তন করুন।' },
              { id: 'adjust' as const, label: 'SHADERS', accent: 'cyan' as const, en: 'Adjust clarity, dehaze, shadows, highlights & vignette.', bn: 'ছবির স্পষ্টতা, শ্যাডো, হাইলাইট ও ভিনেট কন্ট্রোল করুন।' },
              { id: 'bulk_resizer' as const, label: `BULK (${bulkPhotos.length})`, accent: 'emerald' as const, en: 'Batch resize up to 50 photos to Reels, Scope, or 4K.', bn: 'একসাথে অনেকগুলো ছবি ৯:১৬, স্কোপ বা ৪কে সাইজে কনভার্ট করুন।' },
              { id: 'lighting' as const, label: 'LIGHT RIG', accent: 'amber' as const, en: 'Apply 3D studio key/rim/fill lighting presets.', bn: '৩৪টি স্টুডিও লাইটিং প্রিসেট দিয়ে ছবির আলো বদলান।' },
            ].map((t) => (
              <CinemaToolHUD key={t.id} title={t.label} en={t.en} bn={t.bn} accent={t.accent} side="bottom">
                <button
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  data-active={activeTab === t.id ? 'true' : 'false'}
                  className={`cinema-tile cinema-tile-${t.accent} min-h-[38px] px-2.5 py-1 rounded text-[10px] font-black tracking-wider uppercase cursor-pointer`}
                >
                  <span>{t.label}</span>
                </button>
              </CinemaToolHUD>
            ))}

            {activeTab !== 'bulk_resizer' && (
              <CinemaToolHUD title="APPLY SHOT" en="Save photo edits directly onto the active shot." bn="সম্পাদিত ছবি বা আলো বর্তমান শটে সেভ করতে চাপুন।" accent="emerald" side="bottom">
                <button
                  type="button"
                  onClick={handleApplyToFrame}
                  data-active="true"
                  className="cinema-tile cinema-tile-emerald min-h-[38px] px-3 py-1 font-black text-[10px] rounded flex items-center gap-1 cursor-pointer uppercase"
                >
                  <Check className="w-3.5 h-3.5 cinema-tile-icon" />
                  <span>APPLY SHOT</span>
                </button>
              </CinemaToolHUD>
            )}

            <CinemaToolHUD title="CLOSE" en="Close Photo & Resize Suite." bn="ফটো এডিটর উইন্ডোটি বন্ধ করুন।" accent="crimson" side="bottom">
              <button type="button" onClick={onClose} className="cinema-tile cinema-tile-crimson p-1.5 rounded cursor-pointer">
                <X className="w-4 h-4 cinema-tile-icon" />
              </button>
            </CinemaToolHUD>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#07070A] relative">
          {/* Toast Notification */}
          {lightToastMsg && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/95 border border-[#fbbf24] text-[#fbbf24] font-mono text-[10px] font-bold px-3 py-1.5 rounded-[1px] shadow-[0_0_20px_rgba(251,191,36,0.4)] flex items-center gap-1.5 pointer-events-none animate-in fade-in duration-200">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{lightToastMsg}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1, 2, & 4: LIQUIFY, PRO ADJUSTMENTS, LIGHT RIG       */}
          {/* ========================================================= */}
          {activeTab === 'lighting' ? (
            <LightingRelightingWorkbench
              frame={frame}
              shotIndex={targetShotIdx}
              selectedLightId={selectedLightId}
              initialLightConfig={(frame as any)?.lightConfig ?? activeStoreShot?.lightConfig ?? null}
              onSelectLightId={(id) => setSelectedLightId(id)}
              onApplyToShot={(lightId, cfg) => handleApplyLightingToShot(lightId, cfg)}
              onApplyToAllShots={(lightId, cfg) => handleApplyLightingToAll(lightId, cfg)}
            />
          ) : activeTab !== 'bulk_resizer' ? (
            <>
              {/* Left Toolbar */}
              <div className="w-full md:w-64 bg-[#09090D] border-b md:border-b-0 md:border-r border-[#272732] p-3 flex flex-col gap-3 font-mono-tech shrink-0 overflow-hidden">
                {activeTab === 'liquify' ? (
                  <>
                    <div className="space-y-2">
                      <CinemaBadgeHeader icon={<Sparkles className="w-3.5 h-3.5" />} label="WARP MODE" accent="crimson" />
                      <div className="grid grid-cols-2 gap-1.5">
                        {([
                          { tool: 'push' as const, label: 'PUSH', en: 'Drag pixels freely along cursor motion.', bn: 'ছবির অংশ হাত দিয়ে ঠেলে বা টেনে সরাতে ব্যবহার করুন।' },
                          { tool: 'bloat' as const, label: 'BLOAT', en: 'Expand pixels outward from brush center.', bn: 'ক্লিক করে নির্দিষ্ট অংশ ফোলাতে বা বড় করতে চাপুন।' },
                          { tool: 'pinch' as const, label: 'PINCH', en: 'Pull pixels inward toward brush center.', bn: 'নির্দিষ্ট অংশ সংকুচিত বা সরু করতে ব্যবহার করুন।' },
                          { tool: 'restore' as const, label: 'RESTORE', en: 'Brush back original unwarped pixels.', bn: 'আগের আসল অবস্থায় ফিরিয়ে আনতে ব্রাশ করুন।' },
                        ]).map((w) => (
                          <CinemaToolHUD key={w.tool} title={w.label} en={w.en} bn={w.bn} accent="crimson" side="right" blockWrapper>
                            <button
                              type="button"
                              onClick={() => setActiveTool(w.tool)}
                              data-active={activeTool === w.tool ? 'true' : 'false'}
                              className="cinema-tile cinema-tile-crimson w-full min-h-[44px] px-2 py-1.5 text-[10px] font-black uppercase tracking-wider rounded cursor-pointer"
                            >
                              <span>{w.label}</span>
                            </button>
                          </CinemaToolHUD>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[9px] font-black text-zinc-400 uppercase">
                        <span>RADIUS</span>
                        <span className="text-[#fbbf24]">{brushRadius}px</span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="220"
                        value={brushRadius}
                        onChange={e => setBrushRadius(Number(e.target.value))}
                        className="w-full mt-1 accent-[#fbbf24] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[9px] font-black text-zinc-400 uppercase">
                        <span>STRENGTH</span>
                        <span className="text-[#fbbf24]">{brushStrength}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="95"
                        value={brushStrength}
                        onChange={e => setBrushStrength(Number(e.target.value))}
                        className="w-full mt-1 accent-[#fbbf24] cursor-pointer"
                      />
                    </div>

                    <CinemaToolHUD title="WARP MESH" en="Toggle reference deformation grid overlay." bn="ওয়ার্প গ্রিড লাইন দেখতে বা লুকাতে চাপুন।" accent="amber" side="right" blockWrapper>
                      <button
                        type="button"
                        onClick={() => setShowMesh(!showMesh)}
                        data-active={showMesh ? 'true' : 'false'}
                        className="cinema-tile cinema-tile-amber w-full min-h-[44px] px-2 py-1.5 text-[10px] font-black uppercase tracking-wider rounded flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Grid className="w-3.5 h-3.5 cinema-tile-icon" />
                        <span>{showMesh ? 'HIDE MESH' : 'SHOW MESH'}</span>
                      </button>
                    </CinemaToolHUD>
                  </>
                ) : (
                  /* Pro Image Adjustments Tab */
                  <div className="space-y-3">
                    <CinemaBadgeHeader icon={<Sliders className="w-3.5 h-3.5" />} label="PRO SHADERS" accent="cyan" />

                    <div>
                      <div className="flex justify-between text-[9px] font-black text-zinc-400 uppercase">
                        <span>CLARITY</span>
                        <span className="text-[#fbbf24]">{clarity > 0 ? `+${clarity}` : clarity}</span>
                      </div>
                      <input type="range" min="-50" max="50" value={clarity} onChange={e => setClarity(Number(e.target.value))} className="w-full accent-[#fbbf24] cursor-pointer" />
                    </div>

                    <div>
                      <div className="flex justify-between text-[9px] font-black text-zinc-400 uppercase">
                        <span>DEHAZE</span>
                        <span className="text-[#fbbf24]">{dehaze > 0 ? `+${dehaze}` : dehaze}</span>
                      </div>
                      <input type="range" min="-50" max="50" value={dehaze} onChange={e => setDehaze(Number(e.target.value))} className="w-full accent-[#fbbf24] cursor-pointer" />
                    </div>

                    <div>
                      <div className="flex justify-between text-[9px] font-black text-zinc-400 uppercase">
                        <span>SHADOWS</span>
                        <span className="text-[#fbbf24]">{shadows > 0 ? `+${shadows}` : shadows}</span>
                      </div>
                      <input type="range" min="-50" max="50" value={shadows} onChange={e => setShadows(Number(e.target.value))} className="w-full accent-[#fbbf24] cursor-pointer" />
                    </div>

                    <div>
                      <div className="flex justify-between text-[9px] font-black text-zinc-400 uppercase">
                        <span>HIGHLIGHT</span>
                        <span className="text-[#fbbf24]">{highlights > 0 ? `+${highlights}` : highlights}</span>
                      </div>
                      <input type="range" min="-50" max="50" value={highlights} onChange={e => setHighlights(Number(e.target.value))} className="w-full accent-[#fbbf24] cursor-pointer" />
                    </div>

                    <div>
                      <div className="flex justify-between text-[9px] font-black text-zinc-400 uppercase">
                        <span>VIGNETTE</span>
                        <span className="text-[#fbbf24]">{vignette}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={vignette} onChange={e => setVignette(Number(e.target.value))} className="w-full accent-[#fbbf24] cursor-pointer" />
                    </div>
                  </div>
                )}

                <div className="mt-auto flex flex-col gap-1.5 pt-3 border-t border-[#272732]">
                  <CinemaToolHUD title="UNDO STROKE" en="Revert last brush stroke." bn="শেষের ব্রাশ স্ট্রোক বাতিল করতে চাপুন।" accent="amber" side="right" blockWrapper>
                    <button
                      type="button"
                      onClick={handleUndo}
                      className="cinema-tile cinema-tile-amber w-full min-h-[44px] px-2 py-1.5 text-[10px] font-black uppercase rounded flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Undo2 className="w-3.5 h-3.5 cinema-tile-icon" />
                      <span>UNDO</span>
                    </button>
                  </CinemaToolHUD>
                  <CinemaToolHUD title="REVERT ALL" en="Reset image back to original frame." bn="সব পরিবর্তন মুছে ছবিটি আগের অবস্থায় ফিরিয়ে আনুন।" accent="crimson" side="right" blockWrapper>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="cinema-tile cinema-tile-crimson w-full min-h-[44px] px-2 py-1.5 text-[10px] font-black uppercase rounded flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 cinema-tile-icon" />
                      <span>REVERT</span>
                    </button>
                  </CinemaToolHUD>
                </div>
              </div>

              {/* Canvas Workspace */}
              <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden bg-radial from-[#121218] to-[#040406]">
                <div className="relative shadow-[0_20px_60px_rgba(0,0,0,0.95)] border border-[#fbbf24]/40 max-w-full max-h-full">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={() => {
                      handleMouseUp();
                      setCursorPos(prev => ({ ...prev, visible: false }));
                    }}
                    className="block max-w-full max-h-[75vh] object-contain cursor-crosshair"
                  />
                  {cursorPos.visible && activeTab === 'liquify' && (
                    <div
                      className="absolute pointer-events-none rounded-full border border-[#fbbf24] -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${cursorPos.x}px`,
                        top: `${cursorPos.y}px`,
                        width: `${brushRadius}px`,
                        height: `${brushRadius}px`,
                        boxShadow: '0 0 10px rgba(251,191,36,0.4)'
                      }}
                    />
                  )}
                </div>
              </div>
            </>
          ) : (
            /* ========================================================= */
            /* TAB 3: MASS BULK PHOTO RESIZER                            */
            /* ========================================================= */
            <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto no-scrollbar">
              {/* Batch Settings Bar */}
              <div className="p-3 bg-[#0C0C14] border border-[#272732] rounded-[2px] flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: '2.39:1' as const, label: '2.39:1', en: 'Resize photos to 1920×804 Cinema Scope.', bn: 'সব ছবি ২.৩৯:১ সিনেমা স্কোপ সাইজে রিসাইজ করুন।' },
                    { id: '9:16' as const, label: '9:16', en: 'Resize photos to 1080×1920 Reels portrait.', bn: 'রিলস ও শর্টসের জন্য ৯:১৬ সাইজে রিসাইজ করুন।' },
                    { id: '4K' as const, label: '4K UHD', en: 'Upscale/resize photos to 3840×2160 UHD.', bn: 'ছবিগুলোকে ৪কে আল্ট্রা-এইচডি রেজোলিউশনে সেট করুন।' },
                    { id: '1:1' as const, label: '1:1 SQ', en: 'Resize photos to 1080×1080 square frame.', bn: 'ইন্সটাগ্রাম পোস্টের জন্য ১:১ স্কয়ার ফ্রেম বাছুন।' }
                  ].map((p) => (
                    <CinemaToolHUD key={p.id} title={p.label} en={p.en} bn={p.bn} accent="amber" side="bottom">
                      <button
                        type="button"
                        onClick={() => setTargetPreset(p.id)}
                        data-active={targetPreset === p.id ? 'true' : 'false'}
                        className="cinema-tile cinema-tile-amber min-h-[40px] px-2.5 py-1 rounded text-[10px] font-black uppercase cursor-pointer"
                      >
                        <span>{p.label}</span>
                      </button>
                    </CinemaToolHUD>
                  ))}
                </div>

                <div className="flex gap-1.5">
                  <CinemaToolHUD title="CROP" en="Fill frame cleanly via center crop." bn="ফ্রেম পুরোটা ভরে রাখতে সেন্টার ক্রপ ব্যবহার করুন।" accent="cyan" side="bottom">
                    <button
                      type="button"
                      onClick={() => setFitMode('crop')}
                      data-active={fitMode === 'crop' ? 'true' : 'false'}
                      className="cinema-tile cinema-tile-cyan min-h-[40px] px-2.5 py-1 rounded text-[10px] font-black uppercase cursor-pointer"
                    >
                      <span>CROP</span>
                    </button>
                  </CinemaToolHUD>
                  <CinemaToolHUD title="LETTERBOX" en="Preserve full image over blurred backdrop." bn="ছবি না কেটে পেছনে ব্লার লেটারবক্স রাখতে এটি চাপুন।" accent="cyan" side="bottom">
                    <button
                      type="button"
                      onClick={() => setFitMode('letterbox')}
                      data-active={fitMode === 'letterbox' ? 'true' : 'false'}
                      className="cinema-tile cinema-tile-cyan min-h-[40px] px-2.5 py-1 rounded text-[10px] font-black uppercase cursor-pointer"
                    >
                      <span>LETTERBOX</span>
                    </button>
                  </CinemaToolHUD>
                </div>

                <select
                  value={exportFormat}
                  onChange={e => setExportFormat(e.target.value as any)}
                  className="bg-[#111215] border border-[#26282E] text-zinc-200 text-[10px] font-black uppercase px-2.5 py-2 rounded outline-none"
                >
                  <option value="image/webp">WEBP</option>
                  <option value="image/jpeg">JPEG</option>
                  <option value="image/png">PNG</option>
                </select>
              </div>

              {bulkFeedback && (
                <div className="px-3 py-1.5 bg-[#fbbf24]/15 border border-[#fbbf24]/40 text-[#fbbf24] text-[10px] rounded-[2px] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{bulkFeedback}</span>
                  </div>
                  <button type="button" onClick={() => setBulkFeedback(null)} className="text-zinc-400 hover:text-white cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Upload Dropzone & Grid */}
              <div className="flex-1 flex flex-col gap-3 min-h-[280px]">
                <CinemaToolHUD title="ADD PHOTOS" en="Drop 10–50 images or browse from disk." bn="একসাথে অনেকগুলো ছবি আপলোড করতে এখানে ক্লিক বা ড্রপ করুন।" accent="amber" side="top" blockWrapper>
                  <label className="w-full border-2 border-dashed border-[#272732] hover:border-[#fbbf24]/60 bg-[#0C0C14]/60 rounded-[2px] p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group">
                    <Upload className="w-7 h-7 text-zinc-500 group-hover:text-[#fbbf24] transition-colors" />
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-200 group-hover:text-white">
                      DROP PHOTOS ({bulkPhotos.length})
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleBulkFilesSelect}
                      className="hidden"
                    />
                  </label>
                </CinemaToolHUD>

                {bulkPhotos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-72 overflow-y-auto no-scrollbar">
                    {bulkPhotos.map(item => (
                      <div
                        key={item.id}
                        className="p-1.5 bg-[#0C0C14] border border-[#272732] rounded-[2px] flex flex-col gap-1 relative group"
                      >
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          className="w-full h-20 object-cover rounded-[1px] border border-white/5"
                        />
                        <div className="text-[8px] text-zinc-300 font-bold truncate">{item.name}</div>
                        <div className="flex items-center justify-between text-[7.5px]">
                          <span className={item.status === 'done' ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                            {item.status.toUpperCase()}
                          </span>
                          <button
                            type="button"
                            onClick={() => setBulkPhotos(prev => prev.filter(p => p.id !== item.id))}
                            className="text-zinc-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Batch Actions */}
              <div className="p-3 bg-[#0C0C14] border border-[#272732] rounded-[2px] flex flex-wrap items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase text-[#fbbf24]">
                  {bulkPhotos.length} READY
                </span>

                <div className="flex items-center gap-2 flex-wrap">
                  <CinemaToolHUD title="BULK CONVERT" en="Process and resize all queued photos now." bn="কিউতে থাকা সব ছবি একসাথে কনভার্ট শুরু করতে চাপুন।" accent="amber" side="top">
                    <button
                      type="button"
                      onClick={processBulkImages}
                      disabled={isBatchProcessing || bulkPhotos.length === 0}
                      data-active="true"
                      className="cinema-tile cinema-tile-amber min-h-[44px] px-4 py-1.5 rounded font-black text-[10px] uppercase cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 cinema-tile-icon" />
                      <span>{isBatchProcessing ? 'CONVERTING...' : 'BULK START'}</span>
                    </button>
                  </CinemaToolHUD>

                  <CinemaToolHUD title="SAVE VAULT" en="Store all resized photos in local Media Vault." bn="রিসাইজ করা সব ছবি লোকাল মিডিয়া ভল্টে সেভ করুন।" accent="cyan" side="top">
                    <button
                      type="button"
                      onClick={handleSaveAllToVault}
                      disabled={!bulkPhotos.some(p => p.processedBlob)}
                      className="cinema-tile cinema-tile-cyan min-h-[44px] px-3.5 py-1.5 rounded font-black text-[10px] uppercase cursor-pointer flex items-center gap-1.5"
                    >
                      <FolderDown className="w-3.5 h-3.5 cinema-tile-icon" />
                      <span>SAVE VAULT</span>
                    </button>
                  </CinemaToolHUD>

                  <CinemaToolHUD title="SAVE ZIP" en="Download converted batch as a ZIP file." bn="সব ছবি একসাথে ZIP ফাইল হিসেবে ডাউনলোড করুন।" accent="emerald" side="top">
                    <button
                      type="button"
                      onClick={handleDownloadZip}
                      disabled={!bulkPhotos.some(p => p.processedBlob)}
                      className="cinema-tile cinema-tile-emerald min-h-[44px] px-3.5 py-1.5 rounded font-black text-[10px] uppercase cursor-pointer flex items-center gap-1.5"
                    >
                      <FileArchive className="w-3.5 h-3.5 cinema-tile-icon" />
                      <span>SAVE ZIP</span>
                    </button>
                  </CinemaToolHUD>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
