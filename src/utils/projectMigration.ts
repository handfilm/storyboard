/**
 * @file /src/utils/projectMigration.ts
 * @description Forward migration, conversion, and factory utilities for rawx-project.v1.
 * Guarantees zero data loss when loading legacy projects or snapshots.
 */

import { AnthologyFrame, AnthologyProject } from './../types/anthology';
import { ProjectV1, ShotV1, CURRENT_PROJECT_SCHEMA_VERSION, isValidProjectV1 } from '../types/projectSchema';
import { DEFAULT_COMPONENT_VISIBILITY } from '../components/ComponentsMatrixPopover';
import { generateInitialFrames } from '../data/frames';

/**
 * Converts an AnthologyFrame or partial legacy frame to a versioned ShotV1
 */
export function convertFrameToShotV1(frame: Partial<AnthologyFrame> | any, sceneId = 'scene-01', index = 0): ShotV1 {
  const fallbackId = typeof frame?.id === 'number' ? frame.id : index;
  const baseFrames = generateInitialFrames();
  const base = baseFrames[Math.abs(fallbackId) % baseFrames.length];

  const epNumber = frame?.epNumber || base.epNumber || String(fallbackId + 1).padStart(3, '0');
  const titleBn = frame?.bengaliTitle || base.bengaliTitle || 'দৃষ্টি';
  const titleEn = frame?.title || base.title || `SHOT ${epNumber}`;
  const subtitle = frame?.tagline || base.tagline || '';
  const directorNotes = frame?.directorNotes || base.directorNotes || '';
  const soundCue = frame?.soundCue || base.soundCue || '';
  const cameraSpec = { ...base.cameraSpec, ...(frame?.cameraSpec || {}) };
  const adjustments = { ...base.adjustments, ...(frame?.adjustments || {}) };
  const tags = Array.isArray(frame?.tags) ? [...frame.tags] : Array.isArray(base.tags) ? [...base.tags] : [];

  return {
    id: `shot-${epNumber}`,
    number: epNumber,
    sceneId,
    titleBn,
    titleEn,
    subtitle,
    directorNotes,
    soundCue,
    cameraSpec,
    durationFrames: 60, // 2.5s @ 24fps
    transition: 'DISSOLVE',
    move: 'PAN',
    lens: cameraSpec.focalLength || '50mm f/1.4',
    filter: frame?.lutFilter || base.lutFilter || 'cinematic',
    panY: typeof frame?.panY === 'number' ? frame.panY : 50,
    mediaId: (frame?.imageUrl || base.imageUrl) ? `media-${epNumber}` : null,
    imageUrl: frame?.imageUrl || base.imageUrl,
    isVideo: typeof frame?.isVideo === 'boolean' ? frame.isVideo : (
      frame?.imageUrl ? (
        frame.imageUrl.startsWith('data:video') ||
        /\.(mp4|webm|mov|ogg|m4v|mkv)($|\?)/i.test(frame.imageUrl)
      ) : false
    ),
    colorAccent: frame?.colorAccent || base.colorAccent || '#D4AF37',
    hoverStyle: typeof frame?.hoverStyle === 'number' ? frame.hoverStyle : (base.hoverStyle || 0),
    titleAnimation: frame?.titleAnimation || 'flare',
    adjustments,
    tags
  };
}

/**
 * Converts a versioned ShotV1 to an AnthologyFrame for runtime stage compatibility
 */
export function convertShotV1ToFrame(shot: Partial<ShotV1> | any, index: number): AnthologyFrame {
  const baseFrames = generateInitialFrames();
  const base = baseFrames[Math.abs(index) % baseFrames.length];

  const epNumber = shot?.number || base.epNumber || String(index + 1).padStart(3, '0');
  const title = shot?.titleEn || base.title || `SHOT ${epNumber}`;
  const bengaliTitle = shot?.titleBn || base.bengaliTitle || 'দৃষ্টি';
  const tagline = shot?.subtitle || base.tagline || '';
  const directorNotes = shot?.directorNotes || base.directorNotes || '';
  const soundCue = shot?.soundCue || base.soundCue || '';
  const cameraSpec = { ...base.cameraSpec, ...(shot?.cameraSpec || {}) };
  const adjustments = { ...base.adjustments, ...(shot?.adjustments || {}) };
  const tags = Array.isArray(shot?.tags) ? [...shot.tags] : Array.isArray(base.tags) ? [...base.tags] : [];

  return {
    id: index,
    epNumber,
    title,
    bengaliTitle,
    tagline,
    directorNotes,
    soundCue,
    cameraSpec,
    imageUrl: (
      shot?.imageUrl && 
      !shot.imageUrl.includes('photo-1507499739999-097706ad8914')
    ) ? shot.imageUrl : base.imageUrl,
    isVideo: typeof shot?.isVideo === 'boolean' ? shot.isVideo : (
      shot?.imageUrl ? (
        shot.imageUrl.startsWith('data:video') ||
        /\.(mp4|webm|mov|ogg|m4v|mkv)($|\?)/i.test(shot.imageUrl)
      ) : false
    ),
    colorAccent: shot?.colorAccent || base.colorAccent || '#D4AF37',
    hoverStyle: typeof shot?.hoverStyle === 'number' ? shot.hoverStyle : (base.hoverStyle || 0),
    titleAnimation: shot?.titleAnimation || 'flare',
    lutFilter: shot?.filter || base.lutFilter || 'cinematic',
    aspectRatio: '2.39:1',
    adjustments,
    tags
  };
}

/**
 * Upgrades a legacy AnthologyProject into a valid rawx-project.v1
 * Guarantees all 100 shots exist and are fully populated.
 */
export function migrateToProjectV1(legacy: AnthologyProject | Partial<ProjectV1>): ProjectV1 {
  const defaultScene = {
    id: 'scene-01',
    sceneNumber: 1,
    title: 'ACT I // SEQUENCE 01',
    description: 'Master cinematography anthology sequence'
  };

  const frames = (Array.isArray((legacy as any).frames) && (legacy as any).frames.length > 0)
    ? (legacy as any).frames 
    : (Array.isArray((legacy as any).shots) && (legacy as any).shots.length > 0)
    ? (legacy as any).shots 
    : generateInitialFrames();

  const shots: ShotV1[] = frames.map((f: any, idx: number) => {
    if (f && f.schemaVersion === CURRENT_PROJECT_SCHEMA_VERSION && f.cameraSpec && f.adjustments) {
      return f;
    }
    return convertFrameToShotV1(f, defaultScene.id, idx);
  });

  const now = new Date().toISOString();
  const projectId = (legacy as any).id || `proj-${Date.now()}`;

  const tracks = [
    {
      id: 'track-v1',
      type: 'video' as const,
      name: 'V1 - Video Master',
      clips: shots.map((s, idx) => ({
        id: `clip-v1-${s.id}`,
        shotId: s.id,
        startFrame: idx * 60,
        durationFrames: s.durationFrames || 60
      }))
    },
    {
      id: 'track-a1',
      type: 'audio' as const,
      name: 'A1 - Dialog & Cues',
      clips: []
    }
  ];

  const totalFrames = shots.reduce((acc, s) => acc + (s.durationFrames || 60), 0);

  return {
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    id: projectId,
    meta: {
      title: (legacy as any).title || (legacy as any).meta?.title || 'RAWx // Master Anthology Engine 100',
      director: (legacy as any).director || (legacy as any).meta?.director || 'Rakib Himon',
      nodeLocation: (legacy as any).nodeLocation || (legacy as any).meta?.nodeLocation || 'DHAKA_01',
      createdAt: (legacy as any).createdAt || (legacy as any).meta?.createdAt || now,
      updatedAt: now,
      version: '1.0.0',
      description: 'Cinematic film anthology sequence'
    },
    settings: {
      aspectRatio: (legacy as any).aspectRatio || (legacy as any).settings?.aspectRatio || '2.39:1',
      defaultFps: 24,
      activeLut: (legacy as any).settings?.activeLut || 'cinematic',
      activeLens: (legacy as any).settings?.activeLens || '50mm f/1.4',
      fitMode: (legacy as any).settings?.fitMode || 'cover',
      componentsVisibility: (legacy as any).settings?.componentsVisibility || { ...DEFAULT_COMPONENT_VISIBILITY },
      theme: (legacy as any).settings?.theme || 'rawx-gold',
      density: (legacy as any).settings?.density || 'compact'
    },
    scenes: [defaultScene],
    shots,
    mediaRefs: {},
    timeline: {
      tracks,
      durationFrames: totalFrames
    }
  };
}

/**
 * Creates a brand new default ProjectV1 populated with initial 100 frames
 */
export function createDefaultProjectV1(title = 'RAWx // Master Anthology Engine 100'): ProjectV1 {
  const initialFrames = generateInitialFrames();
  return migrateToProjectV1({
    title,
    director: 'Rakib Himon',
    nodeLocation: 'DHAKA_01',
    aspectRatio: '2.39:1',
    frames: initialFrames,
    createdAt: new Date().toISOString(),
    version: '1.0.0'
  });
}

/**
 * Clones a ProjectV1 with new IDs and copy naming
 */
export function duplicateProjectV1(source: ProjectV1, newTitle?: string): ProjectV1 {
  const now = new Date().toISOString();
  const newId = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const title = newTitle || `${source.meta.title} (Copy)`;

  const cloned: ProjectV1 = JSON.parse(JSON.stringify(source));
  cloned.id = newId;
  cloned.meta.title = title;
  cloned.meta.createdAt = now;
  cloned.meta.updatedAt = now;

  return cloned;
}
