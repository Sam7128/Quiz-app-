import { useEffect, useRef } from 'react';

interface KeyboardShortcutsProps {
  onSelectOption: (index: number) => void;
  onSubmitOrNext: () => void;
  onToggleHint: () => void;
  onExit: () => void;
}

export const useKeyboardShortcuts = ({ onSelectOption, onSubmitOrNext, onToggleHint, onExit }: KeyboardShortcutsProps) => {
  const handlersRef = useRef({ onSelectOption, onSubmitOrNext, onToggleHint, onExit });

  useEffect(() => {
    handlersRef.current = { onSelectOption, onSubmitOrNext, onToggleHint, onExit };
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditableTarget =
        !!target &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
          target.getAttribute?.('role') === 'textbox');

      // When the user is typing in an input (e.g., AI helper), do not hijack keystrokes.
      if (isEditableTarget) return;

      // Prevent default for our shortcuts to avoid conflicts
      if (['1', '2', '3', '4', 'Enter', 'h', 'H', 'Escape'].includes(event.key)) {
        event.preventDefault();
      }

      if (event.key >= '1' && event.key <= '4') {
        const index = parseInt(event.key) - 1;
        handlersRef.current.onSelectOption(index);
        return;
      }

      switch (event.key) {
        case 'Enter':
          handlersRef.current.onSubmitOrNext();
          break;
        case 'h':
        case 'H':
          handlersRef.current.onToggleHint();
          break;
        case 'Escape':
          handlersRef.current.onExit();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
