import { buildWorker } from '@mail-ai/queue';
import { JobName, JobPayloadMap } from '../../../packages/queue/src/jobs';
import { classifyEmail, generateDrafts, optimizeDraft, sendDraft, indexRAG } from '@mail-ai/agents';

buildWorker(JobName.ClassifyMail, async (job: { data: JobPayloadMap[JobName.ClassifyMail] }) => {
  await classifyEmail(job.data.emailId);
});

buildWorker(JobName.GenerateDraft, async (job: { data: JobPayloadMap[JobName.GenerateDraft] }) => {
  await generateDrafts(job.data.emailId, job.data.tones);
});

buildWorker(JobName.OptimizeDraft, async (job: { data: JobPayloadMap[JobName.OptimizeDraft] }) => {
  await optimizeDraft(job.data.draftId);
});

buildWorker(JobName.SendDraft, async (job: { data: JobPayloadMap[JobName.SendDraft] }) => {
  await sendDraft(job.data.draftId);
});

buildWorker(JobName.IndexRAG, async (job: { data: JobPayloadMap[JobName.IndexRAG] }) => {
  await indexRAG(job.data.draftId);
});

console.log('Worker started');
