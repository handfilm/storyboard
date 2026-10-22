/**
 * @file /src/components/CloudR2Sync.tsx
 * @description Cloudflare R2 Cloud Backup & Zero-Egress S3 Streaming Dashboard.
 * Module 13: CLOUD & R2.
 */

import React, { useState, useEffect } from 'react';
import { useStudioStore } from '../core/store';
import { r2StorageService } from '../services/r2StorageService';
import { R2StreamingConfig, R2StreamingStats } from '../types/r2';
import { 
  Cloud, 
  HardDrive, 
  Radio, 
  RefreshCw, 
  CheckCircle2, 
  Send, 
  ShieldCheck, 
  Server,
  Zap,
  Activity
} from 'lucide-react';

export const CloudR2Sync: React.FC = () => {
  const { project } = useStudioStore();
  const [config, setConfig] = useState<R2StreamingConfig>(r2StorageService.getConfig());
  const [stats, setStats] = useState<R2StreamingStats>(r2StorageService.getStats());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    setStats(r2StorageService.getStats());
  }, []);

  const handleTestRange = async () => {
    setIsSyncing(true);
    setSyncStatus('Initiating byte-range test (bytes=0-1048576)...');
    try {
      const buffer = await r2StorageService.fetchByteRange({
        key: `reels/master_${project.title.toLowerCase().replace(/\s+/g, '_')}_4k.mp4`,
        startByte: 0,
        endByte: 1048576,
        totalSize: 45000000
      });
      setStats(r2StorageService.getStats());
      setSyncStatus(`✓ HTTP 206 Partial Content Streamed: ${Math.round(buffer.data.byteLength / 1024)} KB slice without buffering full 45MB file.`);
    } catch (err: any) {
      setSyncStatus(`Range request error: ${err.message || 'Stream simulation failed'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    r2StorageService.saveConfig(config);
    setSyncStatus('✓ R2 Cloudflare Configuration Saved!');
    setTimeout(() => setSyncStatus(null), 3000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#07070A] text-[#EDEDED] font-mono-tech select-none overflow-hidden">
      {/* Header */}
      <div className="h-11 px-3 border-b border-[#272732] bg-[#0C0C12] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Cloud className="w-4 h-4 text-[#fbbf24] shrink-0" />
          <span className="text-[11px] font-bold text-white tracking-widest uppercase truncate">
            13 CLOUDFLARE R2 & S3 STREAMING ARCHIVE
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleTestRange}
            disabled={isSyncing}
            className="px-2.5 py-1 rounded-[1px] bg-[#fbbf24] hover:bg-[#f59e0b] disabled:opacity-40 text-black font-bold text-[10px] flex items-center gap-1 cursor-pointer"
          >
            {isSyncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Radio className="w-3 h-3" />}
            <span>TEST BYTE-RANGE STREAM</span>
          </button>
        </div>
      </div>

      {syncStatus && (
        <div className="px-3 py-1.5 bg-[#fbbf24]/15 border-b border-[#fbbf24]/40 text-[#fbbf24] text-[10px] flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span className="font-bold">{syncStatus}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 max-w-4xl mx-auto w-full">
        {/* Streaming Telemetry Readout */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[9px]">
          <div className="p-2.5 bg-[#0C0C14] border border-[#272732] rounded-[2px]">
            <div className="text-zinc-500 uppercase flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#fbbf24]" />
              <span>ACTIVE CHUNKS</span>
            </div>
            <div className="text-base font-bold text-zinc-100 mt-1">{stats.activeChunkCount}</div>
          </div>
          <div className="p-2.5 bg-[#0C0C14] border border-[#272732] rounded-[2px]">
            <div className="text-zinc-500 uppercase flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-[#fbbf24]" />
              <span>BYTES STREAMED</span>
            </div>
            <div className="text-base font-bold text-[#fbbf24] mt-1">
              {(stats.totalBytesStreamed / (1024 * 1024)).toFixed(2)} MB
            </div>
          </div>
          <div className="p-2.5 bg-[#0C0C14] border border-[#272732] rounded-[2px]">
            <div className="text-zinc-500 uppercase flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>CACHE HIT RATIO</span>
            </div>
            <div className="text-base font-bold text-emerald-400 mt-1">
              {(stats.cacheHitRatio * 100).toFixed(0)}%
            </div>
          </div>
          <div className="p-2.5 bg-[#0C0C14] border border-[#272732] rounded-[2px]">
            <div className="text-zinc-500 uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-sky-400" />
              <span>EGRESS SAVINGS</span>
            </div>
            <div className="text-base font-bold text-sky-400 mt-1">$0.00 (Zero Egress)</div>
          </div>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSaveConfig} className="p-4 bg-[#0C0C14] border border-[#272732] rounded-[2px] space-y-3">
          <span className="text-[10px] text-[#fbbf24] font-bold uppercase tracking-wider block">
            R2 BUCKET & STREAMING ENDPOINT CONFIGURATION
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[9.5px]">
            <div>
              <label className="text-zinc-400 block mb-1">R2 Bucket Name</label>
              <input
                type="text"
                value={config.bucketName}
                onChange={e => setConfig({ ...config, bucketName: e.target.value })}
                className="w-full bg-black/60 border border-[#272732] px-2.5 py-1.5 rounded text-zinc-100 outline-none"
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1">Account ID</label>
              <input
                type="text"
                value={config.accountId}
                onChange={e => setConfig({ ...config, accountId: e.target.value })}
                className="w-full bg-black/60 border border-[#272732] px-2.5 py-1.5 rounded text-zinc-100 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-zinc-400 block mb-1">Custom Worker Domain / CDN URL</label>
              <input
                type="text"
                value={config.publicCdnDomain}
                onChange={e => setConfig({ ...config, publicCdnDomain: e.target.value })}
                className="w-full bg-black/60 border border-[#272732] px-2.5 py-1.5 rounded text-zinc-100 outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-black font-bold text-[10px] rounded-[1px] cursor-pointer"
            >
              SAVE CONFIGURATION
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
