import { GoogleGenerativeAI } from "@google/generative-ai";
import { Question } from "../types";

const AI_CONFIG_KEY = 'mindspark_ai_config';

export interface AIConfig {
  apiKey: string;
  model: string;
}

export const getAIConfig = (): AIConfig | null => {
  const data = localStorage.getItem(AI_CONFIG_KEY);
  return data ? JSON.parse(data) : null;
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

  const genAI = new GoogleGenerativeAI(config.apiKey);
  // Default to gemini-1.5-flash for speed/cost if not specified or fallback
  const model = genAI.getGenerativeModel({ model: config.model || "gemini-1.5-flash" });

  const prompt = `
你是一位專業且親切的助教。請針對以下題目提供詳細的解答與解釋。

【題目內容】
題目：${question.question}
選項：${question.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join(', ')}
正確答案：${Array.isArray(question.answer) ? question.answer.join(', ') : question.answer}
${question.explanation ? `原解析：${question.explanation}` : ''}

【用戶當前狀況】
用戶選擇的答案：${userAnswer ? (Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer) : '尚未作答'}
用戶提出的疑問：${userQuery}

請根據以上資訊，給予用戶具啟發性且易於理解的解說。
  `.trim();

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("AI Error:", error);
    throw new Error(error.message || "AI 請求失敗，請檢查 API 金鑰或網路連線。");
  }
};
