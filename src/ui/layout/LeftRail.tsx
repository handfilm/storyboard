/**
 * RAWx Studio — LeftRail Module Navigator
 * Public API: LeftRail component
 * Implements 13 studio modules with Simple/PRO filtering and workspace preset triggers.
 */

import React from 'react';
import { useStudioStore, StudioModule, WorkspacePreset } from '../../core/store';
import { 
  BookOpen, 
  FolderKanban, 
  LayoutGrid, 
  Type, 
  Scissors, 
  Palette, 
  Volume2, 
  PlaySquare, 
  Box, 
  FileSpreadsheet, 
  MessageSquare, 
  Download, 
  Library, 
  Sparkles, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface ModuleDef {
  id: StudioModule;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  proOnly?: boolean;
}

const modules: ModuleDef[] = [
  { id: 'PLAYER', label: 'STAGE', icon: PlaySquare },
  { id: 'STORY', label: 'STORY', icon: BookOpen },
  { id: 'MEDIA', label: 'MEDIA', icon: FolderKanban },
  { id: 'BOARD', label: 'BOARD', icon: LayoutGrid },
  { id: 'TEXT', label: 'TEXT', icon: Type },
  { id: 'EDIT', label: 'EDIT', icon: Scissors, proOnly: true },
  { id: 'COLOR', label: 'COLOR', icon: Palette, proOnly: true },
  { id: 'SOUND', label: 'SOUND', icon: Volume2, proOnly: true },
  { id: 'PREVIS', label: 'PREVIS', icon: Box, proOnly: true },
  { id: 'PRODUCTION', label: 'PROD', icon: FileSpreadsheet, proOnly: true },
  { id: 'REVIEW', label: 'REVIEW', icon: MessageSquare, proOnly: true },
  { id: 'EXPORT', label: 'EXPORT', icon: Download },
  { id: 'LIBRARY', label: 'LIBRARY', icon: Library, proOnly: true },
  { id: 'AI', label: 'AI LAB', icon: Sparkles, proOnly: true },
  { id: 'SETTINGS', label: 'SETTINGS', icon: Settings }
];

const presets: WorkspacePreset[] = [
  'Director',
  'Writer',
  'Storyboarder',
  'Editor',
  'Colorist',
  'Sound',
  'Producer',
  'Review',
  'Presenter',
  'Minimal'
];

export const LeftRail: React.FC = () => {
  const {
    activeModule,
    setActiveModule,
    isProMode,
    isLeftRailExpanded,
    toggleLeftRail,
    workspacePreset,
    setWorkspacePreset
  } = useStudioStore();

  const filteredModules = modules.filter(m => isProMode || !m.proOnly);

  return (
    <aside 
      className={`h-full bg-[#0B0B0B] border-r border-[#D4AF37]/20 flex flex-col justify-between transition-all duration-200 select-none z-20 ${
        isLeftRailExpanded ? 'w-44' : 'w-12'
      }`}
    >
      {/* Top Module Icons */}
      <div className="flex flex-col py-2 overflow-y-auto">
        {filteredModules.map((m) => {
          const Icon = m.icon;
          const isActive = activeModule === m.id;

          return (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.id)}
              className={`flex items-center gap-3 px-3 py-2 text-xs font-mono transition-colors relative group ${
                isActive
                  ? 'text-[#FFE066] bg-[#121212]'
                  : 'text-[#8A8A8A] hover:text-[#EDEDED] hover:bg-[#121212]/50'
              }`}
              title={`${m.label} Module`}
            >
              {isActive && (
                <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#D4AF37]" />
              )}
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#D4AF37]' : ''}`} />
              {isLeftRailExpanded && (
                <span className="tracking-wider truncate">{m.label}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Presets & Collapse Control */}
      <div className="p-2 border-t border-[#D4AF37]/20 flex flex-col gap-1.5 bg-[#050505]">
        {isLeftRailExpanded && (
          <div className="flex flex-col gap-1 mb-1">
            <span className="text-[9px] font-mono text-[#D4AF37] uppercase tracking-wider">
              Workspace Preset
            </span>
            <select
              value={workspacePreset}
              onChange={(e) => setWorkspacePreset(e.target.value as WorkspacePreset)}
              className="bg-[#121212] border border-[#D4AF37]/30 text-[#EDEDED] text-[10px] font-mono rounded px-1.5 py-1 outline-none"
            >
              {presets.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={toggleLeftRail}
          className="flex items-center justify-center p-1.5 rounded hover:bg-[#121212] text-[#8A8A8A] hover:text-[#EDEDED] transition-colors"
          title={isLeftRailExpanded ? 'Collapse Rail' : 'Expand Rail'}
        >
          {isLeftRailExpanded ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
};
