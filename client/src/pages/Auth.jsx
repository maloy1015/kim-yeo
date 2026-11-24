import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

function Form({ mode }) {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const isReg = mode === 'register';
  const set = k => e => setF({ ...f, [k]: e.target.value });

  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const u = isReg ? await register(f.name, f.email, f.password) : await login(f.email, f.password);
      const back = loc.state && loc.state.from;
      nav(back || (u.role === 'student' ? '/app' : '/admin'), { replace: true });
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  return (
    <main className="container auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h2>{isReg ? 'Ro\'yxatdan o\'tish' : 'Kirish'} <span className="ko">👋</span></h2>
        <p className="muted" style={{ marginTop: 0 }}>{isReg ? 'Bir daqiqada akkaunt yarating va o\'qishni boshlang.' : 'Davom ettirish uchun akkauntingizga kiring.'}</p>
        {isReg && (<><label>Ism</label><input value={f.name} onChange={set('name')} placeholder="Ismingiz" required autoComplete="name" /></>)}
        <label>Email</label>
        <input type="email" value={f.email} onChange={set('email')} placeholder="email@misol.uz" required autoComplete="email" />
        <label>Parol</label>
        <input type="password" value={f.password} onChange={set('password')} placeholder="Kamida 6 belgi" required minLength={6} autoComplete={isReg ? 'new-password' : 'current-password'} />
        {err && <div className="err">{err}</div>}
        <button className="btn lg" style={{ width: '100%', marginTop: 18 }} disabled={busy}>{busy ? 'Kuting…' : isReg ? 'Ro\'yxatdan o\'tish' : 'Kirish'}</button>
        <p className="muted" style={{ textAlign: 'center', marginBottom: 0 }}>
          {isReg ? <>Akkauntingiz bormi? <Link to="/login" className="grad-text"><b>Kirish</b></Link></> : <>Akkaunt yo'qmi? <Link to="/register" className="grad-text"><b>Ro'yxatdan o'ting</b></Link></>}
        </p>
      </form>
    </main>
  );
}
export const Login = () => <Form mode="login" />;
export const Register = () => <Form mode="register" />;
