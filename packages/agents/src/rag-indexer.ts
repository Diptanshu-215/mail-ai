import { prisma } from '@mail-ai/db';

export async function indexRAG(draftId: string) {
  const draft = await prisma.draft.findUnique({ where: { id: draftId }, include: { email: true } });
  if (!draft || !draft.email) return;
  // Placeholder: storing index pointer only; real embeddings in vector DB
  await prisma.rAGEntry.create({ data: { userId: draft.userId, title: draft.email.subject.slice(0,80), text: draft.optimizedText || draft.draftText, sourceMessageId: draft.email.messageId } });
}
