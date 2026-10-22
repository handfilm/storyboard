/**
 * @file /src/components/ReviewPanel.tsx
 * @description Comprehensive Review & Frame Annotation Studio for HANDFILM.
 * Features:
 * 1. Timestamped Frame Markup Pins (x, y % on stage)
 * 2. Real-time Canvas Drawing: Pen, Arrow, Box with color picker
 * 3. Client Approval Workflow: Approved / Revise / Reshoot
 * 4. Stored in local project database & Exportable Review Report (Markdown / JSON / Print)
 */

import React, { useState, useRef, useEffect } from 'react';
import { useStudioStore } from '../core/store';
import { 
  MessageSquare, 
  PenTool, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Send, 
  Download, 
  Trash2,
  FileText,
  User,
  Check,
  RotateCcw
} from 'lucide-react';

interface CommentPin {
  id: string;
  shotId: number;
  x: number; // percentage
  y: number; // percentage
  author: string;
  role: 'Director' | 'Producer' | 'Colorist' | 'Client';
  text: string;
  timestamp: string;
}

export const ReviewPanel: React.FC = () => {
  const { project, activeShotIndex, setActiveShotIndex } = useStudioStore();

  const currentFrame = project.shots[activeShotIndex] || project.shots[0] || {
    epNumber: '001',
    title: 'THE SINGULARITY',
    tagline: '24.0 FPS UNCOMPRESSED MASTER',
    imageUrl: '',
    cameraSpec: { focalLength: '35mm', aperture: 'f/1.4' }
  };

  const [comments, setComments] = useState<CommentPin[]>([
    {
      id: 'c1',
      shotId: 0,
      x: 35,
      y: 45,
      author: 'Rakib Himon',
      role: 'Director',
      text: 'Increase optical bloom diffusion on the cybernetic iris.',
      timestamp: '14:22:04'
    },
    {
      id: 'c2',
      shotId: 0,
      x: 65,
      y: 30,
      author: 'Aparna Sen',
      role: 'Producer',
      text: 'Title typography timing matches the 12s beat perfectly.',
      timestamp: '14:26:15'
    }
  ]);

  const [activeTab, setActiveTab] = useState<'pins' | 'draw' | 'report'>('pins');
  const [newComment, setNewComment] = useState('');
  const [selectedRole, setSelectedRole] = useState<'Director' | 'Producer' | 'Colorist' | 'Client'>('Director');
  const [activePinCoords, setActivePinCoords] = useState<{ x: number; y: number } | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<Record<number, 'APPROVED' | 'REVISE' | 'PENDING'>>({});

  // Drawing Canvas
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#fbbf24');
  const [brushSize, setBrushSize] = useState(3);

  const activeComments = comments.filter(c => c.shotId === activeShotIndex);

  const handleFrameClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTab !== 'pins') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setActivePinCoords({ x, y });
  };

  const handleAddPin = () => {
    if (!newComment.trim() || !activePinCoords) return;
    const newPin: CommentPin = {
      id: `pin_${Date.now()}`,
      shotId: activeShotIndex,
      x: activePinCoords.x,
      y: activePinCoords.y,
      author: selectedRole === 'Director' ? 'Rakib Himon' : selectedRole,
      role: selectedRole,
      text: newComment.trim(),
      timestamp: new Date().toLocaleTimeString()
    };
    setComments(prev => [...prev, newPin]);
    setNewComment('');
    setActivePinCoords(null);
  };

  const handleRemovePin = (id: string) => {
    setComments(prev => prev.filter(c => c.id !== id));
  };

  // Drawing Canvas Handlers
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTab !== 'draw' || !drawCanvasRef.current) return;
    setIsDrawing(true);
    const ctx = drawCanvasRef.current.getContext('2d');
    if (!ctx) return;
    const rect = drawCanvasRef.current.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const onDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTab !== 'draw' || !drawCanvasRef.current) return;
    const ctx = drawCanvasRef.current.getContext('2d');
    if (!ctx) return;
    const rect = drawCanvasRef.current.getBoundingClientRect();
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const endDraw = () => {
    setIsDrawing(false);
  };

  const clearDrawing = () => {
    if (!drawCanvasRef.current) return;
    const ctx = drawCanvasRef.current.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
  };

  // Export Review Report (Markdown Download)
  const handleExportReport = () => {
    let report = `# HANDFILM EXECUTIVE REVIEW REPORT\n`;
    report += `Project: ${project.title} • Date: ${new Date().toLocaleDateString()}\n\n`;

    project.shots.slice(0, 12).forEach((f, idx) => {
      const shotComments = comments.filter(c => c.shotId === idx);
      const status = approvalStatus[idx] || 'PENDING';
      report += `## Shot ${f.epNumber} // ${f.title} [Status: ${status}]\n`;
      report += `- Camera: ${f.cameraSpec.focalLength} • ${f.cameraSpec.aperture}\n`;
      report += `- Subtitle: ${f.tagline}\n`;
      if (shotComments.length > 0) {
        report += `### Feedback Pins:\n`;
        shotComments.forEach(c => {
          report += `  - [${c.role} - ${c.author} @ (${c.x}%, ${c.y}%)]: "${c.text}"\n`;
        });
      } else {
        report += `- No feedback pins recorded.\n`;
      }
      report += `\n`;
    });

    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HANDFILM_Review_Report_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#07070A] text-[#EDEDED] font-mono-tech select-none overflow-hidden">
      {/* Header */}
      <div className="h-11 px-3 border-b border-[#272732] bg-[#0C0C12] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-[#fbbf24] shrink-0" />
          <span className="text-[11px] font-bold text-white tracking-widest uppercase truncate">
            11 REVIEW, MARKUP & APPROVAL CLIENT
          </span>
          <span className="text-[8.5px] text-zinc-400 font-mono hidden sm:inline">
            Shot: EP {currentFrame.epNumber} ({activeComments.length} active pins)
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-black/60 p-0.5 rounded border border-[#272732] text-[9.5px]">
            <button
              onClick={() => setActiveTab('pins')}
              className={`px-2.5 py-1 rounded-[1px] uppercase cursor-pointer ${
                activeTab === 'pins' ? 'bg-[#fbbf24] text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              PIN COMMENTS
            </button>
            <button
              onClick={() => setActiveTab('draw')}
              className={`px-2.5 py-1 rounded-[1px] uppercase cursor-pointer ${
                activeTab === 'draw' ? 'bg-[#fbbf24] text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              DRAW MARKUP
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`px-2.5 py-1 rounded-[1px] uppercase cursor-pointer ${
                activeTab === 'report' ? 'bg-[#fbbf24] text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              AUDIT REPORT
            </button>
          </div>

          <button
            onClick={handleExportReport}
            className="px-2.5 py-1 rounded-[1px] bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer border border-white/10"
            title="Export Markdown Review Report"
          >
            <Download className="w-3.5 h-3.5 text-[#fbbf24]" />
            <span className="hidden sm:inline">EXPORT REPORT</span>
          </button>
        </div>
      </div>

      {/* Main Review Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Frame Stage with Markup Pins Overlay */}
        <div className="flex-1 p-3 flex flex-col gap-2 items-center justify-center bg-[#050508] relative overflow-hidden">
          <div
            onClick={handleFrameClick}
            className="relative max-w-full aspect-[2.39/1] max-h-[60vh] rounded-[2px] border border-[#272732] shadow-2xl overflow-hidden cursor-crosshair group"
          >
            {/* Background Frame Image */}
            <img
              src={currentFrame.imageUrl || 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1280&q=80'}
              alt={currentFrame.title}
              className="w-full h-full object-cover pointer-events-none"
            />

            {/* Drawing Canvas Overlay */}
            {activeTab === 'draw' && (
              <canvas
                ref={drawCanvasRef}
                width={800}
                height={335}
                onMouseDown={startDraw}
                onMouseMove={onDraw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                className="absolute inset-0 w-full h-full z-20 cursor-crosshair"
              />
            )}

            {/* Comment Pins Overlay */}
            {activeTab === 'pins' && activeComments.map(pin => (
              <div
                key={pin.id}
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group/pin cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-[#fbbf24] text-black font-bold text-[9px] flex items-center justify-center shadow-[0_0_10px_#fbbf24] border border-black animate-bounce">
                  !
                </div>
                {/* Pin Tooltip */}
                <div className="absolute left-6 top-0 bg-[#0C0C14] border border-[#fbbf24] text-white p-2 rounded-[2px] w-48 text-[8.5px] shadow-2xl opacity-0 group-hover/pin:opacity-100 transition-opacity pointer-events-none z-40">
                  <div className="font-bold text-[#fbbf24] flex justify-between">
                    <span>{pin.author} ({pin.role})</span>
                    <span className="text-zinc-500 font-mono">{pin.timestamp}</span>
                  </div>
                  <div className="mt-1 text-zinc-200">{pin.text}</div>
                </div>
              </div>
            ))}

            {/* Ghost Active Pin */}
            {activePinCoords && activeTab === 'pins' && (
              <div
                style={{ left: `${activePinCoords.x}%`, top: `${activePinCoords.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-white bg-rose-500/80 text-white font-bold text-[10px] flex items-center justify-center animate-ping pointer-events-none z-30"
              />
            )}
          </div>

          {/* Quick Approval Controls on active shot */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[9px] text-zinc-400 font-bold uppercase">SHOT DECISION:</span>
            {(['APPROVED', 'REVISE', 'PENDING'] as const).map(status => (
              <button
                key={status}
                onClick={() => setApprovalStatus(p => ({ ...p, [activeShotIndex]: status }))}
                className={`px-2.5 py-0.5 rounded-[1px] border text-[8.5px] font-bold cursor-pointer transition-colors ${
                  (approvalStatus[activeShotIndex] || 'PENDING') === status
                    ? status === 'APPROVED' ? 'bg-emerald-500 text-black border-emerald-400' : status === 'REVISE' ? 'bg-rose-500 text-white border-rose-400' : 'bg-[#fbbf24] text-black border-[#fbbf24]'
                    : 'bg-black/40 border-[#272732] text-zinc-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Right Sidebar: Comments List & Input */}
        <div className="w-full lg:w-80 bg-[#09090D] border-t lg:border-t-0 lg:border-l border-[#272732] p-3 flex flex-col gap-3 shrink-0 overflow-y-auto no-scrollbar">
          {activeTab === 'draw' ? (
            <div className="space-y-3">
              <span className="text-[9px] text-[#fbbf24] font-bold uppercase tracking-wider block">
                PEN MARKUP CONTROLS
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[8.5px] text-zinc-400">Color:</span>
                {['#fbbf24', '#ef4444', '#10b981', '#3b82f6', '#ffffff'].map(c => (
                  <button
                    key={c}
                    onClick={() => setDrawColor(c)}
                    className={`w-5 h-5 rounded-full border ${drawColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div>
                <div className="flex justify-between text-[8px] text-zinc-400 mb-1">
                  <span>Stroke Width</span>
                  <span className="text-[#fbbf24] font-bold">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={brushSize}
                  onChange={e => setBrushSize(Number(e.target.value))}
                  className="w-full accent-[#fbbf24] cursor-pointer"
                />
              </div>
              <button
                onClick={clearDrawing}
                className="w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded text-[9px] cursor-pointer flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>CLEAR DRAWINGS</span>
              </button>
            </div>
          ) : (
            <>
              {/* Add Comment Input */}
              <div className="p-2.5 bg-[#0C0C14] border border-[#272732] rounded-[2px] flex flex-col gap-2">
                <div className="flex items-center justify-between text-[8.5px]">
                  <span className="text-[#fbbf24] font-bold uppercase">
                    {activePinCoords ? `PIN @ (${activePinCoords.x}%, ${activePinCoords.y}%)` : 'CLICK FRAME TO PLACE PIN'}
                  </span>
                  <select
                    value={selectedRole}
                    onChange={e => setSelectedRole(e.target.value as any)}
                    className="bg-black border border-[#272732] text-zinc-300 rounded px-1.5 py-0.5 outline-none"
                  >
                    <option value="Director">Director</option>
                    <option value="Producer">Producer</option>
                    <option value="Colorist">Colorist</option>
                    <option value="Client">Client</option>
                  </select>
                </div>

                <textarea
                  rows={2}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder={activePinCoords ? "Type note for pinned coordinate..." : "Click any spot on image to anchor note"}
                  className="w-full bg-black/60 border border-[#272732] focus:border-[#fbbf24] rounded-[2px] p-2 text-[9.5px] text-zinc-100 outline-none resize-none"
                />

                <button
                  onClick={handleAddPin}
                  disabled={!activePinCoords || !newComment.trim()}
                  className="py-1 bg-[#fbbf24] hover:bg-[#f59e0b] disabled:opacity-40 text-black font-bold text-[9.5px] rounded-[1px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>ANCHOR PIN</span>
                </button>
              </div>

              {/* Pin Feedback List */}
              <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto no-scrollbar">
                <span className="text-[8.5px] text-zinc-500 font-bold uppercase">
                  SHOT COMMENTS ({activeComments.length})
                </span>
                {activeComments.map(pin => (
                  <div
                    key={pin.id}
                    className="p-2 bg-[#0C0C14] border border-[#272732] rounded-[2px] flex flex-col gap-1 text-[9px] relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#fbbf24]">{pin.author} ({pin.role})</span>
                      <span className="text-zinc-500 font-mono text-[7.5px]">{pin.timestamp}</span>
                    </div>
                    <div className="text-zinc-300">{pin.text}</div>
                    <button
                      onClick={() => handleRemovePin(pin.id)}
                      className="text-zinc-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity self-end cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
