import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ChunkDraftState } from '../../types/battleTypes';
import { saveChunkDraft, getChunkDraft } from '../../services/storage';

describe('saveChunkDraft version guard and quota recovery', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('saves and retrieves draft successfully', () => {
    const draft: ChunkDraftState = {
      sessionId: 'session-1',
      chunkIndex: 0,
      currentQuestionIndex: 5,
      score: 4,
      wrongQuestionIds: ['q-1'],
      updatedAt: 1000,
    };

    saveChunkDraft(draft);
    const retrieved = getChunkDraft('session-1', 0);
    expect(retrieved).toEqual(draft);
  });

  it('rejects older draft updates but allows newer ones', () => {
    const existing: ChunkDraftState = {
      sessionId: 'session-1',
      chunkIndex: 0,
      currentQuestionIndex: 5,
      score: 4,
      wrongQuestionIds: ['q-1'],
      updatedAt: 2000,
    };
    saveChunkDraft(existing);

    // Incoming draft is older
    const older: ChunkDraftState = {
      sessionId: 'session-1',
      chunkIndex: 0,
      currentQuestionIndex: 4,
      score: 3,
      wrongQuestionIds: [],
      updatedAt: 1500, // 1.5s is older than 2.0s
    };
    saveChunkDraft(older);

    // Should still be the existing newer one
    expect(getChunkDraft('session-1', 0)).toEqual(existing);

    // Incoming draft is newer
    const newer: ChunkDraftState = {
      sessionId: 'session-1',
      chunkIndex: 0,
      currentQuestionIndex: 6,
      score: 5,
      wrongQuestionIds: ['q-1', 'q-2'],
      updatedAt: 2500, // 2.5s is newer
    };
    saveChunkDraft(newer);

    expect(getChunkDraft('session-1', 0)).toEqual(newer);
  });

  it('bypasses version guard when clock rewind is greater than 1 hour', () => {
    const oneHourMs = 60 * 60 * 1000;
    const existing: ChunkDraftState = {
      sessionId: 'session-1',
      chunkIndex: 0,
      currentQuestionIndex: 5,
      score: 4,
      wrongQuestionIds: ['q-1'],
      updatedAt: 5000000,
    };
    saveChunkDraft(existing);

    // Incoming draft is older but by more than 1 hour (rewind bypass)
    const rewoundDraft: ChunkDraftState = {
      sessionId: 'session-1',
      chunkIndex: 0,
      currentQuestionIndex: 2,
      score: 1,
      wrongQuestionIds: [],
      updatedAt: 5000000 - (oneHourMs + 1000), // rewound by > 1 hour
    };
    saveChunkDraft(rewoundDraft);

    // Should successfully overwrite due to rewind bypass
    expect(getChunkDraft('session-1', 0)).toEqual(rewoundDraft);
  });

  it('evicts the oldest draft on QuotaExceededError and retries successfully', () => {
    // 1. Create three pre-existing drafts with different timestamps
    const draftOld: ChunkDraftState = {
      sessionId: 'session-old',
      chunkIndex: 0,
      currentQuestionIndex: 1,
      score: 0,
      wrongQuestionIds: [],
      updatedAt: 1000,
    };
    const draftMid: ChunkDraftState = {
      sessionId: 'session-mid',
      chunkIndex: 0,
      currentQuestionIndex: 2,
      score: 1,
      wrongQuestionIds: [],
      updatedAt: 2000,
    };
    const draftNew: ChunkDraftState = {
      sessionId: 'session-new',
      chunkIndex: 0,
      currentQuestionIndex: 3,
      score: 2,
      wrongQuestionIds: [],
      updatedAt: 3000,
    };

    saveChunkDraft(draftOld);
    saveChunkDraft(draftMid);
    saveChunkDraft(draftNew);

    // 2. Setup mock for setItem to fail on the next write (QuotaExceededError) and then succeed
    let failOnce = true;
    const originalSetItem = Storage.prototype.setItem;
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, val) {
      if (failOnce && key.includes('session-to-save')) {
        failOnce = false;
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, val);
    });

    const toSave: ChunkDraftState = {
      sessionId: 'session-to-save',
      chunkIndex: 0,
      currentQuestionIndex: 4,
      score: 3,
      wrongQuestionIds: [],
      updatedAt: 4000,
    };

    // 3. Save draft which triggers quota failure, eviction, and successful retry
    saveChunkDraft(toSave);

    // 4. Verify results
    // The oldest draft (session-old) should be evicted (removed)
    expect(getChunkDraft('session-old', 0)).toBeNull();
    // The middle and new drafts should remain
    expect(getChunkDraft('session-mid', 0)).toEqual(draftMid);
    expect(getChunkDraft('session-new', 0)).toEqual(draftNew);
    // The new target draft should be successfully saved
    expect(getChunkDraft('session-to-save', 0)).toEqual(toSave);

    setItemSpy.mockRestore();
  });
});
