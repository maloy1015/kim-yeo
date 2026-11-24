import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const FEATURES = [
  ['🎬', 'Video darslar', 'Koreyscha + o\'zbekcha tarjima, har bir so\'z misol bilan.'],
  ['📝', 'Testlar va imtihonlar', 'Har dars uchun test, har daraja uchun yakuniy imtihon.'],
  ['🏅', 'Sertifikat', 'Yakuniy imtihondan o\'tsangiz – yuklab olinadigan sertifikat.'],
  ['🔊', 'Talaffuz', 'Har bir so\'zni bosib, koreyscha talaffuzini eshiting.'],
  ['👩‍🏫', 'O\'qituvchilar', 'O\'qituvchilar yangi dars, test va jonli dars qo\'sha oladi.'],
  ['📱', 'Ilova kabi ishlaydi', 'Telefoningizga o\'rnating – tez va oflayn qobiq bilan.']
];

export default function Landing() {
  const [info, setInfo] = useState(null);
  useEffect(() => { api('/public/levels').then(setInfo).catch(() => {}); }, []);
  const levels = info ? info.levels : [];
  return (
    <main className="container">
      <section className="hero">
        <div>
          <span className="chip">🇰🇷 한국어 · Koreys tili</span>
          <h1 style={{ marginTop: 14 }}>Koreys tilini <span className="grad-text">noldan TOPIK</span> darajasigacha o'rganing</h1>
          <p>Hangul alifbosidan boshlab, TOPIK II 6-darajagacha – video darslar, testlar va sertifikat bitta joyda. Hammasi o'zbek tilida tushuntiriladi.</p>
          <div className="row" style={{ marginTop: 22 }}>
            <Link to="/register" className="btn lg">Bepul boshlash →</Link>
            <Link to="/login" className="btn ghost lg">Kirish</Link>
          </div>
          <div className="stats">
            <div><b>{levels.length || 7}</b><span className="muted">daraja</span></div>
            <div><b>{info ? info.videos : 6}+</b><span className="muted">video dars</span></div>
            <div><b>{levels.reduce((a, l) => a + l.lessons, 0) || 27}</b><span className="muted">mavzu</span></div>
          </div>
        </div>
        <div className="hero-art">
          <div className="hero-card ko">한글</div>
          <div className="bubble ko" style={{ top: '6%', left: '2%' }}>안녕하세요! 👋</div>
          <div className="bubble ko" style={{ bottom: '10%', right: '0%', animationDelay: '1s' }}>감사합니다 ✨</div>
          <div className="bubble ko" style={{ bottom: '2%', left: '8%', animationDelay: '2s' }}>TOPIK 🏅</div>
        </div>
      </section>

      <section style={{ padding: '30px 0' }}>
        <h2>Nimalar bor?</h2>
        <div className="grid g3" style={{ marginTop: 16 }}>
          {FEATURES.map(f => (
            <div className="card" key={f[1]}><div className="feat">{f[0]}</div><h3>{f[1]}</h3><p className="muted" style={{ margin: 0 }}>{f[2]}</p></div>
          ))}
        </div>
      </section>

      <section style={{ padding: '30px 0 120px' }}>
        <h2>O'qish yo'l xaritasi</h2>
        <div className="road" style={{ marginTop: 16 }}>
          {levels.map(l => (
            <div className="road-item" key={l.id}>
              <div className="road-dot" style={{ background: l.color }}>{l.order}</div>
              <div style={{ flex: 1 }}><b>{l.title}</b><div className="muted" style={{ fontSize: 14 }}>{l.description}</div></div>
              <span className="chip">{l.lessons} dars · {l.tests} test</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
