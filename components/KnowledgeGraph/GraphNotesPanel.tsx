import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Heading1, Heading2, Bold, Italic, Underline as UnderlineIcon,
  Strikethrough, List, ListOrdered, RemoveFormatting, X,
} from 'lucide-react';
import { GRAPH_LIMITS } from '@/types/graphTypes';

// 節點改名處理：將筆記的 key 從舊 title 轉移為新 title
export function renameNoteKey(
  notes: Record<string, string>,
  oldTitle: string,
  newTitle: string
): Record<string, string> {
  if (!oldTitle || !newTitle || oldTitle === newTitle) return notes;
  const updated = { ...notes };
  if (updated[oldTitle] !== undefined) {
    updated[newTitle] = updated[oldTitle];
    delete updated[oldTitle];
  }
  return updated;
}

interface MenuBarProps {
  editor: ReturnType<typeof useEditor>;
}

const MenuBar: React.FC<MenuBarProps> = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap gap-1 p-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 rounded-t-lg">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 ${
          editor.isActive('heading', { level: 1 }) ? 'bg-slate-200 dark:bg-slate-700 font-bold' : ''
        }`}
        title="標題一 (H1)"
      >
        <Heading1 size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 ${
          editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 dark:bg-slate-700 font-bold' : ''
        }`}
        title="標題二 (H2)"
      >
        <Heading2 size={16} />
      </button>
      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 align-middle self-center" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 ${
          editor.isActive('bold') ? 'bg-slate-200 dark:bg-slate-700 font-bold' : ''
        }`}
        title="粗體 (Bold)"
      >
        <Bold size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 ${
          editor.isActive('italic') ? 'bg-slate-200 dark:bg-slate-700' : ''
        }`}
        title="斜體 (Italic)"
      >
        <Italic size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 ${
          editor.isActive('underline') ? 'bg-slate-200 dark:bg-slate-700' : ''
        }`}
        title="底線 (Underline)"
      >
        <UnderlineIcon size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 ${
          editor.isActive('strike') ? 'bg-slate-200 dark:bg-slate-700' : ''
        }`}
        title="刪除線 (Strike)"
      >
        <Strikethrough size={16} />
      </button>
      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 align-middle self-center" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 ${
          editor.isActive('orderedList') ? 'bg-slate-200 dark:bg-slate-700' : ''
        }`}
        title="有序列表"
      >
        <ListOrdered size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 ${
          editor.isActive('bulletList') ? 'bg-slate-200 dark:bg-slate-700' : ''
        }`}
        title="無序列表"
      >
        <List size={16} />
      </button>
      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 align-middle self-center" />
      <button
        type="button"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
        title="清除格式"
      >
        <RemoveFormatting size={16} />
      </button>
    </div>
  );
};

interface GraphNotesPanelProps {
  nodeTitle: string;
  notes: Record<string, string>;
  onChangeNotes: (notes: Record<string, string>) => void;
  onClose?: () => void;
}

export const GraphNotesPanel: React.FC<GraphNotesPanelProps> = ({
  nodeTitle,
  notes,
  onChangeNotes,
  onClose,
}) => {
  const activeTitleRef = useRef(nodeTitle);
  const latestContentRef = useRef('');
  const isDirtyRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notesRef = useRef(notes);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  const onChangeNotesRef = useRef(onChangeNotes);
  useEffect(() => {
    onChangeNotesRef.current = onChangeNotes;
  }, [onChangeNotes]);

  const flush = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (!isDirtyRef.current) return;

    const titleToSave = activeTitleRef.current;
    let contentToSave = latestContentRef.current;

    // 限制最大字元數 (防禦式)
    if (contentToSave.length > GRAPH_LIMITS.NOTES_MAX) {
      contentToSave = contentToSave.slice(0, GRAPH_LIMITS.NOTES_MAX);
    }

    const updatedNotes = {
      ...notesRef.current,
      [titleToSave]: contentToSave,
    };

    onChangeNotesRef.current(updatedNotes);
    isDirtyRef.current = false;
  };

  const onUpdate = ({ editor: activeEditor }: { editor: NonNullable<ReturnType<typeof useEditor>> }) => {
    const html = activeEditor.getHTML();
    latestContentRef.current = html;
    isDirtyRef.current = true;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      flush();
    }, 500);
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: '開始撰寫富文本筆記...',
      }),
    ],
    content: notes[nodeTitle] || '',
    onUpdate,
    editorProps: {
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
              return true; // 阻斷 Base64 或其他格式圖片貼入
            }
          }
        }
        return false;
      },
      transformPastedHTML(html) {
        // 攔截並清除 Base64 格式圖片
        return html.replace(/<img[^>]*src=["']data:image\/[^"']*base64[^"']*["'][^>]*>/gi, '');
      },
    },
  });

  // 當 nodeTitle 改變時，先同步舊筆記，再載入新筆記
  useEffect(() => {
    if (nodeTitle !== activeTitleRef.current) {
      flush();
      activeTitleRef.current = nodeTitle;
      const newContent = notesRef.current[nodeTitle] || '';
      latestContentRef.current = newContent;
      isDirtyRef.current = false;
      if (editor) {
        editor.commands.setContent(newContent);
      }
    }
  }, [nodeTitle, editor]);

  // 同步外部的 notes 變更 (如復原/重做)，但要避免在 editor focus 時影響使用者輸入
  useEffect(() => {
    if (editor && !editor.isFocused) {
      const currentVal = notes[nodeTitle] || '';
      if (editor.getHTML() !== currentVal) {
        editor.commands.setContent(currentVal);
        latestContentRef.current = currentVal;
        isDirtyRef.current = false;
      }
    }
  }, [notes, nodeTitle, editor]);

  // Unmount 時強制同步
  useEffect(() => {
    return () => {
      flush();
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-80 md:w-96 flex-shrink-0 z-10">
      <style>{`
        .ProseMirror {
          outline: none;
          min-height: 200px;
          padding: 1rem;
        }
        .ProseMirror p { margin-bottom: 0.5rem; }
        .ProseMirror h1 { font-size: 1.5rem; font-weight: bold; margin-top: 1rem; margin-bottom: 0.5rem; }
        .ProseMirror h2 { font-size: 1.25rem; font-weight: bold; margin-top: 0.75rem; margin-bottom: 0.5rem; }
        .ProseMirror ul { list-style-type: disc; padding-left: 1.25rem; margin-bottom: 0.5rem; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.25rem; margin-bottom: 0.5rem; }
        .ProseMirror:focus { outline: none; }
        .tiptap p.is-editor-empty:first-child::before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>

      {/* Panel Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800">
        <div className="min-w-0 flex-1 mr-2">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
            節點筆記
          </span>
          <h3 className="font-bold text-sm text-slate-800 dark:text-white truncate">
            {nodeTitle || '未命名節點'}
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-500 dark:text-slate-400"
            aria-label="關閉筆記面板"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* TipTap MenuBar */}
      {editor && <MenuBar editor={editor} />}

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto ProseMirror-container">
        <EditorContent editor={editor} className="h-full prose dark:prose-invert max-w-none text-sm" />
      </div>
    </div>
  );
};
