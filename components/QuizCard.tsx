import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSound from 'use-sound';
import { Question } from '../types';
import { Lightbulb, CheckCircle, XCircle, ArrowRight, CheckSquare, Square, Volume2, VolumeX } from 'lucide-react';
import { AIHelper } from './AIHelper';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface QuizCardProps {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  onAnswer: (isCorrect: boolean, selectedOption: string | string[]) => void;
  onNext: () => void;
  isLastQuestion: boolean;
  onExit: () => void;
}

// Motion variants extracted for stability
const QUIZ_CARD_ANIM = {
  enter: { x: 0, opacity: 1 },
  initial: { x: 20, opacity: 0 },
  exit: { x: -20, opacity: 0 },
  shake: (feedback: 'none' | 'correct' | 'incorrect') => ({ rotateZ: feedback === 'incorrect' ? [0, -1, 1, -1, 1, 0] : 0 })
};

export const QuizCard: React.FC<QuizCardProps> = ({ 
  question, 
  currentIndex, 
  totalQuestions, 
  onAnswer, 
  onNext, 
  isLastQuestion,
  onExit 
}) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Placeholder sound paths - users should put actual files in public/sounds/
  const [playCorrect] = useSound('/sounds/correct.mp3', { volume: 0.5, soundEnabled });
  const [playWrong] = useSound('/sounds/wrong.mp3', { volume: 0.3, soundEnabled });

  // Detect if question is multiple choice
  const isMultiple = useMemo(() => {
    return question.type === 'multiple' || Array.isArray(question.answer);
  }, [question]);

  // Normalize correct answer to array
  const correctAnswers = useMemo(() => {
    if (Array.isArray(question.answer)) return question.answer;
    return [question.answer];
  }, [question]);

  // Shuffle options
  const currentOptions = useMemo(() => {
    const arr = [...question.options];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [question.id]); // Use question.id as trigger to shuffle only on new question

  useEffect(() => {
    setSelectedOptions([]);
    setShowHint(false);
    setIsAnswered(false);
    setShowExplanation(false);
    setFeedback('none');
  }, [question]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSelectOption: (index: number) => {
      if (index < currentOptions.length) {
        handleOptionClick(currentOptions[index]);
      }
    },
    onSubmitOrNext: () => {
      if (!isAnswered) {
        if (isMultiple) {
          if (selectedOptions.length > 0) {
            submitAnswer(selectedOptions);
          }
        } else {
          if (selectedOptions.length === 1) {
            submitAnswer(selectedOptions);
          }
        }
      } else {
        onNext();
      }
    },
    onToggleHint: () => setShowHint(!showHint),
    onExit
  });

  const handleOptionClick = (option: string) => {
    if (isAnswered) return;
    
    if (isMultiple) {
      setSelectedOptions(prev => {
        if (prev.includes(option)) return prev.filter(o => o !== option);
        return [...prev, option];
      });
    } else {
      submitAnswer([option]);
    }
  };

  const submitAnswer = (selection: string[]) => {
    const isCorrect = selection.length === correctAnswers.length && 
                      selection.every(s => correctAnswers.includes(s));
    
    setIsAnswered(true);
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    
    if (isCorrect) {
      playCorrect();
    } else {
      playWrong();
    }

    const answerToPass = isMultiple ? selection : selection[0];
    onAnswer(isCorrect, answerToPass);
    
    setTimeout(() => setShowExplanation(true), 400);
  };

  const getOptionClass = (option: string) => {
    const baseClass = "w-full p-4 mb-3 text-left border rounded-xl transition-all duration-200 flex items-center justify-between group relative overflow-hidden";
    const isSelected = selectedOptions.includes(option);
    const isCorrect = correctAnswers.includes(option);

    if (!isAnswered) {
      if (isSelected && isMultiple) {
        return `${baseClass} border-brand-500 bg-brand-50 text-brand-900 shadow-sm`;
      }
      return `${baseClass} border-slate-200 hover:border-brand-500 hover:bg-brand-50 hover:shadow-md`;
    }

    if (isCorrect) {
      return `${baseClass} border-green-500 bg-green-50 text-green-800 ring-1 ring-green-500`;
    }

    if (isSelected && !isCorrect) {
      return `${baseClass} border-red-500 bg-red-50 text-red-800`;
    }

    return `${baseClass} border-slate-100 text-slate-400 opacity-60`;
  };

  const renderOptionIcon = (option: string) => {
    const isSelected = selectedOptions.includes(option);
    if (!isAnswered) {
        if (isMultiple) {
            return isSelected 
                ? <CheckSquare className="text-brand-600" size={24} /> 
                : <Square className="text-slate-300 group-hover:text-brand-400" size={24} />;
        }
        return <div className={`w-5 h-5 rounded-full border-2 ${isSelected ? 'border-brand-500 bg-brand-500' : 'border-slate-300 group-hover:border-brand-400'}`}></div>;
    }

    const isCorrect = correctAnswers.includes(option);
    if (isCorrect) return <CheckCircle className="text-green-600" size={24} />;
    if (isSelected && !isCorrect) return <XCircle className="text-red-500" size={24} />;
    return null;
  };

  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="max-w-2xl mx-auto w-full px-4 md:px-0">
      {/* Progress Bar */}
      <div className="mb-6 space-y-2">
        <div className="flex justify-between items-end text-sm font-bold text-slate-400">
          <span>題目 {currentIndex + 1} / {totalQuestions}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-brand-500 rounded-full"
          />
        </div>
      </div>

    <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={QUIZ_CARD_ANIM.initial}
          animate={{
            ...QUIZ_CARD_ANIM.enter,
            ...QUIZ_CARD_ANIM.shake(feedback),
            transition: { rotateZ: { duration: 0.4, ease: "easeInOut" }, x: { duration: 0.3 } }
          }}
          exit={QUIZ_CARD_ANIM.exit}
          className={`bg-white dark:bg-slate-800 rounded-3xl shadow-xl border overflow-hidden ${
            feedback === 'correct' ? 'border-green-200 dark:border-green-700 shadow-green-100' : 
            feedback === 'incorrect' ? 'border-red-200 dark:border-red-700 shadow-red-100' : 
            'border-slate-100 dark:border-slate-700'
          }`}
        >
          {/* Header Area */}
          <div className="p-8 pb-4">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                    Q-{currentIndex + 1}
                  </span>
                  {isMultiple && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-700">
                      多選
                      </span>
                  )}
                  <button 
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-1 text-slate-400 hover:text-brand-500 transition-colors"
                  >
                    {soundEnabled ? <Volume2 size={16}/> : <VolumeX size={16}/>}
                  </button>
                  <div className="h-4 w-px bg-slate-200 mx-1"></div>
                  <AIHelper question={question} userAnswer={selectedOptions} />
              </div>
              
              {question.hint && (
                <button
                  onClick={() => setShowHint(!showHint)}
                  className={`flex items-center gap-1 text-sm font-bold transition-colors ${
                    showHint ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
                  }`}
                >
                  <Lightbulb size={18} />
                  <span>{showHint ? '關閉提示' : '取得提示'}</span>
                </button>
              )}
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 leading-relaxed mb-2">
              {question.question}
            </h2>

            <AnimatePresence>
                {showHint && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                >
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 p-4 rounded-xl text-sm italic mb-4">
                    💡 提示: {question.hint}
                    </div>
                </motion.div>
                )}
            </AnimatePresence>
          </div>

          {/* Options Area */}
          <div className="px-8 pb-8">
            <div className="space-y-1">
              {currentOptions.map((option, idx) => (
                <button
                  key={`${question.id}-${idx}`}
                  onClick={() => handleOptionClick(option)}
                  disabled={isAnswered}
                  className={getOptionClass(option)}
                >
                  <span className="font-semibold pr-4 z-10">{option}</span>
                  <div className="shrink-0 z-10">
                      {renderOptionIcon(option)}
                  </div>
                  {isAnswered && correctAnswers.includes(option) && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.1 }}
                        className="absolute inset-0 bg-green-500"
                      />
                  )}
                </button>
              ))}
            </div>

            {isMultiple && !isAnswered && (
               <div className="mt-6 flex justify-end">
                  <button
                      onClick={() => submitAnswer(selectedOptions)}
                      disabled={selectedOptions.length === 0}
                      className="bg-brand-600 hover:bg-brand-500 disabled:bg-slate-300 disabled:shadow-none text-white font-bold py-3 px-10 rounded-xl shadow-lg transition-all transform active:scale-95"
                  >
                      送出答案
                  </button>
               </div>
            )}

            {/* Explanation Area */}
            <AnimatePresence>
                {showExplanation && (
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="mt-6"
                    >
                        <div className={`p-6 rounded-2xl border ${
                            feedback === 'correct'
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}>
                        <h3 className={`text-sm font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${
                             feedback === 'correct' ? 'text-green-700' : 'text-red-700'
                        }`}>
                            {feedback === 'correct' ? '🎉 太棒了！回答正確' : '❌ 再接再厲！解析如下'}
                        </h3>
                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-7 font-medium">
                            {question.explanation || "此題暫無解析。"}
                        </p>
                        </div>

                        <div className="mt-8 flex justify-end">
                        <button
                            onClick={onNext}
                            className={`flex items-center gap-2 text-white font-bold py-4 px-10 rounded-2xl shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 ${
                                feedback === 'correct' ? 'bg-green-600 hover:bg-green-500' : 'bg-slate-800 hover:bg-slate-700'
                            }`}
                        >
                            <span>{isLastQuestion ? '查看結果' : '下一題'}</span>
                            <ArrowRight size={20} />
                        </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default React.memo(QuizCard);
