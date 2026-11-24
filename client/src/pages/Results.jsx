import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDate } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Results() {
  const { user, setUser } = useAuth();
  const [rs, setRs] = useState(null);
  const [name, setName] = useState(user.name);
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => { api('/results').then(d => setRs(d.results)).catch(() => setRs([])); }, []);
  const certs = (rs || []).filter(r => r.passed && r.kind === 'final');
  const saveProfile = async e => {
    e.preventDefault(); setMsg('');
    try { const d = await api('/me', { method: 'PUT', body: { name, password: pw || undefined } }); setUser(d.user); setPw(''); setMsg('Saqlandi ✓'); }
    catch (er) { setMsg(er.message); }
  };

  return (
    <main className="container page">
      <h1>Natijalarim</h1>
      {certs.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>🏅 Sertifikatlarim</h3>
          <div className="grid g3">
            {certs.map(c => (
              <Link to={`/certificate/${c.id}`} className="card" key={c.id} style={{ padding: 16 }}>
                <b>{c.levelTitle}</b><div className="muted" style={{ fontSize: 13 }}>{c.percent}% · {fmtDate(c.date)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="card">
        {!rs ? <div className="loading">Yuklanmoqda…</div> : rs.length === 0 ? <p className="muted">Hali test topshirmagansiz. <Link to="/app" className="grad-text"><b>Darslarga o'tish →</b></Link></p> : (
          <div className="scroll-x"><table className="tbl">
            <thead><tr><th>Test</th><th>Daraja</th><th>Natija</th><th>Sana</th><th /></tr></thead>
            <tbody>{rs.map(r => (
              <tr key={r.id}>
                <td><b>{r.testTitle}</b></td><td className="muted">{r.levelTitle}</td>
                <td><span className={'chip ' + (r.passed ? 'ok' : 'bad')}>{r.percent}% ({r.score}/{r.total})</span></td>
                <td className="muted">{fmtDate(r.date)}</td>
                <td>{r.passed && r.kind === 'final' && <Link className="btn sm" to={`/certificate/${r.id}`}>Sertifikat</Link>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
      <form className="card" style={{ marginTop: 20, maxWidth: 520 }} onSubmit={saveProfile}>
        <h3>⚙️ Profil</h3>
        <label>Ism (sertifikatda shu ism chiqadi)</label><input value={name} onChange={e => setName(e.target.value)} required />
        <label>Yangi parol (ixtiyoriy)</label><input type="password" value={pw} onChange={e => setPw(e.target.value)} minLength={6} placeholder="O'zgartirmaslik uchun bo'sh qoldiring" />
        {msg && <div className={msg.includes('✓') ? 'okmsg' : 'err'}>{msg}</div>}
        <button className="btn" style={{ marginTop: 14 }}>Saqlash</button>
      </form>
    </main>
  );
}
