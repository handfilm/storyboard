/**
 * @file /src/components/LeftRail.tsx
 * @description Single Scrollable Left Navigation Rail for HANDFILM Creative Suite.
 * Re-exports StudioNavRail.
 */

import React from 'react';
import { StudioNavRail, StudioNavRailProps, StudioModuleId, CameraLensProfile, CINE_PROFILES } from './StudioNavRail';

export type { StudioNavRailProps, StudioModuleId, CameraLensProfile };
export { CINE_PROFILES, StudioNavRail };

export interface LeftRailProps extends StudioNavRailProps {}

export const LeftRail: React.FC<LeftRailProps> = (props) => {
  return <StudioNavRail {...props} />;
};
