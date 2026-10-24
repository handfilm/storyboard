/**
 * RAWx Studio — Central Data Schemas (Zod)
 * Public API: ProjectSchema, ShotSchema, MediaSchema, SequenceSchema, etc.
 * Enforces strict typing, persistence validation, and automated migrations.
 */

import { z } from 'zod';

export const LutPresetEnum = z.enum([
  'cinematic',
  'bleach',
  'technicolor',
  'noir',
  'flir',
  'nightvision',
  'kodachrome',
  'solaris',
  'golden',
  'tungsten',
  'cyberpunk',
  'infrared',
  'monolith',
  'matrix',
  'raw',
  'kodak_vision3',
  'fuji_eterna',
  'noir_35mm',
  'bleach_bypass',
  'raw_clean'
]);

export const AspectRatioEnum = z.enum([
  '2.39:1',
  '16:9',
  '4:3',
  '1:1',
  '4:5',
  '9:16'
]);

export const CameraSpecSchema = z.object({
  focalLength: z.string().default('50mm f/1.4 Human Eye'),
  aperture: z.string().default('f/1.4'),
  shutter: z.string().default('1/48s 180°'),
  iso: z.string().default('ISO 400'),
  sensor: z.string().default('Full-Frame Cine 35mm'),
  format: z.string().default('RAW 14-BIT ARRI')
});

export const FrameAdjustmentsSchema = z.object({
  brightness: z.number().min(0).max(200).default(100),
  contrast: z.number().min(0).max(200).default(100),
  saturation: z.number().min(0).max(200).default(100),
  bloom: z.number().min(0).max(100).default(30),
  grain: z.number().min(0).max(100).default(15),
  motionBlur: z.number().min(0).max(100).default(50),
  vignette: z.number().min(0).max(100).default(40),
  halations: z.number().min(0).max(100).default(0),
  anamorphicStreak: z.number().min(0).max(100).default(0)
});

export const ShotSchema = z.object({
  id: z.number(),
  epNumber: z.string(),
  title: z.string(),
  bengaliTitle: z.string(),
  bengaliDesc: z.string().optional(),
  cameraMove: z.string().optional(),
  tagline: z.string().default(''),
  directorNotes: z.string().default(''),
  soundCue: z.string().default('Sub-bass pulse 36Hz'),
  cameraSpec: CameraSpecSchema.default(() => CameraSpecSchema.parse({})),
  imageUrl: z.string().optional(),
  isVideo: z.boolean().default(false),
  panY: z.number().min(0).max(100).default(50),
  colorAccent: z.string().default('#d4af37'),
  hoverStyle: z.number().default(0),
  lutFilter: LutPresetEnum.default('cinematic'),
  aspectRatio: AspectRatioEnum.default('16:9'),
  adjustments: FrameAdjustmentsSchema.default(() => FrameAdjustmentsSchema.parse({})),
  durationSeconds: z.number().default(4.0),
  shotType: z.string().default('MS'), // ELS, LS, MS, MCU, CU, ECU, OTS, POV
  status: z.enum(['planned', 'in-progress', 'approved', 'cut']).default('planned'),
  tags: z.array(z.string()).default([]),
  activeLens: z.string().default('50mm f/1.4 Human Eye'),
  dof: z.string().default('1.8cm'),
  titleAnimation: z.string().optional(),
  liquifyData: z.string().optional(),
  updatedAt: z.number().default(() => Date.now())
});

export type Shot = z.infer<typeof ShotSchema>;

export const MediaItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['image', 'video', 'audio', 'document']),
  url: z.string(),
  thumbnailUrl: z.string().optional(),
  sizeBytes: z.number().default(0),
  width: z.number().optional(),
  height: z.number().optional(),
  durationSeconds: z.number().optional(),
  dominantColor: z.string().default('#000000'),
  sharpnessScore: z.number().default(100),
  pHash: z.string().optional(),
  tags: z.array(z.string()).default([]),
  assignedShotIds: z.array(z.number()).default([]),
  createdAt: z.number().default(() => Date.now())
});

export type MediaItem = z.infer<typeof MediaItemSchema>;

export const ProjectSchema = z.object({
  schemaVersion: z.number().default(1),
  id: z.string().default('default-project'),
  title: z.string().default('RAWx // Master Anthology Engine 100'),
  director: z.string().default('RAKIB HIMON'),
  nodeLocation: z.string().default('DHAKA_01'),
  aspectRatio: AspectRatioEnum.default('16:9'),
  activeFilter: LutPresetEnum.default('cinematic'),
  activeLens: z.string().default('50mm f/1.4 Human Eye'),
  playbackSpeed: z.number().default(50), // slider 1-100
  shots: z.array(ShotSchema).default([]),
  mediaPool: z.array(MediaItemSchema).default([]),
  scriptText: z.string().default(''),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.number().default(() => Date.now()),
  version: z.string().default('5.0.0')
});

export type StudioProject = z.infer<typeof ProjectSchema>;
