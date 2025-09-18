export enum JobName {
  FetchMail = 'fetch_mail',
  ClassifyMail = 'classify_mail',
  GenerateDraft = 'generate_draft',
  OptimizeDraft = 'optimize_draft',
  SendDraft = 'send_draft',
  IndexRAG = 'index_rag'
}

export interface JobPayloadMap {
  [JobName.FetchMail]: { userId: string; messageId: string };
  [JobName.ClassifyMail]: { emailId: string };
  [JobName.GenerateDraft]: { emailId: string; tones?: string[] };
  [JobName.OptimizeDraft]: { draftId: string };
  [JobName.SendDraft]: { draftId: string };
  [JobName.IndexRAG]: { draftId: string };
}
