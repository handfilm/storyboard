/**
 * @file /src/constants/ecosystemApps.ts
 * @description Central Master Registry of the 25+ Subdomains in the handsandhead.com Ecosystem.
 * Powering the Mega Ecosystem Launcher (Omniverse Central Command OS).
 */

export interface EcosystemAppItem {
  id: string;
  name: string;
  subdomain: string;
  url: string;
  description: string;
  iconName: string;
  badge?: string;
  isInternalTool?: boolean;
}

export interface EcosystemCategory {
  id: string;
  title: string;
  icon: string;
  badge?: string;
  apps: EcosystemAppItem[];
}

export const ECOSYSTEM_CATEGORIES: EcosystemCategory[] = [
  {
    id: 'commerce',
    title: '[ 🌐 COMMERCE & ENTERPRISE ]',
    icon: 'Globe',
    badge: '3 PORTALS',
    apps: [
      {
        id: 'b2b',
        name: 'B2B Global',
        subdomain: 'b2b.handsandhead.com',
        url: 'https://b2b.handsandhead.com',
        description: 'Worldwide wholesale commerce & manufacturing hub',
        iconName: 'Building2',
        badge: 'B2B'
      },
      {
        id: 'admin',
        name: 'Admin Backend',
        subdomain: 'admin.handsandhead.com',
        url: 'https://admin.handsandhead.com',
        description: 'Enterprise ERP, multi-tenant inventory & ledger',
        iconName: 'ShieldCheck',
        badge: 'AUTH'
      },
      {
        id: 'd2c',
        name: 'D2C Storefront',
        subdomain: 'd2c.handsandhead.com',
        url: 'https://d2c.handsandhead.com',
        description: 'Direct-to-consumer flagship retail experience',
        iconName: 'ShoppingBag',
        badge: 'RETAIL'
      }
    ]
  },
  {
    id: 'studio',
    title: '[ 🎬 STUDIO & MEDIA ]',
    icon: 'Film',
    badge: '4 PORTALS',
    apps: [
      {
        id: 'hub',
        name: 'Media Hub',
        subdomain: 'hub.handsandhead.com',
        url: 'https://hub.handsandhead.com',
        description: 'Central creative command desk and client review',
        iconName: 'Layers',
        badge: 'HQ'
      },
      {
        id: 'vault',
        name: 'Vault',
        subdomain: 'vault.handsandhead.com',
        url: 'https://vault.handsandhead.com',
        description: 'Permanent 4K uncompressed RAW footage media storage',
        iconName: 'FolderLock',
        badge: 'STORAGE'
      },
      {
        id: 'deeper',
        name: 'Deeper Scopes',
        subdomain: 'deeper.handsandhead.com',
        url: 'https://deeper.handsandhead.com',
        description: 'Real-time hardware optical scopes & parade analyzers',
        iconName: 'Activity',
        badge: 'MONITOR'
      },
      {
        id: 'r2',
        name: 'R2 Stream',
        subdomain: 'xvideos-r2.handsandhead.com',
        url: 'https://xvideos-r2.handsandhead.com',
        description: 'Cloudflare R2 global zero-egress video edge streaming',
        iconName: 'Cloud',
        badge: 'EDGE'
      }
    ]
  },
  {
    id: 'tools',
    title: '[ 🛠️ CREATOR TOOLS ]',
    icon: 'Wrench',
    badge: '4 PORTALS',
    apps: [
      {
        id: 'aural',
        name: 'Aural Music',
        subdomain: 'aural.handsandhead.com',
        url: 'https://aural.handsandhead.com',
        description: 'Procedural 140 BPM audio synthesizer & DSP mastering',
        iconName: 'Music',
        badge: 'AUDIO'
      },
      {
        id: 'picseed',
        name: 'Picseed Photo',
        subdomain: 'picseed.handsandhead.com',
        url: 'https://picseed.handsandhead.com',
        description: 'Batch optical RAW image color grader & darkroom',
        iconName: 'Image',
        badge: 'STILLS'
      },
      {
        id: 'account',
        name: 'Account & Finance',
        subdomain: 'account.handsandhead.com',
        url: 'https://account.handsandhead.com',
        description: 'Studio billing, royalties & production cost ledger',
        iconName: 'CreditCard',
        badge: 'FINANCE'
      },
      {
        id: 'note',
        name: 'Note Director Pad',
        subdomain: 'note.handsandhead.com',
        url: 'https://note.handsandhead.com',
        description: 'Scriptwriting markdown scratchpad & shot notes',
        iconName: 'FileText',
        badge: 'SCRATCH'
      }
    ]
  },
  {
    id: 'kids',
    title: '[ 🧠 KIDS & LEARNING ]',
    icon: 'Sparkles',
    badge: '2 PORTALS',
    apps: [
      {
        id: 'hiya',
        name: 'Hiya World',
        subdomain: 'hiya.handsandhead.com',
        url: 'https://hiya.handsandhead.com',
        description: 'Interactive gamified learning for young storytellers',
        iconName: 'Smile',
        badge: 'EDU'
      },
      {
        id: 'bloom',
        name: 'Bloom App',
        subdomain: 'bloom.handsandhead.com',
        url: 'https://bloom.handsandhead.com',
        description: 'Kinetic visual sandbox & procedural color bloom',
        iconName: 'Sparkles',
        badge: 'CREATIVE'
      }
    ]
  },
  {
    id: 'atelier',
    title: '[ 📦 ATELIER (PHYSICAL GOODS) ]',
    icon: 'Package',
    badge: '6 ATELIERS',
    apps: [
      {
        id: 'rmg',
        name: 'RMG Production',
        subdomain: 'rmg.handsandhead.com',
        url: 'https://rmg.handsandhead.com',
        description: 'Ready-made garment manufacturing & technical specs',
        iconName: 'Scissors',
        badge: 'MFG'
      },
      {
        id: 'textile',
        name: 'Textile Studio',
        subdomain: 'textile.handsandhead.com',
        url: 'https://textile.handsandhead.com',
        description: 'Raw denim, organic cotton & weave composition',
        iconName: 'Shirt',
        badge: 'FABRIC'
      },
      {
        id: 'leather',
        name: 'Leather Atelier',
        subdomain: 'leather.handsandhead.com',
        url: 'https://leather.handsandhead.com',
        description: 'Full-grain vegetable-tanned artisanal leather goods',
        iconName: 'Briefcase',
        badge: 'LEATHER'
      },
      {
        id: 'jute',
        name: 'Jute Natural Fiber',
        subdomain: 'jute.handsandhead.com',
        url: 'https://jute.handsandhead.com',
        description: 'Golden fiber sustainable packaging & biodegradable goods',
        iconName: 'Leaf',
        badge: 'ECO'
      },
      {
        id: 'jacket',
        name: 'Jacket Workshop',
        subdomain: 'jacket.handsandhead.com',
        url: 'https://jacket.handsandhead.com',
        description: 'Architectural outerwear, bombers & heavy coats',
        iconName: 'Sparkle',
        badge: 'OUTERWEAR'
      },
      {
        id: 'bracelets',
        name: 'Bracelets & Metals',
        subdomain: 'bracelets.handsandhead.com',
        url: 'https://bracelets.handsandhead.com',
        description: 'Handcrafted titanium & woven leather wristwear',
        iconName: 'Watch',
        badge: 'JEWELRY'
      }
    ]
  },
  {
    id: 'lifestyle',
    title: '[ 📓 LIFESTYLE & BLOGS ]',
    icon: 'Compass',
    badge: '4 PORTALS',
    apps: [
      {
        id: 'me',
        name: 'Me (Personal Dossier)',
        subdomain: 'me.handsandhead.com',
        url: 'https://me.handsandhead.com',
        description: 'Director portfolio, personal manifesto & timeline',
        iconName: 'User',
        badge: 'BIO'
      },
      {
        id: 'articles',
        name: 'Articles & Essays',
        subdomain: 'articles.handsandhead.com',
        url: 'https://articles.handsandhead.com',
        description: 'Long-form editorial essays on cinema, culture & craft',
        iconName: 'BookOpen',
        badge: 'ESSAYS'
      },
      {
        id: 'gym',
        name: 'Gym & Kinetic Health',
        subdomain: 'gym.handsandhead.com',
        url: 'https://gym.handsandhead.com',
        description: 'Daily training regimens, metabolic health & athletic metrics',
        iconName: 'Dumbbell',
        badge: 'FITNESS'
      },
      {
        id: 'food',
        name: 'Food & Culinary',
        subdomain: 'food.handsandhead.com',
        url: 'https://food.handsandhead.com',
        description: 'Culinary alchemy, specialty coffee & gastronomy notes',
        iconName: 'Coffee',
        badge: 'CULINARY'
      }
    ]
  },
  {
    id: 'concepts',
    title: '[ 🔞 CONCEPT LIBRARIES ]',
    icon: 'Flame',
    badge: '2 ARCHIVES',
    apps: [
      {
        id: 'lingerie',
        name: 'Lingerie Design',
        subdomain: 'lingerie.handsandhead.com',
        url: 'https://lingerie.handsandhead.com',
        description: 'Avant-garde intimate apparel design & couture lines',
        iconName: 'Heart',
        badge: 'COUTURE'
      },
      {
        id: 'harness',
        name: 'Harness & Leather Bond',
        subdomain: 'harness.handsandhead.com',
        url: 'https://harness.handsandhead.com',
        description: 'Saddlery hardware, architectural body harnesses',
        iconName: 'Lock',
        badge: 'LEATHERCRAFT'
      }
    ]
  }
];

export const TOTAL_ECOSYSTEM_COUNT = ECOSYSTEM_CATEGORIES.reduce(
  (acc, cat) => acc + cat.apps.length,
  0
);
