const TOKEN_KEY = 'ktoken';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = t => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const t = getToken();
  if (t) headers.Authorization = 'Bearer ' + t;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try { res = await fetch('/api' + path, { method, headers, body: payload }); }
  catch (e) { throw new Error('Internetga ulanib bo\'lmadi'); }
  let data = null;
  try { data = await res.json(); } catch (e) { /* bo'sh javob */ }
  if (!res.ok) {
    if (res.status === 401 && t) { setToken(null); window.dispatchEvent(new Event('auth-expired')); }
    throw new Error((data && data.error) || 'Xatolik yuz berdi');
  }
  return data;
}

// Koreys tilida talaffuz (brauzer ovozi)
export function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR'; u.rate = 0.85;
  const v = window.speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith('ko'));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

export const fmtDate = ms => new Date(ms).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });
export const fmtDateTime = ms => new Date(ms).toLocaleString('uz-UZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
