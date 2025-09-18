import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { getEnv } from '@core/env';
import { signUserToken, verifyUserToken, encryptToken, decryptToken } from '@core/auth';
import { prisma } from '@db/client';
import { buildInitialPlan } from '@agents/planner';
import { JobName, buildQueue } from '@queue/index';
import http from 'http';
import { WebSocketServer } from 'ws';
import { google } from 'googleapis';

const env = getEnv();
const app = express();
app.use(cors({ origin: env.APP_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Auth middleware using JWT cookie
app.use(async (req, _res, next) => {
  const token = req.cookies?.auth;
  if (token) {
    const payload = verifyUserToken(token);
    if (payload?.sub) {
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (user) (req as any).user = user;
    }
  }
  next();
});
// Simple in-memory store for plans (replace w/ persistent store later)
const planStore = new Map<string, any>();

// OAuth: initiate Google flow
app.get('/api/auth/google', (_req, res) => {
  const oauth2 = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
  const url = oauth2.generateAuthUrl({
    scope: [
      'openid','email','profile',
      'https://www.googleapis.com/auth/gmail.readonly'
    ],
    access_type: 'offline',
    prompt: 'consent'
  });
  res.redirect(url);
});

// OAuth callback
app.get('/api/auth/oauth/callback', async (req, res) => {
  const code = req.query.code as string | undefined;
  if (!code) return res.status(400).send('Missing code');
  try {
    const oauth2 = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);
    const oauth = google.oauth2({ version: 'v2', auth: oauth2 });
    const { data } = await oauth.userinfo.get();
    if (!data.email) return res.status(400).send('No email');
    // Persist (encrypted) provider tokens. We store the whole tokens object.
    const encryptedTokens = encryptToken(JSON.stringify(tokens));
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: { name: data.name || data.email, encryptedTokens },
      create: {
        email: data.email,
        name: data.name || data.email,
        provider: 'google',
        encryptedTokens
      }
    });
    const jwt = signUserToken(user);
    res.cookie('auth', jwt, {
      httpOnly: true,
      sameSite: (process.env.COOKIE_SAME_SITE as any) || 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      domain: process.env.COOKIE_DOMAIN || undefined,
      maxAge: 7 * 24 * 3600 * 1000
    });
    res.redirect((env.APP_ORIGIN || 'http://localhost:3000') + '/inbox');
  } catch (e) {
    console.error('OAuth error', e);
    res.status(500).send('OAuth failed');
  }
});

// Dev login (no password) for local testing
app.post('/api/auth/dev-login', async (_req, res) => {
  if (env.NODE_ENV !== 'development') return res.status(403).json({ error: 'disabled' });
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({ data: { email: 'demo@example.com', provider: 'dev', encryptedTokens: '{}' } });
  }
  const jwt = signUserToken(user);
  res.cookie('auth', jwt, {
    httpOnly: true,
    sameSite: (process.env.COOKIE_SAME_SITE as any) || 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge: 7 * 24 * 3600 * 1000
  });
  res.json({ ok: true });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('auth');
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ user: null });
  res.json({ user: { id: user.id, email: user.email, name: user.name } });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Emails
app.get('/api/emails', async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ items: [] });
  const emails = await prisma.emailMeta.findMany({ where: { userId: user.id }, take: 20, orderBy: { fetchedAt: 'desc' } });
  res.json({ items: emails });
});

// Email detail
app.get('/api/emails/:id', async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const email = await prisma.emailMeta.findFirst({ where: { id: req.params.id, userId: user.id } });
  if (!email) return res.status(404).json({ error: 'not_found' });
  res.json(email);
});

// Real Gmail fetch route: pulls messages via Gmail API for authenticated Google user
app.post('/api/emails/fetch', async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  if (user.provider !== 'google') return res.status(400).json({ error: 'user_not_google' });

  // Decrypt tokens
  const decrypted = decryptToken(user.encryptedTokens || '');
  if (!decrypted) return res.status(400).json({ error: 'missing_tokens' });
  let tokenObj: any;
  try { tokenObj = JSON.parse(decrypted); } catch { return res.status(400).json({ error: 'bad_token_json' }); }

  const oauth2 = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
  oauth2.setCredentials(tokenObj);
  const gmail = google.gmail({ version: 'v1', auth: oauth2 });

  const maxResults = Math.min(50, Math.max(1, Number(req.body?.count) || 10));
  try {
    const listResp = await gmail.users.messages.list({ userId: 'me', labelIds: ['INBOX'], maxResults });
    const messages = listResp.data.messages || [];
    let inserted = 0;

    for (const m of messages) {
      if (!m.id) continue;
      try {
        const full = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['Subject','From','To'] });
        const payload = full.data;
        const headers = payload.payload?.headers || [];
        const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
        const subject = getHeader('Subject') || '(no subject)';
        const from = getHeader('From') || '';
        const to = getHeader('To') || user.email;

        await prisma.emailMeta.create({
          data: {
            userId: user.id,
            messageId: payload.id!,
            threadId: payload.threadId || payload.id!,
            sender: from,
            recipients: to,
            subject,
            snippet: payload.snippet || '',
            labels: payload.labelIds || []
          }
        });
        inserted++;
      } catch (e: any) {
        // Ignore duplicates or partial failures (e.g. unique constraint)
      }
    }
    res.json({ inserted, attempted: messages.length });
  } catch (e: any) {
    console.error('Gmail fetch error', e?.response?.data || e);
    return res.status(500).json({ error: 'gmail_fetch_failed' });
  }
});

app.post('/api/emails/:id/draft', async (req, res) => {
  const { id } = req.params;
  // enqueue draft generation job placeholder
  const q = buildQueue(JobName.GenerateDraft);
  await q.add(JobName.GenerateDraft, { emailId: id, tones: req.body?.tones });
  res.json({ queued: true });
});

app.get('/api/drafts/:id', async (req, res) => {
  const draft = await prisma.draft.findUnique({ where: { id: req.params.id } });
  if (!draft) return res.status(404).json({ error: 'not found' });
  res.json(draft);
});

app.post('/api/drafts/:id/send', async (req, res) => {
  const draft = await prisma.draft.findUnique({ where: { id: req.params.id } });
  if (!draft) return res.status(404).json({ error: 'not found' });
  await prisma.draft.update({ where: { id: draft.id }, data: { status: 'sent' } });
  res.json({ sent: true });
});

// Planner
app.get('/api/agent/plan/:emailId', (req, res) => {
  const { emailId } = req.params;
  if (!planStore.has(emailId)) planStore.set(emailId, buildInitialPlan(emailId));
  res.json(planStore.get(emailId));
});

// Settings placeholder
app.get('/api/settings', (req, res) => {
  res.json({ defaultTone: 'friendly', autoReply: false });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  ws.send(JSON.stringify({ event: 'connected' }));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`API listening on ${PORT}`));
