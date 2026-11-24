import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';

const LET = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function Test() {
  const { id } = useParams();
  const [t, setT] = useState(null);
  const [err, setErr] = useState('');
  const [i, setI] = useState(0);
  const [ans, setAns] = useState([]);
  const [left, setLeft] = useState(0);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(Date.now());
  const submitted = useRef(false);

  useEffect(() => {
    api('/tests/' + id).then(x => { setT(x.test); setLeft(x.test.minutes * 60); started.current = Date.now(); }).catch(e => setErr(e.message));
  }, [id]);

  const submit = async (answers) => {
    if (submitted.current) return; submitted.current = true; setBusy(true);
    try {
      const r = await api(`/tests/${id}/submit`, { method: 'POST', body: { answers, seconds: Math.round((Date.now() - started.current) / 1000) } });
      setRes(r); window.scrollTo(0, 0);
    } catch (e) { setErr(e.message); submitted.current = false; } finally { setBusy(false); }
  };

  // taymer
  const ansRef = useRef([]); ansRef.current = ans;
  useEffect(() => {
    if (!t || res) return;
    const h = setInterval(() => setLeft(s => s - 1), 1000);
    return () => clearInterval(h);
  }, [t, res]);
  useEffect(() => { if (t && !res && left <= 0) submit(ansRef.current); /* eslint-disable-next-line */ }, [left]);

  if (err) return <div className="container page"><div className="err">{err}</div><Link to="/app" className="btn ghost">← Orqaga</Link></div>;
  if (!t) return <div className="loading">Yuklanmoqda…</div>;

  if (res) {
    const r = res.result;
    return (
      <main className="container page" style={{ maxWidth: 760 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="score-ring" style={{ background: `conic-gradient(${r.passed ? 'var(--ok)' : 'var(--bad)'} ${r.percent * 3.6}deg, var(--card-b) 0)` }}>
            <div style={{ background: 'var(--bg)', width: 122, height: 122, borderRadius: '50%', display: 'grid', placeItems: 'center' }}>{r.percent}%</div>
          </div>
          <h2 style={{ marginTop: 18 }}>{r.passed ? '🎉 Tabriklaymiz, o\'tdingiz!' : 'Yana urinib ko\'ring 💪'}</h2>
          <p className="muted">{r.score} / {r.total} to'g'ri · o'tish bali {t.passPercent}%</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            {r.passed && r.kind === 'final' && <Link className="btn" to={`/certificate/${r.id}`}>🏅 Sertifikatni olish</Link>}
            <button className="btn ghost" onClick={() => window.location.reload()}>Qayta topshirish</button>
            <Link className="btn ghost" to="/app">Darslarga qaytish</Link>
          </div>
        </div>
        <h3 style={{ margin: '26px 0 6px' }}>Javoblar tahlili</h3>
        {res.review.map((q, k) => (
          <div className="card" key={k} style={{ marginTop: 12 }}>
            <div className="row"><span className={'chip ' + (q.correct ? 'ok' : 'bad')}>{q.correct ? '✓ To\'g\'ri' : '✕ Noto\'g\'ri'}</span><span className="muted">{k + 1}-savol</span></div>
            <div className="qtext ko" style={{ fontSize: 20 }}>{q.q}</div>
            {q.options.map((o, j) => (
              <div key={j} className={'opt ' + (j === q.answer ? 'right' : j === q.chosen ? 'wrong' : '')} style={{ cursor: 'default', margin: '6px 0', padding: '10px 14px' }}>
                <b>{LET[j]}</b><span className="ko">{o}</span>
              </div>
            ))}
            {q.explanation && <p className="muted" style={{ marginBottom: 0 }}>💡 {q.explanation}</p>}
          </div>
        ))}
      </main>
    );
  }

  const q = t.questions[i];
  const mm = String(Math.max(0, Math.floor(left / 60))).padStart(2, '0');
  const ss = String(Math.max(0, left % 60)).padStart(2, '0');
  const answered = ans.filter(a => a != null).length;
  const pick = j => { const n = ans.slice(); n[i] = j; setAns(n); };

  return (
    <main className="container page" style={{ maxWidth: 760 }}>
      <div className="row spread">
        <div><span className="chip">{t.kind === 'final' ? 'Yakuniy imtihon' : 'Test'}</span> <b style={{ marginLeft: 8 }}>{t.title}</b></div>
        <span className={'chip ' + (left < 60 ? 'bad' : 'warn')} style={{ fontSize: 15 }}>⏱ {mm}:{ss}</span>
      </div>
      <div className="bar" style={{ margin: '14px 0' }}><i style={{ width: ((i + 1) / t.questions.length) * 100 + '%' }} /></div>
      <div className="muted">Savol {i + 1} / {t.questions.length} · javob berilgan: {answered}</div>
      <div className="qtext ko">{q.q}</div>
      {q.options.map((o, j) => (
        <button key={j} className={'opt' + (ans[i] === j ? ' sel' : '')} onClick={() => pick(j)}>
          <b>{LET[j]}</b><span className="ko">{o}</span>
        </button>
      ))}
      <div className="row spread" style={{ marginTop: 22 }}>
        <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}>← Oldingi</button>
        {i < t.questions.length - 1
          ? <button className="btn" onClick={() => setI(i + 1)}>Keyingi →</button>
          : <button className="btn" disabled={busy} onClick={() => { if (answered < t.questions.length && !window.confirm(`${t.questions.length - answered} ta savolga javob berilmagan. Baribir yakunlaysizmi?`)) return; submit(ans); }}>{busy ? 'Tekshirilmoqda…' : 'Yakunlash ✓'}</button>}
      </div>
      <div className="row" style={{ marginTop: 18, gap: 6 }}>
        {t.questions.map((_, k) => (
          <button key={k} onClick={() => setI(k)} className="icon-btn" style={{ width: 34, height: 34, fontSize: 13, fontWeight: 700, background: k === i ? 'var(--p)' : ans[k] != null ? 'rgba(109,94,252,.3)' : undefined, color: k === i ? '#fff' : undefined }}>{k + 1}</button>
        ))}
      </div>
    </main>
  );
}
