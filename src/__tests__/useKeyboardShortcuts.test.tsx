import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts Hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('scenario 1: pressing "1" triggers onSelectOption(0) and calls preventDefault', () => {
    const onSelectOption = vi.fn();
    const onSubmitOrNext = vi.fn();
    const onToggleHint = vi.fn();
    const onExit = vi.fn();

    renderHook(() => useKeyboardShortcuts({
      onSelectOption,
      onSubmitOrNext,
      onToggleHint,
      onExit
    }));

    const event = new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    act(() => {
      document.body.dispatchEvent(event);
    });

    expect(onSelectOption).toHaveBeenCalledWith(0);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('scenario 2: pressing "Enter" triggers onSubmitOrNext', () => {
    const onSelectOption = vi.fn();
    const onSubmitOrNext = vi.fn();
    const onToggleHint = vi.fn();
    const onExit = vi.fn();

    renderHook(() => useKeyboardShortcuts({
      onSelectOption,
      onSubmitOrNext,
      onToggleHint,
      onExit
    }));

    act(() => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onSubmitOrNext).toHaveBeenCalledTimes(1);
  });

  it('scenario 3: keydown on editable element does not trigger callback', () => {
    const onSelectOption = vi.fn();
    const onSubmitOrNext = vi.fn();
    const onToggleHint = vi.fn();
    const onExit = vi.fn();

    renderHook(() => useKeyboardShortcuts({
      onSelectOption,
      onSubmitOrNext,
      onToggleHint,
      onExit
    }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
    });

    expect(onSelectOption).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('scenario 4: callback changes do not re-bind window event listener', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    const onSelectOption1 = vi.fn();
    const onSubmitOrNext = vi.fn();
    const onToggleHint = vi.fn();
    const onExit = vi.fn();

    const { rerender } = renderHook(
      ({ onSelectOption }) => useKeyboardShortcuts({
        onSelectOption,
        onSubmitOrNext,
        onToggleHint,
        onExit
      }),
      {
        initialProps: { onSelectOption: onSelectOption1 }
      }
    );

    const initialCalls = addEventListenerSpy.mock.calls.filter(call => call[0] === 'keydown').length;
    expect(initialCalls).toBe(1);

    // Re-render with new callback
    const onSelectOption2 = vi.fn();
    rerender({ onSelectOption: onSelectOption2 });

    const postRerenderCalls = addEventListenerSpy.mock.calls.filter(call => call[0] === 'keydown').length;
    expect(postRerenderCalls).toBe(1); // 仍為 1，代表未重複綁定

    // 驗證新 callback 是否能正常工作
    act(() => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
    });
    expect(onSelectOption1).not.toHaveBeenCalled();
    expect(onSelectOption2).toHaveBeenCalledWith(0);
  });

  describe('Modifier key and IME composition guards', () => {
    it('(a) Ctrl+1 does NOT trigger onSelectOption and does NOT call preventDefault', () => {
      const onSelectOption = vi.fn();
      const onSubmitOrNext = vi.fn();
      const onToggleHint = vi.fn();
      const onExit = vi.fn();

      renderHook(() => useKeyboardShortcuts({
        onSelectOption,
        onSubmitOrNext,
        onToggleHint,
        onExit
      }));

      const event = new KeyboardEvent('keydown', {
        key: '1',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      act(() => {
        document.body.dispatchEvent(event);
      });

      expect(onSelectOption).not.toHaveBeenCalled();
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('(b) Ctrl+H does NOT trigger onToggleHint and does NOT call preventDefault', () => {
      const onSelectOption = vi.fn();
      const onSubmitOrNext = vi.fn();
      const onToggleHint = vi.fn();
      const onExit = vi.fn();

      renderHook(() => useKeyboardShortcuts({
        onSelectOption,
        onSubmitOrNext,
        onToggleHint,
        onExit
      }));

      const event = new KeyboardEvent('keydown', {
        key: 'h',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      act(() => {
        document.body.dispatchEvent(event);
      });

      expect(onToggleHint).not.toHaveBeenCalled();
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('(c) Alt+Enter does NOT trigger onSubmitOrNext', () => {
      const onSelectOption = vi.fn();
      const onSubmitOrNext = vi.fn();
      const onToggleHint = vi.fn();
      const onExit = vi.fn();

      renderHook(() => useKeyboardShortcuts({
        onSelectOption,
        onSubmitOrNext,
        onToggleHint,
        onExit
      }));

      act(() => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter',
          altKey: true,
          bubbles: true
        }));
      });

      expect(onSubmitOrNext).not.toHaveBeenCalled();
    });

    it('(d) Meta+Escape does NOT trigger onExit', () => {
      const onSelectOption = vi.fn();
      const onSubmitOrNext = vi.fn();
      const onToggleHint = vi.fn();
      const onExit = vi.fn();

      renderHook(() => useKeyboardShortcuts({
        onSelectOption,
        onSubmitOrNext,
        onToggleHint,
        onExit
      }));

      act(() => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Escape',
          metaKey: true,
          bubbles: true
        }));
      });

      expect(onExit).not.toHaveBeenCalled();
    });

    it('(e) isComposing=true does NOT trigger handlers', () => {
      const onSelectOption = vi.fn();
      const onSubmitOrNext = vi.fn();
      const onToggleHint = vi.fn();
      const onExit = vi.fn();

      renderHook(() => useKeyboardShortcuts({
        onSelectOption,
        onSubmitOrNext,
        onToggleHint,
        onExit
      }));

      act(() => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', {
          key: '1',
          isComposing: true,
          bubbles: true
        }));
      });

      expect(onSelectOption).not.toHaveBeenCalled();
    });

    it('(f) keyCode=229 (IME input) does NOT trigger handlers', () => {
      const onSelectOption = vi.fn();
      const onSubmitOrNext = vi.fn();
      const onToggleHint = vi.fn();
      const onExit = vi.fn();

      renderHook(() => useKeyboardShortcuts({
        onSelectOption,
        onSubmitOrNext,
        onToggleHint,
        onExit
      }));

      // Emulate IME composition keyCode 229
      const event = new KeyboardEvent('keydown', {
        key: '1',
        bubbles: true
      });
      Object.defineProperty(event, 'keyCode', { value: 229 });

      act(() => {
        document.body.dispatchEvent(event);
      });

      expect(onSelectOption).not.toHaveBeenCalled();
    });

    it('(g) handles options 1 to 4, h/H hint, and Escape key normally', () => {
      const onSelectOption = vi.fn();
      const onSubmitOrNext = vi.fn();
      const onToggleHint = vi.fn();
      const onExit = vi.fn();

      renderHook(() => useKeyboardShortcuts({
        onSelectOption,
        onSubmitOrNext,
        onToggleHint,
        onExit
      }));

      // 1-4 selection
      ['1', '2', '3', '4'].forEach((num, idx) => {
        act(() => {
          document.body.dispatchEvent(new KeyboardEvent('keydown', { key: num, bubbles: true }));
        });
        expect(onSelectOption).toHaveBeenLastCalledWith(idx);
      });

      // Hint h & H
      act(() => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true }));
      });
      expect(onToggleHint).toHaveBeenCalledTimes(1);

      act(() => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'H', bubbles: true }));
      });
      expect(onToggleHint).toHaveBeenCalledTimes(2);

      // Escape
      act(() => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      expect(onExit).toHaveBeenCalledTimes(1);
    });
  });
});
