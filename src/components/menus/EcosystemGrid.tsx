import React from 'react';
import { EcosystemGridModal } from './EcosystemGridModal';
import { ALL_ECOSYSTEM_PROJECTS, EcosystemProject } from '../../constants/ecosystemApps';

export interface EcosystemProjectItem {
  id: string;
  title: string;
  sub: string;
  url: string;
  image: string;
}

export const ECOSYSTEM_PROJECTS: EcosystemProjectItem[] = ALL_ECOSYSTEM_PROJECTS.map((proj: EcosystemProject) => ({
  id: proj.id,
  title: proj.title,
  sub: proj.sub,
  url: proj.url,
  image: proj.image
}));

export const EcosystemGrid = ({ onClose }: { onClose: () => void }) => {
  return <EcosystemGridModal isOpen={true} onClose={onClose} />;
};

export default EcosystemGrid;
