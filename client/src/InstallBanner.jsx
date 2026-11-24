import React, { useEffect, useState } from 'react';

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

// Saytga kirganda pastdan chiqadigan "Ilovani o'rnatish" taklifi (PWA)
export default function InstallBanner() {
  const [evt, setEvt] = useState(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if (isStandalone() || sessionStorage.getItem('install-hidden')) return;
    const onPrompt = e => { e.preventDefault(); setEvt(e); setShow(true); };
    const onInstalled = () => { setShow(false); setEvt(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    let t;
    if (isIOS()) { setIos(true); t = setTimeout(() => setShow(true), 1500); }
    else t = setTimeout(() => setShow(s => s || true), 2500); // boshqa brauzerlarda ham ko'rsatamiz (qo'llanma bilan)
    return () => { clearTimeout(t); window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  if (!show) return null;
  const hide = () => { sessionStorage.setItem('install-hidden', '1'); setShow(false); };
  const install = async () => {
    if (evt) {
      evt.prompt();
      const r = await evt.userChoice.catch(() => null);
      setEvt(null);
      if (r && r.outcome === 'accepted') setShow(false); else hide();
    } else setHelp(h => !h);
  };

  return (
    <div className="install no-print" role="dialog" aria-label="Ilovani o'rnatish">
      <div className="install-in">
        <img src="/icons/icon-192.png" alt="" />
        <div>
          <b>Koreys tili ilovasini o'rnating</b>
          {help || ios
            ? (ios ? <span className="muted">Safari'da <b style={{ display: 'inline' }}>Ulashish ⬆️</b> → <b style={{ display: 'inline' }}>«Bosh ekranga qo'shish»</b> ni bosing.</span>
                : <span className="muted">Brauzer menyusi (⋮) → «Ilovani o'rnatish» yoki «Bosh ekranga qo'shish».</span>)
            : <span className="muted">Tezroq ochiladi, ekranda ikonka bo'ladi, oflayn ham ishlaydi.</span>}
        </div>
        {!ios && <button className="btn sm" onClick={install}>O'rnatish</button>}
        <button className="icon-btn" onClick={hide} aria-label="Yopish" style={{ width: 34, height: 34 }}>✕</button>
      </div>
    </div>
  );
}
