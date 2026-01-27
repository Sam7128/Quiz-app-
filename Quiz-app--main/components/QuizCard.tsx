import React, { useState, useEffect, useMemo } from 'react';
import { Question } from '../types';
import { Lightbulb, CheckCircle, XCircle, ArrowRight, CheckSquare, Square } from 'lucide-react';

interface QuizCardProps {
  question: Question;
  onAnswer: (isCorrect: boolean, selectedOption: string | string[]) => void;
  onNext: () => void;
  isLastQuestion: boolean;
}

export const QuizCard: React.FC<QuizCardProps> = ({ question, onAnswer, onNext, isLastQuestion }) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // Detect if question is multiple choice
  const isMultiple = useMemo(() => {
    return question.type === 'multiple' || Array.isArray(question.answer);
  }, [question]);

  // Normalize correct answer to array for consistent logic
  const correctAnswers = useMemo(() => {
    if (Array.isArray(question.answer)) return question.answer;
    return [question.answer];
  }, [question]);

  // Shuffle options when question changes
  const currentOptions = useMemo(() => {
    const arr = [...question.options];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [question]);

  // Reset state when question changes
  useEffect(() => {
    setSelectedOptions([]);
    setShowHint(false);
    setIsAnswered(false);
    setShowExplanation(false);
  }, [question]);

  const handleOptionClick = (option: string) => {
    if (isAnswered) return;
    
    if (isMultiple) {
      // Toggle selection for multiple choice
      setSelectedOptions(prev => {
        if (prev.includes(option)) return prev.filter(o => o !== option);
        return [...prev, option];
      });
    } else {
      // Immediate submit for single choice
      submitAnswer([option]);
    }
  };

  const submitAnswer = (selection: string[]) => {
    setIsAnswered(true);
    
    // Check correctness: Selected length matches Correct length AND every selected item is in Correct list
    const isCorrect = selection.length === correctAnswers.length && 
                      selection.every(s => correctAnswers.includes(s));
    
    const answerToPass = isMultiple ? selection : selection[0];
    onAnswer(isCorrect, answerToPass);
    
    setTimeout(() => setShowExplanation(true), 500);
  };

  const getOptionClass = (option: string) => {
    const baseClass = "w-full p-4 mb-3 text-left border rounded-xl transition-all duration-200 flex items-center justify-between group";
    
    const isSelected = selectedOptions.includes(option);
    const isCorrect = correctAnswers.includes(option);

    if (!isAnswered) {
      if (isSelected && isMultiple) {
        return `${baseClass} border-brand-500 bg-brand-50 text-brand-900 shadow-sm`;
      }
      return `${baseClass} border-slate-200 hover:border-brand-500 hover:bg-brand-50 hover:shadow-md`;
    }

    // Answered State Logic
    if (isCorrect) {
      // Always highlight correct answers in green
      return `${baseClass} border-green-500 bg-green-50 text-green-800 ring-1 ring-green-500`;
    }

    if (isSelected && !isCorrect) {
      // Highlight wrong selections in red
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

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        
        {/* Header / Question Area */}
        <div className="p-8 pb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                ID: {question.id}
                </span>
                {isMultiple && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                    多選題
                    </span>
                )}
            </div>
            
            {question.hint && (
              <button
                onClick={() => setShowHint(!showHint)}
                className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                  showHint ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
                }`}
              >
                <Lightbulb size={18} />
                <span>{showHint ? '隱藏提示' : '提示'}</span>
              </button>
            )}
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-relaxed">
            {question.question}
          </h2>

          {isMultiple && !isAnswered && (
            <p className="text-sm text-slate-500 mt-2">請選擇所有正確答案</p>
          )}

          {/* Hint Box */}
          <div className={`mt-4 overflow-hidden transition-all duration-300 ${showHint ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-sm italic">
              💡 提示: {question.hint}
            </div>
          </div>
        </div>

        {/* Options Area */}
        <div className="px-8 pb-8">
          <div className="space-y-1">
            {currentOptions.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleOptionClick(option)}
                disabled={isAnswered}
                className={getOptionClass(option)}
              >
                <span className="font-medium pr-4">{option}</span>
                <div className="shrink-0">
                    {renderOptionIcon(option)}
                </div>
              </button>
            ))}
          </div>

          {/* Confirm Button for Multiple Choice */}
          {isMultiple && !isAnswered && (
             <div className="mt-6 flex justify-end">
                <button
                    onClick={() => submitAnswer(selectedOptions)}
                    disabled={selectedOptions.length === 0}
                    className="bg-brand-600 hover:bg-brand-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-xl shadow-lg transition-all"
                >
                    確認答案
                </button>
             </div>
          )}

          {/* Explanation Area */}
          <div className={`mt-6 transition-all duration-500 ease-out ${showExplanation ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none absolute'}`}>
            <div className={`p-5 rounded-xl border ${
                // Logic: show Green box if fully correct, else Slate (neutral) or Red? 
                // Let's stick to Green if correct, Slate if wrong for explanation background.
                (selectedOptions.length === correctAnswers.length && selectedOptions.every(s => correctAnswers.includes(s)))
                ? 'bg-green-50 border-green-200' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                {(selectedOptions.length === correctAnswers.length && selectedOptions.every(s => correctAnswers.includes(s))) ? (
                  <span className="text-green-700">太棒了！</span>
                ) : (
                  <span className="text-slate-700">詳細解析</span>
                )}
              </h3>
              <p className="text-slate-700 text-sm leading-6">
                {question.explanation || "此題暫無解析。"}
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={onNext}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
              >
                <span>{isLastQuestion ? '完成測驗' : '下一題'}</span>
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};