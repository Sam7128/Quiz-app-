import React, { useState, useEffect } from 'react';
import { Question, BankMetadata } from '../types';
import { Upload, Download, Trash2, AlertCircle, Plus, FileJson, FileText, Check, FolderOpen, Loader2, Sparkles, FileType, PencilLine, Save, X } from 'lucide-react';
import { useRepository } from '../contexts/RepositoryContext';
import { generateQuestionsFromPDF } from '../services/ai';
import DOMPurify from 'dompurify';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import { SkeletonLoader } from './SkeletonLoader';
import { generateUUID } from '../utils/uuid';
import {
  normalizeQuestionForPersistence,
  normalizeSourceQuestionKey,
  planQuestionImport,
  type ImportMode
} from '../utils/questionIdentity';

interface BankManagerProps {
  currentQuestions: Question[];
  currentBankId: string | null;
  onBankChange: (bankId: string) => void;
  onUpdateQuestions: (questions: Question[]) => void;
  onRefreshBanks: () => void;
  onMistakesUpdate: () => void;
}

interface QuestionEditorDraft {
  question: string;
  type: 'single' | 'multiple';
  optionsText: string;
  answerText: string;
  hint: string;
  explanation: string;
}

const PDFImportSection: React.FC<{ onImport: (q: Question[]) => void }> = ({ onImport }) => {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [langOutput, setLangOutput] = useState('zh-TW');
  const [questionType, setQuestionType] = useState('mixed');
  const [langExplanation, setLangExplanation] = useState('zh-TW');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleGenerate = async () => {
    if (!file) return;
    setLoading(true);
    setStatus('讀取檔案中...');

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        setStatus('AI 正在閱讀 PDF 並生成題目 (約需 10-30 秒)...');

        try {
          const questions = await generateQuestionsFromPDF(base64, topic, count, {
            langOutput,
            questionType,
            langExplanation
          });
          onImport(questions);
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : '未知錯誤';
          toast.error('生成失敗: ' + message);
        } finally {
          setLoading(false);
          setStatus('');
        }
      };
    } catch {
      toast.error('檔案讀取失敗');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 border border-dashed border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/10 rounded-xl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full flex items-center justify-center">
            <FileType size={24} />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-700 dark:text-slate-200">上傳 PDF 講義 / 文件</p>
            <p className="text-xs text-slate-500">支援 Google Gemini 模型分析文件</p>
          </div>

          <label className="cursor-pointer">
            <span className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors shadow-sm inline-flex items-center gap-2">
              {file ? '更換檔案' : '選擇 PDF'}
            </span>
            <input aria-label="Upload PDF File" type="file" accept=".pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
          {file && <p className="text-sm text-purple-700 font-bold underline">{file.name}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="pdf-question-count" className="text-xs font-bold text-slate-500 mb-1 block">題目數量</label>
          <input
            id="pdf-question-count"
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={e => setCount(Number(e.target.value))}
            className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
          />
        </div>
        <div>
          <label htmlFor="pdf-topic" className="text-xs font-bold text-slate-500 mb-1 block">專注主題 (選填)</label>
          <input
            id="pdf-topic"
            type="text"
            placeholder="例如: 第二章, 歷史背景..."
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">題目語言</label>
          <select
            aria-label="Output Language"
            value={langOutput}
            onChange={(e) => setLangOutput(e.target.value)}
            className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-sm"
          >
            <option value="zh-TW">繁體中文</option>
            <option value="en">English (英文)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">題目類型</label>
          <select
            aria-label="Question Type"
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value)}
            className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-sm"
          >
            <option value="mixed">混合 (Mixed)</option>
            <option value="single">單選題 (Single)</option>
            <option value="multiple">多選題 (Multiple)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">詳解語言</label>
          <select
            aria-label="Explanation Language"
            value={langExplanation}
            onChange={(e) => setLangExplanation(e.target.value)}
            className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-sm"
          >
            <option value="zh-TW">繁體中文</option>
            <option value="en">English (英文)</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!file || loading}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
        {loading ? status : '開始生成題目'}
      </button>
    </div>
  );
};

export const BankManager: React.FC<BankManagerProps> = ({
  currentQuestions,
  currentBankId,
  onBankChange,
  onUpdateQuestions,
  onRefreshBanks,
  onMistakesUpdate
}) => {
  const repository = useRepository();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [banks, setBanks] = useState<BankMetadata[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'ai'>('upload');
  const [importMode, setImportMode] = useState<ImportMode>('append');
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [newBankName, setNewBankName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionDraft, setQuestionDraft] = useState<QuestionEditorDraft | null>(null);

  const sanitizeString = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    return DOMPurify.sanitize(value);
  };

  const sanitizeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
      .filter((v): v is string => typeof v === 'string')
      .map((v) => DOMPurify.sanitize(v));
  };

  const normalizeImportedQuestions = (value: unknown): Question[] => {
    if (!Array.isArray(value)) {
      throw new Error("資料必須是 JSON 陣列 (Array)");
    }

    // Basic validation for shape
    if (value.length > 0) {
      const first = value[0];
      if (!first || typeof first !== 'object' || !('question' in (first as Record<string, unknown>))) {
        throw new Error("格式無效：缺少 'question' 欄位");
      }
    }

    return value.map((item) => {
      const q = (item && typeof item === 'object') ? (item as Record<string, unknown>) : ({} as Record<string, unknown>);

      const rawAnswer = q.answer;
      const answer = Array.isArray(rawAnswer)
        ? rawAnswer.filter((v): v is string => typeof v === 'string').map((v) => DOMPurify.sanitize(v))
        : (sanitizeString(rawAnswer) ?? '');

      const type = q.type === 'single' || q.type === 'multiple' ? q.type : undefined;
      const sourceQuestionKey =
        sanitizeString(q.sourceQuestionKey) ??
        normalizeSourceQuestionKey(q.original_question_id) ??
        normalizeSourceQuestionKey(q.id);

      return {
        id: normalizeSourceQuestionKey(q.id) ?? generateUUID(),
        original_question_id: sourceQuestionKey,
        sourceQuestionKey,
        question: sanitizeString(q.question) ?? '',
        options: sanitizeStringArray(q.options),
        answer,
        type,
        hint: sanitizeString(q.hint),
        explanation: sanitizeString(q.explanation),
        tags: Array.isArray(q.tags) ? q.tags.filter((t): t is string => typeof t === 'string') : undefined,
      };
    });
  };

  const buildDraftFromQuestion = (question: Question): QuestionEditorDraft => ({
    question: question.question,
    type: question.type ?? 'single',
    optionsText: question.options.join('\n'),
    answerText: Array.isArray(question.answer) ? question.answer.join('\n') : question.answer,
    hint: question.hint ?? '',
    explanation: question.explanation ?? '',
  });

  useEffect(() => {
    void refreshBanks();
  }, [repository]);

  useEffect(() => {
    if (!editingQuestionId) return;

    const currentQuestion = currentQuestions.find((question) => String(question.id) === editingQuestionId);
    if (!currentQuestion) {
      setEditingQuestionId(null);
      setQuestionDraft(null);
    }
  }, [currentQuestions, editingQuestionId]);

  const refreshBanks = async () => {
    setLoading(true);
    const latestBanks = await repository.getBanks();
    setBanks(latestBanks);
    setLoading(false);
  };

  const handleCreateBank = async () => {
    if (!newBankName.trim()) return;
    setLoading(true);
    try {
      const newBank = await repository.createBank(newBankName);
      await refreshBanks();
      onRefreshBanks();
      onBankChange(newBank.id);
      setNewBankName('');
      setIsCreating(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '建立題庫失敗';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBank = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (await confirmDialog({ title: '確認刪除', message: '確定要刪除這個題庫嗎？此操作無法復原。' })) {
      setLoading(true);
      await repository.deleteBank(id);

      await refreshBanks();
      onRefreshBanks();

      // If deleted active bank, switch to another or null
      if (id === currentBankId) {
        const latestBanks = await repository.getBanks();
        if (latestBanks.length > 0) {
          onBankChange(latestBanks[0].id);
        } else {
          onBankChange(''); // Clear selection
        }
      }
      setLoading(false);
    }
  };

  const processJson = async (jsonString: string) => {
    try {
      const parsed: unknown = JSON.parse(jsonString);
      const data = normalizeImportedQuestions(parsed);

      if (currentBankId) {
        const mergedQuestions = await confirmImportSummary(data);
        if (!mergedQuestions) {
          setError(null);
          return;
        }

        setLoading(true);
        await repository.saveQuestions(currentBankId, mergedQuestions);

        onUpdateQuestions(mergedQuestions);
        await refreshBanks(); // Update counts
        onRefreshBanks(); // Sync parent
        setError(null);
        setLoading(false);
        toast.success(`成功匯入 ${mergedQuestions.length} 題！`);
      } else {
        setError("請先選擇或建立一個題庫");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "無效的 JSON 格式");
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => processJson(e.target?.result as string);
    reader.readAsText(file);
  };

  const handlePasteImport = () => {
    processJson(jsonText);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentQuestions, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `mindspark_bank_${currentBankId || 'export'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const confirmImportSummary = async (importedQuestions: Question[]): Promise<Question[] | null> => {
    if (!currentBankId) {
      setError("請先選擇或建立一個題庫");
      return null;
    }

    const { questions: mergedQuestions, analysis } = planQuestionImport(
      currentQuestions,
      importedQuestions,
      importMode
    );

    const summaryLines = [
      `匯入模式：${importMode === 'append' ? '追加新題' : importMode === 'merge' ? '更新同來源題目' : '覆蓋整個題庫'}`,
      `原始資料：${analysis.rawCount} 題`,
      `重複來源 ID 合併：${analysis.duplicateSourceKeyMergedCount} 題`,
      `相同題目內容合併：${analysis.duplicateFingerprintMergedCount} 題`,
      `實際可匯入：${analysis.dedupedCount} 題`,
      `符合既有題目：${analysis.matchedExistingCount} 題`,
      `實際更新題目：${analysis.updatedQuestionCount} 題`,
      `略過既有題目：${analysis.skippedMatchedCount} 題`,
      `新增題目：${analysis.newQuestionCount} 題`,
      `移除舊題目：${analysis.removedQuestionCount} 題`,
      `匯入後題庫總數：${analysis.finalQuestionCount} 題`,
    ];

    const confirmed = await confirmDialog({
      title: '匯入前檢查',
      message: `${summaryLines.join('\n')}\n\n是否繼續匯入？`,
      confirmText: '繼續匯入',
      cancelText: '取消',
    });

    return confirmed ? mergedQuestions : null;
  };

  const beginEditQuestion = (question: Question) => {
    setEditingQuestionId(String(question.id));
    setQuestionDraft(buildDraftFromQuestion(question));
  };

  const resetQuestionEditor = () => {
    setEditingQuestionId(null);
    setQuestionDraft(null);
  };

  const parseLines = (value: string): string[] => {
    return value
      .split('\n')
      .map((entry) => DOMPurify.sanitize(entry.trim()))
      .filter((entry) => entry.length > 0);
  };

  const handleSaveQuestionEdit = async () => {
    if (!currentBankId || !editingQuestionId || !questionDraft) return;

    const sanitizedQuestion = DOMPurify.sanitize(questionDraft.question.trim());
    const sanitizedHint = DOMPurify.sanitize(questionDraft.hint.trim());
    const sanitizedExplanation = DOMPurify.sanitize(questionDraft.explanation.trim());
    const options = parseLines(questionDraft.optionsText);
    const answers = parseLines(questionDraft.answerText);

    if (!sanitizedQuestion) {
      setError('題目內容不可為空。');
      return;
    }

    if (options.length < 2) {
      setError('至少需要兩個選項。');
      return;
    }

    if (answers.length === 0) {
      setError('請至少填入一個正確答案。');
      return;
    }

    const invalidAnswers = answers.filter((answer) => !options.includes(answer));
    if (invalidAnswers.length > 0) {
      setError('正確答案必須出現在選項中。');
      return;
    }

    if (questionDraft.type === 'single' && answers.length !== 1) {
      setError('單選題只能有一個正確答案。');
      return;
    }

    const updatedQuestions = currentQuestions.map((question) => {
      if (String(question.id) !== editingQuestionId) return question;

      return normalizeQuestionForPersistence({
        ...question,
        question: sanitizedQuestion,
        type: questionDraft.type,
        options,
        answer: questionDraft.type === 'single' ? answers[0] : answers,
        hint: sanitizedHint || undefined,
        explanation: sanitizedExplanation || undefined,
      });
    });

    setLoading(true);
    try {
      await repository.saveQuestions(currentBankId, updatedQuestions);
      onUpdateQuestions(updatedQuestions);
      await refreshBanks();
      onRefreshBanks();
      setError(null);
      toast.success('題目已更新。');
      resetQuestionEditor();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新題目失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (question: Question) => {
    if (!currentBankId) return;

    const confirmed = await confirmDialog({
      title: '刪除題目',
      message: '確定要刪除這一題嗎？此操作會同步清理該題的錯題與複習資料。'
    });

    if (!confirmed) return;

    const questionId = String(question.id);
    const updatedQuestions = currentQuestions.filter((entry) => String(entry.id) !== questionId);

    setLoading(true);
    try {
      await repository.saveQuestions(currentBankId, updatedQuestions);
      await repository.deleteQuestionArtifacts(questionId);
      onUpdateQuestions(updatedQuestions);
      await refreshBanks();
      onRefreshBanks();
      onMistakesUpdate();
      if (editingQuestionId === questionId) {
        resetQuestionEditor();
      }
      setError(null);
      toast.success('題目已刪除。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除題目失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto grid md:grid-cols-12 gap-8 min-h-[calc(100vh-8rem)] items-start relative">
      {loading && (
        <div className="absolute inset-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-[2px] z-50 flex items-center justify-center rounded-3xl">
          <div className="flex flex-col items-center gap-3">
            <SkeletonLoader width="40px" height="40px" count={1} />
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">正在處理雲端資料...</p>
          </div>
        </div>
      )}

      {/* Left Sidebar: Bank List */}
      <div className="md:col-span-4 flex flex-col bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 dark:border-white/5 overflow-hidden w-full md:sticky md:top-4 md:max-h-[calc(100vh-9rem)]">
        <div className="p-6 border-b border-slate-100/50 dark:border-white/10 flex justify-between items-center bg-white/40 dark:bg-slate-800/40">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FolderOpen className="text-brand-500" size={20} />
            我的題庫 ({banks.length})
          </h3>
          <button
            onClick={() => setIsCreating(true)}
            className="p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-500 transition-all shadow-lg shadow-brand-500/20 active:scale-95"
            title="新增題庫"
          >
            <Plus size={20} />
          </button>
        </div>

        {isCreating && (
          <div className="p-3 bg-brand-50 dark:bg-brand-900/30 border-b border-brand-100 dark:border-brand-800 animate-in fade-in slide-in-from-top-2">
            <input
              autoFocus
              type="text"
              placeholder="輸入題庫名稱..."
              className="w-full p-2 border border-brand-200 dark:border-brand-800 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBank()}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsCreating(false)} className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1">取消</button>
              <button onClick={handleCreateBank} className="text-xs bg-brand-600 text-white px-3 py-1 rounded-md hover:bg-brand-700">建立</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {banks.length === 0 && !isCreating && (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
              <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
              尚未建立題庫<br />請點擊「+」新增
            </div>
          )}

          {banks.map(bank => (
            <div
              key={bank.id}
              onClick={() => onBankChange(bank.id)}
              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${currentBankId === bank.id
                ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-200 dark:border-brand-800 shadow-sm ring-1 ring-brand-200 dark:ring-brand-800'
                : 'hover:bg-slate-50 dark:hover:bg-slate-700 border border-transparent'
                }`}
            >
              <div className="flex-1 min-w-0">
                <div className={`font-medium truncate ${currentBankId === bank.id ? 'text-brand-900 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300'}`}>
                  {bank.name}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  {bank.questionCount} 題
                </div>
              </div>
              {currentBankId === bank.id && (
                <div className="mr-2 text-brand-600"><Check size={16} /></div>
              )}
              <button
                onClick={(e) => handleDeleteBank(e, bank.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="刪除"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right Content: Actions */}
      <div className="md:col-span-8 flex flex-col gap-6 min-w-0 pb-6">
        {!currentBankId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-10">
            <p>請先在左側選擇一個題庫</p>
          </div>
        ) : (
          <>
            {/* Import Section */}
            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-white/5 overflow-hidden">
              <div className="flex border-b border-slate-100/50 dark:border-white/10">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'upload' ? 'bg-white dark:bg-slate-800 text-brand-600 border-b-2 border-brand-600' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                >
                  <FileJson size={18} /> 上傳 JSON 檔案
                </button>
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'paste' ? 'bg-white dark:bg-slate-800 text-brand-600 border-b-2 border-brand-600' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                >
                  <FileText size={18} /> 貼上文字 (Paste)
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'ai' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 border-b-2 border-purple-600' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                >
                  <Sparkles size={18} /> AI 生成
                </button>
              </div>

              <div className="p-6">
                <div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 p-4">
                  <label className="text-xs font-bold text-slate-500 mb-2 block">匯入模式</label>
                  <select
                    value={importMode}
                    onChange={(event) => setImportMode(event.target.value as ImportMode)}
                    className="w-full p-3 border rounded-xl dark:bg-slate-700 dark:border-slate-600 text-sm font-medium"
                  >
                    <option value="append">追加新題：保留舊題，只加入全新題目</option>
                    <option value="merge">更新同來源題目：保留舊題，並更新相同來源的題目</option>
                    <option value="replace">覆蓋整個題庫：以這次匯入內容取代題庫</option>
                  </select>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    建議平常新增題目時使用「追加新題」；只有你確定要同步修正版或整包覆蓋時，再切換其他模式。
                  </p>
                </div>

                {activeTab === 'upload' && (
                  <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-3">
                      <Upload size={24} />
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">點擊選擇或拖曳 JSON 檔案至此</p>
                    <label className="cursor-pointer bg-brand-600 hover:bg-brand-700 text-white py-2 px-6 rounded-lg transition-colors shadow-sm">
                      <span>選擇檔案</span>
                      <input aria-label="Upload JSON File" type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
                    </label>
                  </div>
                )}

                {activeTab === 'paste' && (
                  <div className="space-y-4">
                    <textarea
                      value={jsonText}
                      onChange={(e) => setJsonText(e.target.value)}
                      placeholder='在此貼上 AI 生成的 JSON 代碼... [{"question": "...", ...}]'
                      className="w-full min-h-[20rem] max-h-[60vh] p-4 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-y bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                    />
                    <button
                      onClick={handlePasteImport}
                      disabled={!jsonText.trim()}
                      className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-medium shadow-sm transition-all"
                    >
                      匯入文字內容
                    </button>
                  </div>
                )}

                {activeTab === 'ai' && (
                  <PDFImportSection onImport={async (questions) => {
                    if (currentBankId) {
                      try {
                        const mergedQuestions = await confirmImportSummary(questions);
                        if (!mergedQuestions) {
                          setError(null);
                          return;
                        }

                        setLoading(true);
                        await repository.saveQuestions(currentBankId, mergedQuestions);
                        onUpdateQuestions(mergedQuestions);
                        await refreshBanks();
                        onRefreshBanks();
                        toast.success(`成功生成並匯入 ${mergedQuestions.length} 題！`);
                        setActiveTab('paste');
                      } catch (err) {
                        setError(err instanceof Error ? err.message : '匯入失敗');
                      } finally {
                        setLoading(false);
                      }
                    }
                  }} />
                )}

                {error && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-white/20 dark:border-white/5 flex flex-col items-center text-center">
                <h4 className="font-bold text-slate-800 dark:text-white mb-2">匯出此題庫</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">備份或分享目前選中的題庫</p>
                <button onClick={handleExport} className="flex items-center gap-2 text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm">
                  <Download size={16} /> 下載 .JSON
                </button>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-white/20 dark:border-white/5 flex flex-col items-center text-center">
                <h4 className="font-bold text-slate-800 dark:text-white mb-2">清除錯題記錄</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">只清除錯題狀態，保留題目</p>
                <button
                  onClick={async () => {
                    if (await confirmDialog({ title: '清除錯題', message: '確定清除錯題記錄？' })) {
                      repository.clearMistakes();
                      onMistakesUpdate();
                      toast.success("錯題記錄已清除！");
                    }
                  }}
                  className="flex items-center gap-2 text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Trash2 size={16} /> 清除記錄
                </button>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-white/5 overflow-visible">
              <div className="p-6 border-b border-slate-100/50 dark:border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white">題目清單與人工修正</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    目前題庫共有 {currentQuestions.length} 題。編輯會保留題目身份，刪除會同步清理學習殘留資料。
                  </p>
                </div>
              </div>

              <div className="grid lg:grid-cols-[1.2fr,0.8fr] gap-0">
                <div className="p-4 border-b lg:border-b-0 lg:border-r border-slate-100/50 dark:border-white/10 max-h-[520px] overflow-y-auto">
                  {currentQuestions.length === 0 ? (
                    <div className="text-sm text-slate-400 dark:text-slate-500 p-4">
                      這個題庫目前沒有題目，可先用 JSON 或 AI 匯入。
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentQuestions.map((question, index) => {
                        const isEditing = String(question.id) === editingQuestionId;
                        return (
                          <div
                            key={String(question.id)}
                            className={`rounded-2xl border p-4 transition-all ${isEditing
                              ? 'border-brand-300 bg-brand-50/70 dark:bg-brand-900/20 dark:border-brand-700'
                              : 'border-slate-100 dark:border-slate-700 bg-white/70 dark:bg-slate-800/50'
                              }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                                  <span>#{index + 1}</span>
                                  <span>{question.type === 'multiple' ? '多選題' : '單選題'}</span>
                                </div>
                                <p className="font-semibold text-slate-800 dark:text-slate-100 break-words">
                                  {question.question}
                                </p>
                                <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
                                  {question.options.map((option) => (
                                    <li key={option} className="break-words">• {option}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => beginEditQuestion(question)}
                                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-300"
                                >
                                  <PencilLine size={16} />
                                  編輯
                                </button>
                                <button
                                  onClick={() => void handleDeleteQuestion(question)}
                                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300"
                                >
                                  <Trash2 size={16} />
                                  刪除
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="p-6">
                  {!questionDraft ? (
                    <div className="h-full min-h-[280px] flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                      先從左側挑一題開始編修。
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-slate-800 dark:text-white">編輯題目</h5>
                        <button
                          onClick={resetQuestionEditor}
                          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                          <X size={16} />
                          取消
                        </button>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">題目類型</label>
                        <select
                          value={questionDraft.type}
                          onChange={(event) => setQuestionDraft((prev) => prev ? { ...prev, type: event.target.value as 'single' | 'multiple' } : prev)}
                          className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                        >
                          <option value="single">單選題</option>
                          <option value="multiple">多選題</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">題目</label>
                        <textarea
                          value={questionDraft.question}
                          onChange={(event) => setQuestionDraft((prev) => prev ? { ...prev, question: event.target.value } : prev)}
                          className="w-full h-24 p-3 border rounded-xl dark:bg-slate-700 dark:border-slate-600"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">選項（每行一個）</label>
                        <textarea
                          value={questionDraft.optionsText}
                          onChange={(event) => setQuestionDraft((prev) => prev ? { ...prev, optionsText: event.target.value } : prev)}
                          className="w-full h-32 p-3 border rounded-xl font-mono text-sm dark:bg-slate-700 dark:border-slate-600"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">
                          正確答案（{questionDraft.type === 'single' ? '單行' : '每行一個'}）
                        </label>
                        <textarea
                          value={questionDraft.answerText}
                          onChange={(event) => setQuestionDraft((prev) => prev ? { ...prev, answerText: event.target.value } : prev)}
                          className="w-full h-24 p-3 border rounded-xl font-mono text-sm dark:bg-slate-700 dark:border-slate-600"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">提示（選填）</label>
                        <textarea
                          value={questionDraft.hint}
                          onChange={(event) => setQuestionDraft((prev) => prev ? { ...prev, hint: event.target.value } : prev)}
                          className="w-full h-20 p-3 border rounded-xl dark:bg-slate-700 dark:border-slate-600"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">詳解（選填）</label>
                        <textarea
                          value={questionDraft.explanation}
                          onChange={(event) => setQuestionDraft((prev) => prev ? { ...prev, explanation: event.target.value } : prev)}
                          className="w-full h-24 p-3 border rounded-xl dark:bg-slate-700 dark:border-slate-600"
                        />
                      </div>

                      <button
                        onClick={() => void handleSaveQuestionEdit()}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white py-3 font-bold"
                      >
                        <Save size={16} />
                        儲存題目變更
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(BankManager);
