import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Ensure CNAME and .nojekyll in dist and root for GitHub Pages
const cnameContent = 'storyboard.handsandhead.com\n';
const distDir = path.join(rootDir, 'dist');

if (fs.existsSync(distDir)) {
  fs.writeFileSync(path.join(distDir, 'CNAME'), cnameContent);
  fs.writeFileSync(path.join(distDir, '.nojekyll'), '');
}
fs.writeFileSync(path.join(rootDir, 'CNAME'), cnameContent);
fs.writeFileSync(path.join(rootDir, '.nojekyll'), '');

console.log('[SYNC] Static sync completed for all GitHub Pages deployment targets.');
