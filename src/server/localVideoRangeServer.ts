import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

export const LOCAL_MEDIA_MIME_MAP: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.ogv': 'video/ogg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg'
};

export interface LocalVideoCacheStats {
  hits: number;
  misses: number;
  cachedBytes: number;
  maxCacheBytes: number;
  blockCount: number;
}

/**
 * In-memory LRU 1MB Byte-Block Cache modeled after VLC's `--file-caching` RAM ring buffer.
 * Keyed by `${filePath}|${size}|${mtimeMs}|${blockIndex}` so modified files auto-invalidate.
 */
export class LruByteBlockCache {
  private readonly maxBytes: number;
  public readonly chunkBytes: number;
  private currentBytes = 0;
  private blocks = new Map<string, Buffer>();
  public hits = 0;
  public misses = 0;

  constructor(maxBytes = 192 * 1024 * 1024, chunkBytes = 1024 * 1024) {
    this.maxBytes = Math.max(chunkBytes, maxBytes);
    this.chunkBytes = Math.max(64 * 1024, chunkBytes);
  }

  public makeKey(fileKey: string, blockIdx: number): string {
    return `${fileKey}#${blockIdx}`;
  }

  public get(fileKey: string, blockIdx: number): Buffer | undefined {
    const key = this.makeKey(fileKey, blockIdx);
    const hit = this.blocks.get(key);
    if (!hit) {
      this.misses++;
      return undefined;
    }
    this.hits++;
    // Refresh recency
    this.blocks.delete(key);
    this.blocks.set(key, hit);
    return hit;
  }

  public set(fileKey: string, blockIdx: number, buf: Buffer): void {
    if (buf.byteLength === 0 || buf.byteLength > this.maxBytes) return;
    const key = this.makeKey(fileKey, blockIdx);
    const existing = this.blocks.get(key);
    if (existing) {
      this.currentBytes -= existing.byteLength;
      this.blocks.delete(key);
    }
    while (this.currentBytes + buf.byteLength > this.maxBytes && this.blocks.size > 0) {
      const oldestKey = this.blocks.keys().next().value;
      if (oldestKey === undefined) break;
      const oldest = this.blocks.get(oldestKey);
      this.blocks.delete(oldestKey);
      if (oldest) {
        this.currentBytes -= oldest.byteLength;
      }
    }
    this.blocks.set(key, buf);
    this.currentBytes += buf.byteLength;
  }

  public getStats(): LocalVideoCacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      cachedBytes: this.currentBytes,
      maxCacheBytes: this.maxBytes,
      blockCount: this.blocks.size
    };
  }

  public clear(): void {
    this.blocks.clear();
    this.currentBytes = 0;
    this.hits = 0;
    this.misses = 0;
  }
}

interface CachedStatEntry {
  size: number;
  mtimeMs: number;
  expiresAt: number;
}

export function setLocalVideoCorsHeaders(res: Response): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, If-None-Match, If-Range');
  res.setHeader(
    'Access-Control-Expose-Headers',
    'Content-Range, Content-Length, Accept-Ranges, ETag, Cache-Control, Last-Modified'
  );
}

export interface LocalVideoMiddlewareOptions {
  maxCacheBytes?: number;
  chunkBytes?: number;
  statTtlMs?: number;
}

export interface LocalVideoRangeHandler {
  middleware: (req: Request, res: Response, next: NextFunction) => void;
  cache: LruByteBlockCache;
  clearCaches: () => void;
}

const MAX_CACHED_RANGE_SPAN = 8 * 1024 * 1024; // Serve & cache bounded seeks up to 8MB directly in RAM blocks

export function createLocalVideoRangeMiddleware(
  options: LocalVideoMiddlewareOptions = {}
): LocalVideoRangeHandler {
  const cache = new LruByteBlockCache(
    options.maxCacheBytes ?? 192 * 1024 * 1024,
    options.chunkBytes ?? 1024 * 1024
  );
  const statTtlMs = options.statTtlMs ?? 2000;
  const statCache = new Map<string, CachedStatEntry>();

  const getCachedFileStat = (filePath: string): { size: number; mtimeMs: number } | null => {
    const now = Date.now();
    const cached = statCache.get(filePath);
    if (cached && cached.expiresAt > now) {
      return { size: cached.size, mtimeMs: cached.mtimeMs };
    }
    try {
      const st = fs.statSync(filePath);
      if (!st.isFile()) return null;
      const entry: CachedStatEntry = {
        size: st.size,
        mtimeMs: st.mtimeMs,
        expiresAt: now + statTtlMs
      };
      if (statCache.size > 512) {
        const firstKey = statCache.keys().next().value;
        if (firstKey !== undefined) statCache.delete(firstKey);
      }
      statCache.set(filePath, entry);
      return { size: st.size, mtimeMs: st.mtimeMs };
    } catch {
      statCache.delete(filePath);
      return null;
    }
  };

  const readBlockCached = async (
    rawPath: string,
    fileKey: string,
    fileSize: number,
    blockIdx: number
  ): Promise<Buffer> => {
    const cached = cache.get(fileKey, blockIdx);
    if (cached) return cached;

    const blockStart = blockIdx * cache.chunkBytes;
    const blockEnd = Math.min(fileSize, blockStart + cache.chunkBytes);
    const len = Math.max(0, blockEnd - blockStart);
    if (len === 0) return Buffer.alloc(0);

    const fh = await fsPromises.open(rawPath, 'r');
    try {
      const buf = Buffer.allocUnsafe(len);
      let totalRead = 0;
      while (totalRead < len) {
        const { bytesRead } = await fh.read(buf, totalRead, len - totalRead, blockStart + totalRead);
        if (bytesRead === 0) break;
        totalRead += bytesRead;
      }
      const finalBuf = totalRead === len ? buf : buf.subarray(0, totalRead);
      cache.set(fileKey, blockIdx, finalBuf);
      return finalBuf;
    } finally {
      await fh.close().catch(() => {});
    }
  };

  const middleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') {
      setLocalVideoCorsHeaders(res);
      return res.status(204).end();
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    setLocalVideoCorsHeaders(res);
    // Minimize seek packet latency over loopback TCP
    try {
      req.socket?.setNoDelay?.(true);
    } catch {}

    const rawPath = typeof req.query.path === 'string' ? req.query.path.trim() : '';
    if (!rawPath) {
      return res.status(400).json({ success: false, error: 'Missing path query parameter' });
    }

    const st = getCachedFileStat(rawPath);
    if (!st) {
      return res.status(404).json({ success: false, error: 'Local media file not found' });
    }

    const fileSize = st.size;
    const mtimeMs = Math.trunc(st.mtimeMs);
    const etag = `"v1-${fileSize}-${mtimeMs}"`;
    const fileKey = `${rawPath}|${fileSize}|${mtimeMs}`;
    const ext = path.extname(rawPath).toLowerCase();
    const contentType = LOCAL_MEDIA_MIME_MAP[ext] || 'application/octet-stream';

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', new Date(mtimeMs).toUTCString());

    const ifNoneMatch = req.headers['if-none-match'];
    if (typeof ifNoneMatch === 'string' && ifNoneMatch.trim() === etag) {
      return res.status(304).end();
    }

    let rangeHeader = req.headers.range;
    const ifRange = req.headers['if-range'];
    if (rangeHeader && typeof ifRange === 'string' && ifRange.trim() && ifRange.trim() !== etag) {
      rangeHeader = undefined;
    }

    if (rangeHeader) {
      const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
      if (!match) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.status(416).end();
      }

      let start = match[1] ? parseInt(match[1], 10) : 0;
      let end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

      if (!match[1] && match[2]) {
        const suffixLen = parseInt(match[2], 10);
        start = Math.max(0, fileSize - suffixLen);
        end = fileSize - 1;
      }

      if (fileSize === 0) {
        res.setHeader('Content-Range', 'bytes */0');
        return res.status(416).end();
      }

      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 0 ||
        end >= fileSize ||
        start > end
      ) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.status(416).end();
      }

      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', String(chunkSize));

      if (req.method === 'HEAD') {
        return res.end();
      }

      if (chunkSize <= MAX_CACHED_RANGE_SPAN) {
        const firstBlock = Math.floor(start / cache.chunkBytes);
        const lastBlock = Math.floor(end / cache.chunkBytes);
        let aborted = false;
        res.on('close', () => {
          aborted = true;
        });

        void (async () => {
          try {
            const parts: Buffer[] = [];
            for (let b = firstBlock; b <= lastBlock; b++) {
              if (aborted) return;
              const blockBuf = await readBlockCached(rawPath, fileKey, fileSize, b);
              const blockBaseOffset = b * cache.chunkBytes;
              const sliceStart = Math.max(0, start - blockBaseOffset);
              const sliceEnd = Math.min(blockBuf.byteLength, end - blockBaseOffset + 1);
              if (sliceEnd > sliceStart) {
                parts.push(blockBuf.subarray(sliceStart, sliceEnd));
              }
            }
            if (!aborted) {
              res.end(parts.length === 1 ? parts[0] : Buffer.concat(parts));
            }
          } catch {
            if (!aborted) {
              if (!res.headersSent) res.status(500).end();
              else res.end();
            }
          }
        })();
        return;
      }

      // Open-ended or very large streaming range: 1MB highWaterMark zero-copy pipe
      // Passively warm head blocks (first 4MB) if aligned at block 0
      const stream = fs.createReadStream(rawPath, { start, end, highWaterMark: cache.chunkBytes });
      res.on('close', () => stream.destroy());
      stream.on('error', () => {
        if (!res.headersSent) res.status(500).end();
        else res.end();
      });
      stream.pipe(res);
      return;
    }

    res.status(200);
    res.setHeader('Content-Length', String(fileSize));

    if (req.method === 'HEAD' || fileSize === 0) {
      return res.end();
    }

    if (fileSize <= MAX_CACHED_RANGE_SPAN) {
      const lastBlock = Math.floor(Math.max(0, fileSize - 1) / cache.chunkBytes);
      let aborted = false;
      res.on('close', () => {
        aborted = true;
      });
      void (async () => {
        try {
          const parts: Buffer[] = [];
          for (let b = 0; b <= lastBlock; b++) {
            if (aborted) return;
            parts.push(await readBlockCached(rawPath, fileKey, fileSize, b));
          }
          if (!aborted) {
            res.end(parts.length === 1 ? parts[0] : Buffer.concat(parts));
          }
        } catch {
          if (!aborted) {
            if (!res.headersSent) res.status(500).end();
            else res.end();
          }
        }
      })();
      return;
    }

    const stream = fs.createReadStream(rawPath, { highWaterMark: cache.chunkBytes });
    res.on('close', () => stream.destroy());
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).end();
      else res.end();
    });
    stream.pipe(res);
  };

  return {
    middleware,
    cache,
    clearCaches: () => {
      cache.clear();
      statCache.clear();
    }
  };
}
