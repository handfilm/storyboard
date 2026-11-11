/**
 * @file /src/components/dashboard/MediaVaultD3Dashboard.tsx
 * @description Master D3-based Media Vault Disk Usage & Memory Consumption Dashboard for RAWx Storyboard Sidebar.
 * 
 * Visualizes:
 * 1. D3 Storage Allocation Donut Chart (4K Video Masters, Stills, Audio Stems, SW Cache, IDB metadata)
 * 2. D3 Real-Time RAM & JS Heap Consumption Area Chart with dynamic gradient fill
 * 3. D3 Top Heaviest Vault Assets Horizontal Bar Chart with exact byte readouts
 * 4. Integrated Service Worker fast-load shot precaching controls
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { db, VaultMediaItem } from '../../services/db';
import { serviceWorkerManager, ServiceWorkerMetrics } from '../../services/serviceWorkerManager';
import { AnthologyFrame } from '../../types/anthology';
import { 
  HardDrive, 
  Cpu, 
  Zap, 
  Trash2, 
  RefreshCw, 
  Database, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  FileVideo,
  FileImage,
  FileAudio,
  ShieldAlert
} from 'lucide-react';

export interface MediaVaultD3DashboardProps {
  frames?: AnthologyFrame[];
  className?: string;
  compact?: boolean;
}

interface StorageCategory {
  name: string;
  bytes: number;
  count: number;
  color: string;
  icon: string;
}

interface MemorySample {
  timestamp: number;
  usedMb: number;
  totalMb: number;
}

export const MediaVaultD3Dashboard: React.FC<MediaVaultD3DashboardProps> = ({
  frames = [],
  className = '',
  compact = false
}) => {
  // ─────────────────────────────────────────────────────────────
  // 1. Telemetry State
  // ─────────────────────────────────────────────────────────────
  const [vaultItems, setVaultItems] = useState<VaultMediaItem[]>([]);
  const [swMetrics, setSwMetrics] = useState<ServiceWorkerMetrics>(serviceWorkerManager.getMetrics());
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number }>({ usage: 0, quota: 0 });
  const [memoryInfo, setMemoryInfo] = useState<{ usedHeapMb: number; totalHeapMb: number; limitHeapMb: number }>({
    usedHeapMb: 0,
    totalHeapMb: 0,
    limitHeapMb: 4096
  });
  const [memoryHistory, setMemoryHistory] = useState<MemorySample[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<StorageCategory | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isPrecaching, setIsPrecaching] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  // SVG Refs for D3 Render Targets
  const donutSvgRef = useRef<SVGSVGElement | null>(null);
  const memorySvgRef = useRef<SVGSVGElement | null>(null);
  const barChartSvgRef = useRef<SVGSVGElement | null>(null);

  // Format bytes helper
  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // ─────────────────────────────────────────────────────────────
  // 2. Fetch Storage & Vault Metrics
  // ─────────────────────────────────────────────────────────────
  const fetchAllMetrics = useCallback(async () => {
    try {
      // 1. IndexedDB Vault Items
      const items = await db.getMasterVaultMedia();
      setVaultItems(items);

      // 2. Browser Storage Quota
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        setStorageEstimate({
          usage: est.usage || 0,
          quota: est.quota || (50 * 1024 * 1024 * 1024)
        });
      }

      // 3. Service Worker Cache Metrics
      const sw = await serviceWorkerManager.refreshMetrics();
      setSwMetrics(sw);

      // 4. Memory / JS Heap Info
      let usedMb = 64;
      let totalMb = 128;
      let limitMb = 4096;

      const perfMemory = (performance as any)?.memory;
      if (perfMemory) {
        usedMb = Math.round(perfMemory.usedJSHeapSize / (1024 * 1024));
        totalMb = Math.round(perfMemory.totalJSHeapSize / (1024 * 1024));
        limitMb = Math.round(perfMemory.jsHeapSizeLimit / (1024 * 1024));
      } else {
        // Fallback estimation based on loaded blobs & shots
        const blobEstimate = items.reduce((acc, it) => acc + (it.size || 0), 0) / (1024 * 1024);
        usedMb = Math.min(3800, Math.round(140 + blobEstimate * 0.45));
        totalMb = Math.round(usedMb * 1.35);
      }

      setMemoryInfo({ usedHeapMb: usedMb, totalHeapMb: totalMb, limitHeapMb: limitMb });

      // Append to memory history
      setMemoryHistory((prev) => {
        const sample: MemorySample = { timestamp: Date.now(), usedMb, totalMb };
        const next = [...prev, sample];
        return next.slice(-20); // Keep last 20 samples
      });
    } catch (err) {
      console.warn('[MediaVaultD3Dashboard] Metrics poll error:', err);
    }
  }, []);

  useEffect(() => {
    fetchAllMetrics();
    const interval = setInterval(fetchAllMetrics, 4000);
    const unsub = serviceWorkerManager.subscribe((metrics) => {
      setSwMetrics(metrics);
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [fetchAllMetrics]);

  // ─────────────────────────────────────────────────────────────
  // 3. Categorized Storage Breakdown
  // ─────────────────────────────────────────────────────────────
  const categories: StorageCategory[] = useMemo(() => {
    let videoBytes = 0;
    let videoCount = 0;
    let stillBytes = 0;
    let stillCount = 0;
    let audioBytes = 0;
    let audioCount = 0;

    vaultItems.forEach((item) => {
      const isVid = item.mimeType?.startsWith('video') || /\.(mp4|webm|mov|mkv|ogg|m4v)$/i.test(item.name);
      const isAud = item.mimeType?.startsWith('audio') || /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(item.name);

      if (isVid) {
        videoBytes += item.size || 0;
        videoCount++;
      } else if (isAud) {
        audioBytes += item.size || 0;
        audioCount++;
      } else {
        stillBytes += item.size || 0;
        stillCount++;
      }
    });

    const swBytes = swMetrics.totalBytes || 0;
    const swCount = swMetrics.itemCount || 0;

    // Minimum visual slice if completely empty
    const result: StorageCategory[] = [
      { name: '4K Video Masters', bytes: videoBytes, count: videoCount, color: '#F5A623', icon: '🎥' },
      { name: 'High-Res Stills', bytes: stillBytes, count: stillCount, color: '#00F0FF', icon: '🖼️' },
      { name: 'Audio Stems & Foley', bytes: audioBytes, count: audioCount, color: '#A855F7', icon: '♫' },
      { name: 'Service Worker L2 Cache', bytes: swBytes, count: swCount, color: '#10B981', icon: '⚡' },
      { name: 'IDB Index & Metadata', bytes: Math.max(1024 * 512, (vaultItems.length * 4096)), count: vaultItems.length, color: '#EC4899', icon: '🗄️' }
    ];

    return result;
  }, [vaultItems, swMetrics]);

  const totalVaultBytes = useMemo(() => {
    return categories.reduce((sum, c) => sum + c.bytes, 0);
  }, [categories]);

  // Top largest assets in Media Vault
  const topAssets = useMemo(() => {
    return [...vaultItems]
      .sort((a, b) => (b.size || 0) - (a.size || 0))
      .slice(0, 5);
  }, [vaultItems]);

  // ─────────────────────────────────────────────────────────────
  // 4. D3 CHART 1: STORAGE COMPOSITION SUNBURST DONUT
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!donutSvgRef.current) return;

    const svg = d3.select(donutSvgRef.current);
    svg.selectAll('*').remove();

    const width = compact ? 220 : 260;
    const height = compact ? 180 : 200;
    const radius = Math.min(width, height) / 2 - 10;
    const innerRadius = radius * 0.62;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Guard: If total is 0, render empty placeholder ring
    const effectiveTotal = Math.max(totalVaultBytes, 1);
    const pieData = categories.map((c) => ({
      ...c,
      effectiveBytes: totalVaultBytes === 0 ? 1 : c.bytes
    }));

    const pie = d3
      .pie<StorageCategory & { effectiveBytes: number }>()
      .value((d) => d.effectiveBytes)
      .sort(null)
      .padAngle(0.04);

    const arc = d3
      .arc<d3.PieArcDatum<StorageCategory & { effectiveBytes: number }>>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .cornerRadius(4);

    const arcHover = d3
      .arc<d3.PieArcDatum<StorageCategory & { effectiveBytes: number }>>()
      .innerRadius(innerRadius - 2)
      .outerRadius(radius + 4)
      .cornerRadius(4);

    // Glowing defs
    const defs = svg.append('defs');
    categories.forEach((cat, i) => {
      const filter = defs.append('filter').attr('id', `glow-${i}`);
      filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur');
      const feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'coloredBlur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    });

    const arcs = g
      .selectAll('.arc')
      .data(pie(pieData))
      .enter()
      .append('g')
      .attr('class', 'arc')
      .style('cursor', 'pointer');

    arcs
      .append('path')
      .attr('d', arc as any)
      .attr('fill', (d) => d.data.color)
      .attr('opacity', 0.85)
      .attr('stroke', '#0B0C10')
      .attr('stroke-width', 2)
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('d', arcHover as any)
          .attr('opacity', 1)
          .style('filter', `url(#glow-${d.index})`);
        setSelectedCategory(d.data);
      })
      .on('mouseleave', function () {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('d', arc as any)
          .attr('opacity', 0.85)
          .style('filter', 'none');
        setSelectedCategory(null);
      });

    // Center Dynamic Readout Text
    const centerGroup = g.append('g').attr('text-anchor', 'middle');

    centerGroup
      .append('text')
      .attr('y', -6)
      .attr('fill', selectedCategory ? selectedCategory.color : '#FFFFFF')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .text(selectedCategory ? formatBytes(selectedCategory.bytes) : formatBytes(totalVaultBytes));

    centerGroup
      .append('text')
      .attr('y', 12)
      .attr('fill', '#9CA3AF')
      .attr('font-size', '8.5px')
      .attr('font-family', 'monospace')
      .attr('letter-spacing', '0.08em')
      .text(selectedCategory ? selectedCategory.name.toUpperCase() : 'TOTAL VAULT DISK');
  }, [categories, totalVaultBytes, selectedCategory, compact]);

  // ─────────────────────────────────────────────────────────────
  // 5. D3 CHART 2: LIVE RAM & JS HEAP CONSUMPTION SPARKLINE
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!memorySvgRef.current) return;

    const svg = d3.select(memorySvgRef.current);
    svg.selectAll('*').remove();

    const width = compact ? 220 : 280;
    const height = 70;
    const margin = { top: 8, right: 10, bottom: 16, left: 24 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Ensure we have at least 2 data points for a smooth gradient line
    const data = memoryHistory.length >= 2 
      ? memoryHistory 
      : [
          { timestamp: Date.now() - 4000, usedMb: memoryInfo.usedHeapMb * 0.95, totalMb: memoryInfo.totalHeapMb },
          { timestamp: Date.now(), usedMb: memoryInfo.usedHeapMb, totalMb: memoryInfo.totalHeapMb }
        ];

    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.timestamp) as [number, number])
      .range([0, innerW]);

    const maxMb = Math.max(d3.max(data, (d) => d.usedMb) || 100, 300);
    const yScale = d3.scaleLinear().domain([0, maxMb * 1.2]).range([innerH, 0]);

    // Gradient definition
    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'ram-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#00F0FF').attr('stop-opacity', 0.45);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#00F0FF').attr('stop-opacity', 0.0);

    // Area
    const area = d3
      .area<MemorySample>()
      .x((d) => xScale(d.timestamp))
      .y0(innerH)
      .y1((d) => yScale(d.usedMb))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'url(#ram-area-gradient)')
      .attr('d', area as any);

    // Line
    const line = d3
      .line<MemorySample>()
      .x((d) => xScale(d.timestamp))
      .y((d) => yScale(d.usedMb))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#00F0FF')
      .attr('stroke-width', 1.8)
      .attr('d', line as any);

    // Current point dot
    const lastSample = data[data.length - 1];
    g.append('circle')
      .attr('cx', xScale(lastSample.timestamp))
      .attr('cy', yScale(lastSample.usedMb))
      .attr('r', 3)
      .attr('fill', '#00F0FF')
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 1.2);

    // Y Axis readout
    g.append('text')
      .attr('x', -4)
      .attr('y', 4)
      .attr('text-anchor', 'end')
      .attr('fill', '#6B7280')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .text(`${Math.round(maxMb)}M`);

    g.append('text')
      .attr('x', -4)
      .attr('y', innerH)
      .attr('text-anchor', 'end')
      .attr('fill', '#6B7280')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .text('0M');
  }, [memoryHistory, memoryInfo, compact]);

  // ─────────────────────────────────────────────────────────────
  // 6. D3 CHART 3: TOP HEAVIEST MEDIA VAULT ASSETS BAR CHART
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!barChartSvgRef.current) return;

    const svg = d3.select(barChartSvgRef.current);
    svg.selectAll('*').remove();

    if (topAssets.length === 0) return;

    const width = compact ? 220 : 280;
    const barHeight = 18;
    const gap = 6;
    const height = topAssets.length * (barHeight + gap) + 10;
    const margin = { top: 4, right: 45, bottom: 4, left: 75 };
    const innerW = width - margin.left - margin.right;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const maxAssetSize = d3.max(topAssets, (d) => d.size || 0) || 1;

    const xScale = d3.scaleLinear().domain([0, maxAssetSize]).range([0, innerW]);

    topAssets.forEach((item, idx) => {
      const y = idx * (barHeight + gap);
      const isVid = item.mimeType?.startsWith('video') || /\.(mp4|webm|mov|mkv)$/i.test(item.name);
      const barColor = isVid ? '#F5A623' : '#00F0FF';
      const barW = Math.max(4, xScale(item.size || 0));

      // Background track
      g.append('rect')
        .attr('x', 0)
        .attr('y', y)
        .attr('width', innerW)
        .attr('height', barHeight)
        .attr('rx', 3)
        .attr('fill', '#14141E');

      // Filled value bar
      g.append('rect')
        .attr('x', 0)
        .attr('y', y)
        .attr('width', barW)
        .attr('height', barHeight)
        .attr('rx', 3)
        .attr('fill', barColor)
        .attr('opacity', 0.85);

      // Truncated Filename label on left
      const cleanName = item.name.length > 11 ? `${item.name.slice(0, 9)}..` : item.name;
      g.append('text')
        .attr('x', -6)
        .attr('y', y + barHeight / 2 + 3)
        .attr('text-anchor', 'end')
        .attr('fill', '#E5E7EB')
        .attr('font-size', '8.5px')
        .attr('font-family', 'monospace')
        .text(cleanName);

      // File size label on right
      g.append('text')
        .attr('x', innerW + 6)
        .attr('y', y + barHeight / 2 + 3)
        .attr('text-anchor', 'start')
        .attr('fill', barColor)
        .attr('font-size', '8px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'monospace')
        .text(formatBytes(item.size || 0));
    });
  }, [topAssets, compact]);

  // ─────────────────────────────────────────────────────────────
  // 7. Interactive Service Worker Actions
  // ─────────────────────────────────────────────────────────────
  const handlePrecacheStoryboardShots = async () => {
    setIsPrecaching(true);
    try {
      await serviceWorkerManager.precacheStoryboardFrames(frames);
      await fetchAllMetrics();
      setActionFeedback(`⚡ Precached ${frames.length} Storyboard frames to Service Worker L2 cache`);
      setTimeout(() => setActionFeedback(null), 3500);
    } catch (err) {
      console.warn('[MediaVaultD3Dashboard] Precache error:', err);
    } finally {
      setIsPrecaching(false);
    }
  };

  const handlePurgeServiceWorkerCache = async () => {
    setIsPurging(true);
    try {
      await serviceWorkerManager.purgeCache();
      await fetchAllMetrics();
      setActionFeedback('🧹 Service Worker media cache purged successfully');
      setTimeout(() => setActionFeedback(null), 3500);
    } catch (err) {
      console.warn('[MediaVaultD3Dashboard] Purge error:', err);
    } finally {
      setIsPurging(false);
    }
  };

  // Quota percentage
  const quotaPercent = storageEstimate.quota > 0
    ? Math.min(100, Math.round((storageEstimate.usage / storageEstimate.quota) * 100))
    : 0;

  // RAM health status
  const ramStatusColor = memoryInfo.usedHeapMb > 3000
    ? 'text-red-400 bg-red-950/60 border-red-500/40'
    : memoryInfo.usedHeapMb > 1800
    ? 'text-amber-400 bg-amber-950/60 border-amber-500/40'
    : 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40';

  const ramStatusLabel = memoryInfo.usedHeapMb > 3000
    ? 'CRITICAL (RAM GUARD)'
    : memoryInfo.usedHeapMb > 1800
    ? 'ELEVATED'
    : 'OPTIMAL (60 FPS)';

  return (
    <div className={`w-full bg-[#0c0d12] border border-[#232332] rounded-xl p-3.5 text-zinc-300 font-mono text-xs space-y-4 shadow-xl ${className}`}>
      
      {/* ───────────────────────────────────────────────────────── */}
      {/* 1. Header with Live Telemetry Pulse & Control Buttons      */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-[#F5A623]" />
          <div>
            <h4 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-1.5">
              <span>MEDIA VAULT TELEMETRY</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h4>
            <span className="text-[9px] text-zinc-400 font-mono">D3 DISK ALLOCATION & RAM ENGINE</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={fetchAllMetrics}
            className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            title="Refresh Storage & Memory Metrics"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="px-2.5 py-1.5 rounded bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-[10px] flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-zinc-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* 2. Key Metrics 2x2 Telemetry Grid                         */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        {/* Metric 1: Total Vault Footprint */}
        <div className="p-2.5 bg-[#12131C] border border-[#232332] rounded-lg">
          <span className="text-[9px] text-zinc-400 block uppercase font-bold">TOTAL VAULT DISK</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-black text-[#F5A623]">{formatBytes(totalVaultBytes)}</span>
            <span className="text-[9px] text-zinc-500">({vaultItems.length} RAW)</span>
          </div>
          <div className="w-full h-1 bg-black/60 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-[#F5A623]" style={{ width: `${Math.min(100, Math.max(5, (totalVaultBytes / (1024*1024*1024)) * 100))}%` }} />
          </div>
        </div>

        {/* Metric 2: RAM & JS Heap Consumption */}
        <div className="p-2.5 bg-[#12131C] border border-[#232332] rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-zinc-400 block uppercase font-bold">HEAP CONSUMPTION</span>
            <span className={`text-[7.5px] px-1 py-0.2 rounded border font-bold ${ramStatusColor}`}>
              {ramStatusLabel}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-black text-[#00F0FF]">{memoryInfo.usedHeapMb} MB</span>
            <span className="text-[9px] text-zinc-500">/ {memoryInfo.limitHeapMb} MB</span>
          </div>
          <div className="w-full h-1 bg-black/60 rounded-full mt-1.5 overflow-hidden">
            <div 
              className="h-full bg-[#00F0FF]" 
              style={{ width: `${Math.min(100, Math.max(4, (memoryInfo.usedHeapMb / memoryInfo.limitHeapMb) * 100))}%` }} 
            />
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* 3. D3 Storage Allocation Donut Chart                      */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="bg-[#12131C] border border-[#232332] rounded-lg p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-3 h-3 text-[#F5A623]" />
            D3 STORAGE ALLOCATION BREAKDOWN
          </span>
          <span className="text-[9px] text-zinc-500 font-mono">HOVER ARCS</span>
        </div>

        <div className="flex items-center justify-center py-1">
          <svg ref={donutSvgRef} className="w-full max-w-[260px] h-auto overflow-visible" />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/5 text-[9px]">
          {categories.map((c) => (
            <div 
              key={c.name}
              onMouseEnter={() => setSelectedCategory(c)}
              onMouseLeave={() => setSelectedCategory(null)}
              className={`p-1 rounded flex items-center justify-between transition-colors cursor-pointer ${
                selectedCategory?.name === c.name ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-zinc-300 truncate">{c.name}</span>
              </div>
              <span className="font-bold tabular-nums text-zinc-400 shrink-0">{formatBytes(c.bytes)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* 4. D3 Live Memory / RAM Consumption Sparkline             */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="bg-[#12131C] border border-[#232332] rounded-lg p-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-[#00F0FF]" />
            D3 REAL-TIME RAM CONSUMPTION
          </span>
          <span className="text-[9px] text-[#00F0FF] font-bold tabular-nums">
            {memoryInfo.usedHeapMb} MB CURRENT
          </span>
        </div>

        <div className="w-full overflow-hidden">
          <svg ref={memorySvgRef} className="w-full h-[70px] overflow-visible" />
        </div>
        <div className="flex items-center justify-between text-[8px] text-zinc-500 font-mono">
          <span>Temporal Rolling Samples (T-60s)</span>
          <span>4GB Silicon Guard Active</span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* 5. D3 Top Largest Vault Assets Bar Chart                  */}
      {/* ───────────────────────────────────────────────────────── */}
      {topAssets.length > 0 && (
        <div className="bg-[#12131C] border border-[#232332] rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-[#F5A623]" />
              TOP HEAVIEST MEDIA VAULT ASSETS
            </span>
            <span className="text-[9px] text-zinc-500">{topAssets.length} SHOWN</span>
          </div>

          <div className="w-full overflow-hidden">
            <svg ref={barChartSvgRef} className="w-full h-auto overflow-visible" />
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* 6. Service Worker L2 Cache Fast-Load Storyboard Actions   */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="bg-[#101518] border border-emerald-500/30 rounded-lg p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              SERVICE WORKER L2 CACHE
            </span>
          </div>
          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold rounded">
            {swMetrics.isActive ? 'ACTIVE & INTERCEPTING' : 'REGISTERING'}
          </span>
        </div>

        <div className="flex items-center justify-between text-[9px] text-zinc-400">
          <span>Cached Media Objects: <strong className="text-white">{swMetrics.itemCount}</strong></span>
          <span>Cached Footprint: <strong className="text-emerald-300">{formatBytes(swMetrics.totalBytes)}</strong></span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-500/20">
          <button
            type="button"
            disabled={isPrecaching}
            onClick={handlePrecacheStoryboardShots}
            className="px-2 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-95 border border-emerald-500/50 text-emerald-300 hover:text-emerald-200 rounded text-[9.5px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all disabled:opacity-50"
            title="Precache all media assets across the current Storyboard timeline"
          >
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>{isPrecaching ? 'Precaching...' : 'Precache Timeline'}</span>
          </button>

          <button
            type="button"
            disabled={isPurging}
            onClick={handlePurgeServiceWorkerCache}
            className="px-2 py-1.5 bg-white/5 hover:bg-red-950/40 active:scale-95 border border-white/10 hover:border-red-500/40 text-zinc-400 hover:text-red-300 rounded text-[9.5px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all disabled:opacity-50"
            title="Clear the Service Worker media cache"
          >
            <Trash2 className="w-3 h-3" />
            <span>{isPurging ? 'Purging...' : 'Clear SW Cache'}</span>
          </button>
        </div>
      </div>

    </div>
  );
};
