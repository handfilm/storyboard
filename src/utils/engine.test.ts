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

test('Safety Net IDB backup exporter loads and returns payload structure', async () => {
  const { exportFullIdbBackup } = await import('./backup.ts');
  assert.ok(typeof exportFullIdbBackup === 'function');
  // In Node.js environment without browser DOM / indexedDB, should handle gracefully
  const res = await exportFullIdbBackup();
  assert.equal(typeof res.success, 'boolean');
});

test('SMPTE Timecode calculation formats HH:MM:SS:FF accurately', async () => {
  const { framesToTimecode, timecodeToFrames, isValidTimecode, calculateShotTimecode } = await import('./timecode.ts');

  // 0 frames = 00:00:00:00
  assert.equal(framesToTimecode(0, 24), '00:00:00:00');

  // 24 frames @ 24fps = 1 second
  assert.equal(framesToTimecode(24, 24), '00:00:01:00');

  // 1440 frames @ 24fps = 1 minute
  assert.equal(framesToTimecode(1440, 24), '00:01:00:00');

  // 86400 frames @ 24fps = 1 hour
  assert.equal(framesToTimecode(86400, 24), '01:00:00:00');

  // Round trip parsing
  const tc = '00:01:30:12';
  const frames = timecodeToFrames(tc, 24);
  assert.ok(frames !== null);
  assert.equal(framesToTimecode(frames!, 24), tc);

  // Invalid timecode checks (rejecting mangled strings like 16:94:31:19:16)
  assert.equal(isValidTimecode('16:94:31:19:16', 24), false);
  assert.equal(isValidTimecode('00:00:00:25', 24), false); // 25 frames exceeds 24fps

  // Shot 0 starts at 00:00:00:00, shot 1 starts at 00:00:02:12 (60 frames)
  const shot0 = calculateShotTimecode(0, 60, 24);
  assert.equal(shot0.start, '00:00:00:00');
  const shot1 = calculateShotTimecode(1, 60, 24);
  assert.equal(shot1.start, '00:00:02:12');
});

test('rawx-project.v1 schema validation and non-destructive migration', async () => {
  const { isValidProjectV1, CURRENT_PROJECT_SCHEMA_VERSION } = await import('../types/projectSchema.ts');
  const { 
    createDefaultProjectV1, 
    migrateToProjectV1, 
    convertFrameToShotV1, 
    convertShotV1ToFrame,
    duplicateProjectV1 
  } = await import('./projectMigration.ts');

  // 1. Valid default project
  const project = createDefaultProjectV1('Master Test Anthology');
  assert.equal(project.schemaVersion, CURRENT_PROJECT_SCHEMA_VERSION);
  assert.equal(project.meta.title, 'Master Test Anthology');
  assert.equal(project.shots.length, 100);
  assert.ok(isValidProjectV1(project));

  // 2. Reject invalid schemas
  assert.equal(isValidProjectV1(null), false);
  assert.equal(isValidProjectV1({}), false);
  assert.equal(isValidProjectV1({ schemaVersion: 'rawx-project.v0' }), false);
  assert.equal(isValidProjectV1({ schemaVersion: 'rawx-project.v1', id: '123' }), false); // missing meta & shots

  // 3. Migrate legacy anthology format
  const legacyProject = {
    title: 'Legacy Film 1999',
    director: 'Master Director',
    nodeLocation: 'DHAKA_NORTH',
    aspectRatio: '16:9' as const,
    frames: [
      {
        id: 0,
        epNumber: '001',
        title: 'FIRST LIGHT',
        bengaliTitle: 'প্রথম আলো',
        tagline: 'The dawn begins',
        directorNotes: 'Wide establishing',
        cameraSpec: {
          focalLength: '35mm',
          aperture: 'f/2.0',
          shutter: '1/48',
          iso: '800',
          sensor: 'Super 35',
          format: 'ProRes 4444'
        },
        imageUrl: 'https://example.com/test.jpg',
        colorAccent: '#D4AF37',
        hoverStyle: 1,
        soundCue: 'WIND // 24Hz',
        lutFilter: 'cinematic' as const,
        aspectRatio: '16:9' as const,
        adjustments: {
          brightness: 100,
          contrast: 100,
          saturation: 100,
          bloom: 10,
          grain: 5,
          motionBlur: 0,
          vignette: 10
        },
        tags: ['intro', 'dawn']
      }
    ],
    createdAt: '2026-01-01T00:00:00Z',
    version: '1.0.0'
  };

  const migrated = migrateToProjectV1(legacyProject);
  assert.equal(migrated.schemaVersion, 'rawx-project.v1');
  assert.equal(migrated.meta.title, 'Legacy Film 1999');
  assert.equal(migrated.shots.length, 1);
  assert.equal(migrated.shots[0].number, '001');
  assert.equal(migrated.shots[0].titleBn, 'প্রথম আলো');
  assert.equal(migrated.shots[0].titleEn, 'FIRST LIGHT');
  assert.ok(isValidProjectV1(migrated));

  // 4. Bidirectional bijection: Frame -> ShotV1 -> Frame
  const originalFrame = legacyProject.frames[0];
  const shot = convertFrameToShotV1(originalFrame);
  assert.equal(shot.number, originalFrame.epNumber);
  assert.equal(shot.titleBn, originalFrame.bengaliTitle);
  assert.equal(shot.titleEn, originalFrame.title);
  assert.equal(shot.soundCue, originalFrame.soundCue);

  const backToFrame = convertShotV1ToFrame(shot, 0);
  assert.equal(backToFrame.epNumber, originalFrame.epNumber);
  assert.equal(backToFrame.title, originalFrame.title);
  assert.equal(backToFrame.bengaliTitle, originalFrame.bengaliTitle);
  assert.equal(backToFrame.soundCue, originalFrame.soundCue);

  // 5. Project duplication
  const duplicate = duplicateProjectV1(project, 'Duplicated Anthology');
  assert.notEqual(duplicate.id, project.id);
  assert.equal(duplicate.meta.title, 'Duplicated Anthology');
  assert.equal(duplicate.shots.length, project.shots.length);
  assert.ok(isValidProjectV1(duplicate));
});


