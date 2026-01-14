import { GoogleGenAI } from "@google/genai";
import { TradeConfig, OrderSide } from '../types';

export const analyzeTradeStrategy = async (config: TradeConfig, currentPrice: number): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return "API Key отсутствует. Проверьте настройки окружения.";
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Ты профессиональный аналитик крипто-рисков.
    Проанализируй следующую торговую настройку для бота на BingX:
    
    Пара: ${config.symbol}
    Текущая цена: ${currentPrice}
    Направление: ${config.side}
    Цена входа: ${config.entryPrice}
    Плечо: ${config.leverage}x
    Тейк-профит: ${config.tpPercent}%
    Стоп-лосс: ${config.slPercent}%
    Объем позиции: ${config.amountUSDT} USDT

    1. Рассчитай реальные цены TP и SL.
    2. Проанализируй соотношение Риск/Прибыль (R/R).
    3. Дай строгую критику этой настройки (например, стоп слишком короткий для волатильности? плечо опасное?).
    4. Предложи небольшие корректировки, если необходимо.

    Отвечай кратко, до 150 слов. Используй русский язык. Форматируй как простой текст с буллитами.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Не удалось получить анализ.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Ошибка подключения к AI. Проверьте API ключ.";
  }
};

export const suggestStrategy = async (trendDescription: string): Promise<{ tp: number, sl: number, leverage: number, reasoning: string } | null> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      Основываясь на этом наблюдении рынка: "${trendDescription}",
      Предложи консервативную скальпинг-стратегию (TP %, SL %, Плечо) для бота на BingX.
      Ответь ТОЛЬКО JSON объектом: { "tp": number, "sl": number, "leverage": number, "reasoning": "string (на русском)" }.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      const text = response.text;
      if (!text) return null;
      return JSON.parse(text);
    } catch (e) {
      console.error(e);
      return null;
    }
}