import { prisma } from '@mail-ai/db';
import { StubLLMClient } from '@mail-ai/llm';

const llm = new StubLLMClient();

export async function optimizeDraft(draftId: string) {
  const draft = await prisma.draft.findUnique({ where: { id: draftId } });
  if (!draft) return;
  const res = await llm.optimizeDraft({ text: draft.draftText, targetTone: draft.tone });
  await prisma.draft.update({ where: { id: draftId }, data: { optimizedText: res.text, status: 'ready' } });
  return res;
}
