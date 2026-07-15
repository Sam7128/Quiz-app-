import React, { Suspense } from 'react';
import type { User } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'framer-motion';
import { AppAction, AppView, BankMetadata, Folder, MistakeLog, Question, QuizState } from '../types';
import { ChunkMeta, ChunkedPracticeSession, MistakeDetail, SavedQuizProgress } from '../types/battleTypes';
import { QuizResult } from './QuizResult';
import { Dashboard } from './Dashboard';
import { QuizCard } from './QuizCard';
import { BankManager } from './BankManager';
import { AIPromptGuide } from './AIPromptGuide';
import { Login } from './Login';
import { Social } from './Social';
import { GlobalModals } from './GlobalModals';
import { ErrorBoundary } from './ErrorBoundary';
import { AppHeader } from './AppHeader';
import { MobileNav } from './MobileNav';
import { SkeletonLoader } from './SkeletonLoader';
import { QuizProvider } from '../contexts/QuizContext';
import { IStorageRepository } from '../services/repository';
import { ChunkCompleteSummary } from './ChunkCompleteSummary';



const KnowledgeGraphWorkspace = React.lazy(() => import('./KnowledgeGraph/KnowledgeGraphWorkspace'));

interface AppContentProps {
    user: User | null;
    loading: boolean;
    guestMode: boolean;
    state: {
        view: AppView;
        gameMode: boolean;
        isSettingsOpen: boolean;
        sharingBank: BankMetadata | null;
        banks: BankMetadata[];
        folders: Folder[];
        editingBankId: string | null;
        selectedQuizBankIds: string[];
        quizPoolQuestions: Question[];
        editingQuestions: Question[];
        mistakeLog: MistakeLog;
    };
    actions: {
        dispatch: React.Dispatch<AppAction>;
        signOut: () => void;
        handleViewChange: (view: AppView) => void;
        handleToggleGameMode: () => void;
        handleSystemNuke: () => Promise<void>;
        handleShare: (bank: BankMetadata | null) => void;
        handleStartMistakes: () => void;
        handlePracticeMistakes: (mistakes: MistakeDetail[]) => void;
        handleCreateFolder: (name: string) => void;
        handleDeleteFolder: (id: string) => void;
        handleBatchDelete: () => Promise<void>;
        handleMoveBank: (bankId: string, folderId: string | undefined) => Promise<void>;
        handleEditingBankChange: (id: string) => void;
        handleToggleQuizBank: (id: string) => void;
        handleSelectAll: (selected: boolean) => void;
        refreshBanksData: () => Promise<BankMetadata[]>;
        setMistakeLog: React.Dispatch<React.SetStateAction<MistakeLog>>;
    };
    quizEngine: {
        quizState: QuizState;
        chunkMeta?: ChunkMeta;
        sessionStartTime: number | null;
        sessionBankIds: string[];
        showResumePrompt: boolean;
        pendingSession: SavedQuizProgress | null;
        restoreSession: (session: SavedQuizProgress) => Promise<void>;
        dismissResumePrompt: () => void;
        startQuiz: (
          count: number,
          mode?: 'random' | 'mistake' | 'retry_session' | 'chunked',
          questionIds?: string[],
          overrideBankIds?: string[],
          chunkMeta?: ChunkMeta,
          draftState?: { currentQuestionIndex: number; score: number; wrongQuestionIds: string[] }
        ) => Promise<void>;
        handleExitQuiz: () => void;
        startChallengeQuiz: (challengeId: string, bankId: string) => Promise<void>;
        handleAnswer: (isCorrect: boolean, answer: string | string[]) => void;
        nextQuestion: () => void;
        trackQuizCompletion: (data: { score: number, totalQuestions: number }) => Promise<void>;
        startQuizByBank: (bankId: string, mode?: 'challenge' | 'normal') => Promise<void>;
    };
    chunkedPractice: {
      activeSessions: ChunkedPracticeSession[];
      chunkSizeOptions: readonly number[];
      isCreatingSession: boolean;
      summary: {
        sessionId: string;
        chunkIndex: number;
        totalChunks: number;
        score: number;
        totalQuestions: number;
        hasNextChunk: boolean;
        wrongQuestionIds: string[];
      } | null;
      createSession: (chunkSize: number) => Promise<void>;
      continueSession: (sessionId: string) => Promise<void>;
      abandonSession: (sessionId: string) => Promise<void>;
      continueFromSummary: () => Promise<void>;
      dismissSummary: () => void;
    };
    repository: IStorageRepository;
}

export const AppContent: React.FC<AppContentProps> = ({
    user,
    loading,
    guestMode,
    state,
    actions,
    quizEngine,
    chunkedPractice,
    repository
}) => {
    const { view, gameMode } = state;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <SkeletonLoader width="12rem" height="12rem" count={1} />
            </div>
        );
    }

    if (!user && !guestMode) return <Login onGuestMode={() => actions.dispatch({ type: 'set_guest_mode', guestMode: true })} />;

    const animationVariants = {
        initial: { opacity: 0, x: -50 },
        animate: { opacity: 1, x: 0, transition: { duration: 0.5 } },
        exit: { opacity: 0, x: 50, transition: { duration: 0.3 } }
    };

    const renderContent = () => {
        if (view === 'quiz' || view === 'mistakes') {
            if (quizEngine.quizState.isFinished) {
                if (quizEngine.quizState.mode === 'chunked') {
                    return (
                        <div className="py-16 text-center text-slate-500 dark:text-slate-400 font-semibold">
                            階段完成，正在更新進度...
                        </div>
                    );
                }
                return (
                    <ErrorBoundary fallbackTitle="測驗結果發生錯誤">
                        <QuizResult
                            score={quizEngine.quizState.score}
                            totalQuestions={quizEngine.quizState.totalQuestions}
                            wrongQuestions={quizEngine.quizState.activeQuestions.filter((q) => quizEngine.quizState.wrongQuestionIds.includes(String(q.id)))}
                            onRetry={() => quizEngine.startQuiz(quizEngine.quizState.wrongQuestionIds.length, 'retry_session', quizEngine.quizState.wrongQuestionIds)}
                            onRestart={() => quizEngine.startQuiz(quizEngine.quizState.totalQuestions, 'random')}
                            onHome={() => {
                                if (quizEngine.sessionStartTime) {
                                    const durationSeconds = Math.floor((Date.now() - quizEngine.sessionStartTime) / 1000);
                                    const correctCount = quizEngine.quizState.score;
                                    const totalQuestions = quizEngine.quizState.totalQuestions;

                                    void repository.recordStudySession(totalQuestions, correctCount, durationSeconds);
                                    void quizEngine.trackQuizCompletion({ score: correctCount, totalQuestions });
                                }
                                quizEngine.handleExitQuiz();
                            }}
                        />
                    </ErrorBoundary>
                );
            }
            return (
                <div className="py-4">
                    <ErrorBoundary fallbackTitle="測驗元件發生錯誤">
                        <QuizCard
                            question={quizEngine.quizState.activeQuestions[quizEngine.quizState.currentQuestionIndex]}
                            currentIndex={quizEngine.quizState.currentQuestionIndex}
                            totalQuestions={quizEngine.quizState.totalQuestions}
                            onAnswer={quizEngine.handleAnswer}
                            onNext={quizEngine.nextQuestion}
                            isLastQuestion={quizEngine.quizState.currentQuestionIndex === quizEngine.quizState.totalQuestions - 1}
                            onExit={quizEngine.handleExitQuiz}
                            gameMode={state.gameMode}
                            chunkMeta={quizEngine.chunkMeta}
                        />
                    </ErrorBoundary>
                </div>
            );
        }

        switch (view) {
            case 'dashboard':
                return <ErrorBoundary fallbackTitle="儀表板發生錯誤"><Dashboard
                    questions={state.quizPoolQuestions}
                    mistakeLog={state.mistakeLog}
                    banks={state.banks}
                    folders={state.folders}
                    selectedBankIds={state.selectedQuizBankIds}
                    onToggleBank={actions.handleToggleQuizBank}
                    onStartQuiz={(count) => quizEngine.startQuiz(count, 'random')}
                    onStartMistakes={actions.handleStartMistakes}
                    onPracticeMistakes={actions.handlePracticeMistakes}
                    onShareBank={actions.handleShare}
                    onSelectAll={actions.handleSelectAll}
                    onCreateFolder={actions.handleCreateFolder}
                    onDeleteFolder={actions.handleDeleteFolder}
                    onMoveBank={actions.handleMoveBank}
                    onBatchDelete={actions.handleBatchDelete}
                    isAuthenticated={!!user}
                    chunkedPractice={{
                      activeSessions: chunkedPractice.activeSessions,
                      chunkSizeOptions: chunkedPractice.chunkSizeOptions,
                      isCreatingSession: chunkedPractice.isCreatingSession,
                      onCreateSession: (chunkSize) => {
                        void chunkedPractice.createSession(chunkSize);
                      },
                      onContinueSession: (sessionId) => {
                        void chunkedPractice.continueSession(sessionId);
                      },
                      onAbandonSession: (sessionId) => {
                        void chunkedPractice.abandonSession(sessionId);
                      }
                    }}
                /></ErrorBoundary>;
            case 'manager':
                return <ErrorBoundary fallbackTitle="題庫管理發生錯誤"><BankManager
                    currentQuestions={state.editingQuestions}
                    currentBankId={state.editingBankId}
                    onBankChange={actions.handleEditingBankChange}
                    onUpdateQuestions={async () => await actions.refreshBanksData()}
                    onRefreshBanks={actions.refreshBanksData}
                    onMistakesUpdate={() => actions.setMistakeLog(repository.getMistakeLog())}
                /></ErrorBoundary>;
            case 'guide': return <ErrorBoundary fallbackTitle="AI 指引發生錯誤"><AIPromptGuide /></ErrorBoundary>;
            case 'social': return <ErrorBoundary fallbackTitle="社群發生錯誤"><Social /></ErrorBoundary>;
            case 'graph': return (
                <ErrorBoundary fallbackTitle="知識圖發生錯誤">
                    <Suspense fallback={<SkeletonLoader />}>
                        <KnowledgeGraphWorkspace />
                    </Suspense>
                </ErrorBoundary>
            );
            default: return <div>Not Found</div>;
        }
    };

    return (
        <div className={`min-h-screen flex flex-col transition-colors duration-500 font-sans selection:bg-brand-500/30 ${view === 'quiz' && gameMode ? 'bg-dungeon-page bg-repeat bg-fixed' : 'bg-slate-50 dark:bg-slate-900 bg-mesh-light dark:bg-mesh-gradient bg-fixed bg-cover'
            }`}>
            {view === 'quiz' && gameMode && <div className="fixed inset-0 bg-black/60 pointer-events-none z-0" />}
            <GlobalModals
                isSettingsOpen={state.isSettingsOpen}
                onCloseSettings={() => actions.dispatch({ type: 'set_settings_open', isSettingsOpen: false })}
                gameMode={state.gameMode}
                onToggleGameMode={actions.handleToggleGameMode}
                onSystemNuke={actions.handleSystemNuke}
                showResumePrompt={quizEngine.showResumePrompt}
                pendingSession={quizEngine.pendingSession}
                onRestoreSession={quizEngine.restoreSession}
                onDismissResumePrompt={quizEngine.dismissResumePrompt}
                sharingBank={state.sharingBank}
                onCloseShare={() => actions.dispatch({ type: 'set_sharing_bank', sharingBank: null })}
            />
            <ChunkCompleteSummary
                isOpen={Boolean(chunkedPractice.summary)}
                chunkIndex={chunkedPractice.summary?.chunkIndex ?? 0}
                totalChunks={chunkedPractice.summary?.totalChunks ?? 1}
                score={chunkedPractice.summary?.score ?? 0}
                totalQuestions={chunkedPractice.summary?.totalQuestions ?? 0}
                hasNextChunk={chunkedPractice.summary?.hasNextChunk ?? false}
                wrongQuestionIds={chunkedPractice.summary?.wrongQuestionIds ?? []}
                onContinueNext={() => {
                  void chunkedPractice.continueFromSummary();
                }}
                onRest={() => {
                  chunkedPractice.dismissSummary();
                  quizEngine.handleExitQuiz();
                }}
                onReviewMistakes={(wrongIds) => {
                  chunkedPractice.dismissSummary();
                  void quizEngine.startQuiz(
                    wrongIds.length,
                    'retry_session',
                    wrongIds,
                    quizEngine.sessionBankIds
                  );
                }}
            />
            <AppHeader
                view={view}
                gameMode={state.gameMode}
                user={user}
                banks={state.banks}
                editingBankId={state.editingBankId}
                selectedQuizBankIds={state.selectedQuizBankIds}
                onNavigate={actions.handleViewChange}
                onOpenSettings={() => actions.dispatch({ type: 'set_settings_open', isSettingsOpen: true })}
                onSignOut={actions.signOut}
                onLoginRedirect={() => actions.dispatch({ type: 'set_guest_mode', guestMode: false })}
            />
            <main className={`flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 pt-24 md:pt-28 pb-24 md:pb-12 relative z-10 ${view === 'quiz' && gameMode ? 'backdrop-blur-sm bg-black/30 md:rounded-b-2xl' : ''}`}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={view}
                        variants={animationVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        <QuizProvider
                            startChallengeQuiz={quizEngine.startChallengeQuiz}
                            startQuizByBank={quizEngine.startQuizByBank}
                        >
                            {renderContent()}
                        </QuizProvider>
                    </motion.div>
                </AnimatePresence>
            </main>
            <MobileNav
                view={view}
                onNavigate={actions.handleViewChange}
                onOpenSettings={() => actions.dispatch({ type: 'set_settings_open', isSettingsOpen: true })}
            />
        </div>
    );
};
