import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api, speak } from '../api.js';

function Video({ url }) {
  if (!url) return <div className="video-empty"><div><div style={{ fontSize: 40 }}>🎬</div>Bu dars uchun video tez orada qo'shiladi.<br />Hozircha lug'at va qoidalarni o'rganing.</div></div>;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (yt) return <div className="video-box"><iframe src={`https://www.youtube.com/embed/${yt[1]}`} title="Video dars" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /></div>;
  return <div className="video-box"><video src={url} controls playsInline preload="metadata" controlsList="nodownload" /></div>;
}

export default function Lesson() {
  const { id } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setD(null); setErr('');
    api('/lessons/' + id).then(x => { setD(x); setDone(x.done); window.scrollTo(0, 0); }).catch(e => setErr(e.message));
  }, [id]);

  if (err) return <div className="container page"><div className="err">{err}</div><Link to="/app" className="btn ghost">← Orqaga</Link></div>;
  if (!d) return <div className="loading">Yuklanmoqda…</div>;
  const l = d.lesson;

  const toggle = async () => {
    try { await api(`/lessons/${l.id}/complete`, { method: done ? 'DELETE' : 'POST' }); setDone(!done); } catch (e) { setErr(e.message); }
  };
  const finish = async () => {
    if (!done) { try { await api(`/lessons/${l.id}/complete`, { method: 'POST' }); setDone(true); } catch (e) { /* e'tiborsiz */ } }
    nav(d.testId ? `/test/${d.testId}` : d.next ? `/lesson/${d.next}` : '/app');
  };

  return (
    <main className="container page">
      <div className="row" style={{ marginBottom: 14 }}>
        <Link to="/app" className="btn ghost sm">← Darslar</Link>
        {d.level && <span className="chip">{d.level.title}</span>}
        {done && <span className="chip ok">✓ Tugallangan</span>}
      </div>
      <h1 style={{ marginBottom: 4 }}>{l.title} {l.titleKo && <span className="ko muted" style={{ fontSize: '.6em' }}>{l.titleKo}</span>}</h1>
      <p className="muted" style={{ marginTop: 0 }}>{l.summary}</p>

      <Video url={l.videoUrl} />

      {l.vocab.length > 0 && (
        <div className="card" style={{ marginTop: 22 }}>
          <h2>📖 Lug'at <span className="muted" style={{ fontSize: 14, fontWeight: 500 }}>({l.vocab.length} ta) – 🔊 ni bosib eshiting</span></h2>
          <div className="scroll-x">
            <table className="vocab">
              <thead><tr><th>Koreyscha</th><th>O'qilishi</th><th>Tarjima</th><th /></tr></thead>
              <tbody>
                {l.vocab.map((v, i) => (
                  <tr key={i}>
                    <td className="k ko">{v.ko}</td>
                    <td className="muted">{v.rom}</td>
                    <td>{v.uz}</td>
                    <td><button className="say" onClick={() => speak(v.ko)} aria-label="Eshitish">🔊</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {l.grammar.length > 0 && (
        <div className="card" style={{ marginTop: 22 }}>
          <h2>✍️ Qoida va misollar</h2>
          {l.grammar.map((g, i) => (
            <div className="gram" key={i}>
              <h3 className="ko">{g.title}</h3>
              <p>{g.body}</p>
            </div>
          ))}
        </div>
      )}

      <div className="row spread" style={{ marginTop: 26 }}>
        <div className="row">
          {d.prev && <Link to={`/lesson/${d.prev}`} className="btn ghost">← Oldingi</Link>}
          <button className={'btn ' + (done ? 'ghost' : '')} onClick={toggle}>{done ? '✓ Tugallandi (bekor qilish)' : 'Tugallandi deb belgilash'}</button>
        </div>
        <button className="btn" onClick={finish}>{d.testId ? 'Testga o\'tish →' : d.next ? 'Keyingi dars →' : 'Yakunlash'}</button>
      </div>
    </main>
  );
}
