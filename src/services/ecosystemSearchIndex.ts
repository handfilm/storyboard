/**
 * @file /src/services/ecosystemSearchIndex.ts
 * @description Fast in-memory keyword indexing engine for the 28+ ecosystem subdomains and studio tools.
 * Powers the StageHeader global search bar with instant keyword matching, fuzzy scoring, and metadata resolution.
 */

import { ECOSYSTEM_DATA, EcosystemProject } from '../constants/ecosystemApps';

export interface IndexedItem {
  id: string;
  title: string;
  sub: string;
  category: string;
  categoryGroup: string;
  url: string;
  type: 'ecosystem' | 'studio-tool';
  keywords: string[];
  actionId?: string;
  iconName?: string;
}

export interface SearchMatchResult extends IndexedItem {
  score: number;
  matchedKeywords: string[];
}

// Domain-specific keyword expansion dictionary
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  b2b: ['wholesale', 'trade', 'international', 'commerce', 'export', 'enterprise', 'manufacturing', 'supply', 'global'],
  admin: ['backend', 'operations', 'analytics', 'erp', 'ledger', 'mission control', 'dashboard', 'database'],
  d2c: ['storefront', 'consumer', 'retail', 'ecommerce', 'direct', 'shopping', 'store', 'marketplace'],
  handfilm: ['studio', 'cinema', 'ai', 'video', 'nle', 'editor', 'timeline', 'assembly', 'storyboard', 'rawx', '4k'],
  hub: ['media', 'vault', 'production', 'central', 'desk', 'assets', 'creative', 'review'],
  vault: ['storage', 'raw', 'footage', 'archive', 'lossless', 'indexeddb', 'pipeline', 'assets'],
  deeper: ['cinema', 'docs', 'scopes', 'monitor', 'parade', 'histogram', 'optical', 'waveform', 'color'],
  r2: ['streaming', 'cloudflare', 'r2', 'edge', 'video', 'hls', 'distribution', 'cdn'],
  aural: ['audio', 'music', 'dsp', 'synthesizer', 'metal', 'rap', 'reggae', 'sound', 'beats', 'mastering'],
  picseed: ['photo', 'raw', 'darkroom', 'editorial', 'grading', 'stills', 'color', 'camera'],
  account: ['finance', 'ledger', 'cash-flow', 'accounting', 'invoicing', 'money', 'budget'],
  note: ['notes', 'markdown', 'knowledge', 'graph', 'scratchpad', 'script', 'screenplay', 'fountain'],
  bloom: ['ed-tech', 'kids', 'tv', 'smart tv', 'bangla', 'children', 'learning', 'bloom', 'animation'],
  hiya: ['education', 'learning', 'children', 'sandbox', 'interactive', 'gamified', 'storytellers'],
  rawx: ['atelier', 'apparel', 'leather', 'jackets', 'full-grain', 'fashion', 'outerwear', 'craft'],
  arutemika: ['footwear', 'boots', 'goodyear', 'welted', 'shoes', 'leather', 'craftsmanship'],
  jacket: ['streetwear', 'atelier', 'bomber', 'outerwear', 'brutalist', 'performance', 'coats'],
  leather: ['tannery', 'cowhide', 'hemayetpur', 'artisanal', 'crust', 'vegetable-tanned', 'hides'],
  bracelets: ['accessories', 'brass', 'wristwear', 'hardware', 'bridle', 'jewelry', 'cuffs'],
  rmg: ['garments', 'export', 'heavy', 'streetwear', '260gsm', '300gsm', 'apparel', 'factory', 'mfg'],
  textile: ['textile', 'mills', 'savar', 'selvedge', 'denim', 'weaves', 'cotton', 'vintage', 'shuttle-loom'],
  jute: ['natural fibers', 'golden fiber', 'biodegradable', 'packaging', 'bangladesh', 'eco', 'sustainable'],
  me: ['portfolio', 'rakib', 'himon', 'personal', 'archive', 'manifesto', 'director', 'timeline'],
  articles: ['articles', 'essays', 'discourse', 'literature', 'indo-aryan', 'bengali', 'philosophy', 'culture'],
  gym: ['gym', 'kinetics', 'shadow boxing', 'conditioning', 'fitness', 'athletic', 'reps', 'training'],
  food: ['food', 'culinary', 'dhaka', 'spices', 'tradition', 'gastronomy', 'coffee', 'recipes'],
  lingerie: ['lingerie', 'couture', 'geometric', 'silk', 'mesh', 'previs', 'atelier', 'intimate'],
  harness: ['harness', 'leather', 'rivets', 'saddlery', 'modular', 'hardware', 'straps', 'bond']
};

// Internal Studio Tools indexed alongside external apps
const INTERNAL_STUDIO_TOOLS: IndexedItem[] = [
  {
    id: 'tool-ai-forge',
    title: 'AI CINE FORGE',
    sub: 'Director prompt synth, scene loglines & cinematic script generation',
    category: 'STUDIO TOOL',
    categoryGroup: 'STUDIO OS',
    url: '#',
    type: 'studio-tool',
    actionId: 'aiforge:open',
    keywords: ['ai', 'prompt', 'gemini', 'director', 'script', 'logline', 'forge', 'generate']
  },
  {
    id: 'tool-neural-vox',
    title: 'NEURAL AUDIO ENGINE',
    sub: 'Bilingual Bengali voice synthesis & scratch audio VO generator',
    category: 'AUDIO TOOL',
    categoryGroup: 'STUDIO OS',
    url: '#',
    type: 'studio-tool',
    actionId: 'neuralvox:open',
    keywords: ['neural', 'audio', 'voice', 'voiceover', 'vo', 'tts', 'bengali', 'synth']
  },
  {
    id: 'tool-vector-forge',
    title: 'VECTOR FORGE CANVAS',
    sub: 'Precision pen tool, vector path masking & custom visual shape overlays',
    category: 'GRAPHICS TOOL',
    categoryGroup: 'STUDIO OS',
    url: '#',
    type: 'studio-tool',
    actionId: 'vectorforge:open',
    keywords: ['vector', 'draw', 'pen', 'canvas', 'svg', 'path', 'mask', 'illustration']
  },
  {
    id: 'tool-rap-sync',
    title: 'RAP AUDIO SYNC',
    sub: '140 BPM cadence synchronizer & lyrical transient beat detector',
    category: 'AUDIO TOOL',
    categoryGroup: 'STUDIO OS',
    url: '#',
    type: 'studio-tool',
    actionId: 'rapsync:open',
    keywords: ['rap', 'beats', '140bpm', 'sync', 'audio', 'transient', 'cadence', 'music']
  },
  {
    id: 'tool-recorder',
    title: '4K SCREEN & AUDIO RECORDER',
    sub: 'Hardware-accelerated browser canvas & WebAudio DSP direct capturer',
    category: 'CAPTURE TOOL',
    categoryGroup: 'STUDIO OS',
    url: '#',
    type: 'studio-tool',
    actionId: 'recorder:open',
    keywords: ['rec', 'record', 'capture', 'screen', 'video', 'webaudio', '4k']
  },
  {
    id: 'tool-export-studio',
    title: 'UNIFIED MASTER EXPORT',
    sub: '4K WebCodecs MP4, Premiere XML, DaVinci FCPXML & PDF contact sheets',
    category: 'EXPORT TOOL',
    categoryGroup: 'STUDIO OS',
    url: '#',
    type: 'studio-tool',
    actionId: 'export:open',
    keywords: ['export', 'mp4', 'xml', 'fcpxml', 'davinci', 'premiere', 'render', '4k', 'pdf']
  }
];

class EcosystemSearchEngine {
  private items: IndexedItem[] = [];

  constructor() {
    this.buildIndex();
  }

  private buildIndex() {
    // 1. Ingest all 28 subdomains from ECOSYSTEM_DATA
    ECOSYSTEM_DATA.forEach((catGroup) => {
      catGroup.projects.forEach((proj: EcosystemProject) => {
        const domainKeywords = DOMAIN_KEYWORDS[proj.id] || [];
        const baseWords = [
          proj.id.toLowerCase(),
          proj.title.toLowerCase(),
          proj.category.toLowerCase(),
          catGroup.categoryName.toLowerCase(),
          ...proj.sub.toLowerCase().split(/\s+/),
          proj.url.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()
        ];

        const allKeywords = Array.from(new Set([...baseWords, ...domainKeywords]));

        this.items.push({
          id: proj.id,
          title: proj.title,
          sub: proj.sub,
          category: proj.category,
          categoryGroup: catGroup.categoryName,
          url: proj.url,
          type: 'ecosystem',
          keywords: allKeywords
        });
      });
    });

    // 2. Ingest internal Studio Tools
    this.items.push(...INTERNAL_STUDIO_TOOLS);
  }

  /**
   * Performs multi-term keyword search with relevance scoring
   */
  public search(query: string, limit = 8): SearchMatchResult[] {
    const raw = query.trim().toLowerCase();
    if (!raw) return [];

    const queryTokens = raw.split(/\s+/).filter(Boolean);

    const matches: SearchMatchResult[] = [];

    for (const item of this.items) {
      let score = 0;
      const matchedKeywords: string[] = [];

      const titleLower = item.title.toLowerCase();
      const subLower = item.sub.toLowerCase();
      const catLower = item.category.toLowerCase();
      const idLower = item.id.toLowerCase();
      const urlLower = item.url.toLowerCase();

      // Exact title match gets massive boost
      if (titleLower === raw) {
        score += 120;
      } else if (titleLower.startsWith(raw)) {
        score += 70;
      } else if (titleLower.includes(raw)) {
        score += 40;
      }

      // Check ID match (e.g. "b2b", "r2", "vault", "gym")
      if (idLower === raw || idLower.includes(raw)) {
        score += 80;
      }

      // Check category match
      if (catLower.includes(raw)) {
        score += 30;
      }

      // Check Subtitle match
      if (subLower.includes(raw)) {
        score += 25;
      }

      // Check URL match
      if (urlLower.includes(raw)) {
        score += 35;
      }

      // Check individual keyword tokens
      for (const token of queryTokens) {
        for (const kw of item.keywords) {
          if (kw === token) {
            score += 20;
            matchedKeywords.push(kw);
          } else if (kw.startsWith(token)) {
            score += 10;
            matchedKeywords.push(kw);
          } else if (kw.includes(token)) {
            score += 5;
            matchedKeywords.push(kw);
          }
        }
      }

      if (score > 0) {
        matches.push({
          ...item,
          score,
          matchedKeywords: Array.from(new Set(matchedKeywords))
        });
      }
    }

    // Sort by descending score
    matches.sort((a, b) => b.score - a.score);

    return matches.slice(0, limit);
  }

  /**
   * Returns quick suggestion list when search bar is focused but query is empty
   */
  public getFeaturedItems(): IndexedItem[] {
    return [
      this.items.find((i) => i.id === 'handfilm'),
      this.items.find((i) => i.id === 'b2b'),
      this.items.find((i) => i.id === 'vault'),
      this.items.find((i) => i.id === 'aural'),
      this.items.find((i) => i.id === 'tool-ai-forge'),
      this.items.find((i) => i.id === 'rawx')
    ].filter(Boolean) as IndexedItem[];
  }
}

export const ecosystemSearchEngine = new EcosystemSearchEngine();
