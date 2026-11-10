import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const cnameContent = 'storyboard.handsandhead.com\n';
const distDir = path.join(rootDir, 'dist');
const distAssetsDir = path.join(distDir, 'assets');
const rootAssetsDir = path.join(rootDir, 'assets');
const docsDir = path.join(rootDir, 'docs');
const docsAssetsDir = path.join(docsDir, 'assets');
const publicDir = path.join(rootDir, 'public');

// 1. Ensure CNAME and .nojekyll in all deployment targets
const targetDirs = [rootDir, distDir, docsDir, publicDir];
targetDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(path.join(dir, 'CNAME'), cnameContent);
  fs.writeFileSync(path.join(dir, '.nojekyll'), '');
});

// 2. Synchronize compiled production assets from dist/ to root and docs/
if (fs.existsSync(distAssetsDir)) {
  // Sync to root ./assets so root index.html can load ./assets/index.js & ./assets/index.css
  fs.mkdirSync(rootAssetsDir, { recursive: true });
  fs.cpSync(distAssetsDir, rootAssetsDir, { recursive: true, force: true });
  console.log('✅ Copied compiled bundles to root ./assets/');

  // Sync to ./docs/assets so GitHub Pages "Deploy from /docs" works seamlessly
  fs.mkdirSync(docsAssetsDir, { recursive: true });
  fs.cpSync(distAssetsDir, docsAssetsDir, { recursive: true, force: true });
  console.log('✅ Copied compiled bundles to ./docs/assets/');
}

// 3. Synchronize production index.html to docs/ and 404.html
const distIndexHtml = path.join(distDir, 'index.html');
if (fs.existsSync(distIndexHtml)) {
  // docs/index.html
  fs.copyFileSync(distIndexHtml, path.join(docsDir, 'index.html'));
  console.log('✅ Synchronized dist/index.html to docs/index.html');

  // SPA 404 fallback for GitHub Pages client-side routing
  fs.copyFileSync(distIndexHtml, path.join(rootDir, '404.html'));
  fs.copyFileSync(distIndexHtml, path.join(publicDir, '404.html'));
  fs.copyFileSync(distIndexHtml, path.join(docsDir, '404.html'));
  console.log('✅ Generated 404.html SPA fallbacks for GitHub Pages');
}

// 4. Ensure public/assets (e.g. sample images) are copied to dist and root if needed
const publicAssetsDir = path.join(publicDir, 'assets');
if (fs.existsSync(publicAssetsDir)) {
  const distPublicAssets = path.join(distDir, 'assets');
  fs.cpSync(publicAssetsDir, distPublicAssets, { recursive: true, force: true });
}

console.log('[SYNC] Static sync completed for all GitHub Pages deployment targets (root, docs, and dist).');
