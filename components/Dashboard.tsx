import React from 'react';
import { Question, MistakeLog, BankMetadata } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { BookOpen, AlertTriangle, Zap, CheckSquare, Square, Layers } from 'lucide-react';

interface DashboardProps {
  questions: Question[]; // Combined questions
  mistakeLog: MistakeLog;
  banks: BankMetadata[];
  selectedBankIds: string[];
  onToggleBank: (id: string) => void;
  onStartQuiz: (count: number) => void;
  onStartMistakes: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  questions, 
  mistakeLog, 
  banks,
  selectedBankIds,
  onToggleBank,
  onStartQuiz, 
  onStartMistakes 
}) => {
  const [quizSize, setQuizSize] = React.useState<number | 'all' | 'custom'>(20);
  const [customSize, setCustomSize] = React.useState<string>('10');
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
          <h3 className="text-slate-700 font-bold mb-4 flex items-center gap-2">
            <Layers size={20} className="text-brand-500"/> 
            選擇練習題庫
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
            {banks.map(bank => {
              const isSelected = selectedBankIds.includes(bank.id);
              return (
                <div 
                  key={bank.id}
                  onClick={() => onToggleBank(bank.id)}
                  className={`cursor-pointer p-3 rounded-xl border transition-all flex items-center justify-between group ${
                    isSelected 
                      ? 'bg-brand-50 border-brand-200 shadow-sm' 
                      : 'bg-slate-50 border-transparent hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isSelected 
                      ? <CheckSquare className="text-brand-600" size={20} />
                      : <Square className="text-slate-300 group-hover:text-slate-400" size={20} />
                    }
                    <div>
                      <div className={`font-medium text-sm ${isSelected ? 'text-brand-900' : 'text-slate-600'}`}>
                        {bank.name}
                      </div>
                      <div className="text-xs text-slate-400">{bank.questionCount} 題</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {banks.length === 0 && (
              <div className="col-span-2 text-center py-4 text-slate-400 text-sm">
                暫無題庫，請至「題庫管理」新增。
              </div>
            )}
          </div>
        </div>

        {/* Stat Card: Mastery */}
        <div className="md:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-slate-500 font-medium mb-4 flex items-center gap-2">
            <BookOpen size={18} /> 當前掌握度
          </h3>
          <div className="h-40 relative" style={{ minHeight: '160px' }}>
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={masteryData}
                   innerRadius={40}
                   outerRadius={60}
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