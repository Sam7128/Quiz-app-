import React, { useState } from 'react';
import { Question, MistakeLog, BankMetadata, Folder } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { BookOpen, AlertTriangle, Zap, CheckSquare, Square, Layers, Share2, Folder as FolderIcon, FolderPlus, ArrowLeft, MoreVertical, Trash2, FolderInput } from 'lucide-react';

interface DashboardProps {
  questions: Question[]; // Combined questions
  mistakeLog: MistakeLog;
  banks: BankMetadata[];
  folders: Folder[];
  selectedBankIds: string[];
  onToggleBank: (id: string) => void;
  onStartQuiz: (count: number) => void;
  onStartMistakes: () => void;
  onShareBank: (bank: BankMetadata) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveBank: (bankId: string, folderId: string | undefined) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
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
  onMoveBank
}) => {
  const [quizSize, setQuizSize] = React.useState<number | 'all' | 'custom'>(20);
  const [customSize, setCustomSize] = React.useState<string>('10');
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [movingBankId, setMovingBankId] = useState<string | null>(null);
  
  // Drag State
  const [draggedBankId, setDraggedBankId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverRoot, setDragOverRoot] = useState(false);

  const totalQuestions = questions.length;
  
  const currentPoolIds = new Set(questions.map(q => String(q.id)));
  const relevantMistakes = Object.keys(mistakeLog).filter(id => currentPoolIds.has(id)).length;

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
  const visibleBanks = banks.filter(b => b.folderId === currentFolderId);
  // Folders only visible at root
  const visibleFolders = currentFolderId ? [] : folders;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Hero */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">歡迎回來，學習者！</h1>
          <p className="text-slate-500 mt-2">
            已選擇 {selectedBankIds.length} 個題庫，共 <strong>{totalQuestions}</strong> 題。
          </p>
        </div>
        <div className="mt-6 md:mt-0 flex flex-wrap gap-4 items-center">
           <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
             <span className="text-xs font-bold text-slate-400 ml-2 uppercase tracking-wider">題數</span>
             <select 
               value={quizSize} 
               onChange={(e) => setQuizSize(e.target.value === 'all' || e.target.value === 'custom' ? e.target.value : Number(e.target.value))}
               className="bg-white border-none text-slate-700 text-sm font-semibold rounded-lg focus:ring-0 cursor-pointer pr-2 py-1.5"
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
                 placeholder="輸入數量"
                 value={customSize}
                 onChange={(e) => setCustomSize(e.target.value)}
                 className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
               />
             )}
           </div>
           <button 
             onClick={handleStartQuiz}
             disabled={totalQuestions === 0}
             className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-brand-200 transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <Zap size={20} />
             開始測驗
           </button>
           <button 
             onClick={onStartMistakes}
             disabled={relevantMistakes === 0}
             className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:border-red-300 hover:bg-red-50 px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <AlertTriangle size={20} className="text-red-500" />
             錯題複習 ({relevantMistakes})
           </button>
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        
        {/* Bank Selector */}
        <div className="md:col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-700 font-bold flex items-center gap-2">
              <Layers size={20} className="text-brand-500"/> 
              選擇練習題庫
            </h3>
            
            {/* Folder Navigation & Actions */}
            <div className="flex items-center gap-2">
               {!currentFolderId && (
                 <button 
                    onClick={() => setIsCreatingFolder(true)}
                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                    title="新增資料夾"
                 >
                    <FolderPlus size={18} />
                 </button>
               )}
            </div>
          </div>

          {/* Breadcrumbs */}
          {currentFolderId && (
             <div className="flex items-center gap-2 mb-4 text-sm font-medium text-slate-500 bg-slate-50 p-2 rounded-lg">
                <button 
                  onClick={() => setCurrentFolderId(undefined)} 
                  onDragOver={(e) => { onDragOver(e); setDragOverRoot(true); }}
                  onDragLeave={() => setDragOverRoot(false)}
                  onDrop={(e) => onDropOnFolder(e, undefined)}
                  className={`hover:text-brand-600 flex items-center gap-1 p-1 rounded transition-colors ${dragOverRoot ? 'bg-brand-100 text-brand-600 ring-2 ring-brand-500' : ''}`}
                >
                   <ArrowLeft size={14} /> 返回
                </button>
                <span className="text-slate-300">/</span>
                <span className="flex items-center gap-1 text-slate-800">
                   <FolderIcon size={14} className="text-amber-400" fill="currentColor" />
                   {currentFolder?.name}
                </span>
                <div className="ml-auto">
                   <button 
                     onClick={() => {
                        if(window.confirm(`確定要刪除資料夾「${currentFolder?.name}」嗎？裡面的題庫將會移回主目錄。`)) {
                           onDeleteFolder(currentFolderId);
                           setCurrentFolderId(undefined);
                        }
                     }}
                     className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
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
                 className="flex-1 bg-slate-50 border-slate-200 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500"
               />
               <button onClick={handleCreateFolder} className="text-brand-600 font-bold text-sm px-3 hover:bg-brand-50 rounded-lg py-1.5">建立</button>
               <button onClick={() => setIsCreatingFolder(false)} className="text-slate-400 text-sm px-2 hover:text-slate-600">取消</button>
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
                className={`cursor-pointer p-3 rounded-xl border transition-all flex items-center gap-3 group relative ${
                  dragOverFolderId === folder.id
                    ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500 shadow-lg'
                    : 'border-amber-100 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-200'
                }`}
              >
                <FolderIcon className={`${dragOverFolderId === folder.id ? 'text-brand-500' : 'text-amber-400 group-hover:text-amber-500'} transition-colors`} size={24} fill="currentColor" />
                <div className={`flex-1 font-bold ${dragOverFolderId === folder.id ? 'text-brand-800' : 'text-slate-700 group-hover:text-slate-900'}`}>{folder.name}</div>
                <div className="text-xs text-amber-300 font-bold px-2 py-0.5 bg-white rounded-full">
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
                  className={`relative p-3 rounded-xl border transition-all flex items-center justify-between group/card active:scale-95 active:rotate-1 cursor-grab active:cursor-grabbing ${
                    isSelected 
                      ? 'bg-brand-50 border-brand-200 shadow-sm' 
                      : 'bg-slate-50 border-transparent hover:bg-slate-100'
                  }`}
                >
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => onToggleBank(bank.id)}
                  >
                    {isSelected 
                      ? <CheckSquare className="text-brand-600 shrink-0" size={20} />
                      : <Square className="text-slate-300 group-hover/card:text-slate-400 shrink-0" size={20} />
                    }
                    <div className="min-w-0">
                      <div className={`font-medium text-sm truncate ${isSelected ? 'text-brand-900' : 'text-slate-600'}`}>
                        {bank.name}
                      </div>
                      <div className="text-xs text-slate-400">{bank.questionCount} 題</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onShareBank(bank);
                        }}
                        className="p-1.5 text-slate-300 hover:text-brand-500 hover:bg-white rounded-lg transition-all"
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
                           className={`p-1.5 rounded-lg transition-all ${movingBankId === bank.id ? 'text-brand-600 bg-brand-50' : 'text-slate-300 hover:text-slate-600 hover:bg-white'}`}
                           title="移動至..."
                        >
                            <FolderInput size={16} />
                        </button>
                        
                        {movingBankId === bank.id && (
                             <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                <div className="text-[10px] font-bold text-slate-400 px-3 py-2 bg-slate-50 border-b border-slate-100">移動至...</div>
                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                    <button 
                                      onClick={(e) => { 
                                        e.stopPropagation();
                                        onMoveBank(bank.id, undefined); 
                                        setMovingBankId(null); 
                                      }}
                                      className="w-full text-left px-3 py-2.5 text-sm text-slate-600 hover:bg-brand-50 hover:text-brand-600 flex items-center gap-2 transition-colors border-b border-slate-50 last:border-0"
                                    >
                                        <Layers size={14} className="opacity-50" /> 主目錄
                                    </button>
                                    {folders.filter(f => f.id !== bank.folderId).map(f => (
                                       <button 
                                         key={f.id}
                                         onClick={(e) => { 
                                            e.stopPropagation();
                                            onMoveBank(bank.id, f.id); 
                                            setMovingBankId(null); 
                                         }}
                                         className="w-full text-left px-3 py-2.5 text-sm text-slate-600 hover:bg-brand-50 hover:text-brand-600 flex items-center gap-2 transition-colors border-b border-slate-50 last:border-0"
                                       >
                                           <FolderIcon size={14} className="text-amber-400" fill="currentColor" /> {f.name}
                                       </button>
                                    ))}
                                    {folders.filter(f => f.id !== bank.folderId).length === 0 && (
                                        <div className="text-xs text-slate-400 text-center py-2">沒有其他資料夾</div>
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
              <div className="col-span-2 text-center py-8 text-slate-400 text-sm flex flex-col items-center gap-2 border-2 border-dashed border-slate-100 rounded-xl">
                 <Layers size={24} className="text-slate-300" />
                 <p>此處暫無內容</p>
                 {currentFolderId && <p className="text-xs">請從主目錄將題庫移動至此</p>}
              </div>
            )}
          </div>
        </div>

        {/* Stat Card: Mastery */}
        <div className="md:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-slate-500 font-medium mb-4 flex items-center gap-2">
            <BookOpen size={18} /> 當前掌握度
          </h3>
          <div className="flex justify-center items-center" style={{ height: 200, width: '100%', position: 'relative' }}>
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={masteryData}
                   innerRadius={60}
                   outerRadius={80}
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {masteryData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip />
               </PieChart>
             </ResponsiveContainer>
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-slate-700">
                  {totalQuestions > 0 ? Math.round(((totalQuestions - relevantMistakes) / totalQuestions) * 100) : 0}%
                </span>
             </div>
          </div>
          <div className="flex justify-center gap-4 text-xs text-slate-400 mt-2">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> 已掌握</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> 需複習</span>
          </div>
        </div>
      </div>
    </div>
  );
};