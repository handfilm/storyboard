import React from 'react';
import { EcosystemGrid } from './EcosystemGrid';

export interface MegaEcosystemLauncherProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject?: (projectId: string) => void;
}

export interface EcosystemProject {
  id: string;
  category: string;
  title: string;
  sub: string;
  url: string;
  image: string;
  images: string[];
  name: string;
  tagline: string;
  specs: string[];
  features: string[];
}

const CORE_ECOSYSTEM_PROJECTS = [
  {
    id: 'handfilm',
    category: 'CINEMA & AI',
    title: 'HANDFILM STUDIO',
    sub: 'B2B Video Engine',
    url: 'https://b2b.handsandhead.com',
    image: 'https://images.unsplash.com/photo-1601506521937-0121a7fc2a6b?q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1601506521937-0121a7fc2a6b?q=80&w=800',
      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=800',
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=800'
    ]
  },
  {
    id: 'rawx',
    category: 'ATELIER',
    title: 'RAWx APPAREL',
    sub: 'Full-Grain Leather Jackets',
    url: 'https://handsandhead.com',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800',
      'https://images.unsplash.com/photo-1520975954732-57dd22299614?q=80&w=800'
    ]
  },
  {
    id: 'arutemika',
    category: 'FOOTWEAR',
    title: 'ARUTEMIKA',
    sub: 'Goodyear Welted Boots',
    url: 'https://handsandhead.com',
    image: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=800',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=800'
    ]
  },
  {
    id: 'bloom',
    category: 'ED-TECH',
    title: 'KHUKIR BAGAN',
    sub: 'Bangla Smart TV App',
    url: 'https://play.google.com/store/apps',
    image: 'https://images.unsplash.com/photo-1512626120412-faf41adb4874?q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1512626120412-faf41adb4874?q=80&w=800',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800'
    ]
  },
  {
    id: 'nexos',
    category: 'INFRASTRUCTURE',
    title: 'NexOS / B2B HUB',
    sub: 'React & Next.js Portals',
    url: 'https://account.handsandhead.com',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800',
      'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?q=80&w=800'
    ]
  }
];

export const ECOSYSTEM_PROJECTS: EcosystemProject[] = CORE_ECOSYSTEM_PROJECTS.map((item) => ({
  ...item,
  name: item.title,
  tagline: item.sub,
  specs: [item.category],
  features: [item.sub]
}));

export { EcosystemGrid };

export const MegaEcosystemLauncher: React.FC<MegaEcosystemLauncherProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;
  return <EcosystemGrid onClose={onClose} />;
};
