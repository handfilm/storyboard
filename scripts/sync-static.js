import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const distAssets = path.join(rootDir, 'dist', 'assets');
const rootAssets = path.join(rootDir, 'assets');
const distHtml = path.join(rootDir, 'dist', 'index.html');
const docsHtml = path.join(rootDir, 'docs', 'index.html');

// 1. Sync compiled assets to root assets/ so classic GitHub Pages "main root" has access
if (fs.existsSync(distAssets)) {
  if (!fs.existsSync(rootAssets)) {
    fs.mkdirSync(rootAssets, { recursive: true });
  }
  fs.cpSync(distAssets, rootAssets, { recursive: true });
  console.log('[SYNC] Successfully mirrored dist/assets -> ./assets');
}

// 2. Sync dist/index.html to docs/index.html for GitHub Pages "docs" folder mode
if (fs.existsSync(distHtml)) {
  const docsDir = path.join(rootDir, 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  fs.copyFileSync(distHtml, docsHtml);
  console.log('[SYNC] Successfully mirrored dist/index.html -> ./docs/index.html');
}

// 3. Ensure CNAME and .nojekyll in dist
const cnameContent = 'storyboard.handsandhead.com\n';
fs.writeFileSync(path.join(rootDir, 'dist', 'CNAME'), cnameContent);
fs.writeFileSync(path.join(rootDir, 'dist', '.nojekyll'), '');
fs.writeFileSync(path.join(rootDir, 'CNAME'), cnameContent);
fs.writeFileSync(path.join(rootDir, '.nojekyll'), '');

console.log('[SYNC] Static sync completed for all GitHub Pages deployment targets.');
