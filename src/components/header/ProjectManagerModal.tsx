/**
 * @file /src/components/header/ProjectManagerModal.tsx
 * @description CapCut-Style Local Multi-Project Draft Manager Modal.
 * 
 * Features:
 * - "New Project", "Duplicate", "Delete", and "Switch Draft"
 * - Object store hydration via studioDraftDb (rawx_storyboard_studio_db v4)
 * - Object URL cleanup with URL.revokeObjectURL() on draft switch to eliminate leaks
 * - Visual storage quota meter with browser persistent storage indicator
 * - Dark-brutalist tactile layout with high-contrast controls
 */

import React, { useState, useEffect } from 'react';
import { studioDraftDb } from '../../services/db';
import { ProjectMeta, AspectRatioType } from '../../types/project';
import {
  X,
  Plus,
  FolderOpen,
  Copy,
  Trash2,
  Check,
  HardDrive,
  Clock,
  Film,
  ShieldCheck
} from 'lucide-react';
import { CinemaToolHUD, CinemaBadgeHeader } from '../ui/CinemaToolHUD';

interface ProjectManagerModalProps {
  isOpen: boolean;
  activeProjectId: string;
  onClose: () => void;
  onSwitchProject: (projectId: string) => void;
  onProjectUpdated?: () => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  activeProjectId,
  onClose,
  onSwitchProject,
  onProjectUpdated
}) => {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAspectRatio, setNewAspectRatio] = useState<AspectRatioType>('2.39:1');
  const [quota, setQuota] = useState<{ usedBytes: number; quotaBytes: number; percent: number }>({
    usedBytes: 0,
    quotaBytes: 1024 * 1024 * 1024,
    percent: 0
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isStoragePersisted, setIsStoragePersisted] = useState(false);

  const loadProjects = async () => {
    const list = await studioDraftDb.listProjectsMeta();
    setProjects(list);
    const q = await studioDraftDb.getStorageEstimate();
    setQuota(q);
    setIsStoragePersisted(studioDraftDb.getIsPersisted());
  };

  useEffect(() => {
    if (isOpen) {
      loadProjects();
      setIsCreating(false);
      setDeleteConfirmId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    studioDraftDb.revokeAllTrackedUrls();

    const created = await studioDraftDb.createNewProject(newTitle.trim(), newAspectRatio);
    setIsCreating(false);
    setNewTitle('');
    await loadProjects();
    onSwitchProject(created.projectId);
    if (onProjectUpdated) onProjectUpdated();
    onClose();
  };

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await studioDraftDb.duplicateProject(id);
    await loadProjects();
    if (onProjectUpdated) onProjectUpdated();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      return;
    }
    await studioDraftDb.deleteProject(id);
    setDeleteConfirmId(null);
    await loadProjects();
    if (id === activeProjectId && projects.length > 1) {
      const remaining = projects.filter(p => p.id !== id);
      if (remaining[0]) {
        onSwitchProject(remaining[0].id);
      }
    }
    if (onProjectUpdated) onProjectUpdated();
  };

  const handleSelectDraft = (id: string) => {
    if (id === activeProjectId) {
      onClose();
      return;
    }
    studioDraftDb.revokeAllTrackedUrls();
    onSwitchProject(id);
    onClose();
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#0B0C10] border border-[#26282E] rounded-lg shadow-[0_24px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[88vh] font-mono animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-h-[56px] px-4 py-2 bg-[#111215] border-b border-[#26282E] flex flex-wrap items-center justify-between gap-2">
          <CinemaBadgeHeader
            icon={<Film className="w-4 h-4" strokeWidth={2.2} />}
            label="PROJECT VAULT"
            accent="amber"
          />

          <div className="flex items-center gap-2">
            {!isCreating && (
              <CinemaToolHUD
                title="NEW PROJECT DRAFT"
                en="Create a new storyboard draft in local IndexedDB storage."
                bn="কীভাবে ব্যবহার করবেন: নতুন প্রজেক্ট খুলতে NEW DRAFT বাটনে চাপুন।"
                accent="amber"
                side="bottom"
              >
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="cinema-tile cinema-tile-amber px-3 py-2 min-h-[44px] rounded-md flex items-center gap-1.5 cursor-pointer"
                  data-active="true"
                >
                  <Plus className="w-4 h-4 cinema-tile-icon" strokeWidth={2.3} />
                  <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase">NEW DRAFT</span>
                </button>
              </CinemaToolHUD>
            )}

            <CinemaToolHUD
              title="CLOSE VAULT"
              en="Close the project manager modal."
              bn="কীভাবে ব্যবহার করবেন: প্রজেক্ট ম্যানেজার বন্ধ করতে X বাটনে চাপুন।"
              shortcut="ESC"
              accent="crimson"
              side="bottom"
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="cinema-tile cinema-tile-crimson min-h-[44px] min-w-[44px] px-2.5 rounded-md flex items-center justify-center gap-1 cursor-pointer"
              >
                <X className="w-4 h-4 cinema-tile-icon" strokeWidth={2.3} />
                <span className="hidden sm:inline font-black tracking-wider text-[10px] uppercase">CLOSE</span>
              </button>
            </CinemaToolHUD>
          </div>
        </div>

        {isCreating && (
          <form
            onSubmit={handleCreateSubmit}
            className="p-4 bg-[#111215] border-b border-[#26282E] flex flex-wrap items-center gap-2.5"
          >
            <input
              type="text"
              placeholder="PROJECT TITLE..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
              className="flex-1 min-w-[200px] min-h-[44px] bg-[#0B0C10] border border-[#26282E] rounded-md px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-400"
            />

            <select
              value={newAspectRatio}
              onChange={(e) => setNewAspectRatio(e.target.value as AspectRatioType)}
              className="min-h-[44px] bg-[#0B0C10] border border-[#26282E] rounded-md px-3 py-2 text-xs font-bold text-white outline-none cursor-pointer"
            >
              <option value="2.39:1">2.39:1 SCOPE</option>
              <option value="16:9">16:9 WIDE</option>
              <option value="4:3">4:3 ACADEMY</option>
              <option value="1:1">1:1 SQUARE</option>
              <option value="9:16">9:16 REEL</option>
            </select>

            <CinemaToolHUD
              title="CREATE DRAFT"
              en="Initialize and switch to this new project draft."
              bn="কীভাবে ব্যবহার করবেন: নাম লিখে CREATE বাটনে চাপলেই নতুন প্রজেক্ট চালু হবে।"
              accent="emerald"
            >
              <button
                type="submit"
                className="cinema-tile cinema-tile-emerald px-4 py-2 min-h-[44px] rounded-md flex items-center gap-1.5 cursor-pointer"
                data-active="true"
              >
                <Check className="w-4 h-4 cinema-tile-icon" strokeWidth={2.3} />
                <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase">CREATE</span>
              </button>
            </CinemaToolHUD>

            <CinemaToolHUD
              title="CANCEL"
              en="Cancel new project creation."
              bn="কীভাবে ব্যবহার করবেন: নতুন প্রজেক্ট বাতিল করতে CANCEL চাপুন।"
              accent="crimson"
            >
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="cinema-tile cinema-tile-crimson px-3 py-2 min-h-[44px] rounded-md flex items-center gap-1 cursor-pointer"
              >
                <X className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                <span className="font-black tracking-wider text-[10px] uppercase">CANCEL</span>
              </button>
            </CinemaToolHUD>
          </form>
        )}

        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.length === 0 ? (
            <div className="col-span-full py-14 flex flex-col items-center justify-center gap-4 text-center">
              <FolderOpen className="w-10 h-10 text-zinc-600" strokeWidth={1.8} />
              <CinemaBadgeHeader
                icon={<Film className="w-3.5 h-3.5" strokeWidth={2.2} />}
                label="EMPTY VAULT"
                accent="amber"
              />
              <CinemaToolHUD
                title="CREATE FIRST DRAFT"
                en="Create a new project draft in IndexedDB."
                bn="কীভাবে ব্যবহার করবেন: প্রথম প্রজেক্ট শুরু করতে NEW DRAFT চাপুন।"
                accent="amber"
              >
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="cinema-tile cinema-tile-amber px-4 py-2 min-h-[44px] rounded-md flex items-center gap-1.5 cursor-pointer"
                  data-active="true"
                >
                  <Plus className="w-4 h-4 cinema-tile-icon" strokeWidth={2.3} />
                  <span className="font-black tracking-wider text-[11px] uppercase">NEW DRAFT</span>
                </button>
              </CinemaToolHUD>
            </div>
          ) : (
            projects.map((proj) => {
              const isActive = proj.id === activeProjectId;
              const isDeleting = deleteConfirmId === proj.id;

              return (
                <div
                  key={proj.id}
                  onClick={() => handleSelectDraft(proj.id)}
                  data-active={isActive ? 'true' : 'false'}
                  className="cinema-tile cinema-tile-amber p-4 rounded-lg cursor-pointer flex flex-col justify-between gap-3 relative"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-black tracking-wider uppercase mb-2">
                      <span className={`px-2 py-0.5 rounded ${
                        isActive ? 'bg-amber-400 text-black' : 'bg-black/60 text-zinc-400 border border-[#26282E]'
                      }`}>
                        {isActive ? 'ACTIVE' : 'DRAFT'}
                      </span>
                      <span className="text-zinc-400">{proj.aspectRatio || '2.39:1'}</span>
                    </div>

                    <h3 className="text-xs font-black text-white uppercase tracking-wide line-clamp-1">
                      {proj.title}
                    </h3>
                    <div className="text-[10px] text-zinc-400 mt-1 tabular-nums">
                      {formatDate(proj.updatedAt)}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#26282E] flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2 font-black tracking-wider text-amber-300 uppercase">
                      <Clock className="w-3.5 h-3.5" strokeWidth={2.2} />
                      <span>{proj.duration ? `${proj.duration}S` : '36S'}</span>
                      <span className="text-zinc-600">/</span>
                      <span className="text-zinc-300">{proj.slideCount || 3} SLIDES</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <CinemaToolHUD
                        title="DUPLICATE DRAFT"
                        en="Create an independent copy of this project draft."
                        bn="কীভাবে ব্যবহার করবেন: প্রজেক্টের কপি বানাতে COPY বাটনে চাপুন।"
                        accent="cyan"
                      >
                        <button
                          type="button"
                          onClick={(e) => handleDuplicate(e, proj.id)}
                          aria-label="Duplicate draft"
                          className="cinema-tile cinema-tile-cyan min-h-[36px] min-w-[36px] px-2 rounded flex items-center justify-center cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
                        </button>
                      </CinemaToolHUD>

                      <CinemaToolHUD
                        title={isDeleting ? 'CONFIRM DELETE' : 'DELETE DRAFT'}
                        en={isDeleting ? 'Click again to permanently delete draft.' : 'Remove this draft from local vault.'}
                        bn="কীভাবে ব্যবহার করবেন: ড্রাফট মুছে ফেলতে পরপর দুইবার DELETE আইকনে চাপুন।"
                        accent="crimson"
                      >
                        <button
                          type="button"
                          data-active={isDeleting ? 'true' : 'false'}
                          onClick={(e) => handleDelete(e, proj.id)}
                          aria-label="Delete draft"
                          className="cinema-tile cinema-tile-crimson min-h-[36px] min-w-[36px] px-2 rounded flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
                          {isDeleting && (
                            <span className="font-black text-[9px] uppercase">CONFIRM</span>
                          )}
                        </button>
                      </CinemaToolHUD>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="min-h-[44px] px-4 py-2 bg-[#111215] border-t border-[#26282E] flex flex-wrap items-center justify-between gap-2 text-[10px] font-black tracking-wider uppercase text-zinc-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span>{isStoragePersisted ? 'PERSISTED' : 'INDEXEDDB'}</span>
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span>{formatBytes(quota.usedBytes)} ({quota.percent}%)</span>
            </span>
          </div>
          <span className="text-amber-400">RAWx VAULT V4</span>
        </div>
      </div>
    </div>
  );
};

