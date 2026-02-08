import React, { useState, useEffect } from 'react';
import { Question, BankMetadata } from '../types';
import { Upload, Download, Trash2, AlertCircle, Plus, FileJson, FileText, Check, FolderOpen, Loader2, Sparkles, FileType } from 'lucide-react';
import { saveQuestions, clearMistakes, getBanksMeta, createBank, deleteBank } from '../services/storage';
import { generateQuestionsFromPDF } from '../services/ai';
import DOMPurify from 'dompurify';
import { useAuth } from '../contexts/AuthContext';
import { SkeletonLoader } from './SkeletonLoader';
import {
  getCloudBanks,
  createCloudBank,
  deleteCloudBank,
  saveCloudQuestions
} from '../services/cloudStorage';

interface BankManagerProps {
  currentQuestions: Question[];
  currentBankId: string | null;
  onBankChange: (bankId: string) => void;
  onUpdateQuestions: (questions: Question[]) => void;
  onRefreshBanks: () => void;
  onMistakesUpdate: () => void;
}

const PDFImportSection: React.FC<{ onImport: (q: Question[]) => void }> = ({ onImport }) => {
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
        } catch (e: any) {
          alert('生成失敗: ' + e.message);
        } finally {
          setLoading(false);
          setStatus('');
        }
      };
    } catch (e) {
      alert('檔案讀取失敗');
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
  const { user } = useAuth();
  const [banks, setBanks] = useState<BankMetadata[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'ai'>('upload');
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [newBankName, setNewBankName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshBanks();
  }, [user]);

  const refreshBanks = async () => {
    setLoading(true);
    const latestBanks = user ? await getCloudBanks() : getBanksMeta();
    setBanks(latestBanks);
    setLoading(false);
  };

  const handleCreateBank = async () => {
    if (!newBankName.trim()) return;
    setLoading(true);

    let newId: string;
    if (user) {
      const cloudId = await createCloudBank(newBankName);
      if (!cloudId) {
        setError("建立雲端題庫失敗");
        setLoading(false);
        return;
      }
      newId = cloudId;
    } else {
      const newBank = createBank(newBankName);
      newId = newBank.id;
    }

    await refreshBanks();
    onRefreshBanks();
    onBankChange(newId);
    setNewBankName('');
    setIsCreating(false);
    setLoading(false);
  };

  const handleDeleteBank = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("確定要刪除這個題庫嗎？此操作無法復原。")) {
      setLoading(true);
      if (user) {
        await deleteCloudBank(id);
      } else {
        deleteBank(id);
      }

      await refreshBanks();
      onRefreshBanks();

      // If deleted active bank, switch to another or null
      if (id === currentBankId) {
        const latestBanks = user ? await getCloudBanks() : getBanksMeta();
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
      let data = JSON.parse(jsonString);

      // Basic validation
      if (!Array.isArray(data)) throw new Error("資料必須是 JSON 陣列 (Array)");
      if (data.length > 0 && !data[0].question) throw new Error("格式無效：缺少 'question' 欄位");

      // Security Sanitization: Clean all string fields to prevent XSS
      data = data.map((q: any) => ({
        ...q,
        question: typeof q.question === 'string' ? DOMPurify.sanitize(q.question) : q.question,
        options: Array.isArray(q.options) 
          ? q.options.map((opt: any) => typeof opt === 'string' ? DOMPurify.sanitize(opt) : opt)
          : q.options,
        hint: typeof q.hint === 'string' ? DOMPurify.sanitize(q.hint) : q.hint,
        explanation: typeof q.explanation === 'string' ? DOMPurify.sanitize(q.explanation) : q.explanation,
      }));

      if (currentBankId) {
        setLoading(true);
        if (user) {
          await saveCloudQuestions(currentBankId, data);
        } else {
          saveQuestions(currentBankId, data);
        }

        onUpdateQuestions(data);
        await refreshBanks(); // Update counts
        onRefreshBanks(); // Sync parent
        setError(null);
        setJsonText('');
        setLoading(false);
        alert(`成功匯入 ${data.length} 題！`);
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

  return (
    <div className="max-w-6xl mx-auto grid md:grid-cols-12 gap-8 h-[calc(100vh-8rem)] relative">
      {loading && (
        <div className="absolute inset-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-[2px] z-50 flex items-center justify-center rounded-3xl">
          <div className="flex flex-col items-center gap-3">
            <SkeletonLoader width="40px" height="40px" count={1} />
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">正在處理雲端資料...</p>
          </div>
        </div>
      )}

      {/* Left Sidebar: Bank List */}
      <div className="md:col-span-4 flex flex-col bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 dark:border-white/5 overflow-hidden h-full">
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
      <div className="md:col-span-8 flex flex-col gap-6 overflow-y-auto">
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
                      className="w-full h-48 p-4 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
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
                  <PDFImportSection onImport={(questions) => {
                    if (currentBankId) {
                      setLoading(true);
                      const savePromise = user
                        ? saveCloudQuestions(currentBankId, questions)
                        : Promise.resolve(saveQuestions(currentBankId, questions));

                      savePromise.then(async () => {
                        onUpdateQuestions(questions);
                        await refreshBanks();
                        onRefreshBanks();
                        alert(`成功生成並匯入 ${questions.length} 題！`);
                        setLoading(false);
                        setActiveTab('paste');
                      }).catch(err => {
                        setError(err.message);
                        setLoading(false);
                      });
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
                  onClick={() => {
                    if (confirm("確定清除錯題記錄？")) {
                      clearMistakes();
                      onMistakesUpdate();
                      alert("錯題記錄已清除！");
                    }
                  }}
                  className="flex items-center gap-2 text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Trash2 size={16} /> 清除記錄
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(BankManager);
