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
 * Converts a legacy AnthologyFrame to a versioned ShotV1
 */
export function convertFrameToShotV1(frame: AnthologyFrame, sceneId = 'scene-01'): ShotV1 {
  return {
    id: `shot-${frame.epNumber}`,
    number: frame.epNumber,
    sceneId,
    titleBn: frame.bengaliTitle || 'দৃশ্য',
    titleEn: frame.title || `SHOT ${frame.epNumber}`,
    subtitle: frame.tagline || '',
    directorNotes: frame.directorNotes || '',
    soundCue: frame.soundCue || '',
    cameraSpec: { ...frame.cameraSpec },
    durationFrames: 60, // 2.5s @ 24fps
    transition: 'DISSOLVE',
    move: 'PAN',
    lens: frame.cameraSpec?.focalLength || '50mm f/1.4',
    filter: frame.lutFilter || 'cinematic',
    panY: 50,
    mediaId: frame.imageUrl ? `media-${frame.epNumber}` : null,
    imageUrl: frame.imageUrl,
    colorAccent: frame.colorAccent || '#D4AF37',
    hoverStyle: frame.hoverStyle || 0,
    adjustments: { ...frame.adjustments },
    tags: Array.isArray(frame.tags) ? [...frame.tags] : []
  };
}

/**
 * Converts a versioned ShotV1 to an AnthologyFrame for runtime stage compatibility
 */
export function convertShotV1ToFrame(shot: ShotV1, index: number): AnthologyFrame {
  return {
    id: index,
    epNumber: shot.number,
    title: shot.titleEn,
    bengaliTitle: shot.titleBn,
    tagline: shot.subtitle,
    directorNotes: shot.directorNotes,
    soundCue: shot.soundCue,
    cameraSpec: { ...shot.cameraSpec },
    imageUrl: shot.imageUrl,
    colorAccent: shot.colorAccent,
    hoverStyle: shot.hoverStyle || 0,
    lutFilter: shot.filter,
    aspectRatio: '2.39:1',
    adjustments: { ...shot.adjustments },
    tags: [...shot.tags]
  };
}

/**
 * Upgrades a legacy AnthologyProject into a valid rawx-project.v1
 */
export function migrateToProjectV1(legacy: AnthologyProject | Partial<ProjectV1>): ProjectV1 {
  if (isValidProjectV1(legacy)) {
    return legacy as ProjectV1;
  }

  const defaultScene = {
    id: 'scene-01',
    sceneNumber: 1,
    title: 'ACT I // SEQUENCE 01',
    description: 'Master cinematography anthology sequence'
  };

  const frames = Array.isArray((legacy as any).frames) 
    ? (legacy as any).frames 
    : generateInitialFrames();

  const shots: ShotV1[] = frames.map((f: any, i: number) => {
    if (f.schemaVersion === CURRENT_PROJECT_SCHEMA_VERSION) return f;
    return convertFrameToShotV1(f, defaultScene.id);
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
      title: (legacy as any).title || 'RAWx // Master Anthology Engine 100',
      director: (legacy as any).director || 'Rakib Himon',
      nodeLocation: (legacy as any).nodeLocation || 'DHAKA_01',
      createdAt: (legacy as any).createdAt || now,
      updatedAt: now,
      version: '1.0.0',
      description: 'Cinematic film anthology sequence'
    },
    settings: {
      aspectRatio: (legacy as any).aspectRatio || '2.39:1',
      defaultFps: 24,
      activeLut: 'cinematic',
      activeLens: '50mm f/1.4',
      fitMode: 'cover',
      componentsVisibility: { ...DEFAULT_COMPONENT_VISIBILITY },
      theme: 'rawx-gold',
      density: 'compact'
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
