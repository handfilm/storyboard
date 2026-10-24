/**
 * @file /src/components/menus/AppsDropdownMenu.tsx
 * @description Mega Ecosystem Launcher & Central Command OS for handsandhead.com.
 * Wraps EcosystemLauncherModal to provide the 25+ categorized subdomains grid menu.
 */

import React from 'react';
import { 
  EcosystemLauncherModal, 
  EcosystemLauncherModalProps 
} from './EcosystemLauncherModal';

export type AppsDropdownMenuProps = EcosystemLauncherModalProps;

export const AppsDropdownMenu: React.FC<AppsDropdownMenuProps> = (props) => {
  return <EcosystemLauncherModal {...props} />;
};

export { EcosystemLauncherModal };
export default AppsDropdownMenu;
