import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env['API_KEY']! });
  }

  async summarizeContent(text: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze the following article content. Provide a concise summary (max 3 sentences) and a bulleted list of 3 key takeaways. Format the output as clean HTML (using <h3>, <p>, <ul>, <li> tags) suitable for inserting into a document. Do not include markdown code blocks.
        
        Article Content:
        ${text.substring(0, 20000)}` // Limit text length to avoid token limits
      });
      
      return response.text || '<p>Unable to generate summary.</p>';
    } catch (error) {
      console.error('Gemini summarization failed:', error);
      throw error;
    }
  }

  async translateContent(text: string, targetLanguage: string): Promise<string> {
    try {
       const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Translate the following text to ${targetLanguage}. Return only the translated text, preserving the HTML structure if possible or just returning paragraphs.
        
        Text:
        ${text.substring(0, 5000)}` 
      });
      return response.text || 'Translation failed.';
    } catch (e) {
      return 'Error translating.';
    }
  }
}