import React, { useState, useEffect, useRef, memo } from 'react';
import { useReactFlow, type NodeProps } from '@xyflow/react';
import { GRAPH_LIMITS } from '@/types/graphTypes';

const StickyNoteNode: React.FC<NodeProps> = memo(({ id, data, selected }) => {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState((data.label || data.title || '') as string);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync internal state when external data changes
  useEffect(() => {
    setText((data.label || data.title || '') as string);
  }, [data.label, data.title]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const trimmed = text.slice(0, GRAPH_LIMITS.STICKY_TEXT_MAX);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                label: trimmed,
                title: trimmed,
              },
            }
          : n
      )
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      // Reset text
      setText((data.label || data.title || '') as string);
    }
  };

  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={`p-4 rounded-lg border-2 shadow-sm w-48 min-h-32 transition-shadow flex items-center justify-center text-center cursor-text select-text ${
        selected ? 'ring-2 ring-blue-400 shadow-lg' : ''
      }`}
      style={{
        backgroundColor: '#FEF3C7',
        borderColor: '#F59E0B',
      }}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, GRAPH_LIMITS.STICKY_TEXT_MAX))}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full h-full bg-transparent resize-none outline-none border-none text-xs text-amber-900 font-sans leading-relaxed text-center"
          placeholder="輸入文字..."
          maxLength={GRAPH_LIMITS.STICKY_TEXT_MAX}
        />
      ) : (
        <div className="text-xs text-amber-900 font-sans break-words whitespace-pre-wrap select-text leading-relaxed w-full">
          {text || <span className="text-amber-600/60 italic">雙擊編輯便利貼...</span>}
        </div>
      )}
    </div>
  );
});

StickyNoteNode.displayName = 'StickyNoteNode';

export default StickyNoteNode;
