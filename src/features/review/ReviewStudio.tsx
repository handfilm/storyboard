/**
 * RAWx Studio — Review, Annotation & Collaboration Engine
 * Public API: ReviewStudio component
 * Features on-frame pinned comments, canvas drawing pen annotations,
 * approval status workflow, and visual version diffing between cuts.
 */

import React, { useState, useRef } from 'react';
import { useStudioStore } from '../../core/store';
import { 
  MessageSquare, 
  PenTool, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Send, 
  Download, 
  GitCompare, 
  Trash2,
  User
} from 'lucide-react';

interface CommentPin {
  id: string;
  shotId: number;
  x: number; // %
  y: number; // %
  author: string;
  role: 'Director' | 'Producer' | 'Client';
  text: string;
  createdAt: string;
}

export const ReviewStudio: React.FC = () => {
  const {
    activeShotIndex,
    project,
    updateShot
  } = useStudioStore();

  const currentShot = project.shots[activeShotIndex] || {};
  const imageUrl = currentShot.imageUrl || 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1920&q=80';
  const isVideo = Boolean(
    currentShot.isVideo ||
    (imageUrl && (
      imageUrl.startsWith('data:video') ||
      imageUrl.startsWith('blob:') ||
      /\.(mp4|webm|mov|ogg|m4v)($|\?)/i.test(imageUrl)
    ))
  );

  const [comments, setComments] = useState<CommentPin[]>([
    {
      id: 'c-1',
      shotId: 0,
      x: 35,
      y: 40,
      author: 'Rakib Himon',
      role: 'Director',
      text: 'Push vertical pan down 10% to reveal the glowing Dhaka neon sign.',
      createdAt: '10 mins ago'
    },
    {
      id: 'c-2',
      shotId: 0,
      x: 65,
      y: 25,
      author: 'Studio Executive',
      role: 'Producer',
      text: 'Lighting grade looks cinematic, approved for animatic mix!',
      createdAt: '25 mins ago'
    }
  ]);

  const [activeTab, setActiveTab] = useState<'comments' | 'draw' | 'diff'>('comments');
  const [newCommentText, setNewCommentText] = useState('');
  const [pinCoords, setPinCoords] = useState<{ x: number; y: number } | null>(null);
  const [userRole, setUserRole] = useState<'Director' | 'Producer' | 'Client'>('Director');
  const [approvalStatus, setApprovalStatus] = useState<'Draft' | 'In Review' | 'Approved' | 'Re-shoot'>('In Review');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const shotComments = comments.filter(c => c.shotId === activeShotIndex);

  const handleFrameClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTab !== 'comments') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setPinCoords({ x, y });
  };

  const handleAddComment = () => {
    if (!newCommentText.trim() || !pinCoords) return;
    const newPin: CommentPin = {
      id: `comm-${Date.now()}`,
      shotId: activeShotIndex,
      x: pinCoords.x,
      y: pinCoords.y,
      author: userRole === 'Director' ? 'Rakib Himon' : userRole === 'Producer' ? 'Studio Exec' : 'Client Reviewer',
      role: userRole,
      text: newCommentText.trim(),
      createdAt: 'Just now'
    };

    setComments(prev => [...prev, newPin]);
    setNewCommentText('');
    setPinCoords(null);
  };

  const handleStatusChange = (status: typeof approvalStatus) => {
    setApprovalStatus(status);
    const mappedStatus = status === 'Approved' ? 'approved' : status === 'Draft' ? 'planned' : status === 'Re-shoot' ? 'cut' : 'in-progress';
    updateShot(activeShotIndex, { status: mappedStatus });
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-[#050505] text-[#EDEDED] font-mono select-none overflow-hidden">
      {/* Left Review Canvas Viewport */}
      <div className="flex-1 flex flex-col border-r border-[#D4AF37]/20 overflow-hidden">
        {/* Header */}
        <div className="h-12 border-b border-[#D4AF37]/20 bg-[#0B0B0B] px-4 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
            <span className="font-bold text-[#FFE066]">REVIEW & COLLABORATION ROUND</span>
            <span className="text-[#8A8A8A]">| SHOT #{String(activeShotIndex + 1).padStart(3, '0')}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#121212] p-0.5 rounded border border-[#D4AF37]/20 text-xs">
              <button
                onClick={() => setActiveTab('comments')}
                className={`px-3 py-1 rounded transition-colors ${activeTab === 'comments' ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8A8A8A]'}`}
              >
                PINS ({shotComments.length})
              </button>
              <button
                onClick={() => setActiveTab('draw')}
                className={`px-3 py-1 rounded transition-colors ${activeTab === 'draw' ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8A8A8A]'}`}
              >
                MARKUP PEN
              </button>
            </div>

            {/* Approval Status */}
            <select
              value={approvalStatus}
              onChange={(e) => handleStatusChange(e.target.value as any)}
              className="bg-[#121212] border border-[#D4AF37]/30 text-[#FFE066] rounded px-2 py-1 text-xs font-bold"
            >
              <option value="Draft">DRAFT</option>
              <option value="In Review">IN REVIEW</option>
              <option value="Approved">APPROVED</option>
              <option value="Re-shoot">RE-SHOOT</option>
            </select>
          </div>
        </div>

        {/* Interactive Frame Canvas */}
        <div className="flex-1 bg-[#030304] flex items-center justify-center p-6 relative overflow-hidden">
          <div 
            onClick={handleFrameClick}
            className="w-full max-w-4xl aspect-video bg-black rounded border border-[#D4AF37]/30 relative overflow-hidden shadow-2xl cursor-crosshair"
          >
            {isVideo ? (
              <video
                src={imageUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={imageUrl}
                alt="Review Shot"
                className="w-full h-full object-cover"
              />
            )}

            {/* Render Pinned Comments */}
            {shotComments.map((pin, idx) => (
              <div
                key={pin.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              >
                <div className="w-6 h-6 rounded-full bg-[#D4AF37] border-2 border-black flex items-center justify-center text-[10px] font-bold text-black shadow-lg">
                  {idx + 1}
                </div>

                {/* Hover Tooltip */}
                <div className="absolute left-8 top-0 w-52 p-2 bg-black/90 border border-[#D4AF37]/40 rounded text-[11px] text-[#EDEDED] shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-30">
                  <div className="font-bold text-[#FFE066] flex justify-between">
                    <span>{pin.author}</span>
                    <span className="text-[9px] text-[#8A8A8A]">{pin.role}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-[#EDEDED]">{pin.text}</p>
                </div>
              </div>
            ))}

            {/* New Pin Draft Placement */}
            {pinCoords && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 animate-bounce"
                style={{ left: `${pinCoords.x}%`, top: `${pinCoords.y}%` }}
              >
                <div className="w-6 h-6 rounded-full bg-[#00FFCC] border-2 border-black flex items-center justify-center text-[10px] font-bold text-black">
                  +
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Comments & Feedback List */}
      <div className="w-full md:w-80 bg-[#0B0B0B] p-4 flex flex-col gap-4 text-xs overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-2">
          <h3 className="font-bold text-[#FFE066] uppercase">Reviewer Comments</h3>
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as any)}
            className="bg-[#121212] border border-[#D4AF37]/20 text-[10px] text-[#8A8A8A] rounded px-1.5 py-0.5"
          >
            <option value="Director">Role: Director</option>
            <option value="Producer">Role: Producer</option>
            <option value="Client">Role: Client</option>
          </select>
        </div>

        {/* Pin Creation Box */}
        {pinCoords ? (
          <div className="p-3 bg-[#121212] border border-[#00FFCC]/40 rounded-lg flex flex-col gap-2">
            <span className="text-[10px] text-[#00FFCC] font-bold">
              Pin placed at ({pinCoords.x}%, {pinCoords.y}%)
            </span>
            <textarea
              rows={3}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Type revision notes or feedback..."
              className="w-full bg-[#050505] border border-[#D4AF37]/30 rounded p-2 text-xs text-[#EDEDED] focus:outline-none focus:border-[#D4AF37] resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddComment}
                className="flex-1 py-1.5 bg-[#D4AF37] hover:bg-[#FFE066] text-black font-bold rounded text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Send className="w-3 h-3" />
                <span>POST COMMENT</span>
              </button>
              <button
                onClick={() => setPinCoords(null)}
                className="px-2 py-1.5 bg-[#050505] border border-[#D4AF37]/20 rounded text-[#8A8A8A]"
              >
                CANCEL
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-[#121212] border border-[#D4AF37]/20 rounded-lg text-center text-[#8A8A8A] text-[11px]">
            Click anywhere on the preview frame to drop a revision pin!
          </div>
        )}

        {/* Comments Feed */}
        <div className="flex flex-col gap-2.5">
          {shotComments.map((c, i) => (
            <div key={c.id} className="p-3 bg-[#121212] border border-[#D4AF37]/20 rounded-lg flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 font-bold text-[#EDEDED]">
                  <span className="w-4 h-4 rounded-full bg-[#D4AF37] text-black flex items-center justify-center text-[9px]">
                    {i + 1}
                  </span>
                  <span>{c.author}</span>
                </div>
                <span className="text-[9px] text-[#FFE066] px-1 bg-black rounded border border-[#D4AF37]/20">
                  {c.role}
                </span>
              </div>
              <p className="text-[11px] text-[#8A8A8A]">{c.text}</p>
              <span className="text-[9px] text-[#555] mt-1">{c.createdAt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
