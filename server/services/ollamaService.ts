import axios from 'axios';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

export async function generateWithOllama(prompt: string): Promise<string> {
  try {
    const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false
    });
    
    return response.data.response;
  } catch (error) {
    console.error('Ollama generation error:', error);
    return "I'm currently offline. Please check my neural connections.";
  }
}

export async function analyzeWithOllama(systemPrompt: string, userPrompt: string): Promise<string> {
  const fullPrompt = `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`;
  return generateWithOllama(fullPrompt);
}
