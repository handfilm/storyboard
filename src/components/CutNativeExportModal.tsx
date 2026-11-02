/**
 * @file /src/components/CutNativeExportModal.tsx
 * @description Unified Master Cinema Export Studio for RAWx / HANDFILM.
 * Re-exports the master UnifiedExportStudio component and types to maintain single source of truth.
 */

export * from './export/UnifiedExportStudio';
import { UnifiedExportStudio, UnifiedExportStudioProps } from './export/UnifiedExportStudio';

export const CutNativeExportModal = UnifiedExportStudio;
export type CutNativeExportModalProps = UnifiedExportStudioProps;
export default CutNativeExportModal;
