#!/usr/bin/env ts-node
// Use path alias defined in tsconfig.base.json for direct source access during development
import { prisma } from '@db/client';

async function main() {
  const existing = await prisma.user.findFirst();
  const user = existing || await prisma.user.create({ data: {
    email: 'demo@example.com',
    name: 'Demo User',
    provider: 'gmail',
    encryptedTokens: '{}',
  }});

  const subjects = [
    'Project Update',
    'Invoice Reminder',
    'Meeting Schedule',
    'Campaign Results'
  ];

  for (const subject of subjects) {
    const found = await prisma.emailMeta.findFirst({ where: { subject, userId: user.id } });
    if (found) continue;
    await prisma.emailMeta.create({ data: {
      userId: user.id,
      messageId: `${Date.now()}-${Math.random()}`,
      threadId: `${Date.now()}-${Math.random()}`,
      sender: 'alice@example.com',
      recipients: user.email,
      subject,
      snippet: 'Lorem ipsum snippet for ' + subject,
      labels: ['INBOX']
    }});
  }

  console.log('Seed complete');
}

main().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1); });
