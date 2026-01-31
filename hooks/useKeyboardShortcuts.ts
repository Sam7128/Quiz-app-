import { useEffect } from 'react';

interface KeyboardShortcutsProps {
  onSelectOption: (index: number) => void;
  onSubmitOrNext: () => void;
  onToggleHint: () => void;
  onExit: () => void;
}

export const useKeyboardShortcuts = ({ onSelectOption, onSubmitOrNext, onToggleHint, onExit }: KeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent default for our shortcuts to avoid conflicts
      if (['1', '2', '3', '4', 'Enter', 'h', 'H', 'Escape'].includes(event.key)) {
        event.preventDefault();
      }

      if (event.key >= '1' && event.key <= '4') {
        const index = parseInt(event.key) - 1;
        onSelectOption(index);
        return;
      }

      switch (event.key) {
        case 'Enter':
          onSubmitOrNext();
          break;
        case 'h':
        case 'H':
          onToggleHint();
          break;
        case 'Escape':
          onExit();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectOption, onSubmitOrNext, onToggleHint, onExit]);
};