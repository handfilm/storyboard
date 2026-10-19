/**
 * @file /src/components/ProjectManagerModal.tsx
 * @description Multi-project manager dialog:
 * - Create, switch, rename, duplicate, and delete projects
 * - Confirmation and 10-second Undo window for project deletion
 * - Persistent storage quota monitor with 80% capacity warning
 */

import React, { useState, useEffect } from 'react';
import { storageManager } from '../core/storage';
import { StorageQuotaInfo } from '../types/projectSchema';
import { 
  X, 
  Plus, 
  FolderOpen, 
  Copy, 
  Trash2, 
  Edit3, 
  Check, 
  HardDrive, 
  AlertTriangle, 
  RotateCcw,
  Film
} from 'lucide-react';

interface ProjectSummary {
  id: string;
  title: string;
  updatedAt: string;
  shotCount: number;
}

interface ProjectManagerModalProps {
  isOpen: boolean;
  activeProjectId: string;
  onClose: () => void;
  onSwitchProject: (projectId: string) => void;
  onProjectUpdated: () => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  activeProjectId,
  onClose,
  onSwitchProject,
  onProjectUpdated
}) => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [quota, setQuota] = useState<StorageQuotaInfo | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDirector, setNewDirector] = useState('Rakib Himon');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // 10-second Undo trash queue
  const [pendingDeletion, setPendingDeletion] = useState<{ id: string; title: string; timer: any } | null>(null);

  const loadData = async () => {
    const list = await storageManager.listProjects();
    setProjects(list);
    const q = await storageManager.getStorageQuota();
    setQuota(q);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setIsCreating(false);
      setEditingId(null);
      setConfirmDeleteId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created = await storageManager.createProject(newTitle.trim(), newDirector.trim() || 'Rakib Himon');
    setIsCreating(false);
    setNewTitle('');
    await loadData();
    onSwitchProject(created.id);
    onProjectUpdated();
  };

  const handleRenameSubmit = async (id: string) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    const proj = await storageManager.loadProject(id);
    if (proj) {
      proj.meta.title = editTitle.trim();
      await storageManager.saveProjectDebounced(proj);
      setEditingId(null);
      await loadData();
      onProjectUpdated();
    }
  };

  const handleDuplicate = async (id: string) => {
    const cloned = await storageManager.duplicateProject(id);
    if (cloned) {
      await loadData();
      onProjectUpdated();
    }
  };

  const handleRequestDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = (id: string, title: string) => {
    setConfirmDeleteId(null);

    // Filter out from immediate UI
    setProjects(prev => prev.filter(p => p.id !== id));

    // Start 10-second undo countdown
    const timer = setTimeout(async () => {
      await storageManager.deleteProject(id);
      setPendingDeletion(null);
      await loadData();
      onProjectUpdated();
    }, 10000);

    setPendingDeletion({ id, title, timer });
  };

  const handleUndoDelete = () => {
    if (pendingDeletion) {
      clearTimeout(pendingDeletion.timer);
      setPendingDeletion(null);
      loadData();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-[#0A0B0E] border border-white/20 rounded-[2px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[1px] bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#FFE066]">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-cinzel text-sm sm:text-base font-bold text-white tracking-widest uppercase">
                Project Vault Manager
              </h2>
              <p className="font-mono-tech text-[10px] text-white/50 tracking-wider">
                MULTIPLE ANTHOLOGY PROJECTS • PERSISTENT INDEXEDDB STORAGE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(true)}
              className="px-3 py-1.5 bg-[#D4AF37] hover:bg-[#FFE066] text-black font-mono-tech text-[10px] font-bold rounded-[1px] flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>NEW PROJECT</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-[1px] hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 10-Second Undo Banner */}
        {pendingDeletion && (
          <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between text-amber-300 font-mono-tech text-xs animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Project <strong>"{pendingDeletion.title}"</strong> will be permanently deleted in 10s.</span>
            </div>
            <button
              onClick={handleUndoDelete}
              className="px-2.5 py-0.5 bg-amber-400 hover:bg-amber-300 text-black font-bold text-[10px] rounded-[1px] flex items-center gap-1 cursor-pointer transition-colors shadow-md"
            >
              <RotateCcw className="w-3 h-3" />
              <span>UNDO DELETE</span>
            </button>
          </div>
        )}

        {/* Storage Quota Bar */}
        {quota && quota.supported && (
          <div className={`px-4 py-2 border-b text-[10px] font-mono-tech flex flex-wrap items-center justify-between gap-2 ${
            quota.isHighUsage ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-black/20 border-white/10 text-white/60'
          }`}>
            <div className="flex items-center gap-2">
              <HardDrive className={`w-3.5 h-3.5 ${quota.isHighUsage ? 'text-red-400' : 'text-[#D4AF37]'}`} />
              <span>
                Storage Quota: {formatBytes(quota.usageBytes)} / {formatBytes(quota.quotaBytes)} ({quota.usagePercent}%)
              </span>
              {quota.persisted && (
                <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[8px] font-bold">
                  PERSISTENT
                </span>
              )}
            </div>

            {quota.isHighUsage && (
              <div className="flex items-center gap-1 text-red-400 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>WARNING: Storage exceeds 80% capacity!</span>
              </div>
            )}
          </div>
        )}

        {/* Project Creation Form */}
        {isCreating && (
          <form onSubmit={handleCreateSubmit} className="p-4 bg-white/5 border-b border-white/15 space-y-3 font-mono-tech animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#FFE066] uppercase tracking-wider">
                Create New Anthology Project
              </h4>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-white/40 hover:text-white text-[10px] cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] text-white/50 uppercase mb-1">Project Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Master Anthology 101"
                  autoFocus
                  required
                  className="w-full bg-black/80 border border-white/20 focus:border-[#D4AF37] px-2.5 py-1 text-xs text-white rounded-[1px] outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] text-white/50 uppercase mb-1">Director Name</label>
                <input
                  type="text"
                  value={newDirector}
                  onChange={(e) => setNewDirector(e.target.value)}
                  placeholder="Director name"
                  className="w-full bg-black/80 border border-white/20 focus:border-[#D4AF37] px-2.5 py-1 text-xs text-white rounded-[1px] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[10px] rounded-[1px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-[#D4AF37] hover:bg-[#FFE066] text-black text-[10px] font-bold rounded-[1px] cursor-pointer"
              >
                Create Project
              </button>
            </div>
          </form>
        )}

        {/* Project List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {projects.map((proj) => {
            const isActive = proj.id === activeProjectId;
            const isEditing = editingId === proj.id;
            const isDeleting = confirmDeleteId === proj.id;

            return (
              <div
                key={proj.id}
                className={`p-3.5 rounded-[1px] border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isActive 
                    ? 'bg-[#D4AF37]/10 border-[#D4AF37]/60 shadow-[0_0_12px_rgba(212,175,55,0.15)]' 
                    : 'bg-white/5 border-white/10 hover:border-white/25'
                }`}
              >
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 font-mono-tech">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSubmit(proj.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="bg-black/90 border border-[#D4AF37] text-white text-xs px-2 py-0.5 rounded-[1px] outline-none w-full max-w-sm"
                      />
                      <button
                        onClick={() => handleRenameSubmit(proj.id)}
                        className="p-1 text-[#D4AF37] hover:text-[#FFE066] cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="font-mono-tech text-xs sm:text-sm font-bold text-white truncate">
                        {proj.title}
                      </h3>
                      {isActive && (
                        <span className="px-1.5 py-0.2 bg-[#D4AF37] text-black text-[8px] font-black rounded-[1px]">
                          ACTIVE
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-1 text-[9.5px] font-mono-tech text-white/50">
                    <span>{proj.shotCount} Shots</span>
                    <span>•</span>
                    <span>Updated {new Date(proj.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 font-mono-tech text-[10px]">
                  {isDeleting ? (
                    <div className="flex items-center gap-1 bg-red-500/20 border border-red-500/40 p-1 rounded-[1px]">
                      <span className="text-[9px] text-red-300 mr-1">Delete?</span>
                      <button
                        onClick={() => handleConfirmDelete(proj.id, proj.title)}
                        className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-[1px] cursor-pointer text-[9px]"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 text-white rounded-[1px] cursor-pointer text-[9px]"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <>
                      {!isActive && (
                        <button
                          onClick={() => {
                            onSwitchProject(proj.id);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-[1px] flex items-center gap-1 cursor-pointer transition-colors"
                          title="Switch to this project"
                        >
                          <FolderOpen className="w-3 h-3 text-[#D4AF37]" />
                          <span>Open</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setEditingId(proj.id);
                          setEditTitle(proj.title);
                        }}
                        className="p-1.5 bg-white/5 hover:bg-white/15 text-white/60 hover:text-white rounded-[1px] cursor-pointer transition-colors"
                        title="Rename Project"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => handleDuplicate(proj.id)}
                        className="p-1.5 bg-white/5 hover:bg-white/15 text-white/60 hover:text-white rounded-[1px] cursor-pointer transition-colors"
                        title="Duplicate Project"
                      >
                        <Copy className="w-3 h-3" />
                      </button>

                      {projects.length > 1 && (
                        <button
                          onClick={() => handleRequestDelete(proj.id)}
                          className="p-1.5 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-[1px] cursor-pointer transition-colors"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
