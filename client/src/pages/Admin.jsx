import React, { useEffect, useState, useCallback } from 'react';
import { api, fmtDate, fmtDateTime, getToken } from '../api.js';
import { useAuth } from '../auth.jsx';

/* ---------- umumiy ---------- */
function useLoad(path, deps = []) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const reload = useCallback(() => { setErr(''); return api(path).then(setData).catch(e => setErr(e.message)); }, [path]);
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [reload, ...deps]);
  return [data, err, reload];
}
const Msg = ({ err, ok }) => (err ? <div className="err">{err}</div> : ok ? <div className="okmsg">{ok}</div> : null);

/* ---------- Statistika ---------- */
function Stats() {
  const [s, err] = useLoad('/admin/stats');
  if (err) return <Msg err={err} />;
  if (!s) return <div className="loading">Yuklanmoqda…</div>;
  const cards = [['👥', 'Foydalanuvchilar', s.users], ['🎓', 'O\'quvchilar', s.students], ['👩‍🏫', 'O\'qituvchilar', s.teachers], ['📚', 'Darslar', s.lessons], ['🎬', 'Videolar', s.videos], ['📝', 'Testlar', s.tests], ['✅', 'Topshirilgan', s.results], ['🏅', 'O\'tganlar', s.passed]];
  return (
    <>
      <div className="grid g4">{cards.map(c => <div className="card stat" key={c[1]}><div style={{ fontSize: 28 }}>{c[0]}</div><b>{c[2]}</b><span className="muted">{c[1]}</span></div>)}</div>
      <div className="grid g2" style={{ marginTop: 18 }}>
        <div className="card"><h3>Yangi foydalanuvchilar</h3>{s.recentUsers.map(u => <div key={u.id} className="row spread" style={{ padding: '6px 0' }}><span>{u.name} <span className="muted">· {u.email}</span></span><span className="chip">{u.role}</span></div>)}</div>
        <div className="card"><h3>So'nggi natijalar</h3>{s.recentResults.length === 0 && <span className="muted">Hali natija yo'q</span>}{s.recentResults.map(r => <div key={r.id} className="row spread" style={{ padding: '6px 0' }}><span>{r.user} <span className="muted">· {r.testTitle}</span></span><span className={'chip ' + (r.passed ? 'ok' : 'bad')}>{r.percent}%</span></div>)}</div>
      </div>
    </>
  );
}

/* ---------- Darslar ---------- */
const emptyLesson = lv => ({ title: '', titleKo: '', summary: '', levelId: lv || '', order: 1, videoUrl: '', published: true, vocab: [], grammar: [] });
const vocabToText = v => v.map(x => [x.ko, x.rom, x.uz].join(' | ')).join('\n');
const textToVocab = t => t.split('\n').map(l => l.split('|').map(s => s.trim())).filter(a => a[0]).map(a => ({ ko: a[0], rom: a[1] || '', uz: a[2] || '' }));

function LessonEditor({ id, levels, onClose }) {
  const [f, setF] = useState(null);
  const [vt, setVt] = useState('');
  const [err, setErr] = useState('');
  const [up, setUp] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  useEffect(() => {
    if (id === 'new') { setF(emptyLesson(levels[0] && levels[0].id)); return; }
    api('/admin/lessons/' + id).then(d => { setF(d.lesson); setVt(vocabToText(d.lesson.vocab)); setCanEdit(d.canEdit); }).catch(e => setErr(e.message));
  }, [id, levels]);
  if (!f) return <><Msg err={err} />{!err && <div className="loading">Yuklanmoqda…</div>}</>;
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const setG = (i, k, v) => { const g = f.grammar.slice(); g[i] = { ...g[i], [k]: v }; setF({ ...f, grammar: g }); };

  const upload = async e => {
    const file = e.target.files[0]; if (!file) return;
    setUp(true); setErr('');
    try { const fd = new FormData(); fd.append('video', file); const d = await api('/admin/upload', { method: 'POST', form: fd }); setF(x => ({ ...x, videoUrl: d.url })); }
    catch (er) { setErr(er.message); } finally { setUp(false); }
  };
  const save = async () => {
    setErr('');
    try {
      const body = { ...f, order: Number(f.order) || 1, vocab: textToVocab(vt) };
      if (id === 'new') await api('/admin/lessons', { method: 'POST', body }); else await api('/admin/lessons/' + id, { method: 'PUT', body });
      onClose(true);
    } catch (er) { setErr(er.message); }
  };

  return (
    <div className="card">
      <div className="row spread"><h3>{id === 'new' ? 'Yangi dars' : 'Darsni tahrirlash'}</h3><button className="btn ghost sm" onClick={() => onClose(false)}>← Ro'yxat</button></div>
      {!canEdit && <div className="err">Bu dars boshqa o'qituvchiniki – faqat ko'rishingiz mumkin.</div>}
      <div className="grid g2">
        <div><label>Sarlavha (o'zbekcha)</label><input value={f.title} onChange={set('title')} /></div>
        <div><label>Koreyscha sarlavha</label><input className="ko" value={f.titleKo} onChange={set('titleKo')} /></div>
        <div><label>Daraja</label><select value={f.levelId} onChange={set('levelId')}>{levels.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select></div>
        <div><label>Tartib raqami</label><input type="number" min="1" value={f.order} onChange={set('order')} /></div>
      </div>
      <label>Qisqacha tavsif</label><textarea value={f.summary} onChange={set('summary')} style={{ minHeight: 60 }} />
      <label>Video (havola: mp4 / YouTube) yoki fayl yuklang</label>
      <div className="row"><input value={f.videoUrl} onChange={set('videoUrl')} placeholder="https://youtu.be/... yoki /videos/dars.mp4" style={{ flex: 1, minWidth: 200 }} />
        <label className="btn ghost sm" style={{ margin: 0, color: 'var(--text)', cursor: 'pointer' }}>{up ? 'Yuklanmoqda…' : '⬆ Fayl yuklash'}<input type="file" accept="video/*" onChange={upload} hidden disabled={up} /></label></div>
      <label>Lug'at – har qatorda: <code>koreyscha | o'qilishi | tarjimasi</code></label>
      <textarea className="ko" value={vt} onChange={e => setVt(e.target.value)} style={{ minHeight: 160 }} placeholder="안녕하세요 | annyeonghaseyo | Salom" />
      <label>Qoida / grammatika bloklari</label>
      {f.grammar.map((g, i) => (
        <div className="qbox" key={i}>
          <input value={g.title} onChange={e => setG(i, 'title', e.target.value)} placeholder="Sarlavha" />
          <textarea value={g.body} onChange={e => setG(i, 'body', e.target.value)} placeholder="Tushuntirish va misollar" style={{ marginTop: 8 }} />
          <button className="btn danger sm" onClick={() => setF({ ...f, grammar: f.grammar.filter((_, k) => k !== i) })}>O'chirish</button>
        </div>
      ))}
      <button className="btn ghost sm" onClick={() => setF({ ...f, grammar: [...f.grammar, { title: '', body: '' }] })}>+ Blok qo'shish</button>
      <label className="row" style={{ gap: 8, textTransform: 'none' }}><input type="checkbox" checked={f.published} onChange={e => setF({ ...f, published: e.target.checked })} style={{ width: 18 }} /> O'quvchilarga ko'rinsin (nashr etilgan)</label>
      <Msg err={err} />
      <button className="btn" onClick={save} disabled={!canEdit} style={{ marginTop: 10 }}>Saqlash</button>
    </div>
  );
}

function Lessons() {
  const [d, err, reload] = useLoad('/admin/lessons');
  const [edit, setEdit] = useState(null);
  if (edit) return <LessonEditor id={edit} levels={d ? d.levels : []} onClose={ch => { setEdit(null); if (ch) reload(); }} />;
  if (err) return <Msg err={err} />;
  if (!d) return <div className="loading">Yuklanmoqda…</div>;
  const lv = Object.fromEntries(d.levels.map(l => [l.id, l.title]));
  const del = async l => { if (!window.confirm(`«${l.title}» darsini o'chirasizmi?`)) return; try { await api('/admin/lessons/' + l.id, { method: 'DELETE' }); reload(); } catch (e) { alert(e.message); } };
  return (
    <div className="card">
      <div className="row spread"><h3>Darslar ({d.lessons.length})</h3><button className="btn sm" onClick={() => setEdit('new')}>+ Yangi dars</button></div>
      <div className="scroll-x"><table className="tbl"><thead><tr><th>#</th><th>Dars</th><th>Daraja</th><th>Video</th><th>Holat</th><th /></tr></thead>
        <tbody>{d.lessons.map(l => (
          <tr key={l.id}><td>{l.order}</td><td><b>{l.title}</b> <span className="ko muted">{l.titleKo}</span></td><td className="muted">{lv[l.levelId]}</td>
            <td>{l.hasVideo ? '🎬' : '—'}</td><td><span className={'chip ' + (l.published ? 'ok' : 'warn')}>{l.published ? 'Nashr' : 'Qoralama'}</span></td>
            <td className="row" style={{ flexWrap: 'nowrap' }}><button className="btn ghost sm" onClick={() => setEdit(l.id)}>{l.canEdit ? 'Tahrirlash' : 'Ko\'rish'}</button>{l.canEdit && <button className="btn danger sm" onClick={() => del(l)}>✕</button>}</td></tr>
        ))}</tbody></table></div>
    </div>
  );
}

/* ---------- Testlar ---------- */
const emptyQ = () => ({ q: '', options: ['', '', '', ''], answer: 0, explanation: '' });

// "Savol? | A | B | C | D | to'g'ri harf (A-D)" – ommaviy qo'shish
function parseBulk(text) {
  const out = [];
  for (const line of text.split('\n')) {
    const p = line.split('|').map(s => s.trim());
    if (p.length < 4 || !p[0]) continue;
    const last = p[p.length - 1].toUpperCase();
    const hasKey = /^[A-F]$/.test(last);
    const opts = hasKey ? p.slice(1, -1) : p.slice(1);
    out.push({ q: p[0], options: opts, answer: hasKey ? Math.min('ABCDEF'.indexOf(last), opts.length - 1) : 0, explanation: '' });
  }
  return out;
}

function TestEditor({ id, levels, lessons, onClose }) {
  const [f, setF] = useState(null);
  const [err, setErr] = useState('');
  const [bulk, setBulk] = useState('');
  const [canEdit, setCanEdit] = useState(true);
  useEffect(() => {
    if (id === 'new') { setF({ title: '', levelId: levels[0] ? levels[0].id : '', lessonId: '', kind: 'lesson', minutes: 10, passPercent: 70, questions: [emptyQ()] }); return; }
    api('/admin/tests/' + id).then(d => { setF({ ...d.test, lessonId: d.test.lessonId || '' }); setCanEdit(d.canEdit); }).catch(e => setErr(e.message));
  }, [id, levels]);
  if (!f) return <><Msg err={err} />{!err && <div className="loading">Yuklanmoqda…</div>}</>;
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const setQ = (i, patch) => { const qs = f.questions.slice(); qs[i] = { ...qs[i], ...patch }; setF({ ...f, questions: qs }); };
  const setOpt = (i, j, v) => { const o = f.questions[i].options.slice(); o[j] = v; setQ(i, { options: o }); };
  const save = async () => {
    setErr('');
    try {
      const body = { ...f, lessonId: f.lessonId || null, minutes: Number(f.minutes), passPercent: Number(f.passPercent) };
      if (id === 'new') await api('/admin/tests', { method: 'POST', body }); else await api('/admin/tests/' + id, { method: 'PUT', body });
      onClose(true);
    } catch (er) { setErr(er.message); }
  };
  const addBulk = () => { const qs = parseBulk(bulk); if (!qs.length) { setErr('Format noto\'g\'ri. Har qatorda: Savol | A | B | C | D | to\'g\'ri harf'); return; } setErr(''); setF({ ...f, questions: [...f.questions.filter(q => q.q), ...qs] }); setBulk(''); };

  return (
    <div className="card">
      <div className="row spread"><h3>{id === 'new' ? 'Yangi test' : 'Testni tahrirlash'}</h3><button className="btn ghost sm" onClick={() => onClose(false)}>← Ro'yxat</button></div>
      {!canEdit && <div className="err">Bu test boshqa o'qituvchiniki – faqat ko'rishingiz mumkin.</div>}
      <div className="grid g2">
        <div><label>Test nomi</label><input value={f.title} onChange={set('title')} /></div>
        <div><label>Turi</label><select value={f.kind} onChange={set('kind')}><option value="lesson">Dars testi</option><option value="final">Yakuniy imtihon (sertifikat beradi)</option><option value="mock">Mashq imtihoni</option></select></div>
        <div><label>Daraja</label><select value={f.levelId} onChange={set('levelId')}>{levels.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select></div>
        <div><label>Bog'langan dars (ixtiyoriy)</label><select value={f.lessonId} onChange={set('lessonId')}><option value="">— yo'q —</option>{lessons.filter(l => l.levelId === f.levelId).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select></div>
        <div><label>Vaqt (daqiqa)</label><input type="number" min="1" value={f.minutes} onChange={set('minutes')} /></div>
        <div><label>O'tish bali (%)</label><input type="number" min="1" max="100" value={f.passPercent} onChange={set('passPercent')} /></div>
      </div>

      <h3 style={{ marginTop: 22 }}>Savollar ({f.questions.length})</h3>
      {f.questions.map((q, i) => (
        <div className="qbox" key={i}>
          <div className="row spread"><b>{i + 1}-savol</b><button className="btn danger sm" onClick={() => setF({ ...f, questions: f.questions.filter((_, k) => k !== i) })}>✕</button></div>
          <input className="ko" value={q.q} onChange={e => setQ(i, { q: e.target.value })} placeholder="Savol matni" />
          {q.options.map((o, j) => (
            <div className="row" key={j} style={{ marginTop: 8, flexWrap: 'nowrap' }}>
              <input type="radio" name={'c' + i} checked={q.answer === j} onChange={() => setQ(i, { answer: j })} style={{ width: 20, flex: 'none' }} title="To'g'ri javob" />
              <input className="ko" value={o} onChange={e => setOpt(i, j, e.target.value)} placeholder={'Variant ' + 'ABCD'[j]} />
            </div>
          ))}
          <input value={q.explanation || ''} onChange={e => setQ(i, { explanation: e.target.value })} placeholder="Izoh (ixtiyoriy)" style={{ marginTop: 8 }} />
        </div>
      ))}
      <button className="btn ghost sm" onClick={() => setF({ ...f, questions: [...f.questions, emptyQ()] })}>+ Savol qo'shish</button>

      <label>Ommaviy qo'shish – har qatorda: <code>Savol | A | B | C | D | to'g'ri harf</code></label>
      <textarea className="ko" value={bulk} onChange={e => setBulk(e.target.value)} placeholder="«물» nima degani? | Suv | Olma | Non | Tosh | A" />
      <button className="btn ghost sm" onClick={addBulk} style={{ marginTop: 8 }}>Qo'shish</button>
      <Msg err={err} />
      <div><button className="btn" onClick={save} disabled={!canEdit} style={{ marginTop: 14 }}>Saqlash</button></div>
    </div>
  );
}

function Tests() {
  const [d, err, reload] = useLoad('/admin/tests');
  const [edit, setEdit] = useState(null);
  if (edit) return <TestEditor id={edit} levels={d ? d.levels : []} lessons={d ? d.lessons : []} onClose={ch => { setEdit(null); if (ch) reload(); }} />;
  if (err) return <Msg err={err} />;
  if (!d) return <div className="loading">Yuklanmoqda…</div>;
  const lv = Object.fromEntries(d.levels.map(l => [l.id, l.title]));
  const del = async t => { if (!window.confirm(`«${t.title}» testini o'chirasizmi?`)) return; try { await api('/admin/tests/' + t.id, { method: 'DELETE' }); reload(); } catch (e) { alert(e.message); } };
  return (
    <div className="card">
      <div className="row spread"><h3>Testlar ({d.tests.length})</h3><button className="btn sm" onClick={() => setEdit('new')}>+ Yangi test</button></div>
      <div className="scroll-x"><table className="tbl"><thead><tr><th>Test</th><th>Daraja</th><th>Turi</th><th>Savol</th><th /></tr></thead>
        <tbody>{d.tests.map(t => (
          <tr key={t.id}><td><b>{t.title}</b></td><td className="muted">{lv[t.levelId]}</td>
            <td><span className={'chip ' + (t.kind === 'final' ? 'warn' : '')}>{t.kind === 'final' ? 'Yakuniy' : t.kind === 'mock' ? 'Mashq' : 'Dars'}</span></td><td>{t.count}</td>
            <td className="row" style={{ flexWrap: 'nowrap' }}><button className="btn ghost sm" onClick={() => setEdit(t.id)}>{t.canEdit ? 'Tahrirlash' : 'Ko\'rish'}</button>{t.canEdit && <button className="btn danger sm" onClick={() => del(t)}>✕</button>}</td></tr>
        ))}</tbody></table></div>
    </div>
  );
}

/* ---------- Jonli darslar ---------- */
function Live() {
  const [d, err, reload] = useLoad('/admin/live');
  const [f, setF] = useState({ title: '', time: '', link: '' });
  const [e2, setE2] = useState('');
  const add = async e => {
    e.preventDefault(); setE2('');
    try { await api('/admin/live', { method: 'POST', body: f }); setF({ title: '', time: '', link: '' }); reload(); } catch (er) { setE2(er.message); }
  };
  const del = async x => { try { await api('/admin/live/' + x.id, { method: 'DELETE' }); reload(); } catch (er) { alert(er.message); } };
  return (
    <div className="grid g2">
      <form className="card" onSubmit={add}>
        <h3>Jonli dars rejalashtirish</h3>
        <label>Mavzu</label><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} required placeholder="Masalan: Hangul takrorlash" />
        <label>Sana va vaqt</label><input type="datetime-local" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} required />
        <label>Zoom / Meet / Telegram havolasi</label><input value={f.link} onChange={e => setF({ ...f, link: e.target.value })} placeholder="https://..." />
        <Msg err={e2} /><button className="btn" style={{ marginTop: 14 }}>Qo'shish</button>
      </form>
      <div className="card"><h3>Rejadagi darslar</h3><Msg err={err} />
        {d && d.live.length === 0 && <span className="muted">Hozircha yo'q</span>}
        {d && d.live.map(x => <div className="row spread" key={x.id} style={{ padding: '8px 0', borderTop: '1px solid var(--card-b)' }}><div><b>{x.title}</b><div className="muted" style={{ fontSize: 13 }}>{fmtDateTime(x.time)}</div></div>{x.canEdit && <button className="btn danger sm" onClick={() => del(x)}>✕</button>}</div>)}
      </div>
    </div>
  );
}

/* ---------- Foydalanuvchilar (admin) ---------- */
function Users() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [d, err, reload] = useLoad('/admin/users?q=' + encodeURIComponent(q), []);
  const upd = async (u, body) => { try { await api('/admin/users/' + u.id, { method: 'PUT', body }); reload(); } catch (e) { alert(e.message); } };
  const del = async u => { if (!window.confirm(`${u.name} ni butunlay o'chirasizmi?`)) return; try { await api('/admin/users/' + u.id, { method: 'DELETE' }); reload(); } catch (e) { alert(e.message); } };
  const resetPw = u => { const p = window.prompt(`${u.name} uchun yangi parol (kamida 6 belgi):`); if (p) upd(u, { password: p }); };
  return (
    <div className="card">
      <div className="row spread"><h3>Foydalanuvchilar {d ? `(${d.users.length})` : ''}</h3><input placeholder="🔍 Ism yoki email" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 260 }} /></div>
      <Msg err={err} />
      <div className="scroll-x"><table className="tbl"><thead><tr><th>Ism</th><th>Email</th><th>Rol</th><th>Darslar</th><th>Testlar</th><th>Sana</th><th /></tr></thead>
        <tbody>{d && d.users.map(u => (
          <tr key={u.id} style={{ opacity: u.banned ? .5 : 1 }}>
            <td><b>{u.name}</b></td><td className="muted">{u.email}</td>
            <td><select value={u.role} onChange={e => upd(u, { role: e.target.value })} disabled={u.id === user.id} style={{ padding: '6px 8px' }}><option value="student">O'quvchi</option><option value="teacher">O'qituvchi</option><option value="admin">Admin</option></select></td>
            <td>{u.lessons}</td><td>{u.tests}</td><td className="muted">{fmtDate(u.createdAt)}</td>
            <td className="row" style={{ flexWrap: 'nowrap' }}>
              <button className="btn ghost sm" onClick={() => resetPw(u)} title="Parolni o'zgartirish">🔑</button>
              {u.id !== user.id && <><button className="btn ghost sm" onClick={() => upd(u, { banned: !u.banned })}>{u.banned ? 'Blokdan chiqarish' : 'Bloklash'}</button><button className="btn danger sm" onClick={() => del(u)}>✕</button></>}
            </td>
          </tr>
        ))}</tbody></table></div>
    </div>
  );
}

/* ---------- Darajalar (admin) ---------- */
function Levels() {
  const [d, err, reload] = useLoad('/admin/levels');
  const [f, setF] = useState({ title: '', subtitle: '', description: '', color: '#6d5efc', order: '' });
  const [e2, setE2] = useState('');
  const add = async e => { e.preventDefault(); setE2(''); try { await api('/admin/levels', { method: 'POST', body: f }); setF({ title: '', subtitle: '', description: '', color: '#6d5efc', order: '' }); reload(); } catch (er) { setE2(er.message); } };
  const save = async l => { try { await api('/admin/levels/' + l.id, { method: 'PUT', body: l }); reload(); } catch (er) { alert(er.message); } };
  const del = async l => { if (!window.confirm(`«${l.title}» darajasini o'chirasizmi?`)) return; try { await api('/admin/levels/' + l.id, { method: 'DELETE' }); reload(); } catch (er) { alert(er.message); } };
  const [edits, setEdits] = useState({});
  const val = (l, k) => (edits[l.id] && edits[l.id][k] != null ? edits[l.id][k] : l[k]);
  const ed = (l, k, v) => setEdits({ ...edits, [l.id]: { ...(edits[l.id] || {}), [k]: v } });
  return (
    <div className="grid g2">
      <form className="card" onSubmit={add}>
        <h3>Yangi daraja</h3>
        <label>Nomi</label><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} required />
        <label>Qisqa ta'rif</label><input value={f.subtitle} onChange={e => setF({ ...f, subtitle: e.target.value })} />
        <label>Tavsif</label><textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} style={{ minHeight: 60 }} />
        <div className="row"><div><label>Rang</label><input type="color" value={f.color} onChange={e => setF({ ...f, color: e.target.value })} style={{ width: 70, padding: 4 }} /></div><div style={{ flex: 1 }}><label>Tartib</label><input type="number" value={f.order} onChange={e => setF({ ...f, order: e.target.value })} /></div></div>
        <Msg err={e2} /><button className="btn" style={{ marginTop: 14 }}>Qo'shish</button>
      </form>
      <div className="card"><h3>Darajalar</h3><Msg err={err} />
        {d && d.levels.map(l => (
          <div className="qbox" key={l.id}>
            <input value={val(l, 'title')} onChange={e => ed(l, 'title', e.target.value)} />
            <input value={val(l, 'subtitle')} onChange={e => ed(l, 'subtitle', e.target.value)} style={{ marginTop: 8 }} />
            <div className="row" style={{ marginTop: 8 }}>
              <input type="color" value={val(l, 'color')} onChange={e => ed(l, 'color', e.target.value)} style={{ width: 60, padding: 3 }} />
              <input type="number" value={val(l, 'order')} onChange={e => ed(l, 'order', e.target.value)} style={{ width: 80 }} />
              <button className="btn sm" onClick={() => save({ ...l, ...(edits[l.id] || {}) })}>Saqlash</button>
              <button className="btn danger sm" onClick={() => del(l)}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Asosiy ---------- */
export default function Admin() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [tab, setTab] = useState('stats');
  const tabs = [['stats', '📊 Statistika'], ['lessons', '📚 Darslar'], ['tests', '📝 Testlar'], ['live', '🎥 Jonli darslar'], ...(isAdmin ? [['users', '👥 Foydalanuvchilar'], ['levels', '🧭 Darajalar']] : [])];
  return (
    <main className="container page">
      <h1>{isAdmin ? 'Admin panel' : 'O\'qituvchi paneli'}</h1>
      <div className="tabs">{tabs.map(t => <button key={t[0]} className={'tab' + (tab === t[0] ? ' active' : '')} onClick={() => setTab(t[0])}>{t[1]}</button>)}</div>
      {tab === 'stats' && <Stats />}
      {tab === 'lessons' && <Lessons />}
      {tab === 'tests' && <Tests />}
      {tab === 'live' && <Live />}
      {tab === 'users' && isAdmin && <Users />}
      {tab === 'levels' && isAdmin && <Levels />}
    </main>
  );
}
