import React, { useState, useEffect } from 'react';
import { Question, MistakeLog, BankMetadata, Folder } from '../types';
import { MistakeDetail } from '../types/battleTypes';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { BookOpen, AlertTriangle, Zap, CheckSquare, Square, Layers, Share2, Folder as FolderIcon, FolderPlus, ArrowLeft, MoreVertical, Trash2, FolderInput, Calendar } from 'lucide-react';
import { getDueQuestions } from '../services/spacedRepetition';
import { StudyStatsCard } from './StudyStatsCard';
import { StreakCard } from './StreakCard';
import { AchievementsCard } from './AchievementsCard';
import { RecentMistakesCard } from './RecentMistakesCard';
import { FocusTimer } from './FocusTimer';
import { useConfirm } from '../hooks/useConfirm';
import { useRepository } from '../contexts/RepositoryContext';

interface DashboardProps {
  questions: Question[]; // Combined questions
  mistakeLog: MistakeLog;
  banks: BankMetadata[];
  folders: Folder[];
  selectedBankIds: string[];
  onToggleBank: (id: string) => void;
  onStartQuiz: (count: number) => void;
  onStartMistakes: () => void;
  onPracticeMistakes?: (mistakes: MistakeDetail[]) => void;
  onShareBank: (bank: BankMetadata) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveBank: (bankId: string, folderId: string | undefined) => void;
  onBatchDelete: () => void;
  onSelectAll?: (selected: boolean) => void;
  isAuthenticated?: boolean;
}

const DashboardBase: React.FC<DashboardProps> = ({
  questions,
  mistakeLog,
  banks,
  folders,
  selectedBankIds,
  onToggleBank,
  onStartQuiz,
  onStartMistakes,
  onShareBank,
  onCreateFolder,
  onDeleteFolder,
  onMoveBank,
  onBatchDelete,
  onSelectAll,
  onPracticeMistakes, // Add this
  isAuthenticated = false
}) => {
  const confirmDialog = useConfirm();
  const [quizSize, setQuizSize] = React.useState<number | 'all' | 'custom'>('all');
  const [customSize, setCustomSize] = React.useState<string>('10');
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [movingBankId, setMovingBankId] = useState<string | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const repository = useRepository();

  // Drag State
  const [draggedBankId, setDraggedBankId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverRoot, setDragOverRoot] = useState(false);

  // Load spaced repetition data on mount
  useEffect(() => {
    const loadDueCount = async () => {
      try {
        const data = await repository.getSpacedRepetition();
        const allItems = Array.isArray(data) ? data : Object.values(data);
        const dueItems = getDueQuestions(allItems);
        setDueCount(dueItems.length);
      } catch (error) {
        console.error('Error loading spaced repetition data:', error);
      }
    };

    void loadDueCount();
  }, [repository]);

  const totalQuestions = selectedBankIds.reduce((sum, id) => {
    const bank = banks.find(b => b.id === id);
    return sum + (bank?.questionCount || 0);
  }, 0);

  const relevantMistakes = Object.keys(mistakeLog).length;

  const masteryData = [
    { name: '已掌握', value: Math.max(0, totalQuestions - relevantMistakes) },
    { name: '需複習', value: relevantMistakes },
  ];
  const COLORS = ['#10b981', '#ef4444'];

  const handleStartQuiz = () => {
    let count = totalQuestions;
    if (quizSize === 'all') {
      count = totalQuestions;
    } else if (quizSize === 'custom') {
      const parsed = parseInt(customSize);
      count = Math.min(Math.max(1, isNaN(parsed) ? 10 : parsed), totalQuestions);
    } else {
      count = Math.min(quizSize, totalQuestions);
    }
    onStartQuiz(count);
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  // Drag and Drop Handlers (State-based for better compatibility)
  const onDragStart = (e: React.DragEvent, bankId: string) => {
    setDraggedBankId(bankId);
    e.dataTransfer.setData('text/plain', bankId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDropOnFolder = (e: React.DragEvent, folderId: string | undefined) => {
    e.preventDefault();
    setDragOverFolderId(null);
    setDragOverRoot(false);

    const bankId = draggedBankId || e.dataTransfer.getData('text/plain');
    if (bankId) {
      onMoveBank(bankId, folderId);
    }
    setDraggedBankId(null);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow drop
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const currentFolder = folders.find(f => f.id === currentFolderId);
  // Show banks based on current folder location, regardless of selection status
  const visibleBanks = banks.filter(b => {
    if (currentFolderId === undefined || currentFolderId === null) {
      // At root: show banks without folderId
      return b.folderId === undefined || b.folderId === null;
    }
    // In a folder: show banks with matching folderId
    return b.folderId === currentFolderId;
  });
  // Folders only visible at root
  const visibleFolders = currentFolderId ? [] : folders;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Hero */}
      {/* Welcome Hero */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 shadow-sm border border-white/20 dark:border-white/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300">歡迎回來，學習者！</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            已選擇 {selectedBankIds.length} 個題庫，共 <strong className="text-brand-600 dark:text-brand-400">{totalQuestions}</strong> 題。
          </p>
          {dueCount > 0 && (
            <div className="mt-4 flex items-center gap-2 text-amber-600 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-900/20 px-4 py-2 rounded-xl border border-amber-200/50 dark:border-amber-800/50 backdrop-blur-sm shadow-sm inline-flex">
              <Calendar size={16} />
              <span className="text-sm font-bold">
                有 {dueCount} 題需要複習
              </span>
            </div>
          )}
        </div>
        <div className="mt-6 md:mt-0 flex flex-wrap gap-4 items-center relative z-10">
          <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 ml-2 uppercase tracking-wider">題數</span>
            <select
              value={quizSize}
              onChange={(e) => setQuizSize(e.target.value === 'all' || e.target.value === 'custom' ? e.target.value : Number(e.target.value))}
              className="bg-transparent border-none text-slate-700 dark:text-slate-200 text-sm font-bold rounded-lg focus:ring-0 cursor-pointer pr-8 py-2 min-w-[80px]"
              title="選擇測驗題數"
            >
              <option value={10}>10 題</option>
              <option value={20}>20 題</option>
              <option value={30}>30 題</option>
              <option value={50}>50 題</option>
              <option value="all">全部</option>
              <option value="custom">自訂...</option>
            </select>
            {quizSize === 'custom' && (
              <input
                type="number"
                min="1"
                placeholder="數量"
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                className="w-20 bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            )}
          </div>
          <button
            onClick={handleStartQuiz}
            disabled={totalQuestions === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-brand-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Zap size={20} className="fill-current" />
            開始測驗
          </button>
          <button
            onClick={onStartMistakes}
            disabled={relevantMistakes === 0}
            className="flex items-center gap-2 bg-white/50 dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-white/10 hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50/50 dark:hover:bg-red-900/10 px-6 py-3.5 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
          >
            <AlertTriangle size={20} className="text-red-500" />
            錯題 ({relevantMistakes})
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-6">

        {/* Bank Selector */}
        <div className="md:col-span-8 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-white/20 dark:border-white/5 h-fit">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-slate-800 dark:text-white font-bold flex items-center gap-2 text-lg">
              <div className="p-2 bg-brand-50 dark:bg-white/10 rounded-lg text-brand-600 dark:text-brand-400">
                <Layers size={20} />
              </div>
              選擇練習題庫
            </h3>

            {/* Folder Navigation & Actions */}
            <div className="flex items-center gap-2">
              {!currentFolderId && (
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="p-1.5 text-slate-400 dark:text-slate-300 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="新增資料夾"
                >
                  <FolderPlus size={18} />
                </button>
              )}

              {selectedBankIds.length > 0 && (
                <button
                  onClick={onBatchDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold text-xs rounded-lg border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all shadow-sm"
                  title="剷除選中的題庫"
                >
                  <Trash2 size={14} /> 剷除選中 ({selectedBankIds.length})
                </button>
              )}

              <button
                onClick={() => onSelectAll?.(selectedBankIds.length < banks.length)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all shadow-sm"
              >
                {selectedBankIds.length === banks.length ? '取消全選' : '全選題庫'}
              </button>
            </div>
          </div>

          {/* Breadcrumbs */}
          {currentFolderId && (
            <div className="flex items-center gap-2 mb-4 text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 p-2 rounded-lg">
              <button
                onClick={() => setCurrentFolderId(undefined)}
                onDragOver={(e) => { onDragOver(e); setDragOverRoot(true); }}
                onDragLeave={() => setDragOverRoot(false)}
                onDrop={(e) => onDropOnFolder(e, undefined)}
                className={`hover:text-brand-600 flex items-center gap-1 p-1 rounded transition-colors ${dragOverRoot ? 'bg-brand-100 text-brand-600 ring-2 ring-brand-500' : ''}`}
              >
                <ArrowLeft size={14} /> 返回
              </button>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                <FolderIcon size={14} className="text-amber-400" fill="currentColor" />
                {currentFolder?.name}
              </span>
              <div className="ml-auto">
                <button
                  onClick={async () => {
                    if (await confirmDialog({ title: '刪除資料夾', message: `確定要刪除資料夾「${currentFolder?.name}」嗎？裡面的題庫將會移回主目錄。` })) {
                      onDeleteFolder(currentFolderId);
                      setCurrentFolderId(undefined);
                    }
                  }}
                  className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  title="刪除此資料夾"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )}

          {/* New Folder Input */}
          {isCreatingFolder && (
            <div className="mb-4 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <div className="bg-amber-50 p-2 rounded-lg text-amber-500"><FolderIcon size={20} fill="currentColor" /></div>
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                placeholder="輸入資料夾名稱..."
                className="flex-1 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 dark:text-slate-200"
              />
              <button onClick={handleCreateFolder} className="text-brand-600 font-bold text-sm px-3 hover:bg-brand-50 dark:hover:bg-slate-700 rounded-lg py-1.5">建立</button>
              <button onClick={() => setIsCreatingFolder(false)} className="text-slate-400 dark:text-slate-300 text-sm px-2 hover:text-slate-600 dark:hover:text-slate-200">取消</button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[28rem] overflow-y-auto pr-1">

            {/* Render Folders */}
            {visibleFolders.map(folder => (
              <div
                key={folder.id}
                onClick={() => setCurrentFolderId(folder.id)}
                onDragOver={(e) => { onDragOver(e); setDragOverFolderId(folder.id); }}
                onDragLeave={() => setDragOverFolderId(null)}
                onDrop={(e) => onDropOnFolder(e, folder.id)}
                className={`cursor-pointer p-3 rounded-xl border transition-all flex items-center gap-3 group relative ${dragOverFolderId === folder.id
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 ring-2 ring-brand-500 shadow-lg'
                  : 'border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-200 dark:hover:border-amber-800'
                  }`}
              >
                <FolderIcon className={`${dragOverFolderId === folder.id ? 'text-brand-500' : 'text-amber-400 group-hover:text-amber-500'} transition-colors`} size={24} fill="currentColor" />
                <div className={`flex-1 font-bold ${dragOverFolderId === folder.id ? 'text-brand-800 dark:text-brand-200' : 'text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-slate-100'}`}>{folder.name}</div>
                <div className="text-xs text-amber-300 font-bold px-2 py-0.5 bg-white dark:bg-slate-800 rounded-full">
                  {banks.filter(b => b.folderId === folder.id).length}
                </div>
              </div>
            ))}

            {/* Render Banks */}
            {visibleBanks.map(bank => {
              const isSelected = selectedBankIds.includes(bank.id);
              return (
                <div
                  key={bank.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, bank.id)}
                  className={`relative p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between group/card active:scale-[0.98] cursor-grab active:cursor-grabbing ${isSelected
                    ? 'bg-brand-50/80 dark:bg-brand-900/20 border-brand-200/60 dark:border-brand-500/30 shadow-sm'
                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-transparent hover:bg-white dark:hover:bg-slate-700/60 hover:shadow-md hover:shadow-black/5 hover:-translate-y-0.5'
                    }`}
                >
                  <div
                    className="flex items-center gap-3.5 flex-1 cursor-pointer"
                    onClick={() => onToggleBank(bank.id)}
                  >
                    {isSelected
                      ? <div className="text-brand-600 bg-white dark:bg-brand-500 rounded-md shadow-sm"><CheckSquare size={20} className={isSelected ? "text-brand-600 dark:text-white" : ""} /></div>
                      : <Square className="text-slate-300 dark:text-slate-600 group-hover/card:text-brand-400 shrink-0 transition-colors" size={20} />
                    }
                    <div className="min-w-0">
                      <div className={`font-bold text-sm truncate ${isSelected ? 'text-brand-900 dark:text-white' : 'text-slate-600 dark:text-slate-300 group-hover/card:text-slate-900 dark:group-hover/card:text-white transition-colors'}`}>
                        {bank.name}
                      </div>
                      <div className="text-xs font-medium text-slate-400 dark:text-slate-500 group-hover/card:text-brand-500/60">{bank.questionCount} 題</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-all duration-200 translate-x-2 group-hover/card:translate-x-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onShareBank(bank);
                      }}
                      className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-white/10 rounded-lg transition-all"
                      title="分享"
                    >
                      <Share2 size={16} />
                    </button>

                    {/* Move Menu (Custom) */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMovingBankId(movingBankId === bank.id ? null : bank.id);
                        }}
                        className={`p-2 rounded-lg transition-all ${movingBankId === bank.id ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/30' : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-white/10'}`}
                        title="移動至..."
                      >
                        <FolderInput size={16} />
                      </button>

                      {movingBankId === bank.id && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-4 py-3 bg-slate-50/80 dark:bg-slate-700/80 border-b border-slate-100 dark:border-slate-700 backdrop-blur-sm">移動至...</div>
                          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                await onMoveBank(bank.id, undefined);
                                setMovingBankId(null);
                              }}
                              className="w-full text-left px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-slate-700 hover:text-brand-600 rounded-xl flex items-center gap-2 transition-colors"
                            >
                              <Layers size={14} className="opacity-50" /> 主目錄
                            </button>
                            {folders.filter(f => f.id !== bank.folderId).map(f => (
                              <button
                                key={f.id}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await onMoveBank(bank.id, f.id);
                                  setMovingBankId(null);
                                }}
                                className="w-full text-left px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-slate-700 hover:text-brand-600 rounded-xl flex items-center gap-2 transition-colors"
                              >
                                <FolderIcon size={14} className="text-amber-400" fill="currentColor" /> {f.name}
                              </button>
                            ))}
                            {folders.filter(f => f.id !== bank.folderId).length === 0 && (
                              <div className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">沒有其他資料夾</div>
                            )}
                          </div>
                        </div>
                      )}
                      {movingBankId === bank.id && (
                        <div className="fixed inset-0 z-[55] cursor-default" onClick={(e) => { e.stopPropagation(); setMovingBankId(null); }}></div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {visibleBanks.length === 0 && visibleFolders.length === 0 && (
              <div className="col-span-2 text-center py-8 text-slate-400 dark:text-slate-500 text-sm flex flex-col items-center gap-2 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-xl">
                <Layers size={24} className="text-slate-300 dark:text-slate-500" />
                <p>此處暫無內容</p>
                {currentFolderId && <p className="text-xs">請從主目錄將題庫移動至此</p>}
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-4 space-y-6">
          <StreakCard isAuthenticated={isAuthenticated} />
          <StudyStatsCard isAuthenticated={isAuthenticated} />
          <RecentMistakesCard onPracticeSession={onPracticeMistakes} />
          <AchievementsCard isAuthenticated={isAuthenticated} />
          <FocusTimer />
        </div>
      </div>
    </div>
  );
};

export const Dashboard = React.memo(DashboardBase);
export default Dashboard;
