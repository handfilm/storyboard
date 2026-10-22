/**
 * @file /src/components/LeftRail.tsx
 * @description Single Scrollable Left Navigation Rail for RAWx Storyboard Studio.
 * Re-exports LeftRailNavigation and adapts existing LeftRail calls to the unified 15-module system.
 */

import React from 'react';
import { LeftRailNavigation, StudioModuleId, CameraLensProfile } from './LeftRailNavigation';

export type { StudioModuleId, CameraLensProfile };
export { LeftRailNavigation };

export interface LeftRailProps {
  activeModule: StudioModuleId;
  onSelectModule: (module: StudioModuleId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isProMode: boolean;
  onToggleProMode?: () => void;
  onOpenVaultMode?: () => void;
  onOpenSelfTest?: () => void;
  onOpenSettingsModal?: () => void;
  activeProfile?: CameraLensProfile;
  onSelectProfile?: (profile: CameraLensProfile) => void;
}

export const LeftRail: React.FC<LeftRailProps> = (props) => {
  return <LeftRailNavigation {...props} />;
};
