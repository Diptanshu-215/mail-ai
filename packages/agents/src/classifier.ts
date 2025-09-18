import { prisma } from '@mail-ai/db';
import { StubLLMClient } from '@mail-ai/llm';

const llm = new StubLLMClient();

export async function classifyEmail(emailId: string) {
  const email = await prisma.emailMeta.findUnique({ where: { id: emailId } });
  if (!email) return;
  const res = await llm.classifyEmail({ snippet: email.snippet || '', subject: email.subject });
  await prisma.emailMeta.update({ where: { id: emailId }, data: { classificationLabel: res.label, classificationTags: res.tags } });
  return res;
}
