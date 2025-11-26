import { OpenAI } from 'openai';

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? 'gpt-3.5-turbo';
const SYSTEM = `system`;
const USER = `user`;

export function createAiEditorService() {
  const API_KEY = process.env.OPENAI_API_KEY;

  if (!API_KEY) {
    throw new Error(`Missing OPENAI_API_KEY`);
  }

  const client = new OpenAI({ apiKey: API_KEY });

  return new AiEditorService(client);
}

/**
 * A class that provides AI text editing services using the OpenAI client.
 */
class AiEditorService {
  constructor(private readonly client: OpenAI) {}

  async completeParagraph(params: { context: string }) {
    return this.client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: SYSTEM,
          content: `You are assisting USER in writing professional text. Never use double quotes.`,
        },
        {
          role: USER,
          content: `
          USER has provided the following text: "${params.context}"

          Your job is to complete the paragraph.
          
          Paragraph:
        `,
        },
      ],
      max_tokens: 50,
      temperature: 0.8,
      stream: true,
    });
  }

  async rewriteParagraph(params: { context: string }) {
    const response = await this.client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: SYSTEM,
          content: `You are assisting USER in writing professional text. Never use double quotes.`,
        },
        {
          role: USER,
          content: `
          USER has provided the following text: "${params.context}"
          
          Your job is to rewrite the text to make it more readable, better structured, and more concise. Only provide the rewritten text.

          Text:
        `,
        },
      ],
      max_tokens: params.context.split(' ').length + 100,
      temperature: 0.8,
    });

    return this.getCompletionText(response);
  }

  async correctGrammar(params: { context: string }) {
    const response = await this.client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: SYSTEM,
          content: `You are assisting USER in writing professional text. Never use double quotes.`,
        },
        {
          role: USER,
          content: `
          USER has written the following text: "${params.context}"
          
          Your job is to correct the grammar of the text. Only provide the rewritten text.

          Text:
        `,
        },
      ],
      max_tokens: params.context.split(' ').length + 100,
      temperature: 0.8,
    });

    return this.getCompletionText(response);
  }

  async customPromptEdit(params: { context: string; prompt: string }) {
    const messages = [
      {
        role: SYSTEM as `system`,
        content: `You are helpful writing assistant.`,
      },
      {
        role: USER as `user`,
        content: `
          Given the following context: "${params.context}"
          
          ${params.prompt}
        `,
      },
    ];

    const response = await this.client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      max_tokens: params.context.split(' ').length + 100,
      temperature: 0.8,
    });

    return this.getCompletionText(response);
  }

  private getCompletionText(response: OpenAI.Chat.ChatCompletion) {
    return (response.choices ?? []).reduce((acc, choice) => {
      return acc + (choice.message.content ?? '');
    }, '');
  }
}
