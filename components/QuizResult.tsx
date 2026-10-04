import React, { useState } from 'react';
import { RotateCcw, Home, CheckCircle, ChevronDown, ChevronUp, AlertCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Question } from '../types';
import { isMultipleAnswer } from '../utils/typeGuards';

interface QuizResultProps {
  score: number;
  totalQuestions: number;
  wrongQuestions: Question[];
  onRetry: () => void | Promise<void>;
  onRestart: () => void | Promise<void>;
  onHome: () => void | Promise<void>;
  userAnswerMap?: Record<string, string | string[]>;
}

export const QuizResult: React.FC<QuizResultProps> = ({
  score,
  totalQuestions,
  wrongQuestions,
  onRetry,
  onRestart,
  onHome,
  userAnswerMap
}) => {
  const [showMistakes, setShowMistakes] = useState(false);
  const percentage = Math.round((score / totalQuestions) * 100);

  return (
    <div className="max-w-2xl mx-auto text-center pt-10 px-4">
      <div className="bg-white dark:bg-slate-800 p-8 md:p-10 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
        <div className="w-24 h-24 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-brand-200 dark:shadow-none">
          <span className="text-3xl font-bold">{percentage}%</span>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">測驗完成！</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          你在 {totalQuestions} 題中答對了 {score} 題
        </p>

        <div className="space-y-3 max-w-sm mx-auto">
          {wrongQuestions.length > 0 && (
            <>
              <button
                onClick={onRetry}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-3 rounded-xl font-medium hover:bg-amber-600 transition-colors shadow-md shadow-amber-200 dark:shadow-none"
              >
                <RotateCcw size={18} /> 立即複習錯題 ({wrongQuestions.length})
              </button>

              <button
                onClick={() => setShowMistakes(!showMistakes)}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {showMistakes ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                {showMistakes ? '隱藏錯題解析' : '查看錯題解析'}
              </button>
            </>
          )}

          <button
            onClick={onRestart}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-3 rounded-xl font-medium hover:bg-brand-500 transition-colors shadow-brand-200 dark:shadow-none"
          >
            <RotateCcw size={18} /> 再做一次 (隨機)
          </button>

          <button
            onClick={onHome}
            className="w-full py-3 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Home size={18} /> 返回首頁
          </button>
        </div>
      </div>

      {/* Mistake Review List */}
      <AnimatePresence>
        {showMistakes && wrongQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-8 text-left space-y-4 pb-12"
          >
            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4 justify-center">
              <AlertCircle className="text-red-500" /> 錯題回顧
            </h3>

            {wrongQuestions.map((q, idx) => {
              const qIdStr = String(q.id);
              const userAns = userAnswerMap ? userAnswerMap[qIdStr] : undefined;
              const isMulti = isMultipleAnswer(q) || q.type === 'multiple';
              const correctAnswersList: string[] = isMultipleAnswer(q)
                ? q.answer
                : [String(q.answer)];
              const userAnswersList: string[] = userAns === undefined
                ? []
                : (Array.isArray(userAns) ? userAns : [userAns]);

              return (
                <div key={q.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                  <div className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-200 mb-3 text-lg break-words">{q.question}</p>

                      <div className="space-y-2 mb-4">
                        {userAns === undefined ? (
                          // Fallback mode when userAnswerMap is missing or questionId not found
                          q.options.map((opt, optIdx) => {
                            const isCorrect = correctAnswersList.includes(opt);
                            if (!isCorrect) return null;

                            return (
                              <div
                                key={optIdx}
                                className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-800/30 break-words"
                                aria-label={`正確答案: ${opt}`}
                              >
                                <CheckCircle size={18} className="shrink-0" />
                                <span className="break-words">✅ 正確答案: {opt}</span>
                              </div>
                            );
                          })
                        ) : isMulti ? (
                          // Multi choice 4-state set operations
                          q.options.map((opt, optIdx) => {
                            const isUserSelected = userAnswersList.includes(opt);
                            const isCorrect = correctAnswersList.includes(opt);

                            if (isUserSelected && isCorrect) {
                              // True Positive [已選/正確]
                              return (
                                <div
                                  key={optIdx}
                                  className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium bg-green-500/10 p-3 rounded-lg border border-green-500/40 break-words"
                                  aria-label="正確且已選擇"
                                >
                                  <CheckCircle size={18} className="shrink-0" />
                                  <span className="break-words">[已選/正確] {opt}</span>
                                </div>
                              );
                            }

                            if (isUserSelected && !isCorrect) {
                              // False Positive [❌ 你的選擇/錯誤]
                              return (
                                <div
                                  key={optIdx}
                                  className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/40 break-words"
                                  aria-invalid="true"
                                >
                                  <XCircle size={18} className="shrink-0" />
                                  <span className="break-words">[❌ 你的選擇/錯誤] {opt}</span>
                                </div>
                              );
                            }

                            if (!isUserSelected && isCorrect) {
                              // False Negative [✅ 正確答案/漏選]
                              return (
                                <div
                                  key={optIdx}
                                  className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 p-3 rounded-lg border border-amber-500/40 border-dashed break-words"
                                  aria-label="正確答案但未選"
                                >
                                  <CheckCircle size={18} className="shrink-0" />
                                  <span className="break-words">[✅ 正確答案/漏選] {opt}</span>
                                </div>
                              );
                            }

                            // True Negative (Neutral)
                            return (
                              <div
                                key={optIdx}
                                className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium p-3 rounded-lg border border-slate-200 dark:border-slate-800 opacity-60 break-words"
                              >
                                <span className="break-words">{opt}</span>
                              </div>
                            );
                          })
                        ) : (
                          // Single choice 3-state
                          q.options.map((opt, optIdx) => {
                            const isUserSelected = userAns === opt;
                            const isCorrect = correctAnswersList.includes(opt);

                            if (isUserSelected && !isCorrect) {
                              // User's wrong pick
                              return (
                                <div
                                  key={optIdx}
                                  className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/40 break-words"
                                  aria-invalid="true"
                                >
                                  <XCircle size={18} className="shrink-0" />
                                  <span className="break-words">❌ 你的選擇: {opt}</span>
                                </div>
                              );
                            }

                            if (isCorrect) {
                              // Correct answer
                              return (
                                <div
                                  key={optIdx}
                                  className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium bg-green-500/10 p-3 rounded-lg border border-green-500/40 break-words"
                                  aria-label={`正確答案: ${opt}`}
                                >
                                  <CheckCircle size={18} className="shrink-0" />
                                  <span className="break-words">✅ 正確答案: {opt}</span>
                                </div>
                              );
                            }

                            // Neutral unselected
                            return (
                              <div
                                key={optIdx}
                                className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium p-3 rounded-lg border border-slate-200 dark:border-slate-800 opacity-60 break-words"
                              >
                                <span className="break-words">{opt}</span>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {q.explanation && (
                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl text-sm text-slate-600 dark:text-slate-400 leading-relaxed break-words">
                          <span className="font-bold block mb-1 text-slate-700 dark:text-slate-300">解析：</span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
