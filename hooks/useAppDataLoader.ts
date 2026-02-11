import React, { useState, useCallback, useEffect } from 'react';
import { AppAction, Question, BankMetadata } from '../types';
import { getCurrentBankId, setCurrentBankId } from '../services/storage';
import { IStorageRepository } from '../services/repository';

interface UseAppDataLoaderProps {
    repository: IStorageRepository;
    dispatch: React.Dispatch<AppAction>;
    refreshBanksData: () => Promise<BankMetadata[]>;
    selectedQuizBankIds: string[];
    editingBankId: string | null;
    loading: boolean;
}

export const useAppDataLoader = ({
    repository,
    dispatch,
    refreshBanksData,
    selectedQuizBankIds,
    editingBankId,
    loading
}: UseAppDataLoaderProps) => {
    const [quizPoolQuestions, setQuizPoolQuestions] = useState<Question[]>([]);
    const [editingQuestions, setEditingQuestions] = useState<Question[]>([]);

    // Initialization: Auth & Initial Banks
    useEffect(() => {
        if (loading) return;

        const init = async () => {
            const loadedBanks = await refreshBanksData();

            // Set initial selection if empty
            let defaultId = getCurrentBankId();
            if (!defaultId || !loadedBanks.find(b => b.id === defaultId)) {
                defaultId = loadedBanks.length > 0 ? loadedBanks[0].id : null;
            }

            if (defaultId) {
                dispatch({ type: 'set_editing_bank_id', editingBankId: defaultId });
                setCurrentBankId(defaultId);
            }
        };

        void init();
    }, [loading, refreshBanksData, dispatch]);

    const loadQuizPool = useCallback(async () => {
        if (selectedQuizBankIds.length === 0) {
            setQuizPoolQuestions([]);
            return;
        }
        try {
            const arrays = await Promise.all(
                selectedQuizBankIds.map(id => repository.getQuestions(id))
            );
            setQuizPoolQuestions(arrays.flat());
        } catch (error) {
            console.error('Failed to load quiz pool questions', error);
            setQuizPoolQuestions([]);
        }
    }, [repository, selectedQuizBankIds]);

    useEffect(() => {
        void loadQuizPool();
    }, [loadQuizPool]);

    const loadEditingQuestions = useCallback(async () => {
        if (!editingBankId) {
            setEditingQuestions([]);
            return;
        }
        try {
            const questions = await repository.getQuestions(editingBankId);
            setEditingQuestions(questions);
        } catch (error) {
            console.error('Failed to load editing questions', error);
            setEditingQuestions([]);
        }
    }, [editingBankId, repository]);

    useEffect(() => {
        void loadEditingQuestions();
    }, [loadEditingQuestions]);

    return { quizPoolQuestions, editingQuestions };
};
