/**
 * @file /src/data/rawxVaultIO.ts
 * @description Encrypted and unencrypted .rawxvault bundle generation for offline zero-cloud backup.
 */

import { encryptProjectData } from './crypto';

export const encryptData = encryptProjectData;

/**
 * Creates a standalone downloadable .rawxvault bundle blob.
 */
export async function exportRawxVaultBundle(
  projectData: any,
  passphrase?: string
): Promise<Blob> {
  const serialized = JSON.stringify({
    schema: 'rawx-vault-bundle.v1',
    timestamp: Date.now(),
    project: projectData
  }, null, 2);

  if (passphrase && passphrase.trim()) {
    try {
      const encrypted = await encryptProjectData(serialized, passphrase.trim());
      return new Blob([JSON.stringify({
        schema: 'rawx-vault-encrypted.v1',
        timestamp: Date.now(),
        payload: encrypted
      }, null, 2)], { type: 'application/json' });
    } catch (e) {
      console.warn('Encryption fallback to plain bundle:', e);
    }
  }

  return new Blob([serialized], { type: 'application/json' });
}
