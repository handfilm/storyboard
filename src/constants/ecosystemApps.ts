/**
 * @file /src/constants/ecosystemApps.ts
 * @description Central Master Registry of the 28 Subdomains in the handsandhead.com Ecosystem.
 * Powering [ THE HIMON ECOSYSTEM ] visual card launcher & Omniverse Central Command.
 */

export interface EcosystemProject {
  id: string;
  category: string;
  title: string;
  sub: string;
  url: string;
  image: string;
}

export interface EcosystemCategory {
  categoryName: string;
  projects: EcosystemProject[];
}

export const ECOSYSTEM_DATA: EcosystemCategory[] = [
  {
    categoryName: "COMMERCE & ENTERPRISE",
    projects: [
      { 
        id: "b2b", 
        category: "ENTERPRISE", 
        title: "B2B GLOBAL ENGINE", 
        sub: "Wholesale & International Trade", 
        url: "https://b2b.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800" 
      },
      { 
        id: "admin", 
        category: "OPERATIONS", 
        title: "ADMIN BACKEND", 
        sub: "Mission Control & Analytics", 
        url: "https://admin.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?q=80&w=800" 
      },
      { 
        id: "d2c", 
        category: "COMMERCE", 
        title: "D2C STOREFRONT", 
        sub: "Direct Consumer Platform", 
        url: "https://d2c.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=800" 
      }
    ]
  },
  {
    categoryName: "CINEMA, AUDIO & MEDIA",
    projects: [
      { 
        id: "handfilm", 
        category: "CINEMA & AI", 
        title: "HANDFILM STUDIO", 
        sub: "B2B Video Assembly Engine", 
        url: "https://b2b.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1601506521937-0121a7fc2a6b?q=80&w=800" 
      },
      { 
        id: "hub", 
        category: "MEDIA", 
        title: "MEDIA HUB", 
        sub: "Central Production Vault", 
        url: "https://hub.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=800" 
      },
      { 
        id: "vault", 
        category: "ARCHIVE", 
        title: "ASSET VAULT", 
        sub: "Zero-Loss Asset Pipeline", 
        url: "https://vault.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=800" 
      },
      { 
        id: "deeper", 
        category: "CINEMA", 
        title: "DEEPER DOCS", 
        sub: "Narrative & Moral Exploration", 
        url: "https://deeper.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?q=80&w=800" 
      },
      { 
        id: "r2", 
        category: "STREAMING", 
        title: "R2 MEDIA STREAM", 
        sub: "Direct Edge Distribution", 
        url: "https://xvideos-r2.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=800" 
      }
    ]
  },
  {
    categoryName: "CREATOR & UTILITY OS",
    projects: [
      { 
        id: "aural", 
        category: "AUDIO", 
        title: "AURAL ENGINE", 
        sub: "Metal, Rap & Reggae Fusion", 
        url: "https://aural.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800" 
      },
      { 
        id: "picseed", 
        category: "PHOTO", 
        title: "PICSEED STUDIO", 
        sub: "Automated Editorial Staging", 
        url: "https://picseed.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=800" 
      },
      { 
        id: "account", 
        category: "FINANCE", 
        title: "ACCOUNT OS", 
        sub: "Ledger & Cash-Flow Engine", 
        url: "https://account.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=800" 
      },
      { 
        id: "note", 
        category: "KNOWLEDGE", 
        title: "CHOPPER NOTES", 
        sub: "Fast Markdown Knowledge Graph", 
        url: "https://note.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=800" 
      }
    ]
  },
  {
    categoryName: "ED-TECH & NEXT GENERATION",
    projects: [
      { 
        id: "bloom", 
        category: "ED-TECH", 
        title: "KHUKIR BAGAN (BLOOM)", 
        sub: "Bangla Smart TV Platform", 
        url: "https://play.google.com/store/apps", 
        image: "https://images.unsplash.com/photo-1512626120412-faf41adb4874?q=80&w=800" 
      },
      { 
        id: "hiya", 
        category: "EDUCATION", 
        title: "HIYA LEARNING", 
        sub: "Interactive Children's Sandbox", 
        url: "https://hiya.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800" 
      }
    ]
  },
  {
    categoryName: "ATELIER & PHYSICAL CRAFT",
    projects: [
      { 
        id: "rawx", 
        category: "ATELIER", 
        title: "RAWx APPAREL", 
        sub: "Full-Grain Leather Jackets", 
        url: "https://handsandhead.com", 
        image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800" 
      },
      { 
        id: "arutemika", 
        category: "FOOTWEAR", 
        title: "ARUTEMIKA", 
        sub: "Goodyear Welted Boots", 
        url: "https://handsandhead.com", 
        image: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=800" 
      },
      { 
        id: "jacket", 
        category: "STREETWEAR", 
        title: "JACKET ATELIER", 
        sub: "Peak Performance Brutalist UI", 
        url: "https://jacket.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1520975954732-57dd22299614?q=80&w=800" 
      },
      { 
        id: "leather", 
        category: "LEATHER", 
        title: "CRUST TANNERY PARK", 
        sub: "Hemayetpur Sourced Cowhide", 
        url: "https://leather.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1559551409-dadc959f76b8?q=80&w=800" 
      },
      { 
        id: "bracelets", 
        category: "ACCESSORIES", 
        title: "SOLID BRASS WRISTWEAR", 
        sub: "Bridle Leather & Hardware", 
        url: "https://bracelets.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1611591475841-86d495761eb8?q=80&w=800" 
      },
      { 
        id: "rmg", 
        category: "GARMENTS", 
        title: "RMG EXPORT PIPELINE", 
        sub: "260-300 GSM Heavy Streetwear", 
        url: "https://rmg.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=800" 
      },
      { 
        id: "textile", 
        category: "MILLS", 
        title: "SAVAR SELVEDGE TEXTILE", 
        sub: "Shuttle-Loom Vintage Weaves", 
        url: "https://textile.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800" 
      },
      { 
        id: "jute", 
        category: "NATURAL FIBERS", 
        title: "BANGLADESH JUTE DIVERSIFIED", 
        sub: "Two Decades Association Line", 
        url: "https://jute.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?q=80&w=800" 
      }
    ]
  },
  {
    categoryName: "LIFESTYLE, ESSAYS & CULTURE",
    projects: [
      { 
        id: "me", 
        category: "PORTFOLIO", 
        title: "RAKIB HIMON DIRECT", 
        sub: "Personal Archive & Creative Notes", 
        url: "https://me.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800" 
      },
      { 
        id: "articles", 
        category: "DISCOURSE", 
        title: "CRITICAL ESSAYS", 
        sub: "Indo-Aryan & Bengali Literature", 
        url: "https://articles.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=800" 
      },
      { 
        id: "gym", 
        category: "KINETICS", 
        title: "SHADOW BOXING & REPS", 
        sub: "High-Cadence Physical Conditioning", 
        url: "https://gym.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=800" 
      },
      { 
        id: "food", 
        category: "CULINARY", 
        title: "DHAKA FOOD ARCHIVE", 
        sub: "Old Town Spices & Tradition", 
        url: "https://food.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800" 
      }
    ]
  },
  {
    categoryName: "CONCEPT & EXPERIMENTAL LIBRARIES",
    projects: [
      { 
        id: "lingerie", 
        category: "ATELIER COUTURE", 
        title: "LINGERIE ATELIER", 
        sub: "Geometric Silk & Mesh Previs", 
        url: "https://lingerie.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1583846783214-7229a91b20ed?q=80&w=800" 
      },
      { 
        id: "harness", 
        category: "LEATHER DESIGN", 
        title: "MODULAR HARNESS RIGS", 
        sub: "Industrial Rivets & Harnessing", 
        url: "https://harness.handsandhead.com", 
        image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800" 
      }
    ]
  }
];

export const TOTAL_ECOSYSTEM_COUNT = ECOSYSTEM_DATA.reduce(
  (acc, cat) => acc + cat.projects.length,
  0
);

export const ALL_ECOSYSTEM_PROJECTS: EcosystemProject[] = ECOSYSTEM_DATA.flatMap(
  (cat) => cat.projects
);

// Backward-compatibility adapters for legacy consumers
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

export interface LegacyEcosystemCategory {
  id: string;
  title: string;
  icon: string;
  badge?: string;
  apps: EcosystemAppItem[];
}

export const ECOSYSTEM_CATEGORIES: LegacyEcosystemCategory[] = ECOSYSTEM_DATA.map((cat) => ({
  id: cat.categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
  title: `[ ${cat.categoryName} ]`,
  icon: 'Globe',
  badge: `${cat.projects.length} PORTALS`,
  apps: cat.projects.map((p) => {
    let hostname = p.url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    return {
      id: p.id,
      name: p.title,
      subdomain: hostname,
      url: p.url,
      description: p.sub,
      iconName: 'Globe',
      badge: p.category
    };
  })
}));
