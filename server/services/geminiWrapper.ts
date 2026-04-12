import { generateWithOllama } from './ollamaService';

function convertContentsToPrompt(contents: any): string {
  if (typeof contents === 'string') return contents;
  if (Array.isArray(contents)) {
    return contents.map((item: any) => {
      if (item.parts && Array.isArray(item.parts)) {
        return item.parts.map((p: any) => p.text || '').join(' ');
      }
      if (item.text) return item.text;
      return String(item);
    }).join('\n');
  }
  return String(contents);
}

export function createOllamaClient() {
  return {
    models: {
      generateContentStream: async ({ model, contents, system }: any) => {
        const prompt = convertContentsToPrompt(contents);
        const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;
        const response = await generateWithOllama(fullPrompt);
        
        return {
          [Symbol.asyncIterator]: async function* () {
            yield { text: response };
          }
        };
      },
      generateContent: async ({ model, contents, system }: any) => {
        const prompt = convertContentsToPrompt(contents);
        const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;
        const response = await generateWithOllama(fullPrompt);
        return { text: response };
      }
    }
  };
}
