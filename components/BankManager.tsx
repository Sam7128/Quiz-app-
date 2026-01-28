import React, { useState, useEffect } from 'react';
import { Question, BankMetadata } from '../types';
import { Upload, Download, Trash2, AlertCircle, Plus, FileJson, FileText, Check, FolderOpen, Loader2 } from 'lucide-react';
import { saveQuestions, clearMistakes, getBanksMeta, createBank, deleteBank } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
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
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
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
      const data = JSON.parse(jsonString);

      // Basic validation
      if (!Array.isArray(data)) throw new Error("資料必須是 JSON 陣列 (Array)");
      if (data.length > 0 && !data[0].question) throw new Error("格式無效：缺少 'question' 欄位");

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
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-center justify-center rounded-3xl">
              <div className="flex flex-col items-center gap-3">
                  <Loader2 className="text-brand-600 animate-spin" size={40} />
                  <p className="text-sm font-bold text-slate-500">正在處理雲端資料...</p>
              </div>
          </div>
      )}
      
      {/* Left Sidebar: Bank List */}
      <div className="md:col-span-4 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">我的題庫 ({banks.length})</h3>
          <button 
            onClick={() => setIsCreating(true)} 
            className="p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            title="新增題庫"
          >
            <Plus size={18} />
          </button>
        </div>

        {isCreating && (
          <div className="p-3 bg-brand-50 border-b border-brand-100 animate-in fade-in slide-in-from-top-2">
            <input 
              autoFocus
              type="text" 
              placeholder="輸入題庫名稱..." 
              className="w-full p-2 border border-brand-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
            <div className="text-center py-10 text-slate-400 text-sm">
              <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
              尚未建立題庫<br/>請點擊「+」新增
            </div>
          )}
          
          {banks.map(bank => (
            <div 
              key={bank.id}
              onClick={() => onBankChange(bank.id)}
              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                currentBankId === bank.id 
                  ? 'bg-brand-50 border-brand-200 shadow-sm ring-1 ring-brand-200' 
                  : 'hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className={`font-medium truncate ${currentBankId === bank.id ? 'text-brand-900' : 'text-slate-700'}`}>
                  {bank.name}
                </div>
                <div className="text-xs text-slate-400">
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
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl p-10">
             <p>請先在左側選擇一個題庫</p>
           </div>
        ) : (
          <>
            {/* Import Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex border-b border-slate-100">
                <button 
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'upload' ? 'bg-white text-brand-600 border-b-2 border-brand-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  <FileJson size={18} /> 上傳 JSON 檔案
                </button>
                <button 
                  onClick={() => setActiveTab('paste')}
                  className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'paste' ? 'bg-white text-brand-600 border-b-2 border-brand-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  <FileText size={18} /> 貼上文字 (Paste)
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'upload' ? (
                  <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                      <Upload size={24} />
                    </div>
                    <p className="text-slate-600 mb-4">點擊選擇或拖曳 JSON 檔案至此</p>
                    <label className="cursor-pointer bg-brand-600 hover:bg-brand-700 text-white py-2 px-6 rounded-lg transition-colors shadow-sm">
                      <span>選擇檔案</span>
                      <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <textarea 
                      value={jsonText}
                      onChange={(e) => setJsonText(e.target.value)}
                      placeholder='在此貼上 AI 生成的 JSON 代碼... [{"question": "...", ...}]'
                      className="w-full h-48 p-4 border border-slate-200 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
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

                {error && (
                  <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                <h4 className="font-bold text-slate-700 mb-2">匯出此題庫</h4>
                <p className="text-xs text-slate-400 mb-4">備份或分享目前選中的題庫</p>
                <button onClick={handleExport} className="flex items-center gap-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  <Download size={16} /> 下載 .JSON
                </button>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                <h4 className="font-bold text-slate-700 mb-2">清除錯題記錄</h4>
                <p className="text-xs text-slate-400 mb-4">只清除錯題狀態，保留題目</p>
                <button 
                  onClick={() => { 
                    if(confirm("確定清除錯題記錄？")) {
                      clearMistakes();
                      onMistakesUpdate();
                      alert("錯題記錄已清除！");
                    }
                  }} 
                  className="flex items-center gap-2 text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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