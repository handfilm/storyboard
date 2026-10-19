import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  calculateSlideshowInterval, 
  getLutFilterCSS, 
  filterFrames, 
  calculateAnthologyStats, 
  generateProjectMarkdown,
  generateCSVExport 
} from './engine.ts';
import type { AnthologyFrame, AnthologyProject } from '../types/anthology.ts';

const mockFrames: AnthologyFrame[] = [
  {
    id: 0,
    epNumber: "001",
    title: "THE SINGULARITY",
    bengaliTitle: "দৃষ্টি",
    tagline: "MACRO EYES: PUPILS DILATING",
    directorNotes: "Extreme close-up on iris",
    soundCue: "Sub-bass pulse 36Hz",
    cameraSpec: {
      focalLength: "35mm High-Speed Master",
      aperture: "f/1.4",
      shutter: "1/48s 180°",
      iso: "ISO 400",
      sensor: "Full-Frame Cine",
      format: "RAW 14-BIT"
    },
    imageUrl: "https://example.com/photo1.jpg",
    colorAccent: "#d4af37",
    hoverStyle: 0,
    lutFilter: 'cinematic',
    aspectRatio: '2.39:1',
    adjustments: {
      brightness: 100,
      contrast: 120,
      saturation: 110,
      bloom: 50,
      grain: 10,
      motionBlur: 70,
      vignette: 40
    },
    tags: ["macro", "cosmic", "eyes"]
  },
  {
    id: 1,
    epNumber: "002",
    title: "EVENT HORIZON",
    bengaliTitle: "সীমানা",
    tagline: "FIRST GLIMPSE",
    directorNotes: "Boundary definition",
    soundCue: "Gravitational sweep",
    cameraSpec: {
      focalLength: "50mm Noctilux",
      aperture: "f/1.2",
      shutter: "1/48s 180°",
      iso: "ISO 200",
      sensor: "Full-Frame Cine",
      format: "RAW 14-BIT"
    },
    imageUrl: undefined,
    colorAccent: "#ff4b4b",
    hoverStyle: 1,
    lutFilter: 'noir',
    aspectRatio: '2.39:1',
    adjustments: {
      brightness: 90,
      contrast: 130,
      saturation: 0,
      bloom: 40,
      grain: 20,
      motionBlur: 50,
      vignette: 50
    },
    tags: ["horizon", "macro"]
  }
];

test('calculateSlideshowInterval scales speed correctly', () => {
  // At min (1), should be ~12000ms
  const minInterval = calculateSlideshowInterval(1);
  assert.equal(minInterval, 12000);

  // At max (100), should be ~600ms
  const maxInterval = calculateSlideshowInterval(100);
  assert.equal(maxInterval, 600);

  // At 50, should be between 600 and 12000
  const midInterval = calculateSlideshowInterval(50);
  assert.ok(midInterval > 5000 && midInterval < 7000);
});

test('getLutFilterCSS produces valid CSS filter strings for presets', () => {
  const adj = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    bloom: 50,
    grain: 10,
    motionBlur: 50,
    vignette: 30
  };

  const noirCSS = getLutFilterCSS('noir', adj);
  assert.ok(noirCSS.includes('grayscale(1)'));

  const goldenCSS = getLutFilterCSS('golden', adj);
  assert.ok(goldenCSS.includes('sepia(0.35)'));

  const cyberCSS = getLutFilterCSS('cyberpunk', adj);
  assert.ok(cyberCSS.includes('hue-rotate(-25deg)'));
});

test('filterFrames correctly matches queries and tags', () => {
  // Match by title
  const matchedTitle = filterFrames(mockFrames, "horizon");
  assert.equal(matchedTitle.length, 1);
  assert.equal(matchedTitle[0].epNumber, "002");

  // Match by Bengali title
  const matchedBengali = filterFrames(mockFrames, "দৃষ্টি");
  assert.equal(matchedBengali.length, 1);
  assert.equal(matchedBengali[0].epNumber, "001");

  // Match by tag
  const matchedTag = filterFrames(mockFrames, "", "macro");
  assert.equal(matchedTag.length, 2);

  const matchedCosmic = filterFrames(mockFrames, "", "cosmic");
  assert.equal(matchedCosmic.length, 1);

  // Non-matching query
  const matchedNone = filterFrames(mockFrames, "nonexistent-query-12345");
  assert.equal(matchedNone.length, 0);
});

test('calculateAnthologyStats calculates accurate totals and completion rates', () => {
  const stats = calculateAnthologyStats(mockFrames);
  assert.equal(stats.total, 2);
  assert.equal(stats.populated, 1);
  assert.equal(stats.percentComplete, 50);
  assert.ok(stats.uniqueTags.includes("macro"));
  assert.ok(stats.uniqueTags.includes("cosmic"));
});

test('generateProjectMarkdown outputs GitHub compatible markdown', () => {
  const project: AnthologyProject = {
    title: "RAWx Test Anthology",
    director: "Rakib Himon",
    nodeLocation: "DHAKA_01",
    aspectRatio: "2.39:1",
    frames: mockFrames,
    createdAt: "2026-10-18",
    version: "1.0.0"
  };

  const md = generateProjectMarkdown(project);
  assert.ok(md.includes("# RAWx Test Anthology"));
  assert.ok(md.includes("Rakib Himon"));
  assert.ok(md.includes("DHAKA_01"));
  assert.ok(md.includes("| `001` | **THE SINGULARITY** |"));
});

test('generateCSVExport formats table headers and rows', () => {
  const csv = generateCSVExport(mockFrames);
  assert.ok(csv.startsWith('"Episode","Title","Bengali Title"'));
  assert.ok(csv.includes('"001","THE SINGULARITY","দৃষ্টি"'));
  assert.ok(csv.includes('"002","EVENT HORIZON","সীমানা"'));
});

test('featureFlags manager initializes and toggles values safely', async () => {
  const { featureFlags } = await import('../core/featureFlags.ts');
  assert.equal(featureFlags.get('enableBoardMode'), true);
  assert.equal(featureFlags.get('enableCutMode'), true);
  
  featureFlags.set('enableScriptNotebook', true);
  assert.equal(featureFlags.get('enableScriptNotebook'), true);
  
  featureFlags.set('enableScriptNotebook', false);
  assert.equal(featureFlags.get('enableScriptNotebook'), false);
});

test('featureRegistry indexes all studio capabilities with diagnostic handlers', async () => {
  const { featureRegistry } = await import('../core/featureRegistry.ts');
  const allFeatures = featureRegistry.getAll();
  assert.ok(allFeatures.length >= 10, 'Expected at least 10 core features registered');

  const stageFeature = featureRegistry.get('stage-view');
  assert.ok(stageFeature);
  assert.equal(stageFeature?.module, 'STAGE');

  const queryResults = featureRegistry.search('pan');
  assert.ok(queryResults.some(f => f.id === 'vertical-pan'));

  const selfTestResult = await stageFeature!.selfTest();
  assert.equal(selfTestResult.ok, true);
});

test('selfTestEngine 1000-shot stress benchmark passes under 250ms budget', async () => {
  const { selfTestEngine } = await import('../core/selfTest.ts');
  const report = await selfTestEngine.runStressTest(1000, 5000);
  assert.equal(report.shotCount, 1000);
  assert.equal(report.benchmarkPassed, true);
  assert.ok(report.elapsedMs < 250, `Expected stress run < 250ms, got ${report.elapsedMs}ms`);
  assert.ok(report.memoryEstimateMB > 0);
});

test('DEFAULT_COMPONENT_VISIBILITY enforces exact 12/13 initial active components', async () => {
  const { DEFAULT_COMPONENT_VISIBILITY } = await import('../components/ComponentsMatrixPopover.tsx');
  const totalKeys = Object.keys(DEFAULT_COMPONENT_VISIBILITY).length;
  const activeKeys = Object.values(DEFAULT_COMPONENT_VISIBILITY).filter(Boolean).length;

  assert.equal(totalKeys, 13, 'Expected exactly 13 component layers');
  assert.equal(activeKeys, 12, 'Expected exactly 12 active components initially (guides off by default)');
  assert.equal(DEFAULT_COMPONENT_VISIBILITY.guides, false);
  assert.equal(DEFAULT_COMPONENT_VISIBILITY.reticles, true);
  assert.equal(DEFAULT_COMPONENT_VISIBILITY.titleBn, true);
  assert.equal(DEFAULT_COMPONENT_VISIBILITY.titleEn, true);
});

test('ThemeManager applies design tokens and density settings accurately', async () => {
  const { themeManager, THEMES } = await import('../core/theme.ts');
  const initial = themeManager.getSettings();
  assert.ok(initial.theme);

  themeManager.setTheme('warm-film');
  assert.equal(themeManager.getSettings().theme, 'warm-film');
  assert.equal(THEMES['warm-film'].colors.bg, '#080605');

  themeManager.setDensity('spacious');
  assert.equal(themeManager.getSettings().density, 'spacious');

  // Reset back to RAWx Gold
  themeManager.setTheme('rawx-gold');
  themeManager.setDensity('compact');
});

