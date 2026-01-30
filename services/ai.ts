import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { Question, AIConfig } from "../types";

const AI_CONFIG_KEY = 'mindspark_ai_config';

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
      // Use local proxy if baseUrl is default, otherwise use configured url
      // Note: Proxy only works in dev mode. For production, you need a backend proxy.
      const isDefaultUrl = !config.baseUrl || config.baseUrl === "https://integrate.api.nvidia.com/v1";
      // OpenAI client requires a full URL, so we prepend origin to the proxy path
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
      // Default to Google
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
