import { prisma } from '@mail-ai/db';

export async function sendDraft(draftId: string) {
  const draft = await prisma.draft.findUnique({ where: { id: draftId }, include: { email: true } });
  if (!draft) return;
  // TODO: integrate Gmail send API; placeholder marks as sent
  await prisma.draft.update({ where: { id: draftId }, data: { status: 'sent' } });
  await prisma.emailMeta.update({ where: { id: draft.emailId }, data: { repliedAt: new Date() } });
  return { sent: true };
}
