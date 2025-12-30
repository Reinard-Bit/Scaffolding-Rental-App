
import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, Rental } from "../types";

export const analyzeFleet = async (inventory: InventoryItem[], rentals: Rental[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
    Analyze the following scaffolding rental fleet data. 
    NOTE: All currency values are in Indonesian Rupiah (IDR).
    Inventory: ${JSON.stringify(inventory)}
    Active Rentals: ${JSON.stringify(rentals)}
    
    Provide a professional summary including:
    1. Utilization rates for top items.
    2. Items that might need restocking soon based on current trends.
    3. Suggested maintenance schedule based on last maintenance dates.
    4. Revenue projections for the next 30 days in IDR.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Failed to analyze fleet. Please check your network connection or API key.";
  }
};
