import { prisma } from '@mail-ai/db';
import { StubLLMClient } from '@mail-ai/llm';

const llm = new StubLLMClient();

export async function generateDrafts(emailId: string, tones: string[] = ['formal','friendly','concise']) {
  const email = await prisma.emailMeta.findUnique({ where: { id: emailId }, include: { user: true } });
  if (!email) return;
  const response = await llm.generateDrafts({
    sender: email.sender,
    subject: email.subject,
    threadSummary: email.snippet || '',
    preferredTone: email.user.defaultTone,
    examples: []
  });
  // Persist each variant
  for (const v of response.variants) {
    if (!tones.includes(v.tone)) continue;
    await prisma.draft.create({ data: { emailId, userId: email.userId, tone: v.tone, draftText: v.text, modelName: 'stub', status: 'ready' } });
  }
  return response;
}
