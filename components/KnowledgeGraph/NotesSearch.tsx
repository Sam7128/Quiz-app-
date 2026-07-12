import React, { useState, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Search, Trash2, Link2, X, AlertCircle } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface NotesSearchProps {
  nodes: any[];
  notes: Record<string, string>;
  onChangeNotes: (notes: Record<string, string>) => void;
  onSelectNode: (nodeId: string) => void;
  selectedNodeId: string | null;
  onClose?: () => void;
}

// 移除 HTML 標籤的 Helper
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

export const NotesSearch: React.FC<NotesSearchProps> = ({
  nodes,
  notes,
  onChangeNotes,
  onSelectNode,
  selectedNodeId,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { fitView, setNodes } = useReactFlow();
  const toast = useToast();

  // 現存節點標題集合
  const nodeTitlesMap = useMemo(() => {
    const map = new Map<string, string>(); // title -> nodeId
    nodes.forEach((n) => {
      const title = (n.data.title || (n.data as any).label || '').trim();
      if (title) {
        map.set(title, n.id);
      }
    });
    return map;
  }, [nodes]);

  // 1. 搜尋匹配項目
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();

    return Object.entries(notes)
      .map(([title, content]) => {
        const plainText = stripHtml(content);
        const titleMatch = title.toLowerCase().includes(query);
        const contentMatch = plainText.toLowerCase().includes(query);
        return {
          title,
          plainText,
          isMatch: titleMatch || contentMatch,
          nodeId: nodeTitlesMap.get(title) || null,
        };
      })
      .filter((item) => item.isMatch);
  }, [notes, searchQuery, nodeTitlesMap]);

  // 2. 找出未歸檔（孤立）筆記
  const orphanNotes = useMemo(() => {
    return Object.entries(notes)
      .map(([title, content]) => ({
        title,
        content,
        plainText: stripHtml(content),
      }))
      .filter((item) => !nodeTitlesMap.has(item.title) && item.title.trim() !== '');
  }, [notes, nodeTitlesMap]);

  // 點擊搜尋結果：聚焦並選中節點，開啟編輯面板
  const handleResultClick = (title: string, nodeId: string | null) => {
    if (!nodeId) {
      toast.warning('該筆記屬於孤立節點，無法在畫布中定位');
      return;
    }

    // 選中該節點，取消其他選中
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === nodeId,
      }))
    );

    // 聚焦定位
    setTimeout(() => {
      fitView({ nodes: [{ id: nodeId }], duration: 800, maxZoom: 1.5 });
    }, 50);

    onSelectNode(nodeId);
  };

  // 刪除孤立筆記
  const handleDeleteOrphan = (title: string) => {
    const updated = { ...notes };
    delete updated[title];
    onChangeNotes(updated);
    toast.success('已刪除孤立筆記');
  };

  // 重新連結孤立筆記至當前選中節點
  const handleReconnectOrphan = (oldTitle: string) => {
    if (!selectedNodeId) {
      toast.warning('請先在畫布上點選一個節點，再進行重新連結');
      return;
    }

    const selectedNode = nodes.find((n) => n.id === selectedNodeId);
    if (!selectedNode) return;

    const newTitle = (selectedNode.data.title || (selectedNode.data as any).label || '').trim();
    if (!newTitle) {
      toast.warning('選中節點無標題，請先命名該節點');
      return;
    }

    const updated = { ...notes };
    const content = updated[oldTitle] || '';

    // 如果新節點已經有筆記，我們將它們合併，避免蓋掉
    if (updated[newTitle]) {
      updated[newTitle] = updated[newTitle] + '<hr />' + content;
    } else {
      updated[newTitle] = content;
    }

    delete updated[oldTitle];
    onChangeNotes(updated);
    toast.success(`已將筆記連結至節點「${newTitle}」`);
  };

  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  const selectedNodeTitle = selectedNode
    ? (selectedNode.data.title || (selectedNode.data as any).label || '未命名節點').trim()
    : null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-80 md:w-96 flex-shrink-0 z-10 select-none">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-white">筆記搜尋與管理</h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">跨節點筆記搜尋與未歸檔整理</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-500 dark:text-slate-400"
            aria-label="關閉搜尋面板"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋節點標題或筆記內容..."
            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs rounded-lg outline-none text-slate-800 dark:text-slate-200 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Search Results */}
        {searchQuery.trim() !== '' && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              搜尋結果 ({searchResults.length})
            </h4>
            {searchResults.length === 0 ? (
              <p className="text-xs text-slate-400 italic">無匹配的筆記內容</p>
            ) : (
              <div className="space-y-1">
                {searchResults.map((item) => (
                  <button
                    key={item.title}
                    onClick={() => handleResultClick(item.title, item.nodeId)}
                    className="w-full text-left p-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors space-y-1 block"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate flex-1">
                        {item.title}
                      </span>
                      {item.nodeId ? (
                        <span className="text-[9px] bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400 px-1.5 py-0.5 rounded">
                          可定位
                        </span>
                      ) : (
                        <span className="text-[9px] bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 px-1.5 py-0.5 rounded">
                          孤立
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 break-all leading-normal">
                      {item.plainText || '(無內容)'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Orphan Notes Management */}
        {searchQuery.trim() === '' && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              孤立筆記 ({orphanNotes.length})
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
              這些筆記的節點標題已變更或已被刪除，但筆記仍保留著。你可以選擇刪除或重新連結至當前所選的節點。
            </p>

            {orphanNotes.length === 0 ? (
              <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-slate-400 dark:text-slate-500 text-xs italic">
                <AlertCircle size={14} />
                <span>目前無孤立筆記，狀態良好！</span>
              </div>
            ) : (
              <div className="space-y-2">
                {orphanNotes.map((item) => (
                  <div
                    key={item.title}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2"
                  >
                    <div className="flex items-start justify-between min-w-0">
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate mr-2 block">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 break-all leading-normal">
                      {item.plainText || '(無內容)'}
                    </p>
                    <div className="flex items-center gap-1.5 justify-end pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleDeleteOrphan(item.title)}
                        className="flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded text-[10px] transition-colors"
                        title="永久刪除此筆記"
                      >
                        <Trash2 size={12} /> 刪除
                      </button>
                      <button
                        onClick={() => handleReconnectOrphan(item.title)}
                        disabled={!selectedNodeId}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${
                          selectedNodeId
                            ? 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                            : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                        }`}
                        title={
                          selectedNodeTitle
                            ? `重新連結至「${selectedNodeTitle}」`
                            : '請先在畫布上選取節點'
                        }
                      >
                        <Link2 size={12} /> 重新連結
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer / Selected Node status */}
      {selectedNodeId && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-[10px]">
          <span className="text-slate-400 block uppercase font-bold tracking-wide">目前選中的節點</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block mt-0.5">
            {selectedNodeTitle}
          </span>
        </div>
      )}
    </div>
  );
};
