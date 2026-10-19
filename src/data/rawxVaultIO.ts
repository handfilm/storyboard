/**
 * RAWx Studio — .rawxvault Project Bundle Importer & Exporter
 * Public API: exportRawxVaultBundle, importRawxVaultBundle
 * Bundles project JSON, media references, and optional AES-GCM encryption.
 */

import { StudioProject } from '../core/schemas';
import { encryptProjectData, decryptProjectData } from './crypto';

export interface RawxVaultManifest {
  format: 'RAWX_VAULT_BUNDLE';
  version: '5.0.0';
  exportedAt: string;
  projectId: string;
  projectTitle: string;
  isEncrypted: boolean;
  totalShots: number;
}

export interface RawxVaultBundle {
  manifest: RawxVaultManifest;
  payload: string; // Plain JSON or AES-GCM ciphertext
}

export async function exportRawxVaultBundle(project: StudioProject, passphrase?: string): Promise<Blob> {
  const isEncrypted = Boolean(passphrase && passphrase.trim());
  const projectJson = JSON.stringify(project);

  let payload = projectJson;
  if (isEncrypted) {
    payload = await encryptProjectData(projectJson, passphrase!.trim());
  }

  const manifest: RawxVaultManifest = {
    format: 'RAWX_VAULT_BUNDLE',
    version: '5.0.0',
    exportedAt: new Date().toISOString(),
    projectId: project.id,
    projectTitle: project.title,
    isEncrypted,
    totalShots: project.shots.length
  };

  const bundle: RawxVaultBundle = {
    manifest,
    payload
  };

  return new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
}

export async function importRawxVaultBundle(bundleJson: string, passphrase?: string): Promise<StudioProject> {
  const bundle: RawxVaultBundle = JSON.parse(bundleJson);
  if (bundle.manifest?.format !== 'RAWX_VAULT_BUNDLE') {
    throw new Error('Invalid file format: Expected RAWX_VAULT_BUNDLE');
  }

  let projectJson = bundle.payload;
  if (bundle.manifest.isEncrypted) {
    if (!passphrase) {
      throw new Error('PROJECT_ENCRYPTED: Passphrase required to decrypt project');
    }
    projectJson = await decryptProjectData(bundle.payload, passphrase.trim());
  }

  return JSON.parse(projectJson) as StudioProject;
}
