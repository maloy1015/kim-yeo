import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fmtDate } from '../api.js';

export default function Certificate() {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/certificate/' + id).then(d => setC(d.cert)).catch(e => setErr(e.message)); }, [id]);
  if (err) return <div className="container page"><div className="err">{err}</div><Link to="/results" className="btn ghost">← Orqaga</Link></div>;
  if (!c) return <div className="loading">Yuklanmoqda…</div>;
  return (
    <main className="container page">
      <div className="row no-print" style={{ marginBottom: 16 }}>
        <Link to="/results" className="btn ghost sm">← Natijalar</Link>
        <button className="btn sm" onClick={() => window.print()}>🖨 Chop etish / PDF saqlash</button>
      </div>
      <div className="cert">
        <div style={{ fontSize: 46 }}>🏅</div>
        <h1>SERTIFIKAT</h1>
        <div className="ko" style={{ fontSize: 22, color: '#8a6d00' }}>수료증 · Koreys tili kursi</div>
        <p style={{ marginTop: 28 }}>Ushbu sertifikat egasi</p>
        <div className="name">{c.name}</div>
        <p style={{ fontSize: 18, lineHeight: 1.7 }}>Koreys tili kursining <b>{c.level}</b> ({c.subtitle}) yakuniy imtihonini <b>{c.percent}%</b> natija bilan muvaffaqiyatli topshirdi.</p>
        <div className="row spread" style={{ marginTop: 40, fontSize: 14, color: '#6b6b7a' }}>
          <div>Sana: {fmtDate(c.date)}</div>
          <div>Sertifikat №: <b>{c.id}</b></div>
        </div>
      </div>
    </main>
  );
}
