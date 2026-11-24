import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import InstallBanner from './InstallBanner.jsx';
import Landing from './pages/Landing.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Lesson from './pages/Lesson.jsx';
import Test from './pages/Test.jsx';
import Results from './pages/Results.jsx';
import Certificate from './pages/Certificate.jsx';
import Admin from './pages/Admin.jsx';

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="loading">Yuklanmoqda…</div>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('theme', theme); }, [theme]);
  const staff = user && (user.role === 'admin' || user.role === 'teacher');

  return (
    <div className={user ? 'has-bn' : ''}>
      <header className="nav no-print">
        <div className="container nav-in">
          <Link to={user ? '/app' : '/'} className="brand"><span className="brand-logo ko">한</span><span>Koreys tili</span></Link>
          {user && (
            <nav className="nav-links">
              <NavLink to="/app">Darslar</NavLink>
              <NavLink to="/results">Natijalar</NavLink>
              {staff && <NavLink to="/admin">{user.role === 'admin' ? 'Admin panel' : 'O\'qituvchi paneli'}</NavLink>}
            </nav>
          )}
          <div className="nav-right">
            <button className="icon-btn" onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))} aria-label="Mavzu">{theme === 'dark' ? '☀️' : '🌙'}</button>
            {user ? (
              <button className="btn ghost sm" onClick={() => { logout(); nav('/'); }}>Chiqish</button>
            ) : (
              <>
                <Link to="/login" className="btn ghost sm">Kirish</Link>
                <Link to="/register" className="btn sm">Ro'yxatdan o'tish</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <Routes>
        <Route path="/" element={user ? <Navigate to="/app" replace /> : <Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/app" element={<Protected><Dashboard /></Protected>} />
        <Route path="/lesson/:id" element={<Protected><Lesson /></Protected>} />
        <Route path="/test/:id" element={<Protected><Test /></Protected>} />
        <Route path="/results" element={<Protected><Results /></Protected>} />
        <Route path="/certificate/:id" element={<Protected><Certificate /></Protected>} />
        <Route path="/admin" element={<Protected roles={['admin', 'teacher']}><Admin /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {user && (
        <nav className="bottom-nav no-print">
          <NavLink to="/app"><span>📚</span>Darslar</NavLink>
          <NavLink to="/results"><span>🏆</span>Natijalar</NavLink>
          {staff && <NavLink to="/admin"><span>⚙️</span>Panel</NavLink>}
        </nav>
      )}
      <InstallBanner />
    </div>
  );
}
