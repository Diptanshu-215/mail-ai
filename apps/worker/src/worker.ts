import { buildWorker, JobName } from '@mail-ai/queue';
import { classifyEmail, generateDrafts, optimizeDraft, sendDraft, indexRAG } from '@mail-ai/agents';

buildWorker(JobName.ClassifyMail, async job => {
  await classifyEmail(job.data.emailId);
});

buildWorker(JobName.GenerateDraft, async job => {
  await generateDrafts(job.data.emailId, job.data.tones);
});

buildWorker(JobName.OptimizeDraft, async job => {
  await optimizeDraft(job.data.draftId);
});

buildWorker(JobName.SendDraft, async job => {
  await sendDraft(job.data.draftId);
});

buildWorker(JobName.IndexRAG, async job => {
  await indexRAG(job.data.draftId);
});

console.log('Worker started');
