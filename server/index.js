const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const compression = require('compression');
const { buildSeed } = require('./seed');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ---------- oddiy JSON baza ---------- */
let db;
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { db = null; }
if (!db) db = { users: [], levels: [], lessons: [], tests: [], results: [], progress: [], live: [], secret: crypto.randomBytes(32).toString('hex') };
for (const k of ['users', 'levels', 'lessons', 'tests', 'results', 'progress', 'live']) if (!db[k]) db[k] = [];
if (!db.secret) db.secret = crypto.randomBytes(32).toString('hex');

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  }, 150);
}
const uid = () => crypto.randomBytes(5).toString('hex');

if (db.lessons.length === 0) {
  const s = buildSeed(uid);
  db.levels = s.levels; db.lessons = s.lessons; db.tests = s.tests;
}
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@koreys.uz').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin12345';
if (!db.users.find(u => u.email === ADMIN_EMAIL)) {
  db.users.push({ id: uid(), name: 'Administrator', email: ADMIN_EMAIL, hash: bcrypt.hashSync(ADMIN_PASSWORD, 10), role: 'admin', banned: false, createdAt: Date.now() });
}
save();

/* ---------- yordamchilar ---------- */
const pub = u => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt, banned: !!u.banned });
const sign = u => jwt.sign({ id: u.id }, db.secret, { expiresIn: '30d' });
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Kirish talab qilinadi' });
  try {
    const p = jwt.verify(token, db.secret);
    const u = db.users.find(x => x.id === p.id);
    if (!u) return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
    if (u.banned) return res.status(403).json({ error: 'Akkaunt bloklangan' });
    req.user = u; next();
  } catch (e) { res.status(401).json({ error: 'Sessiya tugagan, qayta kiring' }); }
}
const role = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Ruxsat yo\'q' });
const canEdit = (item, user) => user.role === 'admin' || item.authorId === user.id;
const clean = (s, n = 4000) => String(s == null ? '' : s).slice(0, n);

const app = express();
app.use(compression());
app.use(express.json({ limit: '4mb' }));

/* ---------- Auth ---------- */
app.post('/api/auth/register', (req, res) => {
  const name = clean(req.body.name, 60).trim();
  const email = clean(req.body.email, 120).trim().toLowerCase();
  const password = String(req.body.password || '');
  if (name.length < 2) return res.status(400).json({ error: 'Ismingizni kiriting' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Email noto\'g\'ri' });
  if (password.length < 6) return res.status(400).json({ error: 'Parol kamida 6 belgi bo\'lsin' });
  if (db.users.find(u => u.email === email)) return res.status(409).json({ error: 'Bu email allaqachon ro\'yxatdan o\'tgan' });
  const u = { id: uid(), name, email, hash: bcrypt.hashSync(password, 10), role: 'student', banned: false, createdAt: Date.now() };
  db.users.push(u); save();
  res.json({ token: sign(u), user: pub(u) });
});
app.post('/api/auth/login', (req, res) => {
  const email = clean(req.body.email, 120).trim().toLowerCase();
  const u = db.users.find(x => x.email === email);
  if (!u || !bcrypt.compareSync(String(req.body.password || ''), u.hash)) return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
  if (u.banned) return res.status(403).json({ error: 'Akkaunt bloklangan' });
  res.json({ token: sign(u), user: pub(u) });
});
app.get('/api/me', auth, (req, res) => res.json({ user: pub(req.user) }));
app.put('/api/me', auth, (req, res) => {
  if (req.body.name) req.user.name = clean(req.body.name, 60).trim() || req.user.name;
  if (req.body.password) {
    if (String(req.body.password).length < 6) return res.status(400).json({ error: 'Parol kamida 6 belgi bo\'lsin' });
    req.user.hash = bcrypt.hashSync(String(req.body.password), 10);
  }
  save(); res.json({ user: pub(req.user) });
});

/* ---------- Ommaviy: yo'l xaritasi ---------- */
app.get('/api/public/levels', (req, res) => {
  const levels = db.levels.slice().sort((a, b) => a.order - b.order).map(l => ({
    ...l,
    lessons: db.lessons.filter(x => x.levelId === l.id && x.published !== false).length,
    tests: db.tests.filter(x => x.levelId === l.id).length
  }));
  res.json({ levels, users: db.users.length, videos: db.lessons.filter(l => l.videoUrl).length });
});

/* ---------- O'quvchi: umumiy ko'rinish ---------- */
app.get('/api/overview', auth, (req, res) => {
  const done = new Set(db.progress.filter(p => p.userId === req.user.id).map(p => p.lessonId));
  const mine = db.results.filter(r => r.userId === req.user.id);
  const levels = db.levels.slice().sort((a, b) => a.order - b.order).map(l => {
    const lessons = db.lessons.filter(x => x.levelId === l.id && x.published !== false).sort((a, b) => a.order - b.order)
      .map(x => ({ id: x.id, title: x.title, titleKo: x.titleKo, summary: x.summary, order: x.order, hasVideo: !!x.videoUrl, done: done.has(x.id) }));
    const tests = db.tests.filter(x => x.levelId === l.id).map(t => {
      const rs = mine.filter(r => r.testId === t.id);
      return { id: t.id, title: t.title, kind: t.kind, lessonId: t.lessonId || null, minutes: t.minutes, count: t.questions.length, best: rs.length ? Math.max(...rs.map(r => r.percent)) : null, passed: rs.some(r => r.passed) };
    });
    return { id: l.id, order: l.order, title: l.title, subtitle: l.subtitle, description: l.description, color: l.color, lessons, tests };
  });
  const now = Date.now() - 3600 * 1000;
  const live = db.live.filter(x => x.time >= now).sort((a, b) => a.time - b.time).slice(0, 6)
    .map(x => ({ ...x, teacher: (db.users.find(u => u.id === x.teacherId) || {}).name || '' }));
  res.json({ levels, live, stats: { completed: done.size, tests: mine.length, passed: mine.filter(r => r.passed).length } });
});

app.get('/api/lessons/:id', auth, (req, res) => {
  const l = db.lessons.find(x => x.id === req.params.id);
  if (!l || (l.published === false && req.user.role === 'student')) return res.status(404).json({ error: 'Dars topilmadi' });
  const siblings = db.lessons.filter(x => x.levelId === l.levelId && x.published !== false).sort((a, b) => a.order - b.order);
  const i = siblings.findIndex(x => x.id === l.id);
  const test = db.tests.find(t => t.lessonId === l.id);
  res.json({
    lesson: l,
    done: !!db.progress.find(p => p.userId === req.user.id && p.lessonId === l.id),
    prev: i > 0 ? siblings[i - 1].id : null,
    next: i < siblings.length - 1 ? siblings[i + 1].id : null,
    testId: test ? test.id : null,
    level: db.levels.find(x => x.id === l.levelId) || null
  });
});
app.post('/api/lessons/:id/complete', auth, (req, res) => {
  if (!db.lessons.find(x => x.id === req.params.id)) return res.status(404).json({ error: 'Dars topilmadi' });
  if (!db.progress.find(p => p.userId === req.user.id && p.lessonId === req.params.id)) {
    db.progress.push({ userId: req.user.id, lessonId: req.params.id, at: Date.now() }); save();
  }
  res.json({ ok: true });
});
app.delete('/api/lessons/:id/complete', auth, (req, res) => {
  db.progress = db.progress.filter(p => !(p.userId === req.user.id && p.lessonId === req.params.id)); save();
  res.json({ ok: true });
});

/* ---------- Testlar ---------- */
app.get('/api/tests/:id', auth, (req, res) => {
  const t = db.tests.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Test topilmadi' });
  res.json({
    test: {
      id: t.id, title: t.title, kind: t.kind, minutes: t.minutes, passPercent: t.passPercent, levelId: t.levelId,
      questions: t.questions.map(q => ({ q: q.q, options: q.options }))
    }
  });
});
app.post('/api/tests/:id/submit', auth, (req, res) => {
  const t = db.tests.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Test topilmadi' });
  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
  let score = 0;
  const review = t.questions.map((q, i) => {
    const ok = Number(answers[i]) === q.answer;
    if (ok) score++;
    return { q: q.q, options: q.options, chosen: answers[i] == null ? null : Number(answers[i]), answer: q.answer, correct: ok, explanation: q.explanation || '' };
  });
  const total = t.questions.length;
  const percent = total ? Math.round((score / total) * 100) : 0;
  const passed = percent >= (t.passPercent || 70);
  const r = { id: uid(), userId: req.user.id, testId: t.id, testTitle: t.title, levelId: t.levelId, kind: t.kind, score, total, percent, passed, seconds: Math.max(0, Number(req.body.seconds) || 0), date: Date.now() };
  db.results.push(r); save();
  res.json({ result: r, review });
});
app.get('/api/results', auth, (req, res) => {
  const rs = db.results.filter(r => r.userId === req.user.id).sort((a, b) => b.date - a.date)
    .map(r => ({ ...r, levelTitle: (db.levels.find(l => l.id === r.levelId) || {}).title || '' }));
  res.json({ results: rs });
});
app.get('/api/certificate/:id', auth, (req, res) => {
  const r = db.results.find(x => x.id === req.params.id);
  if (!r || (r.userId !== req.user.id && req.user.role !== 'admin')) return res.status(404).json({ error: 'Sertifikat topilmadi' });
  if (!(r.passed && r.kind === 'final')) return res.status(400).json({ error: 'Sertifikat faqat yakuniy imtihondan o\'tganda beriladi' });
  const u = db.users.find(x => x.id === r.userId);
  const l = db.levels.find(x => x.id === r.levelId) || {};
  res.json({ cert: { id: r.id.toUpperCase(), name: u ? u.name : '', level: l.title || '', subtitle: l.subtitle || '', percent: r.percent, date: r.date } });
});
app.get('/api/live', auth, (req, res) => {
  const now = Date.now() - 3600 * 1000;
  res.json({ live: db.live.filter(x => x.time >= now).sort((a, b) => a.time - b.time) });
});

/* ---------- Admin / O'qituvchi ---------- */
const staff = [auth, role('teacher', 'admin')];
const adminOnly = [auth, role('admin')];

app.get('/api/admin/stats', staff, (req, res) => {
  res.json({
    users: db.users.length, students: db.users.filter(u => u.role === 'student').length,
    teachers: db.users.filter(u => u.role === 'teacher').length,
    lessons: db.lessons.length, videos: db.lessons.filter(l => l.videoUrl).length, tests: db.tests.length,
    results: db.results.length, passed: db.results.filter(r => r.passed).length,
    recentUsers: db.users.slice(-5).reverse().map(pub),
    recentResults: db.results.slice(-8).reverse().map(r => ({ ...r, user: (db.users.find(u => u.id === r.userId) || {}).name || '?' }))
  });
});

// Darslar
app.get('/api/admin/lessons', staff, (req, res) => {
  res.json({ lessons: db.lessons.slice().sort((a, b) => (a.levelId === b.levelId ? a.order - b.order : String(a.levelId).localeCompare(String(b.levelId)))).map(l => ({ id: l.id, title: l.title, titleKo: l.titleKo, levelId: l.levelId, order: l.order, hasVideo: !!l.videoUrl, published: l.published !== false, authorId: l.authorId || null, canEdit: canEdit(l, req.user) })), levels: db.levels.slice().sort((a, b) => a.order - b.order) });
});
app.get('/api/admin/lessons/:id', staff, (req, res) => {
  const l = db.lessons.find(x => x.id === req.params.id);
  if (!l) return res.status(404).json({ error: 'Topilmadi' });
  res.json({ lesson: l, canEdit: canEdit(l, req.user) });
});
function readLesson(b) {
  return {
    levelId: clean(b.levelId, 40), order: Number(b.order) || 1, title: clean(b.title, 140).trim(), titleKo: clean(b.titleKo, 80).trim(),
    summary: clean(b.summary, 600), videoUrl: clean(b.videoUrl, 500).trim(), published: b.published !== false,
    vocab: (Array.isArray(b.vocab) ? b.vocab : []).slice(0, 200).map(v => ({ ko: clean(v.ko, 80), rom: clean(v.rom, 80), uz: clean(v.uz, 160) })).filter(v => v.ko),
    grammar: (Array.isArray(b.grammar) ? b.grammar : []).slice(0, 40).map(g => ({ title: clean(g.title, 140), body: clean(g.body, 4000) })).filter(g => g.title || g.body)
  };
}
app.post('/api/admin/lessons', staff, (req, res) => {
  const d = readLesson(req.body);
  if (!d.title || !d.levelId) return res.status(400).json({ error: 'Sarlavha va daraja kerak' });
  const l = { id: uid(), ...d, authorId: req.user.id };
  db.lessons.push(l); save(); res.json({ lesson: l });
});
app.put('/api/admin/lessons/:id', staff, (req, res) => {
  const l = db.lessons.find(x => x.id === req.params.id);
  if (!l) return res.status(404).json({ error: 'Topilmadi' });
  if (!canEdit(l, req.user)) return res.status(403).json({ error: 'Bu dars sizniki emas' });
  const d = readLesson(req.body);
  if (!d.title || !d.levelId) return res.status(400).json({ error: 'Sarlavha va daraja kerak' });
  Object.assign(l, d); save(); res.json({ lesson: l });
});
app.delete('/api/admin/lessons/:id', staff, (req, res) => {
  const l = db.lessons.find(x => x.id === req.params.id);
  if (!l) return res.status(404).json({ error: 'Topilmadi' });
  if (!canEdit(l, req.user)) return res.status(403).json({ error: 'Bu dars sizniki emas' });
  db.lessons = db.lessons.filter(x => x.id !== l.id);
  db.progress = db.progress.filter(p => p.lessonId !== l.id); save(); res.json({ ok: true });
});

// Testlar
app.get('/api/admin/tests', staff, (req, res) => {
  res.json({ tests: db.tests.map(t => ({ id: t.id, title: t.title, kind: t.kind, levelId: t.levelId, lessonId: t.lessonId || null, count: t.questions.length, minutes: t.minutes, canEdit: canEdit(t, req.user) })), levels: db.levels.slice().sort((a, b) => a.order - b.order), lessons: db.lessons.map(l => ({ id: l.id, title: l.title, levelId: l.levelId })) });
});
app.get('/api/admin/tests/:id', staff, (req, res) => {
  const t = db.tests.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Topilmadi' });
  res.json({ test: t, canEdit: canEdit(t, req.user) });
});
function readTest(b) {
  const questions = (Array.isArray(b.questions) ? b.questions : []).slice(0, 300).map(q => {
    const options = (Array.isArray(q.options) ? q.options : []).slice(0, 6).map(o => clean(o, 200));
    return { q: clean(q.q, 600), options, answer: Math.min(Math.max(Number(q.answer) || 0, 0), Math.max(options.length - 1, 0)), explanation: clean(q.explanation, 600) };
  }).filter(q => q.q && q.options.filter(Boolean).length >= 2);
  return {
    title: clean(b.title, 140).trim(), levelId: clean(b.levelId, 40), lessonId: b.lessonId ? clean(b.lessonId, 40) : null,
    kind: ['lesson', 'final', 'mock'].includes(b.kind) ? b.kind : 'lesson', minutes: Math.min(Math.max(Number(b.minutes) || 10, 1), 180),
    passPercent: Math.min(Math.max(Number(b.passPercent) || 70, 1), 100), questions
  };
}
app.post('/api/admin/tests', staff, (req, res) => {
  const d = readTest(req.body);
  if (!d.title || !d.levelId) return res.status(400).json({ error: 'Sarlavha va daraja kerak' });
  if (!d.questions.length) return res.status(400).json({ error: 'Kamida bitta savol kerak' });
  const t = { id: uid(), ...d, authorId: req.user.id };
  db.tests.push(t); save(); res.json({ test: t });
});
app.put('/api/admin/tests/:id', staff, (req, res) => {
  const t = db.tests.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Topilmadi' });
  if (!canEdit(t, req.user)) return res.status(403).json({ error: 'Bu test sizniki emas' });
  const d = readTest(req.body);
  if (!d.title || !d.levelId) return res.status(400).json({ error: 'Sarlavha va daraja kerak' });
  if (!d.questions.length) return res.status(400).json({ error: 'Kamida bitta savol kerak' });
  Object.assign(t, d); save(); res.json({ test: t });
});
app.delete('/api/admin/tests/:id', staff, (req, res) => {
  const t = db.tests.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Topilmadi' });
  if (!canEdit(t, req.user)) return res.status(403).json({ error: 'Bu test sizniki emas' });
  db.tests = db.tests.filter(x => x.id !== t.id); save(); res.json({ ok: true });
});

// Jonli darslar jadvali
app.get('/api/admin/live', staff, (req, res) => res.json({ live: db.live.slice().sort((a, b) => b.time - a.time).map(x => ({ ...x, canEdit: canEdit({ authorId: x.teacherId }, req.user) })) }));
app.post('/api/admin/live', staff, (req, res) => {
  const time = new Date(req.body.time).getTime();
  if (!req.body.title || isNaN(time)) return res.status(400).json({ error: 'Nom va vaqt kerak' });
  const x = { id: uid(), title: clean(req.body.title, 140), time, link: clean(req.body.link, 400), teacherId: req.user.id };
  db.live.push(x); save(); res.json({ live: x });
});
app.delete('/api/admin/live/:id', staff, (req, res) => {
  const x = db.live.find(l => l.id === req.params.id);
  if (!x) return res.status(404).json({ error: 'Topilmadi' });
  if (!canEdit({ authorId: x.teacherId }, req.user)) return res.status(403).json({ error: 'Ruxsat yo\'q' });
  db.live = db.live.filter(l => l.id !== x.id); save(); res.json({ ok: true });
});

// Video yuklash
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, uid() + uid() + path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, ''))
  }),
  limits: { fileSize: 300 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /\.(mp4|webm|mov|m4v)$/i.test(file.originalname))
});
app.post('/api/admin/upload', staff, (req, res) => {
  upload.single('video')(req, res, err => {
    if (err) return res.status(400).json({ error: 'Yuklashda xato: ' + err.message });
    if (!req.file) return res.status(400).json({ error: 'Faqat mp4/webm/mov fayl yuklang' });
    res.json({ url: '/uploads/' + req.file.filename });
  });
});

// Darajalar (faqat admin)
app.post('/api/admin/levels', adminOnly, (req, res) => {
  if (!req.body.title) return res.status(400).json({ error: 'Nom kerak' });
  const l = { id: uid(), order: Number(req.body.order) || db.levels.length + 1, title: clean(req.body.title, 80), subtitle: clean(req.body.subtitle, 120), description: clean(req.body.description, 500), color: clean(req.body.color, 20) || '#6d5efc' };
  db.levels.push(l); save(); res.json({ level: l });
});
app.put('/api/admin/levels/:id', adminOnly, (req, res) => {
  const l = db.levels.find(x => x.id === req.params.id);
  if (!l) return res.status(404).json({ error: 'Topilmadi' });
  for (const k of ['title', 'subtitle', 'description', 'color']) if (req.body[k] != null) l[k] = clean(req.body[k], 500);
  if (req.body.order != null) l.order = Number(req.body.order) || l.order;
  save(); res.json({ level: l });
});
app.delete('/api/admin/levels/:id', adminOnly, (req, res) => {
  if (db.lessons.some(x => x.levelId === req.params.id) || db.tests.some(x => x.levelId === req.params.id)) return res.status(400).json({ error: 'Avval daraja ichidagi dars va testlarni o\'chiring' });
  db.levels = db.levels.filter(x => x.id !== req.params.id); save(); res.json({ ok: true });
});
app.get('/api/admin/levels', staff, (req, res) => res.json({ levels: db.levels.slice().sort((a, b) => a.order - b.order) }));

// Foydalanuvchilar (faqat admin)
app.get('/api/admin/users', adminOnly, (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  const users = db.users.filter(u => !q || u.name.toLowerCase().includes(q) || u.email.includes(q)).map(u => ({
    ...pub(u), lessons: db.progress.filter(p => p.userId === u.id).length, tests: db.results.filter(r => r.userId === u.id).length
  }));
  res.json({ users });
});
app.put('/api/admin/users/:id', adminOnly, (req, res) => {
  const u = db.users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'Topilmadi' });
  if (u.id === req.user.id && (req.body.role && req.body.role !== 'admin' || req.body.banned)) return res.status(400).json({ error: 'O\'zingizni o\'zgartira olmaysiz' });
  if (['student', 'teacher', 'admin'].includes(req.body.role)) u.role = req.body.role;
  if (typeof req.body.banned === 'boolean') u.banned = req.body.banned;
  if (req.body.password && String(req.body.password).length >= 6) u.hash = bcrypt.hashSync(String(req.body.password), 10);
  save(); res.json({ user: pub(u) });
});
app.delete('/api/admin/users/:id', adminOnly, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'O\'zingizni o\'chira olmaysiz' });
  db.users = db.users.filter(u => u.id !== req.params.id);
  db.progress = db.progress.filter(p => p.userId !== req.params.id);
  db.results = db.results.filter(r => r.userId !== req.params.id); save(); res.json({ ok: true });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Topilmadi' }));

/* ---------- Statik fayllar ---------- */
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
const DIST = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(DIST, {
  setHeaders: (res, file) => {
    if (/sw\.js$|index\.html$|manifest/.test(file)) res.setHeader('Cache-Control', 'no-cache');
    else if (/\/assets\//.test(file)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
}));
app.get('*', (req, res) => {
  const f = path.join(DIST, 'index.html');
  if (fs.existsSync(f)) res.sendFile(f); else res.status(200).send('Frontend hali build qilinmagan. "npm run build" ni ishga tushiring.');
});

app.listen(PORT, () => console.log('Koreys tili platformasi ishga tushdi: port ' + PORT + ' | admin: ' + ADMIN_EMAIL));
