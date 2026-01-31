import { appReducer, initialAppState } from '../../App';
import { BankMetadata } from '../../types';

const createBank = (id: string): BankMetadata => ({
  id,
  name: `Bank ${id}`,
  createdAt: 0,
  questionCount: 0
});

describe('appReducer', () => {
  it('sets the active view', () => {
    const next = appReducer(initialAppState, { type: 'set_view', view: 'manager' });

    expect(next.view).toBe('manager');
  });

  it('toggles quiz bank selection', () => {
    const added = appReducer(initialAppState, { type: 'toggle_quiz_bank_id', bankId: 'bank-1' });
    const removed = appReducer(added, { type: 'toggle_quiz_bank_id', bankId: 'bank-1' });

    expect(added.selectedQuizBankIds).toEqual(['bank-1']);
    expect(removed.selectedQuizBankIds).toEqual([]);
  });

  it('syncs banks data and preserves valid selection', () => {
    const start = {
      ...initialAppState,
      selectedQuizBankIds: ['bank-2']
    };
    const next = appReducer(start, {
      type: 'sync_banks_data',
      banks: [createBank('bank-1'), createBank('bank-2')],
      folders: []
    });

    expect(next.selectedQuizBankIds).toEqual(['bank-2']);
  });

  it('syncs banks data and defaults selection when invalid', () => {
    const start = {
      ...initialAppState,
      selectedQuizBankIds: ['bank-3']
    };
    const next = appReducer(start, {
      type: 'sync_banks_data',
      banks: [createBank('bank-1')],
      folders: []
    });

    expect(next.selectedQuizBankIds).toEqual(['bank-1']);
  });

  it('clears selection when no banks exist', () => {
    const start = {
      ...initialAppState,
      selectedQuizBankIds: ['bank-1']
    };
    const next = appReducer(start, {
      type: 'sync_banks_data',
      banks: [],
      folders: []
    });

    expect(next.selectedQuizBankIds).toEqual([]);
  });
});
