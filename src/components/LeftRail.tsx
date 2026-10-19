/**
 * @file /src/components/LeftRail.tsx
 * @description Collapsible left studio navigation rail with module shortcuts:
 * STORY, MEDIA, BOARD, TEXT, EDIT/CUT, SOUND, PLAYER, PRODUCTION, REVIEW, EXPORT, LIBRARY, AI, SETTINGS.
 */

import React from 'react';
import { 
  BookOpen, 
  Image as ImageIcon, 
  LayoutGrid, 
  Type, 
  Scissors, 
  Volume2, 
  PlaySquare, 
  Clapperboard, 
  MessageSquare, 
  FolderDown, 
  Library, 
  Sparkles, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export type StudioModuleId = 
  | 'STORY' 
  | 'MEDIA' 
  | 'BOARD' 
  | 'TEXT' 
  | 'EDIT/CUT' 
  | 'SOUND' 
  | 'PLAYER' 
  | 'PRODUCTION' 
  | 'REVIEW' 
  | 'EXPORT' 
  | 'LIBRARY' 
  | 'AI' 
  | 'SETTINGS';

interface LeftRailProps {
  activeModule: StudioModuleId;
  onSelectModule: (module: StudioModuleId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isProMode: boolean;
}

interface RailItem {
  id: StudioModuleId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  proOnly?: boolean;
}

const RAIL_ITEMS: RailItem[] = [
  { id: 'BOARD', label: 'Board', icon: LayoutGrid },
  { id: 'EDIT/CUT', label: 'Cut Edit', icon: Scissors },
  { id: 'STORY', label: 'Story', icon: BookOpen },
  { id: 'MEDIA', label: 'Media', icon: ImageIcon },
  { id: 'TEXT', label: 'Titles', icon: Type },
  { id: 'SOUND', label: 'Sound', icon: Volume2 },
  { id: 'PLAYER', label: 'Player', icon: PlaySquare },
  { id: 'PRODUCTION', label: 'Production', icon: Clapperboard, proOnly: true },
  { id: 'REVIEW', label: 'Review', icon: MessageSquare, proOnly: true },
  { id: 'LIBRARY', label: 'Library', icon: Library },
  { id: 'AI', label: 'AI Studio', icon: Sparkles },
  { id: 'EXPORT', label: 'Export', icon: FolderDown },
  { id: 'SETTINGS', label: 'Settings', icon: Settings },
];

export const LeftRail: React.FC<LeftRailProps> = ({
  activeModule,
  onSelectModule,
  isCollapsed,
  onToggleCollapse,
  isProMode
}) => {
  const visibleItems = RAIL_ITEMS.filter(item => !item.proOnly || isProMode);

  return (
    <aside 
      className={`h-full bg-[#08080A]/95 border-r border-white/10 flex flex-col justify-between select-none z-30 transition-all duration-200 shrink-0 ${
        isCollapsed ? 'w-11' : 'w-14 sm:w-16'
      }`}
    >
      {/* Top Module Icons */}
      <div className="flex flex-col items-center py-2 gap-1 overflow-y-auto no-scrollbar">
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              title={`${item.label} (${item.id})`}
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-[2px] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all relative ${
                isActive 
                  ? 'bg-[#D4AF37]/20 text-[#FFE066] border border-[#D4AF37]/50 shadow-[0_0_10px_rgba(212,175,55,0.25)]' 
                  : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              {!isCollapsed && (
                <span className="text-[7.5px] font-mono-tech tracking-wider uppercase truncate max-w-[48px]">
                  {item.label}
                </span>
              )}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#D4AF37] rounded-r"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Rail Collapse Toggle */}
      <div className="p-1 border-t border-white/10 flex items-center justify-center">
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Rail' : 'Collapse Rail'}
          className="p-1.5 text-white/40 hover:text-[#FFE066] cursor-pointer rounded hover:bg-white/5 transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>
    </aside>
  );
};
