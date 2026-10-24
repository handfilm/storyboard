/**
 * @file /src/components/MediaLibraryDrawer.tsx
 * @description Master Media Library Drawer & Asset Vault for HANDFILM.
 * Re-exports the high-capacity MediaBinDrawer with drag-and-drop asset assignment.
 */

import React from 'react';
import { MediaBinDrawer, MediaBinDrawerProps } from './MediaBinDrawer';

export type MediaLibraryDrawerProps = MediaBinDrawerProps;

export const MediaLibraryDrawer: React.FC<MediaLibraryDrawerProps> = (props) => {
  return <MediaBinDrawer {...props} />;
};

export default MediaLibraryDrawer;
