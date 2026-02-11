import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import OpenAI from "openai";
import { Question, AIConfig } from "../types";

const AI_CONFIG_KEY = 'mindspark_ai_config';

const QUESTION_JSON_SCHEMA = `{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "id": { "type": "string", "description": "Unique UUID" },
      "question": { "type": "string" },
      "options": { "type": "array", "items": { "type": "string" } },
      "answer": { "type": "string | array", "description": "Correct option text(s)" },
      "type": { "enum": ["single", "multiple"] },
      "explanation": { "type": "string" },
      "hint": { "type": "string", "optional": true }
    },
    "required": ["id", "question", "options", "answer", "type", "explanation"]
  }
}`;

const FEW_SHOT_EXAMPLES = `
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "type": "single",
    "question": "React 中用於處理副作用的 Hook 是什麼？",
    "options": ["useState", "useEffect", "useContext", "useReducer"],
    "answer": "useEffect",
    "explanation": "useEffect 是 React 函數元件中處理副作用（如資料獲取、訂閱或手動修改 DOM）的 Hook。"
  },
  {
    "id": "223e4567-e89b-12d3-a456-426614174001",
    "type": "multiple",
    "question": "以下哪些是 JavaScript 的基本資料型別？",
    "options": ["String", "Number", "Boolean", "Object", "Symbol"],
    "answer": ["String", "Number", "Boolean", "Symbol"],
    "explanation": "JavaScript 的基本型別包括 String, Number, Boolean, Null, Undefined, Symbol 和 BigInt。Object 是參照型別。"
  }
]
`;

export const cleanJsonResponse = (raw: string): string => {
  // Remove markdown code blocks
  let clean = raw.replace(/```json\n?|\n?```/g, "").trim();
  // Remove potential leading/trailing non-JSON characters like comments or text
  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start !== -1 && end !== -1) {
    clean = clean.substring(start, end + 1);
  }
  // Remove trailing commas from objects and arrays (common LLM error)
  clean = clean.replace(/,(\s*[\]}])/g, '$1');
  return clean;
};

export const getAIConfig = (): AIConfig | null => {
  const data = localStorage.getItem(AI_CONFIG_KEY);
  if (!data) return null;

  const config = JSON.parse(data);
  // Migration for old config without provider
  if (!config.provider) {
    config.provider = 'google';
  }
  return config;
};

export const saveAIConfig = (config: AIConfig) => {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
};

export const clearAIConfig = () => {
  localStorage.removeItem(AI_CONFIG_KEY);
};

export const askAI = async (
  question: Question,
  userQuery: string,
  userAnswer?: string | string[]
): Promise<string> => {
  const config = getAIConfig();
  if (!config || !config.apiKey) {
    throw new Error("請先配置 API 金鑰");
  }

  const contextData = `
【題目內容】
題目：${question.question}
選項：${question.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join(', ')}
正確答案：${Array.isArray(question.answer) ? question.answer.join(', ') : question.answer}
${question.explanation ? `原解析：${question.explanation}` : ''}

【用戶當前狀況】
用戶選擇的答案：${userAnswer ? (Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer) : '尚未作答'}
用戶提出的疑問：${userQuery}
  `.trim();

  const systemInstruction = "你是一位專業且親切的助教。請根據提供的題目資訊與用戶疑問，給予具啟發性且易於理解的解說。";

  try {
    if (config.provider === 'nvidia') {
      const isDefaultUrl = !config.baseUrl || config.baseUrl === "https://integrate.api.nvidia.com/v1";
      const baseURL = isDefaultUrl ? `${window.location.origin}/api/nvidia` : config.baseUrl;

      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: baseURL,
        dangerouslyAllowBrowser: true
      });

      const completion = await client.chat.completions.create({
        model: config.model || "deepseek-ai/deepseek-v3.2",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: contextData }
        ],
        temperature: 0.7,
        max_tokens: 4096,
      });

      return completion.choices[0].message.content || "";

    } else {
      const genAI = new GoogleGenerativeAI(config.apiKey);
      const model = genAI.getGenerativeModel({ model: config.model || "gemini-1.5-flash" });

      const prompt = `${systemInstruction}\n\n${contextData}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    }
  } catch (error: any) {
    console.error("AI Error:", error);
    throw new Error(error.message || "AI 請求失敗，請檢查 API 金鑰或網路連線。");
  }
};

export const generateQuestionsFromPDF = async (
  pdfBase64: string,
  topic: string = "",
  count: number = 5,
  options: {
    langOutput: string;
    questionType: string;
    langExplanation: string;
  } = { langOutput: 'zh-TW', questionType: 'mixed', langExplanation: 'zh-TW' }
): Promise<Question[]> => {
  const config = getAIConfig();
  if (!config || !config.apiKey) throw new Error("請先配置 API 金鑰");

  if (config.provider !== 'google') {
    throw new Error("目前 PDF 生成功能僅支援 Google Gemini 模型，請在設定中切換。");
  }

  try {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const model = genAI.getGenerativeModel({ model: config.model || "gemini-1.5-flash" });

    const typeInstruction = options.questionType === 'single'
      ? '請只生成「單選題」。'
      : options.questionType === 'multiple'
        ? '請只生成「多選題」。'
        : '請包含「單選題」與「多選題」。';

    const outputLang = options.langOutput === 'zh-TW' ? '繁體中文 (Traditional Chinese)' : 'English';
    const explanationLang = options.langExplanation === 'zh-TW' ? '繁體中文' : 'English';

    const prompt = `
      請根據附件的 PDF 文件內容${topic ? `，並專注於「${topic}」主題` : ''}，
      生成 ${count} 題。
      
      【內容要求】
      ${typeInstruction}
      詳解語言：${explanationLang}

      【輸出格式要求】
      1. 請直接輸出純 JSON 陣列 (Array)，遵守以下 JSON Schema：
      ${QUESTION_JSON_SCHEMA}
      
      2. 參考範例 (Few-Shot Examples)：
      ${FEW_SHOT_EXAMPLES}

      3. 不要包含任何 Markdown 標記 (如 \`\`\`json ... \`\`\`)。
      4. 題目語言：${outputLang}
    `;

    // Explicitly construct parts with 'any' cast to avoid strict union discrimination issues specific to some SDK versions
    // The structure is correct per documentation: { text: string } | { inlineData: ... }
    const parts: any[] = [
      { text: prompt },
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64
        }
      }
    ];

    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text();

    const cleanJson = cleanJsonResponse(text);

    return JSON.parse(cleanJson);
  } catch (error: any) {
    console.error("PDF Generate Error:", error);
    throw new Error("生成失敗：" + (error.message || "未知錯誤"));
  }
};
