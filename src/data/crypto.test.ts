import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptProjectData, decryptProjectData } from './crypto.ts';

test('encryptProjectData and decryptProjectData perform round trip AES-GCM successfully', async () => {
  const secretProject = JSON.stringify({
    title: "RAWx Classified Film Anthology",
    shots: [1, 2, 3]
  });
  const passphrase = "DirectorKey2026";

  const ciphertext = await encryptProjectData(secretProject, passphrase);
  assert.ok(ciphertext.includes('ciphertext'));
  assert.ok(ciphertext.includes('salt'));

  const decrypted = await decryptProjectData(ciphertext, passphrase);
  assert.equal(decrypted, secretProject);
});

test('decryptProjectData throws on incorrect passphrase', async () => {
  const secretProject = "Top secret script";
  const passphrase = "CorrectPassword";
  const wrongPassphrase = "WrongPassword";

  const ciphertext = await encryptProjectData(secretProject, passphrase);

  await assert.rejects(
    async () => {
      await decryptProjectData(ciphertext, wrongPassphrase);
    },
    /operation failed|MAC check failed|tag mismatch|decryption/i
  );
});
