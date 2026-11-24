# 한국어 · Koreys tili platformasi (0 dan TOPIK gacha)

React (Vite) + Express. Firebase kerak emas. Ma'lumotlar `data/db.json` faylida saqlanadi.

## Imkoniyatlar
- Ro'yxatdan o'tish / kirish (JWT), rollar: **o'quvchi, o'qituvchi, admin**
- 7 ta daraja: Hangul → TOPIK I (1-2) → TOPIK II (3-6); 27 ta dars, 6 ta tarjimali video dars (har biri 2,5 daqiqa)
- Har bir dars: video, so'z boshi (🔊 koreyscha talaffuz), grammatika, mini-test
- 13 ta test (142 savol): mini-testlar + har daraja uchun yakuniy imtihon; 70% dan o'tsa **sertifikat** (PDF ga chop etish)
- Admin panel: statistika, darslar, testlar (savol muharriri), jonli dars jadvali, foydalanuvchilar, darajalar, video yuklash
- O'qituvchi paneli: o'z dars va testlarini qo'shadi/tahrirlaydi
- PWA: oflayn qobiq, o'rnatish, saytga kirganda pastda "O'rnatish" taklifi; qorong'i/yorug' mavzu

## Render.com ga joylash
1. Loyihani GitHub'ga yuklang (videolar `client/public/videos` ichida, ~52 MB).
2. Render → New → **Web Service** → repo'ni tanlang.
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Environment: `ADMIN_EMAIL`, `ADMIN_PASSWORD` (majburiy o'zgartiring!), `DATA_DIR=/var/data`
6. **Disk** qo'shing (Mount path: `/var/data`) — aks holda bepul rejimda har deploydan keyin foydalanuvchilar va natijalar o'chib ketadi.

Standart admin (env berilmasa): `admin@koreys.uz` / `Admin12345`

## Lokal ishga tushirish
```
npm install
npm run build
npm start        # http://localhost:3000
```
Ishlab chiqish: `npm start` (API) va boshqa terminalda `npm run dev:client` (http://localhost:5173).

## Yangi video qo'shish
Admin panel → Darslar → dars tahriri → "Video yuklash" yoki video havolasi (mp4 / YouTube).
