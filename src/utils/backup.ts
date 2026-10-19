/**
 * @file /src/utils/backup.ts
 * @description Safety Net: Full IndexedDB and local storage backup exporter.
 * Dumps all IndexedDB databases, object stores, records, and localStorage keys
 * into a single JSON file without modifying or deleting any existing records.
 */

export interface BackupStoreData {
  storeName: string;
  records: Array<{ key: any; value: any }>;
}

export interface BackupDbData {
  dbName: string;
  version: number;
  stores: BackupStoreData[];
}

export interface FullBackupPayload {
  exportVersion: string;
  timestamp: string;
  app: string;
  databases: BackupDbData[];
  localStorage: Record<string, string>;
}

/**
 * Reads all entries from a single object store
 */
function dumpObjectStore(db: IDBDatabase, storeName: string): Promise<Array<{ key: any; value: any }>> {
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const records: Array<{ key: any; value: any }> = [];

      const cursorReq = store.openCursor();
      cursorReq.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          records.push({ key: cursor.key, value: cursor.value });
          cursor.continue();
        } else {
          resolve(records);
        }
      };
      cursorReq.onerror = () => {
        resolve([]);
      };
    } catch {
      resolve([]);
    }
  });
}

/**
 * Dumps a single named IndexedDB database
 */
function dumpDatabase(dbName: string): Promise<BackupDbData | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(dbName);
      req.onsuccess = async () => {
        const db = req.result;
        const storeNames = Array.from(db.objectStoreNames);
        const stores: BackupStoreData[] = [];

        for (const sName of storeNames) {
          const records = await dumpObjectStore(db, sName);
          stores.push({ storeName: sName, records });
        }

        const data: BackupDbData = {
          dbName,
          version: db.version,
          stores
        };
        db.close();
        resolve(data);
      };
      req.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Collects all IndexedDB databases and dumps everything to a downloadable file.
 */
export async function exportFullIdbBackup(): Promise<{ success: boolean; byteSize: number; dbCount: number; message: string }> {
  try {
    const knownDbNames = new Set<string>(['RAWxVault100_DB', 'rawx-vault', 'RAWxVault', 'keyval-store']);

    // Query databases if API is available
    if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
      try {
        const dbs = await indexedDB.databases();
        for (const info of dbs) {
          if (info.name) knownDbNames.add(info.name);
        }
      } catch {
        // Fall back to known names
      }
    }

    const dumpedDbs: BackupDbData[] = [];
    for (const dbName of knownDbNames) {
      const dumped = await dumpDatabase(dbName);
      if (dumped && dumped.stores.length > 0) {
        dumpedDbs.push(dumped);
      }
    }

    // Capture LocalStorage keys
    const lsData: Record<string, string> = {};
    if (typeof localStorage !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) {
            lsData[k] = localStorage.getItem(k) || '';
          }
        }
      } catch {
        // LocalStorage fallback
      }
    }

    const payload: FullBackupPayload = {
      exportVersion: 'rawx-backup.v1',
      timestamp: new Date().toISOString(),
      app: 'RAWx Storyboard Engine',
      databases: dumpedDbs,
      localStorage: lsData
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `RAWx-Vault-Full-Backup-${dateStr}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      success: true,
      byteSize: blob.size,
      dbCount: dumpedDbs.length,
      message: `Safety backup successfully created (${(blob.size / 1024).toFixed(1)} KB)`
    };
  } catch (err: any) {
    return {
      success: false,
      byteSize: 0,
      dbCount: 0,
      message: err?.message || 'Failed to generate IDB backup'
    };
  }
}
