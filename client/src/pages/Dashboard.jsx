import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDateTime } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState({});

  useEffect(() => {
    api('/overview').then(x => {
      setD(x);
      // birinchi tugallanmagan darajani ochamiz
      const first = x.levels.find(l => l.lessons.some(s => !s.done)) || x.levels[0];
      if (first) setOpen({ [first.id]: true });
    }).catch(e => setErr(e.message));
  }, []);

  if (err) return <div className="container page"><div className="err">{err}</div></div>;
  if (!d) return <div className="loading">Yuklanmoqda…</div>;

  const total = d.levels.reduce((a, l) => a + l.lessons.length, 0);
  const pct = total ? Math.round((d.stats.completed / total) * 100) : 0;
  // keyingi dars
  let next = null;
  for (const l of d.levels) { const s = l.lessons.find(x => !x.done); if (s) { next = { ...s, level: l }; break; } }

  return (
    <main className="container page">
      <div className="card" style={{ background: 'var(--grad)', border: 0, color: '#fff' }}>
        <div className="row spread">
          <div>
            <h2 style={{ margin: 0 }}>안녕하세요, {user.name.split(' ')[0]}! 👋</h2>
            <p style={{ margin: '6px 0 0', opacity: .9 }}>{pct}% tugallandi · {d.stats.completed}/{total} dars · {d.stats.passed} ta o'tilgan test</p>
          </div>
          {next && <Link to={`/lesson/${next.id}`} className="btn" style={{ background: '#fff', color: '#4b3fd6', boxShadow: 'none' }}>Davom etish: {next.title} →</Link>}
        </div>
        <div className="bar" style={{ marginTop: 16, background: 'rgba(255,255,255,.3)' }}><i style={{ width: pct + '%', background: '#fff' }} /></div>
      </div>

      {d.live.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <h3>🎥 Jonli darslar</h3>
          {d.live.map(x => (
            <div className="row spread" key={x.id} style={{ padding: '8px 0', borderTop: '1px solid var(--card-b)' }}>
              <div><b>{x.title}</b><div className="muted" style={{ fontSize: 13 }}>{fmtDateTime(x.time)} {x.teacher && '· ' + x.teacher}</div></div>
              {x.link && <a className="btn sm" href={x.link} target="_blank" rel="noreferrer">Qo'shilish</a>}
            </div>
          ))}
        </div>
      )}

      <h2 style={{ margin: '28px 0 14px' }}>O'quv dasturi</h2>
      <div className="grid">
        {d.levels.map(l => {
          const done = l.lessons.filter(x => x.done).length;
          const p = l.lessons.length ? Math.round((done / l.lessons.length) * 100) : 0;
          const isOpen = !!open[l.id];
          return (
            <div className="card" key={l.id}>
              <div className="level-head" onClick={() => setOpen({ ...open, [l.id]: !isOpen })}>
                <div className="level-ico" style={{ background: l.color }}>{l.order}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 18 }}>{l.title}</b>
                  <div className="muted" style={{ fontSize: 14 }}>{l.subtitle}</div>
                  <div className="bar" style={{ marginTop: 8, maxWidth: 320 }}><i style={{ width: p + '%' }} /></div>
                </div>
                <span className="chip">{done}/{l.lessons.length}</span>
                <span className="muted">{isOpen ? '▲' : '▼'}</span>
              </div>
              {isOpen && (
                <div style={{ marginTop: 14 }}>
                  <p className="muted" style={{ marginTop: 0 }}>{l.description}</p>
                  {l.lessons.map(s => (
                    <Link to={`/lesson/${s.id}`} className="lesson-row" key={s.id}>
                      <span className={'dot' + (s.done ? ' done' : '')}>{s.done ? '✓' : ''}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <b>{s.title}</b> {s.titleKo && <span className="ko muted" style={{ marginLeft: 6 }}>{s.titleKo}</span>}
                        <div className="muted" style={{ fontSize: 13 }}>{s.summary}</div>
                      </div>
                      {s.hasVideo && <span className="chip">🎬 video</span>}
                    </Link>
                  ))}
                  {l.tests.length > 0 && <h3 style={{ margin: '18px 0 6px', fontSize: 16 }}>📝 Testlar</h3>}
                  {l.tests.map(t => (
                    <Link to={`/test/${t.id}`} className="lesson-row" key={t.id}>
                      <span className="dot" style={{ borderColor: t.passed ? 'var(--ok)' : undefined }}>{t.passed ? '🏅' : '•'}</span>
                      <div style={{ flex: 1 }}><b>{t.title}</b><div className="muted" style={{ fontSize: 13 }}>{t.count} savol · {t.minutes} daqiqa</div></div>
                      {t.kind === 'final' && <span className="chip warn">Yakuniy imtihon</span>}
                      {t.best != null && <span className={'chip ' + (t.passed ? 'ok' : 'bad')}>{t.best}%</span>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
