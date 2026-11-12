# Permanent Storyboard Assets Directory

Drop your pre-saved photos or videos into this directory (`public/assets/`) before deploying to GitHub Pages or any static host.

### Naming Conventions Supported:
The applet automatically scans each of the 100 frames (from `001` to `100`) and auto-loads whichever media file it finds first:

- **Videos** (auto-plays with 4-layer optical glow & motion blur):
  - `001.mp4`, `001.webm`, `001.mov`, `002.mp4` ... `100.mp4`
- **Images**:
  - `001.jpg`, `001.jpeg`, `001.png`, `001.webp` ... `100.webp`

If a file is found for frame `001`, it will immediately load and auto-play with full cinematic grading, Orton center bloom, and hypersonic motion blur. If none is found, the frame remains open for live in-browser drag-and-drop or file upload.
