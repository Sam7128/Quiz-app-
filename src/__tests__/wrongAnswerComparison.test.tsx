import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuizResult } from '../../components/QuizResult';
import { Question } from '../../types';

const mockSingleQuestion: Question = {
  id: 'q-single-1',
  question: 'React 是哪家公司開發的？',
  options: ['Google', 'Meta', 'Microsoft', 'Apple'],
  answer: 'Meta',
  explanation: 'React 是由 Meta (Facebook) 開發的前端函式庫。'
};

const mockMultiQuestion: Question = {
  id: 'q-multi-1',
  question: '下列何者為 JavaScript 基本型別？',
  options: ['string', 'number', 'boolean', 'tuple', 'list'],
  answer: ['string', 'number', 'boolean'],
  type: 'multiple',
  explanation: 'string, number, boolean 為 JS 原生型別。'
};

describe('Wrong Answer Comparison & Accessibility (QuizResult)', () => {
  it('單選題三態：正確渲染使用者錯誤選擇、正確答案與中立選項，並附帶無障礙標籤', () => {
    const wrongQuestions = [mockSingleQuestion];
    const userAnswerMap = {
      'q-single-1': 'Google' // 使用者選了 Google (錯誤)，正確是 Meta
    };

    render(
      <QuizResult
        score={0}
        totalQuestions={1}
        wrongQuestions={wrongQuestions}
        onRetry={vi.fn()}
        onRestart={vi.fn()}
        onHome={vi.fn()}
        userAnswerMap={userAnswerMap}
      />
    );

    // 點擊展開錯題解析
    const toggleBtn = screen.getByText(/查看錯題解析/);
    fireEvent.click(toggleBtn);

    // 1. 使用者錯誤選擇 (Google)
    const userChoice = screen.getByText(/❌ 你的選擇: Google/);
    expect(userChoice).toBeDefined();
    const userChoiceContainer = userChoice.closest('div');
    expect(userChoiceContainer?.getAttribute('aria-invalid')).toBe('true');
    expect(userChoiceContainer?.className).toContain('text-red-600');

    // 2. 正確答案 (Meta)
    const correctChoice = screen.getByText(/✅ 正確答案: Meta/);
    expect(correctChoice).toBeDefined();
    const correctChoiceContainer = correctChoice.closest('div');
    expect(correctChoiceContainer?.getAttribute('aria-label')).toBe('正確答案: Meta');
    expect(correctChoiceContainer?.className).toContain('text-green-600');

    // 3. 中立未選 (Microsoft, Apple)
    expect(screen.getByText('Microsoft')).toBeDefined();
    expect(screen.getByText('Apple')).toBeDefined();
  });

  it('多選題四態集合運算：選對(TP)、錯選(FP)、漏選(FN)、中立(TN) 正確渲染並附帶語義標籤', () => {
    const wrongQuestions = [mockMultiQuestion];
    // 正確為: string, number, boolean
    // 使用者選了: string (選對), tuple (錯選) -> 漏選: number, boolean; 中立: list
    const userAnswerMap = {
      'q-multi-1': ['string', 'tuple']
    };

    render(
      <QuizResult
        score={0}
        totalQuestions={1}
        wrongQuestions={wrongQuestions}
        onRetry={vi.fn()}
        onRestart={vi.fn()}
        onHome={vi.fn()}
        userAnswerMap={userAnswerMap}
      />
    );

    fireEvent.click(screen.getByText(/查看錯題解析/));

    // 1. True Positive: [已選/正確] string
    const tpChoice = screen.getByText(/\[已選\/正確\] string/);
    expect(tpChoice).toBeDefined();
    expect(tpChoice.closest('div')?.getAttribute('aria-label')).toBe('正確且已選擇');

    // 2. False Positive: [❌ 你的選擇/錯誤] tuple
    const fpChoice = screen.getByText(/\[❌ 你的選擇\/錯誤\] tuple/);
    expect(fpChoice).toBeDefined();
    expect(fpChoice.closest('div')?.getAttribute('aria-invalid')).toBe('true');

    // 3. False Negative: [✅ 正確答案/漏選] number & boolean
    const fnChoice1 = screen.getByText(/\[✅ 正確答案\/漏選\] number/);
    expect(fnChoice1).toBeDefined();
    expect(fnChoice1.closest('div')?.getAttribute('aria-label')).toBe('正確答案但未選');

    const fnChoice2 = screen.getByText(/\[✅ 正確答案\/漏選\] boolean/);
    expect(fnChoice2).toBeDefined();
    expect(fnChoice2.closest('div')?.getAttribute('aria-label')).toBe('正確答案但未選');

    // 4. True Negative: list
    expect(screen.getByText('list')).toBeDefined();
  });

  it('優雅降級：當 userAnswerMap 缺失或未傳時，安全回退為僅顯示正確答案，不拋出異常', () => {
    const wrongQuestions = [mockSingleQuestion];

    render(
      <QuizResult
        score={0}
        totalQuestions={1}
        wrongQuestions={wrongQuestions}
        onRetry={vi.fn()}
        onRestart={vi.fn()}
        onHome={vi.fn()}
        userAnswerMap={undefined}
      />
    );

    fireEvent.click(screen.getByText(/查看錯題解析/));

    // 顯示正確答案
    const fallbackCorrect = screen.getByText(/✅ 正確答案: Meta/);
    expect(fallbackCorrect).toBeDefined();
    expect(fallbackCorrect.closest('div')?.getAttribute('aria-label')).toBe('正確答案: Meta');
    // 降級模式下不顯示未選的中立項目
    expect(screen.queryByText('Microsoft')).toBeNull();
  });
});
