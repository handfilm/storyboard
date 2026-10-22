/**
 * @file /src/data/homepageSlides.ts
 * @description Curated Cinema Hero Slides with 5 Ultra-Widescreen Cinematic Artworks.
 * 
 * Mappings:
 * - Slide 01: 'The Death of Bloat // Zero-Cloud Sovereign Core' -> 02.jpg (Server room / Cyberpunk terminal)
 * - Slide 02: 'The 15s Dopamine Filter // Instant Creative Pulse' -> 01.jpg (Rain-slicked neon street portrait)
 * - Slide 03: 'The 12.0s Cinematic Meter // 288 Frames @ 24fps Locked' -> 03.jpg (Editor at grading monitor / Timeline grid)
 * - Slide 04: 'Dual-Mode Playback Engine // Sequence Animatic vs Solo Inspector' -> 04.jpg (Dual-monitor setup with console wheel)
 * - Slide 05: '2.39:1 Optical Scope // The Director's True Aspect' -> 05 (2).jpg (Film set with anamorphic camera and light flares)
 */

export type SlideWidgetKey =
  | 'telemetry'
  | 'vibe'
  | 'meter'
  | 'playback'
  | 'scope'
  | 'type'
  | 'audio'
  | 'silicon'
  | 'xml'
  | 'launch';

export interface HomepageSlide {
  id: number;
  title: string;
  subtitle: string;
  body: string;
  tag: string;
  widget: SlideWidgetKey;
  backgroundImage: string;
  imageAlt: string;
  aspectRatio: string;
}

export const HOMEPAGE_SLIDES: readonly HomepageSlide[] = [
  {
    id: 1,
    title: 'THE DEATH OF BLOAT',
    subtitle: 'Zero-Cloud Sovereign Core',
    tag: 'LOCAL-FIRST ARCHITECTURE',
    widget: 'telemetry',
    backgroundImage: '/assets/aistudio/02_4487d60a.jpg',
    imageAlt: 'Server room and sovereign cyberpunk terminal station',
    aspectRatio: '2.39:1',
    body: "Reject multi-gigabyte desktop software, render queues, and cloud subscriptions. Your browser's GPU and IndexedDB run the entire studio.",
  },
  {
    id: 2,
    title: 'THE 15S DOPAMINE FILTER',
    subtitle: 'Instant Creative Pulse',
    tag: 'RAPID CREATIVE VALIDATION',
    widget: 'vibe',
    backgroundImage: '/assets/aistudio/01_5fdc96be.jpg',
    imageAlt: 'Rain-slicked neon street cinematic anamorphic portrait',
    aspectRatio: '2.39:1',
    body: "Drop raw footage onto the stage. If it doesn't give you chills with music and title within three seconds, kill the shot instantly.",
  },
  {
    id: 3,
    title: 'THE 12.0S CINEMATIC METER',
    subtitle: '288 Frames @ 24fps Locked',
    tag: 'TEMPORAL PRECISION',
    widget: 'meter',
    backgroundImage: '/assets/aistudio/03_307d68f5.jpg',
    imageAlt: 'Director and editor at ultra-wide grading monitor with timeline grid',
    aspectRatio: '2.39:1',
    body: 'Every storyboard frame is constrained to a strict 12.000s temporal block. Master your pacing before committing to deep assembly.',
  },
  {
    id: 4,
    title: 'DUAL-MODE PLAYBACK ENGINE',
    subtitle: 'Sequence Animatic vs Solo Inspector',
    tag: 'MACRO / MICRO CONTROL',
    widget: 'playback',
    backgroundImage: '/assets/aistudio/04_a108e8eb.jpg',
    imageAlt: 'Dual-monitor editing bay with console jog-shuttle control wheel',
    aspectRatio: '2.39:1',
    body: 'Switch seamlessly between macro sequence flow (continuous 100-slide playback) and micro sub-frame scrubbing with J-K-L shuttling.',
  },
  {
    id: 5,
    title: '2.39:1 OPTICAL SCOPE',
    subtitle: "The Director's True Aspect",
    tag: 'CINEMATIC COMPOSITION',
    widget: 'scope',
    backgroundImage: '/assets/aistudio/05__2__6d814b04.jpg',
    imageAlt: 'Film set production with anamorphic cinema camera and horizontal lens flares',
    aspectRatio: '2.39:1',
    body: 'True theatrical widescreen letterboxing with real-time anamorphic lens streaks and zero hover clutter.',
  },
  {
    id: 6,
    title: 'BILINGUAL TYPOGRAPHIC ART',
    subtitle: 'Real-Time Gold Metallic Bloom',
    tag: 'TYPE / LIGHT / LANGUAGE',
    widget: 'type',
    backgroundImage: '/assets/aistudio/image_5ea6c84c.png',
    imageAlt: 'Bilingual typography with gold metallic bloom on cinema plate',
    aspectRatio: '2.39:1',
    body: 'Elevate native Bangla and English titles into high-fashion cinema graphics with real-time bidirectional inspector synchronization.',
  },
  {
    id: 7,
    title: 'AUDIO TRANSIENT BEAT-SYNC',
    subtitle: 'DSP Waveform Intelligence',
    tag: 'RHYTHM-AWARE EDITING',
    widget: 'audio',
    backgroundImage: '/assets/aistudio/image_7e972830.png',
    imageAlt: 'DSP audio transient waveform synchronized to video cuts',
    aspectRatio: '2.39:1',
    body: 'Built-in Web Audio API peak detection marks kick and snare downbeats, snapping shot cuts automatically to musical rhythm.',
  },
  {
    id: 8,
    title: 'SOVEREIGN LOCAL SILICON',
    subtitle: 'Your Machine Is The Server',
    tag: 'LOCAL DATA OWNERSHIP',
    widget: 'silicon',
    backgroundImage: '/assets/aistudio/image_a4619b66.png',
    imageAlt: 'Hardware GPU and sovereign IndexedDB local silicon node',
    aspectRatio: '2.39:1',
    body: '100% client-side persistence via IndexedDB. Your footage never leaves your local drive. Complete operational security.',
  },
  {
    id: 9,
    title: 'ONE-CLICK NLE HANDOVER',
    subtitle: 'Premiere & CapCut XML Pipeline',
    tag: 'PORTABLE EDIT DECISIONS',
    widget: 'xml',
    backgroundImage: '/assets/aistudio/image_b3398899.png',
    imageAlt: 'Hollywood NLE XML timeline export for CapCut and Premiere Pro',
    aspectRatio: '2.39:1',
    body: 'Export native FCP 7 XML and FCPXML directly to CapCut Desktop or Premiere Pro with complete timecodes, titles, and track metadata.',
  },
  {
    id: 10,
    title: 'CLIENT-SIDE MP4 EXPORTER',
    subtitle: 'Local WebCodecs Hardware Muxer',
    tag: 'FROM IDEA TO DELIVERABLE',
    widget: 'launch',
    backgroundImage: '/assets/aistudio/image_c26145a7.png',
    imageAlt: 'WebCodecs hardware MP4 muxer exporting master cut',
    aspectRatio: '2.39:1',
    body: 'Render selected frame ranges directly into high-fidelity H.264 MP4 files straight from your canvas, completely in-browser.',
  },
];
