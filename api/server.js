require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const sendgrid = require('@sendgrid/mail');

const app = express();
const port = process.env.PORT || 3000;
const publicRoot = path.join(__dirname, '..');
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const eventsFile = path.join(dataDir, 'events.json');
const registrationsFile = path.join(dataDir, 'registrations.json');
const contactEmail = process.env.CONTACT_EMAIL || 'contact.sgffrance@gmail.com';
const adminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_TOKEN || 'changeme-sgf-admin';
const sessionSecret = process.env.SESSION_SECRET || 'local-dev-secret-change-me';

if (process.env.SENDGRID_API_KEY) sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(publicRoot, { extensions: ['html'] }));

const limiter = rateLimit({ windowMs: 60 * 1000, limit: 90, standardHeaders: true, legacyHeaders: false });
const adminLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
app.use('/api/', limiter);
app.use('/api/admin/', adminLimiter);

function uid(prefix = 'evt') {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

function signToken() {
  const issued = Date.now();
  const payload = Buffer.from(JSON.stringify({ role: 'admin', iat: issued }), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token = '') {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const maxAge = 1000 * 60 * 60 * 8;
    return parsed.role === 'admin' && Date.now() - parsed.iat < maxAge;
  } catch (_) { return false; }
}

function requireAdmin(req, res, next) {
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const legacy = req.headers['x-admin-token'];
  if (bearer && verifyToken(bearer)) return next();
  if (legacy && legacy === adminPassword) return next();
  return res.status(401).json({ ok: false, error: 'Authentification administrateur requise.' });
}

async function ensureDataFile(file, fallback) {
  try { await fs.access(file); }
  catch (_) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(fallback, null, 2), 'utf8');
  }
}

async function readJson(file, fallback) {
  await ensureDataFile(file, fallback);
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (_) { return fallback; }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(tmp, file);
}

function normalizeEvent(event = {}) {
  const nowId = uid('event');
  return {
    id: String(event.id || nowId),
    title: String(event.title || '').trim(),
    category: String(event.category || 'Événement SGF').trim(),
    dateLabel: String(event.dateLabel || '').trim(),
    badgeDay: String(event.badgeDay || '').trim(),
    badgeMonth: String(event.badgeMonth || '').trim(),
    start: String(event.start || '').trim(),
    end: String(event.end || '').trim(),
    location: String(event.location || '').trim(),
    description: String(event.description || '').trim(),
    formats: Array.isArray(event.formats) ? event.formats.map(String).map(x => x.trim()).filter(Boolean) : String(event.formats || '').split(',').map(x => x.trim()).filter(Boolean),
    buttonLabel: String(event.buttonLabel || 'Réserver').trim(),
    teamsUrl: String(event.teamsUrl || '').trim(),
    meetUrl: String(event.meetUrl || '').trim(),
    capacity: Number.isFinite(Number(event.capacity)) ? Number(event.capacity) : 0,
    visible: event.visible !== false,
    featured: event.featured === true,
    updatedAt: new Date().toISOString()
  };
}

function validateEvent(event) {
  if (!event.title) return 'Le titre est obligatoire.';
  if (!event.dateLabel) return 'Le libellé de date est obligatoire.';
  if (!event.description) return 'La description est obligatoire.';
  return null;
}

function publicEvent(event) {
  const { teamsUrl, meetUrl, ...safe } = event;
  return safe;
}

function csvEscape(value = '') {
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

const defaultEvents = [
  { id: 'forum-paris', title: 'SGF Investment Forum', category: 'Forum · Paris', dateLabel: '15 septembre 2026 · 09h00 – 18h00', badgeDay: '15', badgeMonth: 'Sep 2026', start: '20260915T090000', end: '20260915T180000', location: 'Paris 17e', description: 'Forum SGF : acquisition, investissement, panels sectoriels et networking.', formats: ['Présentiel', 'Teams Live'], buttonLabel: 'Réserver ma place', visible: true, featured: true, capacity: 120 },
  { id: 'meet-benin', title: 'Entrepreneurs Bénin × SGF', category: 'Networking · Cotonou', dateLabel: '22 octobre 2026 · 10h00 – 17h00', badgeDay: '22', badgeMonth: 'Oct 2026', start: '20261022T100000', end: '20261022T170000', location: 'Cotonou', description: 'Rencontre SGF avec entrepreneurs, institutions et partenaires en Afrique de l’Ouest.', formats: ['Présentiel', 'Google Meet'], buttonLabel: 'Réserver ma place', visible: true, capacity: 180 },
  { id: 'webinar-holding', title: 'Finance d’entreprise & holdings en 2026', category: 'Webinaire · Online', dateLabel: '05 novembre 2026 · 14h00 – 16h30', badgeDay: '05', badgeMonth: 'Nov 2026', start: '20261105T140000', end: '20261105T163000', location: 'Microsoft Teams / Google Meet', description: 'Webinaire SGF sur la structuration de holdings et le financement d’acquisitions.', formats: ['Microsoft Teams', 'Google Meet'], buttonLabel: 'Rejoindre', visible: true, capacity: 500 },
  { id: 'annual-gathering', title: 'SGF Annual Gathering 2026', category: 'Soirée annuelle · Invitation', dateLabel: '12 décembre 2026 · 19h30 – 00h00', badgeDay: '12', badgeMonth: 'Déc 2026', start: '20261212T193000', end: '20261213T000000', location: 'Paris · Sur invitation', description: 'Soirée annuelle SGF réservée aux partenaires, investisseurs et filiales.', formats: ['Sur invitation'], buttonLabel: 'Demander une invitation', visible: true, capacity: 80 }
].map(normalizeEvent);

app.get('/api/health', (_, res) => res.json({ ok: true, service: 'SGF Group V9', storage: dataDir }));

app.post('/api/admin/login', (req, res) => {
  const password = String(req.body?.password || '');
  if (!password || password !== adminPassword) return res.status(401).json({ ok: false, error: 'Mot de passe incorrect.' });
  return res.json({ ok: true, token: signToken(), expiresIn: '8h' });
});

app.get('/api/events', async (_, res) => {
  const events = await readJson(eventsFile, defaultEvents);
  res.json({ ok: true, events: events.map(normalizeEvent).filter(e => e.visible).map(publicEvent) });
});

app.get('/api/admin/events', requireAdmin, async (_, res) => {
  const events = await readJson(eventsFile, defaultEvents);
  res.json({ ok: true, events: events.map(normalizeEvent) });
});

app.post('/api/admin/events', requireAdmin, async (req, res) => {
  const events = await readJson(eventsFile, defaultEvents);
  const event = normalizeEvent({ ...req.body, id: req.body?.id || uid('event') });
  const error = validateEvent(event);
  if (error) return res.status(400).json({ ok: false, error });
  if (events.find(e => e.id === event.id)) return res.status(409).json({ ok: false, error: 'Un événement avec cet identifiant existe déjà.' });
  events.unshift(event);
  await writeJson(eventsFile, events.map(normalizeEvent));
  res.status(201).json({ ok: true, event });
});

app.patch('/api/admin/events/:id', requireAdmin, async (req, res) => {
  const events = await readJson(eventsFile, defaultEvents);
  const index = events.findIndex(e => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ ok: false, error: 'Événement introuvable.' });
  const event = normalizeEvent({ ...events[index], ...req.body, id: events[index].id });
  const error = validateEvent(event);
  if (error) return res.status(400).json({ ok: false, error });
  events[index] = event;
  await writeJson(eventsFile, events.map(normalizeEvent));
  res.json({ ok: true, event });
});

app.delete('/api/admin/events/:id', requireAdmin, async (req, res) => {
  const events = await readJson(eventsFile, defaultEvents);
  const next = events.filter(e => e.id !== req.params.id);
  if (next.length === events.length) return res.status(404).json({ ok: false, error: 'Événement introuvable.' });
  await writeJson(eventsFile, next.map(normalizeEvent));
  res.json({ ok: true, deleted: req.params.id });
});

app.post('/api/event-registrations', async (req, res) => {
  const { eventId, name, email, phone, company, format, message } = req.body || {};
  if (!eventId || !name || !email) return res.status(400).json({ ok: false, error: 'Événement, nom et email sont obligatoires.' });
  const events = await readJson(eventsFile, defaultEvents);
  const event = events.find(e => e.id === eventId && e.visible !== false);
  if (!event) return res.status(404).json({ ok: false, error: 'Événement introuvable.' });
  const registrations = await readJson(registrationsFile, []);
  const registration = { id: uid('reg'), eventId, eventTitle: event.title, name, email, phone: phone || '', company: company || '', format: format || '', message: message || '', createdAt: new Date().toISOString() };
  registrations.unshift(registration);
  await writeJson(registrationsFile, registrations);

  const text = [
    `Nouvelle inscription événement SGF : ${event.title}`,
    '',
    `Nom : ${name}`,
    `Entreprise : ${company || '-'}`,
    `Email : ${email}`,
    `Téléphone : ${phone || '-'}`,
    `Format souhaité : ${format || '-'}`,
    '',
    `Message : ${message || '-'}`
  ].join('\n');

  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM) {
    await sendgrid.send({ to: contactEmail, from: process.env.SENDGRID_FROM, subject: `Inscription événement SGF — ${event.title}`, text, replyTo: email });
  } else {
    console.log(text);
  }

  res.status(201).json({ ok: true, registrationId: registration.id });
});

app.get('/api/admin/registrations', requireAdmin, async (req, res) => {
  const list = await readJson(registrationsFile, []);
  const eventId = req.query.eventId;
  res.json({ ok: true, registrations: eventId ? list.filter(r => r.eventId === eventId) : list });
});

app.get('/api/admin/registrations.csv', requireAdmin, async (_, res) => {
  const list = await readJson(registrationsFile, []);
  const header = ['createdAt', 'eventTitle', 'name', 'company', 'email', 'phone', 'format', 'message'];
  const rows = [header.join(';')].concat(list.map(r => header.map(key => csvEscape(r[key] || '')).join(';')));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="sgf-inscriptions-evenements.csv"');
  res.send(`\uFEFF${rows.join('\n')}`);
});

app.post('/api/booking', async (req, res) => {
  const { name, email, phone, company, topic, format, message } = req.body || {};
  if (!name || !email || !topic) return res.status(400).json({ ok: false, error: 'Nom, email et objet obligatoires.' });
  const text = ['Nouvelle demande de rendez-vous SGF Group', '', `Nom : ${name}`, `Entreprise : ${company || '-'}`, `Email : ${email}`, `Téléphone : ${phone || '-'}`, `Objet : ${topic}`, `Format souhaité : ${format || '-'}`, '', `Message : ${message || '-'}`].join('\n');
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM) await sendgrid.send({ to: contactEmail, from: process.env.SENDGRID_FROM, subject: `Demande de rendez-vous SGF — ${topic}`, text, replyTo: email });
  else console.log(text);
  res.json({ ok: true });
});

app.listen(port, () => console.log(`SGF Group V9 running on http://localhost:${port}`));
