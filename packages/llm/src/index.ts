export interface DraftVariant {
  tone: string;
  text: string;
}

export interface WriterResponse {
  variants: DraftVariant[];
  raw?: unknown;
}

export interface ClassificationResult {
  label: 'NeedsReply' | 'NoReply' | 'LowPriority' | 'Urgent';
  reason: string;
  tags: string[];
}

export interface LLMClient {
  classifyEmail(input: { snippet: string; subject?: string }): Promise<ClassificationResult>;
  generateDrafts(input: { sender: string; subject: string; threadSummary: string; preferredTone?: string; examples?: string[]; }): Promise<WriterResponse>;
  optimizeDraft(input: { text: string; targetTone?: string }): Promise<{ text: string; confidence?: number }>;
}

// Stub implementation for local & test environments
export class StubLLMClient implements LLMClient {
  async classifyEmail(): Promise<ClassificationResult> {
    return { label: 'NeedsReply', reason: 'stub', tags: ['stub'] };
  }
  async generateDrafts(input: { sender: string; subject: string; threadSummary: string; preferredTone?: string; examples?: string[]; }): Promise<WriterResponse> {
    return { variants: [
      { tone: 'formal', text: `Formal reply to ${input.sender} about ${input.subject}.` },
      { tone: 'friendly', text: `Hey ${input.sender}, thanks for the note about ${input.subject}!` },
      { tone: 'concise', text: `Ack ${input.subject}. Will follow up soon.` }
    ] };
  }
  async optimizeDraft(input: { text: string; targetTone?: string }) {
    return { text: input.text + ' (optimized)', confidence: 0.9 };
  }
}

// Placeholder Gemini client (pseudo - real implementation would call provider API)
export class GeminiLLMClient extends StubLLMClient {
  constructor(private apiKey: string) { super(); }
  // TODO: Replace stubbed calls with real fetch calls to Gemini endpoints once key & endpoint available.
}
