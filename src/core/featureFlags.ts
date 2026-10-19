/**
 * @file /src/core/featureFlags.ts
 * @description Central feature flag registry for progressive enhancement.
 * Ensures unfinished experimental modules never degrade the rock-solid Stage experience.
 */

export interface FeatureFlags {
  // Navigation & Workspaces
  enableBoardMode: boolean;
  enableCutMode: boolean;
  enableProModeSwitch: boolean;
  
  // Advanced Tools
  enableCommandPalette: boolean;
  enableSelfTestDiagnostics: boolean;
  enableScriptNotebook: boolean;
  enableMediaBinV2: boolean;
  enableSuperTitleEditor: boolean;
  enableAnimaticEngine: boolean;
  enableVideoEditorTimeline: boolean;
  enableWebCodecsExport: boolean;
  enableScopesAndColorGrading: boolean;
  enableThreeJsPrevis: boolean;
  enableCollaborativeReview: boolean;
  enableGeminiInteractions: boolean;

  // Diagnostics & Stability
  enableStrictSafetyChecks: boolean;
  enableLayoutDoctor: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  enableBoardMode: true,
  enableCutMode: true,
  enableProModeSwitch: true,
  enableCommandPalette: true,
  enableSelfTestDiagnostics: true,
  enableScriptNotebook: false,
  enableMediaBinV2: false,
  enableSuperTitleEditor: false,
  enableAnimaticEngine: false,
  enableVideoEditorTimeline: false,
  enableWebCodecsExport: false,
  enableScopesAndColorGrading: false,
  enableThreeJsPrevis: false,
  enableCollaborativeReview: false,
  enableGeminiInteractions: true,
  enableStrictSafetyChecks: true,
  enableLayoutDoctor: true,
};

const STORAGE_KEY = 'rawx_feature_flags_v1';

class FeatureFlagManager {
  private flags: FeatureFlags;

  constructor() {
    this.flags = { ...DEFAULT_FLAGS };
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.flags = { ...DEFAULT_FLAGS, ...parsed };
      }
    } catch (err) {
      console.warn('[FeatureFlags] Could not read stored flags:', err);
    }
  }

  public get(flag: keyof FeatureFlags): boolean {
    return Boolean(this.flags[flag]);
  }

  public getAll(): FeatureFlags {
    return { ...this.flags };
  }

  public set(flag: keyof FeatureFlags, value: boolean): void {
    this.flags[flag] = value;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.flags));
      } catch (err) {
        console.warn('[FeatureFlags] Could not persist flag:', err);
      }
    }
  }

  public resetAll(): void {
    this.flags = { ...DEFAULT_FLAGS };
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

export const featureFlags = new FeatureFlagManager();
