/**
 * @file /src/types/r2.ts
 * @description Cloudflare R2 Media Streaming & Zero-Egress Storage Engine types.
 */

export interface R2StreamingConfig {
  accountId: string;
  bucketName: string;
  publicCdnDomain: string; // e.g., 'assets.handsandhead.com' or 'r2.handsandhead.com'
  workerEndpoint: string; // Cloudflare Worker proxy for pre-signed URLs & byte-range streaming
  accessKeyId?: string;
  isCustomWorkerEnabled: boolean;
  preSignedExpirySeconds: number;
}

export interface R2AssetMetadata {
  id: string;
  key: string; // Storage path in bucket, e.g. 'reels/2026/shot_001_4k.mp4'
  name: string;
  sizeBytes: number;
  mimeType: string;
  etag: string;
  uploadedAt: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  streamUrl: string; // Cloudflare CDN or worker pre-signed URL
  isByteRangeSupported: boolean;
  checksumSha256?: string;
  tags?: string[];
}

export interface R2ByteRangeRequest {
  key: string;
  startByte: number;
  endByte?: number;
  totalSize?: number;
}

export interface R2PreSignedTicket {
  key: string;
  uploadUrl: string;
  streamUrl: string;
  expiresAt: string;
  headers: Record<string, string>;
}

export interface R2StreamingStats {
  totalBytesStreamed: number;
  activeChunkCount: number;
  egressCostSavedUsd: number; // Cloudflare R2 $0 egress calculation
  cacheHitRatio: number; // %
  lastLatencyMs: number;
}
