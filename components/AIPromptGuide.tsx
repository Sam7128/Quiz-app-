import React, { useState } from 'react';
import { Copy, Check, Settings2, Globe, FileText, CheckCircle2, Sparkles, BrainCircuit, GitFork } from 'lucide-react';

const AIPromptGuideComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'quiz' | 'graph'>('quiz');
  const [copied, setCopied] = useState(false);

  // Quiz Prompt Configuration State
  const [config, setConfig] = useState({
    type: 'mixed', // mixed, single, multiple
    langExplanation: 'zh-TW', // zh-TW, en
    langOutput: 'zh-TW', // zh-TW, en
    count: 10 // default count
  });

  // Graph Prompt Configuration State
  const [configGraph, setConfigGraph] = useState({
    mode: 'generate', // generate, convert
    direction: 'TD', // TD, LR
    lang: 'zh-TW' // zh-TW, en
  });

  const getPromptText = () => {
    const typeInstruction = config.type === 'single'
      ? '請只生成「單選題」。'
      : config.type === 'multiple'
        ? '請只生成「多選題」。'
        : '請包含「單選題」與「多選題」。如果是多選題，請在題目或 type 欄位中標註。';

    const explainerLang = config.langExplanation === 'zh-TW' ? '繁體中文' : 'English';
    const outputLang = config.langOutput === 'zh-TW' ? '繁體中文' : 'English';

    return `請扮演專業的教學專家。根據我提供的內容，生成 ${config.count} 題選擇題。
⚠️ 內容規範：
 * 題目 (question): 應著重於理解與應用。
 * 類型: ${typeInstruction}
 * 提示 (hint): 禁止直接說出答案。提示應提供相關的定義、概念關鍵詞或邏輯線索，引引導我思考。
 * 詳解 (explanation): 請使用 ${explainerLang} 解釋正確選項的原理，並簡述為什麼其他干擾項是錯的。
⚠️ 格式要求：
請輸出純 JSON Array，結構如下：
[
  {
    "id": "uuid",
    "question": "單選題範例...",
    "type": "single",
    "options": ["A", "B", "C", "D"],
    "answer": "正確選項文字 (字串)",
    "hint": "提示...",
    "explanation": "詳解..."
  },
  {
    "id": "uuid",
    "question": "多選題範例 (請選出所有正確答案)...",
    "type": "multiple",
    "options": ["A", "B", "C", "D", "E"],
    "answer": ["正確選項1", "正確選項2"], 
    "hint": "提示...",
    "explanation": "詳解..."
  }
]

* 注意：多選題的 answer 欄位必須是字串陣列 (Array of Strings)。
輸出語言：${outputLang}${outputLang === '繁體中文' ? ' (搭配專業學術語)' : ''}。`;
  };

  const getGraphPromptText = () => {
    const dirLabel = configGraph.direction === 'LR' ? '由左至右 (LR)' : '由上而下 (TD)';
    const langLabel = configGraph.lang === 'zh-TW' ? '繁體中文' : 'English';

    if (configGraph.mode === 'convert') {
      return `請扮演資料結構與 Mermaid.js 專家。我有一段 Mermaid \`mindmap\` 格式的代碼，但我們的系統只支援標準的 flowchart 格式 (\`graph TD\` 或 \`graph LR\`)。
請幫我將這段 \`mindmap\` 代碼完全轉換為標準 flowchart 格式。

⚠️ 轉換與語法規則：
1. 必須以 \`graph ${configGraph.direction}\` 作為標頭。
2. 將心智圖的樹狀層級結構轉換為一對多的父子節點連線。例如：
   - 根節點連接到第一層節點。
   - 第一層節點分別連接到第二層子節點。
3. 語法要求：
   * 節點定義：必須使用「英文或數字的唯一 ID」搭配「括號包覆標題」，例如：\`root((中央核心主題))\`、\`node1[子主題A]\`、\`node2[子主題B]\`。
   * 連線：必須使用標準的單向箭頭連線，例如：\`root --> node1\`、\`node1 --> node1_1\`。
   * ID 命名：所有節點 ID 必須是英文或數字（如 A, B, node1, node2 等），不可包含特殊字元，不可直接使用中文作為 ID（中文應放在括號或方括號中，例如：A[中文名稱]）。
4. 嚴禁保留 \`mindmap\` 關鍵字、樹狀縮排、引號單獨成行等 mindmap 特有語法。所有節點必須有明確的 ID，並用 \`-->\` 進行連接。
5. 嚴禁使用 \`subgraph\`、\`style\`、\`classDef\`、\`click\` 等系統不支援的進階語法。

待轉換的 mindmap 代碼如下：
[在此貼上您的 mindmap 代碼]`;
    }

    return `請扮演專業的知識整理專家。請將我提供的主題或文章內容，整理並轉換為 Mermaid.js 的標準流程圖 (flowchart) 代碼，以供我們的系統匯入生成知識圖。

⚠️ 語法與輸出規範：
1. 必須以 \`graph ${configGraph.direction}\` 作為標頭。
2. 僅支援標準節點定義與連線，例如：
   * 概念節點：A[概念名稱] 或 A(概念名稱)
   * 決策節點：A{決策名稱}
   * 標準連線：A --> B 或 A --- B 或 A -->|關聯描述| B
   * 雙向連線：A <--> B
3. ID 命名：所有節點 ID 必須是英文或數字（如 A, B, node1, node2 等），不可包含特殊字元，不可直接使用中文作為 ID（中文應放在括號或方括號中，例如：A[中文名稱]）。
4. 嚴禁使用 \`mindmap\`、\`subgraph\`、\`style\`、\`classDef\`、\`click\` 等非標準或系統不支援的語法。
5. 節點名稱應精簡扼要，避免過長。

輸出格式：
請僅輸出以 Markdown 代碼塊包覆的 Mermaid 語法，例如：
\`\`\`mermaid
graph ${configGraph.direction}
  A[定義] --> B[核心框架]
  B --> C{是否有效}
\`\`\`

輸出語言：${langLabel}${langLabel === '繁體中文' ? ' (搭配專業學術語)' : ''}。

請根據以下內容生成：
[在此貼上您的學習筆記、文章或主題]`;
  };

  const PROMPT_TEXT = activeTab === 'quiz' ? getPromptText() : getGraphPromptText();

  const handleCopy = () => {
    navigator.clipboard.writeText(PROMPT_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-indigo-600/90 to-purple-600/90 backdrop-blur-xl rounded-3xl p-8 md:p-12 text-white shadow-2xl shadow-indigo-500/20 mb-8 relative overflow-hidden group border border-white/10">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-12 -translate-y-12 transition-transform duration-700 group-hover:scale-110">
          <svg width="300" height="300" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" /></svg>
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold mb-6 tracking-tight">🤖 AI 助手指引</h2>
        <p className="text-indigo-100/90 text-lg md:text-xl max-w-2xl font-medium leading-relaxed">
          利用 ChatGPT、Claude 或 Gemini 的強大力量，為您自動生成高質量的選擇題庫與關聯知識圖。
        </p>

        {/* Tab Controls */}
        <div className="flex gap-4 mt-8 relative z-10 border-t border-white/10 pt-6">
          <button
            onClick={() => { setActiveTab('quiz'); setCopied(false); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
              activeTab === 'quiz'
                ? 'bg-white text-indigo-700 shadow-lg shadow-black/10'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <BrainCircuit size={16} />
            AI 出題助手
          </button>
          <button
            onClick={() => { setActiveTab('graph'); setCopied(false); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
              activeTab === 'graph'
                ? 'bg-white text-indigo-700 shadow-lg shadow-black/10'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <GitFork size={16} />
            AI 知識圖助手
          </button>
        </div>
      </div>

      {/* Configurator Card */}
      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 dark:border-white/5 p-8 mb-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Settings2 size={24} />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
            {activeTab === 'quiz' ? '出題自定義設定' : '知識圖自定義設定'}
          </h3>
        </div>

        {activeTab === 'quiz' ? (
          <div className="grid md:grid-cols-4 gap-6">
            {/* Question Count */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <Settings2 size={16} /> 題目數量
              </label>
              <input
                type="number"
                aria-label="題目數量"
                min="1"
                max="100"
                value={config.count}
                onChange={(e) => setConfig({ ...config, count: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-bold text-xl text-slate-700 dark:text-white bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm transition-all"
              />
            </div>

            {/* Question Type */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <FileText size={16} /> 題目類型
              </label>
              <div className="flex flex-col gap-2">
                {['mixed', 'single', 'multiple'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setConfig({ ...config, type: t })}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${config.type === t
                      ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50'
                      }`}
                  >
                    <span className="font-bold text-sm">
                      {t === 'mixed' ? '混合題型' : t === 'single' ? '僅單選題' : '僅多選題'}
                    </span>
                    {config.type === t && <CheckCircle2 size={16} className="text-indigo-600 dark:text-indigo-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Explanation Language */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <Globe size={16} /> 詳解語言
              </label>
              <div className="flex flex-col gap-2">
                {[
                  { id: 'zh-TW', label: '繁體中文' },
                  { id: 'en', label: 'English' }
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setConfig({ ...config, langExplanation: l.id })}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${config.langExplanation === l.id
                      ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50'
                      }`}
                  >
                    <span className="font-bold text-sm">{l.label}</span>
                    {config.langExplanation === l.id && <CheckCircle2 size={16} className="text-indigo-600 dark:text-indigo-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Output Language */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <Globe size={16} /> 輸出語言
              </label>
              <div className="flex flex-col gap-2">
                {[
                  { id: 'zh-TW', label: '繁體中文' },
                  { id: 'en', label: 'English' }
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setConfig({ ...config, langOutput: l.id })}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${config.langOutput === l.id
                      ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50'
                      }`}
                  >
                    <span className="font-bold text-sm">{l.label}</span>
                    {config.langOutput === l.id && <CheckCircle2 size={16} className="text-indigo-600 dark:text-indigo-400" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Generate Mode */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <FileText size={16} /> 模式選擇
              </label>
              <div className="flex flex-col gap-2">
                {[
                  { id: 'generate', label: '從文章生成知識圖' },
                  { id: 'convert', label: '心智圖轉換 (Mindmap → Flowchart)' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setConfigGraph({ ...configGraph, mode: m.id })}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${configGraph.mode === m.id
                      ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50'
                      }`}
                  >
                    <span className="font-bold text-sm">{m.label}</span>
                    {configGraph.mode === m.id && <CheckCircle2 size={16} className="text-indigo-600 dark:text-indigo-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Layout Direction */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <Settings2 size={16} /> 圖表方向
              </label>
              <div className="flex flex-col gap-2">
                {[
                  { id: 'TD', label: '由上而下 (TD / Top-Down)' },
                  { id: 'LR', label: '由左至右 (LR / Left-to-Right)' }
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setConfigGraph({ ...configGraph, direction: d.id })}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${configGraph.direction === d.id
                      ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50'
                      }`}
                  >
                    <span className="font-bold text-sm">{d.label}</span>
                    {configGraph.direction === d.id && <CheckCircle2 size={16} className="text-indigo-600 dark:text-indigo-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Output Language */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <Globe size={16} /> 輸出語言
              </label>
              <div className="flex flex-col gap-2">
                {[
                  { id: 'zh-TW', label: '繁體中文' },
                  { id: 'en', label: 'English' }
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setConfigGraph({ ...configGraph, lang: l.id })}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${configGraph.lang === l.id
                      ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50'
                      }`}
                  >
                    <span className="font-bold text-sm">{l.label}</span>
                    {configGraph.lang === l.id && <CheckCircle2 size={16} className="text-indigo-600 dark:text-indigo-400" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Panel */}
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-3">
                <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border border-indigo-200 dark:border-indigo-700">1</span>
                複製提示詞 (Prompt)
              </h3>
              {copied && <span className="text-green-600 dark:text-green-400 text-sm font-bold flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full"><Check size={14} /> 已複製到剪貼簿</span>}
            </div>
            <div className="relative bg-slate-900 rounded-xl p-4 md:p-6 group border border-slate-800 shadow-inner">
              <button
                onClick={handleCopy}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors backdrop-blur-sm border border-white/5"
              >
                {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
              </button>
              <pre className="text-indigo-100 font-mono text-sm whitespace-pre-wrap overflow-x-auto max-h-[500px] custom-scrollbar selection:bg-indigo-500/50">
                {PROMPT_TEXT}
              </pre>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-4 flex items-center gap-3">
              <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border border-indigo-200 dark:border-indigo-700">2</span>
              {activeTab === 'quiz' ? '生成與存檔' : '生成與匯入'}
            </h3>
            <div className="prose dark:prose-invert text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              {activeTab === 'quiz' ? (
                <>
                  <p>將提示詞貼到你的 AI 聊天室中，然後在下方貼上你的學習筆記。</p>
                  <p className="mt-2 text-indigo-700 dark:text-indigo-300 font-medium p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800/30">AI 會回傳一段 JSON 代碼。複製該代碼，存為 <code>.json</code> 檔案（例如 <code>history.json</code>），然後在「題庫管理」中上傳。</p>
                </>
              ) : (
                <>
                  <p>將提示詞貼到你的 AI 聊天室中，隨後貼上文章或你要轉換的心智圖 (Mindmap) 語法。</p>
                  <p className="mt-2 text-indigo-700 dark:text-indigo-300 font-medium p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                    AI 會回傳一段以 <code>```mermaid</code> 包覆的 Flowchart 代碼。複製該段代碼，前往<strong>「🧠 知識圖」</strong>工具列，點選<strong>「匯入 Mermaid」</strong>並貼上，即可在編輯器中呈現並編輯！
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur-sm rounded-2xl p-6 border border-amber-100 dark:border-amber-800/30">
            <h4 className="font-bold text-amber-900 dark:text-amber-200 mb-3 flex items-center gap-2"><Sparkles size={16} /> 為什麼這有效？</h4>
            <p className="text-amber-800/80 dark:text-amber-100/70 text-sm leading-relaxed">
              {activeTab === 'quiz' 
                ? '這個特定的提示詞強制執行應用程式可讀取的嚴格 JSON 格式。它還強制 AI 提供有用的提示和詳細解析，將簡單的測驗轉變為學習工具。'
                : '由於本系統目前使用標準 flowchart 規則渲染知識圖，不支援 mindmap 格式。此提示詞強制 AI 以嚴格符合我們系統規格的 graph TD 語法輸出，並且將複雜的縮排結構轉換為精確的父子節點 ID 連線，確保匯入 100% 成功。'
              }
            </p>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h4 className="font-bold text-slate-800 dark:text-white mb-4">支援的模型</h4>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
              <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></div> ChatGPT (GPT-4o)
              </li>
              <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div> Google Gemini 1.5/2.0
              </li>
              <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50"></div> Anthropic Claude 3.5
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AIPromptGuide = React.memo(AIPromptGuideComponent);
