import { supabase } from './supabase';
import { Question, BankMetadata, SpacedRepetitionItem } from '../types';

/**
 * Cloud Storage Service (Supabase)
 * All operations here require an authenticated user.
 */

export const getCloudBanks = async (): Promise<BankMetadata[]> => {
  const { data, error } = await supabase
    .from('banks')
    .select('*, questions(count)');

  if (error) {
    console.error('Error fetching cloud banks:', error);
    return [];
  }

  return data.map(bank => ({
    id: bank.id,
    name: bank.title,
    createdAt: new Date(bank.created_at).getTime(),
    questionCount: bank.questions?.[0]?.count || 0,
    description: bank.description,
    folderId: bank.folder_id ?? undefined
  }));
};

export const createCloudBank = async (title: string, description: string = ''): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('banks')
    .insert({
      title,
      description,
      user_id: user.id
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating cloud bank:', error);
    return null;
  }
  return data.id;
};

export const deleteCloudBank = async (bankId: string) => {
  const { error } = await supabase
    .from('banks')
    .delete()
    .eq('id', bankId);
  
  if (error) console.error('Error deleting cloud bank:', error);
};

export const updateCloudBankFolder = async (bankId: string, folderId: string | undefined) => {
  const { error } = await supabase
    .from('banks')
    .update({ folder_id: folderId || null })
    .eq('id', bankId);

  if (error) console.error('Error updating cloud bank folder:', error);
};

export const getCloudQuestions = async (bankId: string): Promise<Question[]> => {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('bank_id', bankId);

  if (error) {
    console.error('Error fetching cloud questions:', error);
    return [];
  }

  return data.map(q => ({
    id: q.id,
    question: q.question,
    options: q.options,
    answer: q.answer,
    type: q.type,
    hint: q.hint,
    explanation: q.explanation
  }));
};

export const saveCloudQuestions = async (bankId: string, questions: Question[]) => {
  // Supabase strategy: Delete existing and re-insert (for simple batch update)
  // Or more efficient: Upsert based on ID
  
  // First, remove old questions
  await supabase.from('questions').delete().eq('bank_id', bankId);

  // Then, bulk insert
  const toInsert = questions.map(q => ({
    bank_id: bankId,
    question: q.question,
    options: q.options,
    answer: q.answer,
    type: q.type,
    hint: q.hint,
    explanation: q.explanation
  }));

  const { error } = await supabase.from('questions').insert(toInsert);
  if (error) console.error('Error saving cloud questions:', error);
};

/**
 * Migration: Local -> Cloud
 */
export const syncLocalToCloud = async (localBanks: BankMetadata[]) => {
    const uploadPromises = localBanks.map(async (bank) => {
        // 1. Create bank in cloud
        const cloudBankId = await createCloudBank(bank.name, bank.description || 'From local storage');
        if (cloudBankId) {
            // 2. Get local questions
            const localQuestions = JSON.parse(localStorage.getItem('mindspark_bank_' + bank.id) || '[]');
            // 3. Save to cloud
            await saveCloudQuestions(cloudBankId, localQuestions);
        }
    });
    await Promise.all(uploadPromises);
};

/**
 * Spaced Repetition Cloud Storage
 */

export const getCloudSpacedRepetition = async (): Promise<SpacedRepetitionItem[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('question_progress')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching spaced repetition data:', error);
    return [];
  }

  return data.map(item => ({
    questionId: item.question_id,
    easinessFactor: Number(item.easiness_factor),
    interval: item.interval,
    repetitions: item.repetitions,
    nextReviewDate: item.next_review_date,
    lastReviewDate: item.last_review_date || undefined
  }));
};

export const saveCloudSpacedRepetition = async (item: SpacedRepetitionItem): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('question_progress')
    .upsert({
      user_id: user.id,
      question_id: item.questionId,
      easiness_factor: item.easinessFactor,
      interval: item.interval,
      repetitions: item.repetitions,
      next_review_date: item.nextReviewDate,
      last_review_date: item.lastReviewDate || null
    }, {
      onConflict: 'user_id,question_id'
    });

  if (error) {
    console.error('Error saving spaced repetition data:', error);
    return false;
  }
  return true;
};

export const batchSaveCloudSpacedRepetition = async (items: SpacedRepetitionItem[]): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const toUpsert = items.map(item => ({
    user_id: user.id,
    question_id: item.questionId,
    easiness_factor: item.easinessFactor,
    interval: item.interval,
    repetitions: item.repetitions,
    next_review_date: item.nextReviewDate,
    last_review_date: item.lastReviewDate || null
  }));

  const { error } = await supabase
    .from('question_progress')
    .upsert(toUpsert, {
      onConflict: 'user_id,question_id'
    });

  if (error) {
    console.error('Error batch saving spaced repetition data:', error);
    return false;
  }
  return true;
};

export const deleteCloudSpacedRepetition = async (questionId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('question_progress')
    .delete()
    .eq('user_id', user.id)
    .eq('question_id', questionId);

  if (error) {
    console.error('Error deleting spaced repetition data:', error);
    return false;
  }
  return true;
};
