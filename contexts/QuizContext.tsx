import React, { createContext, useContext, ReactNode } from 'react';

interface QuizContextType {
  startQuizByBank: (bankId: string, mode?: 'challenge' | 'normal') => Promise<void>;
  startChallengeQuiz: (challengeId: string, bankId: string) => Promise<void>;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export const QuizProvider: React.FC<{ 
  children: ReactNode; 
  startQuizByBank: (bankId: string, mode?: 'challenge' | 'normal') => Promise<void>;
  startChallengeQuiz: (challengeId: string, bankId: string) => Promise<void>;
}> = ({ children, startQuizByBank, startChallengeQuiz }) => {
  return (
    <QuizContext.Provider value={{ startQuizByBank, startChallengeQuiz }}>
      {children}
    </QuizContext.Provider>
  );
};

export const useQuiz = (): QuizContextType => {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within QuizProvider');
  }
  return context;
};
