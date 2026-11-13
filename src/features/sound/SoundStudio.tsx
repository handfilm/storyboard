/**
 * @file /src/features/sound/SoundStudio.tsx
 * @description Unified Cinema Sound Studio featuring Vocal Remover, Record VO, Gemini Audio AI, and 3-Bus Mixer.
 */

import React from 'react';
import { ProAudioStudioWorkspace } from '../../components/audio/ProAudioStudioWorkspace';

export const SoundStudio: React.FC = () => {
  return <ProAudioStudioWorkspace initialTab="gemini-audio" />;
};
