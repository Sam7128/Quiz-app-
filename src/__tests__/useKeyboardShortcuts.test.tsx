import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts Hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('scenario 1: pressing "1" triggers onSelectOption(0)', () => {
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
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
    });

    expect(onSelectOption).toHaveBeenCalledWith(0);
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

    expect(onSubmitOrNext).toHaveBeenCalled();
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
    expect(postRerenderCalls).toBe(1); // 仍為 1，代表未重新綁定
    
    // 驗證新 callback 是否能正常工作
    act(() => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
    });
    expect(onSelectOption1).not.toHaveBeenCalled();
    expect(onSelectOption2).toHaveBeenCalledWith(0);
  });
});
