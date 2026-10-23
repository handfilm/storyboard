/**
 * @file /src/services/reviewStore.ts
 * @description Frame-accurate video markup & client annotation state for HANDFILM Review Studio (Module 11).
 * Supports Freehand Pen, Tactical Arrow, Bounding Box, and Text Flag with persistent storage.
 */

export type MarkupTool = 'pen' | 'arrow' | 'box' | 'text';
export type MarkupColor = '#F5A623' | '#00F0FF' | '#FF3344';

export interface ReviewPoint {
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
}

export interface ReviewAnnotation {
  id: string;
  shotIndex: number;
  frameNumber: number; // 1 - 288 (at 24fps)
  timeSec: number;
  tool: MarkupTool;
  color: MarkupColor;
  points?: ReviewPoint[]; // For freehand pen
  startX?: number; // percentage
  startY?: number; // percentage
  endX?: number;   // percentage
  endY?: number;   // percentage
  text?: string;
  author: string;
  resolved: boolean;
  timestamp: string;
}

type Listener = () => void;

class ReviewStore {
  private activeTool: MarkupTool = 'pen';
  private activeColor: MarkupColor = '#F5A623';
  private strokeWidth: number = 3;
  private annotations: ReviewAnnotation[] = [];
  private listeners: Set<Listener> = new Set();
  private storageKey = 'handfilm_review_annotations_v2';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.annotations = JSON.parse(saved);
      } else {
        // Initial cinematic sample pins
        this.annotations = [
          {
            id: 'ann-001',
            shotIndex: 0,
            frameNumber: 18,
            timeSec: 0.75,
            tool: 'text',
            color: '#F5A623',
            startX: 32,
            startY: 40,
            text: 'Increase optical bloom diffusion on the cybernetic iris.',
            author: 'Director (Rakib Himon)',
            resolved: false,
            timestamp: '14:22:04'
          },
          {
            id: 'ann-002',
            shotIndex: 1,
            frameNumber: 72,
            timeSec: 3.0,
            tool: 'box',
            color: '#00F0FF',
            startX: 55,
            startY: 28,
            endX: 82,
            endY: 65,
            text: 'Shadow fill too cold / adjust cyan balance on background monolith.',
            author: 'Lead Colorist',
            resolved: false,
            timestamp: '14:28:15'
          },
          {
            id: 'ann-003',
            shotIndex: 2,
            frameNumber: 144,
            timeSec: 6.0,
            tool: 'arrow',
            color: '#FF3344',
            startX: 20,
            startY: 75,
            endX: 45,
            endY: 50,
            text: 'Motion vector blur artifact on edge during whip pan.',
            author: 'VFX Supervisor',
            resolved: false,
            timestamp: '15:05:42'
          }
        ];
        this.saveToStorage();
      }
    } catch {
      // Fallback
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.annotations));
    } catch (e) {
      console.warn('Failed to save review annotations to localStorage', e);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  public getActiveTool(): MarkupTool {
    return this.activeTool;
  }

  public setActiveTool(tool: MarkupTool) {
    this.activeTool = tool;
    this.notify();
  }

  public getActiveColor(): MarkupColor {
    return this.activeColor;
  }

  public setActiveColor(color: MarkupColor) {
    this.activeColor = color;
    this.notify();
  }

  public getStrokeWidth(): number {
    return this.strokeWidth;
  }

  public setStrokeWidth(w: number) {
    this.strokeWidth = w;
    this.notify();
  }

  public getAnnotations(shotIndex?: number): ReviewAnnotation[] {
    if (shotIndex !== undefined) {
      return this.annotations.filter(a => a.shotIndex === shotIndex);
    }
    return [...this.annotations];
  }

  public addAnnotation(annotation: Omit<ReviewAnnotation, 'id' | 'timestamp' | 'resolved'>): ReviewAnnotation {
    const newAnn: ReviewAnnotation = {
      ...annotation,
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      resolved: false
    };
    this.annotations.unshift(newAnn);
    this.saveToStorage();
    this.notify();
    return newAnn;
  }

  public toggleResolved(id: string) {
    this.annotations = this.annotations.map(a => 
      a.id === id ? { ...a, resolved: !a.resolved } : a
    );
    this.saveToStorage();
    this.notify();
  }

  public deleteAnnotation(id: string) {
    this.annotations = this.annotations.filter(a => a.id !== id);
    this.saveToStorage();
    this.notify();
  }

  public clearAll() {
    this.annotations = [];
    this.saveToStorage();
    this.notify();
  }

  public exportManifestJson(projectTitle: string = 'HANDFILM_ANTHOLOGY'): string {
    const manifest = {
      project: projectTitle,
      exportDate: new Date().toISOString(),
      totalNotes: this.annotations.length,
      unresolvedCount: this.annotations.filter(a => !a.resolved).length,
      annotations: this.annotations
    };
    return JSON.stringify(manifest, null, 2);
  }

  public exportManifestMarkdown(projectTitle: string = 'HANDFILM_ANTHOLOGY'): string {
    const lines = [
      `# REVIEW MANIFEST // ${projectTitle}`,
      `> Generated: ${new Date().toLocaleString()} | Total Notes: ${this.annotations.length}`,
      '',
      '| Status | Shot | Frame | Timecode | Tool | Author | Note |',
      '| :---: | :---: | :---: | :---: | :---: | :---: | :--- |'
    ];

    this.annotations.forEach(a => {
      const status = a.resolved ? '✓ RESOLVED' : '⚠ OPEN';
      const shotLabel = `Shot ${String(a.shotIndex + 1).padStart(3, '0')}`;
      const frameLabel = `F${String(a.frameNumber).padStart(3, '0')}`;
      const timecode = `00:00:${String(Math.floor(a.timeSec)).padStart(2, '0')}:${String(Math.round((a.timeSec % 1) * 24)).padStart(2, '0')}`;
      const toolLabel = a.tool.toUpperCase();
      const text = (a.text || 'Visual mark').replace(/\|/g, '\\|');
      lines.push(`| ${status} | ${shotLabel} | ${frameLabel} | ${timecode} | ${toolLabel} | ${a.author} | ${text} |`);
    });

    lines.push('', '---', '_Exported from HANDFILM Review Studio (Module 11)_');
    return lines.join('\n');
  }
}

export const reviewStore = new ReviewStore();
