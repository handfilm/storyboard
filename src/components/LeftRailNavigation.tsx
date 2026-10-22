/**
 * @file /src/components/LeftRailNavigation.tsx
 * @description Master Unified Single Left Navigation Rail for HANDFILM Creative Suite.
 * Re-exports StudioNavRail and exports types for backwards compatibility.
 */

import { StudioNavRail, StudioNavRailProps, StudioModuleId, CameraLensProfile, CINE_PROFILES } from './StudioNavRail';

export type { StudioNavRailProps, StudioModuleId, CameraLensProfile };
export { CINE_PROFILES, StudioNavRail };
export const LeftRailNavigation = StudioNavRail;
