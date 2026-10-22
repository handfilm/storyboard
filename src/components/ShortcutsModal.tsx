/**
 * @file /src/components/ShortcutsModal.tsx
 * @description Storyboard Engine Keyboard Shortcuts Cheat Sheet modal.
 * Connects directly to the new KeyboardShortcutsModal component.
 */

import React from 'react';
import { KeyboardShortcutsModal } from './modals/KeyboardShortcutsModal';

export interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction?: (commandId: string) => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = (props) => {
  return <KeyboardShortcutsModal {...props} />;
};

export { KeyboardShortcutsModal };
export default ShortcutsModal;
