const VV = require('./video-vocab.json');
// raqamlar: bir xil ma'noli (2, 3, ...) variantlar chalkashmasligi uchun tizim nomi qo'shiladi
VV.numbers.items.forEach((it, i) => { if (!/\(/.test(it.uz)) it.uz += i < 10 ? ' (xitoycha)' : ' (sof koreys)'; });

// "ko|rom|uz;ko|rom|uz" -> [{ko,rom,uz}]
const V = s => s.split(';').map(x => x.trim()).filter(Boolean).map(x => { const [ko, rom, uz] = x.split('|').map(y => y.trim()); return { ko, rom, uz }; });

function rngFrom(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function shuffle(arr, rnd) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// 4 ta variantli savol; to'g'ri javob o'rni aralashtiriladi
function mk(q, correct, wrongs, rnd, explanation) {
  const uniq = Array.from(new Set(wrongs)).filter(w => w !== correct);
  const opts = shuffle([correct, ...uniq.slice(0, 3)], rnd);
  return { q, options: opts, answer: opts.indexOf(correct), explanation: explanation || '' };
}

// Video darsning lug'atidan avtomatik test (ko -> ma'no va ma'no -> ko)
function vocabQuestions(items, useRom, seed, count) {
  const rnd = rngFrom(seed);
  const meaning = it => (useRom ? it.rom : it.uz);
  const pool = shuffle(items, rnd);
  const qs = [];
  pool.slice(0, Math.ceil(count / 2)).forEach(it => {
    const wr = shuffle(items.filter(x => meaning(x) !== meaning(it)), rnd).map(meaning);
    qs.push(mk(useRom ? `«${it.ko}» harfi qaysi tovushni bildiradi?` : `«${it.ko}» nima degani?`, meaning(it), wr, rnd, `${it.ko} (${it.rom}) – ${it.uz}`));
  });
  if (!useRom) {
    pool.slice(Math.ceil(count / 2), count).forEach(it => {
      const wr = shuffle(items.filter(x => x.ko !== it.ko), rnd).map(x => x.ko);
      qs.push(mk(`Koreyscha qaysi biri: «${it.uz}»?`, it.ko, wr, rnd, `${it.ko} (${it.rom}) – ${it.uz}`));
    });
  } else {
    pool.slice(Math.ceil(count / 2), count).forEach(it => {
      const wr = shuffle(items.filter(x => x.ko !== it.ko), rnd).map(x => x.ko);
      qs.push(mk(`«${it.rom}» tovushi qaysi harfga to'g'ri keladi?`, it.ko, wr, rnd, `${it.ko} – ${it.rom}`));
    });
  }
  return shuffle(qs, rnd);
}

// qo'lda yozilgan savol: q(savol, [variantlar], to'g'ri indeks, izoh)
const rq = rngFrom(99);
const q = (text, options, answer, explanation) => {
  const correct = options[answer];
  const o = shuffle(options, rq);
  return { q: text, options: o, answer: o.indexOf(correct), explanation: explanation || '' };
};

function buildSeed(uid) {
  const COL = ['#6d5efc', '#00b894', '#ff7a3d', '#e84393', '#0984e3', '#a55eea', '#f5a623'];
  const L = [
    ['Hangul (한글)', '0-daraja · Alifbo', 'Koreys alifbosini 1-2 haftada o\'rganing: unli, undosh, qo\'sh undoshlar va batchim.'],
    ['TOPIK I – 1-daraja', '1-daraja · Boshlang\'ich (80+ ball)', 'Salomlashish, tanishuv, raqamlar, oila, ovqat va eng oddiy gaplar.'],
    ['TOPIK I – 2-daraja', '2-daraja · Elementar (140+ ball)', 'Hozirgi va o\'tgan zamon, qo\'shimchalar, xarid, yo\'nalish va kundalik hayot.'],
    ['TOPIK II – 3-daraja', '3-daraja · O\'rta (120+ ball)', 'Sabab, shart, niyat, rejalar – kundalik muloqot va oddiy matnlar.'],
    ['TOPIK II – 4-daraja', '4-daraja · O\'rta-yuqori (150+ ball)', 'Murakkab bog\'lovchilar, taxmin, tajriba, majhul nisbat.'],
    ['TOPIK II – 5-daraja', '5-daraja · Ilg\'or (190+ ball)', 'Bilvosita nutq, sabab-oqibat, rasmiy va akademik uslub.'],
    ['TOPIK II – 6-daraja', '6-daraja · Mukammal (230+ ball)', 'Yangiliklar uslubi, nozik ma\'no ottenkalari va yozma ish (쓰기) strategiyasi.']
  ].map((x, i) => ({ id: 'lv' + i, order: i, title: x[0], subtitle: x[1], description: x[2], color: COL[i] }));

  const lessons = [];
  const tests = [];
  let ord = {};
  const addLesson = (lv, id, title, titleKo, summary, vocab, grammar, video) => {
    ord[lv] = (ord[lv] || 0) + 1;
    lessons.push({ id, levelId: 'lv' + lv, order: ord[lv], title, titleKo, summary, videoUrl: video || '', published: true, vocab, grammar, authorId: null });
  };
  const fromVideo = (key) => VV[key].items.map(i => ({ ko: i.ko, rom: i.rom, uz: i.uz }));
  const videoGrammar = key => VV[key].items.slice(0, 6).map(i => ({ title: `${i.ko} – ${i.uz}`, body: `Misol: ${i.ex.ko} (${i.ex.rom}) – ${i.ex.uz}` }));
  const addTest = (lv, id, title, kind, minutes, lessonId, questions) => tests.push({ id, levelId: 'lv' + lv, lessonId: lessonId || null, title, kind, minutes, passPercent: 70, questions, authorId: null });

  /* ===== 0-daraja: Hangul ===== */
  addLesson(0, 'l-vowels', 'Hangul: unli harflar', '한글 모음', '10 ta asosiy va 2 ta qo\'sh unli (ㅏ, ㅓ, ㅗ, ㅜ, ㅡ, ㅣ ...) – talaffuz va misollar.', fromVideo('hangul-vowels'),
    [{ title: 'Hangul qanday tuzilgan?', body: 'Koreys alifbosi 1443-yilda qirol Sejong tomonidan yaratilgan. Harflar bo\'g\'in (block) shaklida yoziladi: undosh + unli (+ oxirgi undosh – batchim). Masalan: 한 = ㅎ + ㅏ + ㄴ.' }, { title: 'Yozish tartibi', body: 'Harflar chapdan o\'ngga va yuqoridan pastga yoziladi. Vertikal unlilar (ㅏ, ㅣ) undoshning o\'ng tomoniga, gorizontal unlilar (ㅗ, ㅜ, ㅡ) undoshning pastiga qo\'yiladi.' }, ...videoGrammar('hangul-vowels')], '/videos/hangul-vowels.mp4');
  addLesson(0, 'l-consonants', 'Hangul: undosh harflar', '한글 자음', '14 ta asosiy undosh: ㄱ, ㄴ, ㄷ, ㄹ, ㅁ, ㅂ, ㅅ, ㅇ, ㅈ, ㅊ, ㅋ, ㅌ, ㅍ, ㅎ.', fromVideo('hangul-consonants'),
    [{ title: 'ㅇ harfi', body: 'Bo\'g\'in boshida ㅇ tovushsiz (faqat unlini ko\'rsatadi): 아 = «a». Bo\'g\'in oxirida esa «ng» o\'qiladi: 강 = «gang».' }, { title: 'Kuchsiz va kuchli undoshlar', body: 'ㄱ/ㅋ, ㄷ/ㅌ, ㅂ/ㅍ, ㅈ/ㅊ juftliklarida ikkinchisi nafas bilan (kuchliroq) aytiladi.' }, ...videoGrammar('hangul-consonants')], '/videos/hangul-consonants.mp4');
  addLesson(0, 'l-batchim', 'Qo\'sh undoshlar va batchim', '쌍자음과 받침', 'ㄲ ㄸ ㅃ ㅆ ㅉ va bo\'g\'in oxiridagi undosh (받침) qoidalari.',
    V('까치|kkachi|zag\'izg\'on;딸기|ttalgi|qulupnay;빵|ppang|non (bulka);쌀|ssal|guruch (xom);짜장면|jjajangmyeon|jajangmyon (lagmon);책|chaek|kitob;한국|hanguk|Koreya;꽃|kkot|gul;사랑|sarang|sevgi'),
    [{ title: 'Qo\'sh undoshlar (쌍자음)', body: 'ㄲ, ㄸ, ㅃ, ㅆ, ㅉ – kuchli, tarang aytiladigan undoshlar (nafas chiqarmasdan). 빵 (ppang) – non, 딸기 (ttalgi) – qulupnay.' }, { title: 'Batchim (받침)', body: 'Bo\'g\'in oxiridagi undosh. Yetti xil tovush beradi: ㄱ(k), ㄴ(n), ㄷ(t), ㄹ(l), ㅁ(m), ㅂ(p), ㅇ(ng). Masalan: 책 [chaek] – oxirida ㄱ → «k»; 꽃 [kkot] – ㅊ → «t» kabi o\'qiladi.' }]);
  addTest(0, 't-vowels', 'Unli harflar testi', 'lesson', 6, 'l-vowels', vocabQuestions(VV['hangul-vowels'].items, true, 11, 10));
  addTest(0, 't-consonants', 'Undosh harflar testi', 'lesson', 7, 'l-consonants', vocabQuestions(VV['hangul-consonants'].items, true, 12, 10));
  addTest(0, 't-final0', 'Hangul yakuniy imtihoni', 'final', 12, null, [
    q('ㅏ harfi qaysi tovushni bildiradi?', ['a', 'o', 'u', 'i'], 0),
    q('«물» so\'zi nima degani?', ['Suv', 'Olma', 'Tog\'', 'Non'], 0, '물 (mul) – suv'),
    q('Quyidagilardan qaysi biri undosh?', ['ㅗ', 'ㅁ', 'ㅣ', 'ㅜ'], 1),
    q('Koreys alifbosini kim yaratgan?', ['Qirol Sejong (세종대왕)', 'Yi Sun-sin', 'Gwanggaeto', 'Park Chung-hee'], 0, 'Hangul 1443-yilda yaratilgan, 1446-yilda e\'lon qilingan.'),
    q('Bo\'g\'in oxiridagi undosh nima deb ataladi?', ['Batchim (받침)', 'Jamo', 'Hanja', 'Sijo'], 0),
    q('«사과» nima degani?', ['Olma', 'Uzum', 'Banan', 'Qahva'], 0),
    q('Bo\'g\'in boshidagi ㅇ qanday o\'qiladi?', ['Tovushsiz', '«n»', '«m»', '«r»'], 0),
    q('«yu» tovushini qaysi harf beradi?', ['ㅠ', 'ㅜ', 'ㅛ', 'ㅡ'], 0),
    q('«아이» nima degani?', ['Bola', 'Tish', 'Ona', 'It'], 0),
    q('ㅎ harfi qaysi tovushni beradi?', ['h', 'g', 'k', 's'], 0),
    q('«차» so\'zi nimani anglatadi?', ['Choy yoki mashina', 'Non', 'Suv', 'Tosh'], 0),
    q('한 so\'zi qanday harflardan tuziladi?', ['ㅎ + ㅏ + ㄴ', 'ㅎ + ㅗ + ㄴ', 'ㅎ + ㅏ + ㅁ', 'ㅏ + ㅎ + ㄴ'], 0)
  ]);

  /* ===== 1-daraja ===== */
  addLesson(1, 'l-greet', 'Salomlashish va tanishuv', '인사와 소개', 'Salom, xayr, rahmat, kechirasiz va o\'zingizni tanishtirish iboralari.', fromVideo('greetings'), videoGrammar('greetings'), '/videos/greetings.mp4');
  addLesson(1, 'l-numbers', 'Raqamlar', '숫자', 'Ikki tizim: xitoycha (일, 이, 삼) va sof koreys (하나, 둘, 셋).', fromVideo('numbers'),
    [{ title: 'Qaysi tizim qachon ishlatiladi?', body: 'Xitoycha (일, 이, 삼...): sana, pul, telefon raqami, daqiqa (분), oy (월), qavat (층). Sof koreys (하나, 둘, 셋...): soat (시), yosh (살), dona (개), kishi (명), piyola (잔).' }, { title: 'Qisqargan shakllar', body: 'Sanoq so\'zlari oldidan: 하나→한, 둘→두, 셋→세, 넷→네, 스물→스무. Masalan: 한 명, 두 개, 세 시.' }, ...videoGrammar('numbers').slice(0, 4)], '/videos/numbers.mp4');
  addLesson(1, 'l-family', 'Oila a\'zolari', '가족', 'Ota-ona, aka-opa, bobo-buvi va boshqa qarindoshlar.', fromVideo('family'),
    [{ title: 'Aka va opa – kim aytayotganiga bog\'liq', body: 'Erkak aytsa: aka – 형, opa – 누나. Ayol aytsa: aka – 오빠, opa – 언니.' }, ...videoGrammar('family').slice(0, 4)], '/videos/family.mp4');
  addLesson(1, 'l-food', 'Ovqat va restoran', '음식과 식당', 'Taomlar, ichimliklar va restoranda buyurtma berish.', fromVideo('food'),
    [{ title: '~ 주세요 – «bering»', body: 'Narsa + 주세요: 물 주세요 (suv bering), 커피 한 잔 주세요 (bir piyola qahva bering).' }, ...videoGrammar('food').slice(0, 4)], '/videos/food.mp4');
  addLesson(1, 'l-ida', 'Men talabaman: ~입니다 va ~은/는', '~은/는, ~입니다', 'Otlarni bog\'lash: «men … man», «bu … dir».',
    V('저|jeo|men (rasmiy);학생|haksaeng|talaba;선생님|seonsaengnim|o\'qituvchi;의사|uisa|shifokor;회사원|hoesawon|kompaniya xodimi;이것|igeot|bu (narsa);저것|jeogeot|anavi (uzoqdagi);책|chaek|kitob;우즈베키스탄|ujebekiseutan|O\'zbekiston'),
    [{ title: '~입니다 / ~이에요 / ~예요', body: 'Ot + 입니다 – «…dir/…man» (rasmiy). Ot + 이에요 (undosh bilan tugasa) / 예요 (unli bilan tugasa) – muloqot uslubi. 저는 학생입니다 – Men talabaman. 저는 의사예요 – Men shifokorman.' }, { title: '~은/는 – mavzu qo\'shimchasi', body: 'Gap mavzusini bildiradi. Unli bilan tugasa – 는, undosh bilan tugasa – 은. 저는 (men), 선생님은 (o\'qituvchi). ' }, { title: '이것 / 그것 / 저것', body: '이것 – bu (menga yaqin), 그것 – shu (senga yaqin), 저것 – anavi (ikkalamizdan uzoq). 이것은 책입니다 – Bu kitob.' }, { title: 'Inkor: ~이/가 아니에요', body: '학생이 아니에요 – talaba emasman. Unli bilan tugasa 가, undosh bilan tugasa 이.' }]);
  addLesson(1, 'l-time', 'Vaqt, sana va hafta kunlari', '시간과 요일', 'Soat, daqiqa, oy, kun va hafta kunlari.',
    V('월요일|woryoil|dushanba;화요일|hwayoil|seshanba;수요일|suyoil|chorshanba;목요일|mogyoil|payshanba;금요일|geumyoil|juma;토요일|toyoil|shanba;일요일|iryoil|yakshanba;오늘|oneul|bugun;내일|naeil|ertaga;어제|eoje|kecha'),
    [{ title: 'Soat va daqiqa', body: 'Soat – sof koreys raqam + 시: 세 시 (3:00). Daqiqa – xitoycha raqam + 분: 십 분 (10 daqiqa). 세 시 십 분 – 3:10.' }, { title: 'Oy va kun', body: 'Xitoycha raqam + 월 (oy), + 일 (kun): 삼 월 이십오 일 – 25-mart.' }]);
  addTest(1, 't-greet', 'Salomlashish testi', 'lesson', 6, 'l-greet', vocabQuestions(VV.greetings.items, false, 21, 10));
  addTest(1, 't-numbers', 'Raqamlar testi', 'lesson', 6, 'l-numbers', vocabQuestions(VV.numbers.items, false, 22, 10));
  addTest(1, 't-family', 'Oila testi', 'lesson', 6, 'l-family', vocabQuestions(VV.family.items, false, 23, 10));
  addTest(1, 't-food', 'Ovqat testi', 'lesson', 6, 'l-food', vocabQuestions(VV.food.items, false, 24, 10));
  addTest(1, 't-final1', 'TOPIK I – 1-daraja yakuniy imtihon', 'final', 15, null, [
    q('«안녕히 계세요» qachon aytiladi?', ['Ketayotgan odam qolayotganga', 'Qolayotgan ketayotganga', 'Tanishganda', 'Rahmat aytganda'], 0),
    q('«저는 학생입니다» nima degani?', ['Men talabaman', 'U talaba', 'Biz talabamiz', 'Bu kitob'], 0),
    q('Bo\'sh joyni to\'ldiring: 저___ 학생이에요.', ['는', '를', '에', '도'], 0, '저 unli bilan tugaydi → 는'),
    q('«칠» qaysi raqam?', ['7', '6', '8', '9'], 0),
    q('«다섯» qaysi raqam?', ['5', '4', '6', '10'], 0),
    q('«아버지» kim?', ['Ota', 'Ona', 'Aka', 'Bobo'], 0),
    q('«감사합니다» nima degani?', ['Rahmat', 'Kechirasiz', 'Xayr', 'Salom'], 0),
    q('«이것은 책입니다» nima degani?', ['Bu kitob', 'Anavi kitob', 'Men kitobman', 'Kitob yo\'q'], 0),
    q('«저것» nima degani?', ['Anavi (uzoqdagi narsa)', 'Bu', 'Shu', 'Qayer'], 0),
    q('«얼마예요?» nima degani?', ['Qancha turadi?', 'Qayerda?', 'Kim?', 'Qachon?'], 0),
    q('«세 시» qaysi vaqt?', ['Soat 3', '3 daqiqa', '3-oy', '3 kun'], 0),
    q('Erkak kishi akasini nima deb chaqiradi?', ['형', '오빠', '누나', '언니'], 0),
    q('«물 주세요» nima degani?', ['Suv bering', 'Suv ichdim', 'Suv yo\'q', 'Suv sovuq'], 0),
    q('«월요일» qaysi kun?', ['Dushanba', 'Juma', 'Yakshanba', 'Shanba'], 0),
    q('«학생이 아니에요» nima degani?', ['Talaba emasman', 'Talabaman', 'Talabasiz', 'Talaba bo\'ldim'], 0)
  ]);

  /* ===== 2-daraja ===== */
  addLesson(2, 'l-haeyo', 'Hozirgi zamon: ~아요/어요', '-아요/어요', 'Fe\'llarni hozirgi/odatiy zamonda (해요체) ishlatish.',
    V('가다|gada|bormoq;오다|oda|kelmoq;먹다|meokda|yemoq;마시다|masida|ichmoq;보다|boda|ko\'rmoq;하다|hada|qilmoq;공부하다|gongbuhada|o\'qimoq (o\'rganmoq);좋아하다|joahada|yoqtirmoq;살다|salda|yashamoq'),
    [{ title: 'Qoida', body: 'Fe\'l o\'zagi (da ni olib tashlang) oxirgi unlisiga qarab: ㅏ yoki ㅗ bo\'lsa + 아요, boshqa unlilar bo\'lsa + 어요, 하다 → 해요. 먹다 → 먹어요; 좋다 → 좋아요; 하다 → 해요.' }, { title: 'Qisqarish', body: '가다 → 가아요 → 가요; 오다 → 와요; 마시다 → 마셔요; 보다 → 봐요.' }, { title: 'Misollar', body: '저는 커피를 마셔요 – Men qahva ichaman. 친구가 와요 – Do\'stim kelyapti.' }]);
  addLesson(2, 'l-particles', 'Qo\'shimchalar: 을/를, 에, 에서, 이/가', '조사', 'Obyekt, joy, harakat joyi va ega qo\'shimchalari.',
    V('집|jip|uy;학교|hakgyo|maktab;도서관|doseogwan|kutubxona;회사|hoesa|kompaniya;식당|sikdang|restoran;시장|sijang|bozor;영화|yeonghwa|kino;친구|chingu|do\'st'),
    [{ title: '을/를 – to\'ldiruvchi (obyekt)', body: 'Unli bilan tugasa 를, undosh bilan tugasa 을: 사과를 먹어요 (olma yeyman), 책을 읽어요 (kitob o\'qiyman).' }, { title: '에 – yo\'nalish va vaqt', body: '도서관에 가요 – kutubxonaga boraman. 세 시에 만나요 – soat 3 da uchrashamiz.' }, { title: '에서 – harakat bajariladigan joy', body: '학교에서 공부해요 – maktabda o\'qiyman. 식당에서 먹어요 – restoranda yeyman.' }, { title: '이/가 – ega', body: '비가 와요 – yomg\'ir yog\'yapti. 친구가 있어요 – do\'stim bor.' }]);
  addLesson(2, 'l-past', 'O\'tgan zamon: ~았/었어요', '-았/었어요', 'Kecha nima qildingiz? O\'tgan zamon shakli.',
    V('어제|eoje|kecha;지난주|jinanju|o\'tgan hafta;아침|achim|ertalab;점심|jeomsim|tushlik;저녁|jeonyeok|kechqurun;재미있다|jaemiitda|qiziqarli;바쁘다|bappeuda|band'),
    [{ title: 'Qoida', body: 'O\'zakning oxirgi unlisi ㅏ/ㅗ bo\'lsa + 았어요, aks holda + 었어요, 하다 → 했어요. 먹다 → 먹었어요; 가다 → 갔어요; 공부하다 → 공부했어요.' }, { title: 'Misol', body: '어제 영화를 봤어요 – Kecha kino ko\'rdim. 어제 뭐 했어요? – Kecha nima qildingiz?' }]);
  addLesson(2, 'l-neg', 'Inkor: 안 va 못', '안 / 못', '«Qilmayman» va «qila olmayman» farqi.',
    V('안|an|…ma (inkor);못|mot|qila olmaydi;수영|suyeong|suzish;운전|unjeon|haydash;요리|yori|ovqat pishirish;노래|norae|qo\'shiq'),
    [{ title: '안 + fe\'l', body: 'Xohlamaslik yoki oddiy inkor: 안 가요 – bormayman. 안 먹어요 – yemayman.' }, { title: '못 + fe\'l', body: 'Qobiliyat yo\'qligi yoki imkonsizlik: 못 가요 – bora olmayman. 수영을 못 해요 – suzishni bilmayman.' }, { title: '하다 fe\'llari', body: 'Ot + 안 하다: 공부 안 해요. Ot + 못 하다: 운전 못 해요.' }]);
  addLesson(2, 'l-shop', 'Xarid va sanoq so\'zlari', '쇼핑과 단위', 'Narx so\'rash, dona/kishi/piyola sanoqlari.',
    V('얼마|eolma|qancha;원|won|von (pul);개|gae|dona;명|myeong|kishi;잔|jan|piyola/stakan;권|gwon|kitob (sanoq);비싸다|bissada|qimmat;싸다|ssada|arzon;깎아 주세요|kkakka juseyo|chegirma qiling'),
    [{ title: 'Narx', body: '이거 얼마예요? – Bu qancha turadi? 오천 원이에요 – 5000 von. Narxlar xitoycha raqamlar bilan aytiladi: 만 원 = 10 000 von.' }, { title: 'Sanoq so\'zlari', body: 'Sof koreys raqam + sanoq: 사과 세 개 (3 ta olma), 학생 두 명 (2 talaba), 커피 한 잔 (1 piyola qahva), 책 네 권 (4 ta kitob).' }]);
  addLesson(2, 'l-direction', 'Yo\'nalish va transport', '길 찾기', 'Qayerda? Qanday boraman? Chap-o\'ng, metro va avtobus.',
    V('어디|eodi|qayer;왼쪽|oenjjok|chap;오른쪽|oreunjjok|o\'ng;똑바로|ttokbaro|to\'g\'ri;지하철|jihacheol|metro;버스|beoseu|avtobus;택시|taeksi|taksi;역|yeok|bekat;여기|yeogi|bu yerda;가깝다|gakkapda|yaqin;멀다|meolda|uzoq'),
    [{ title: 'Qayerda?', body: '화장실이 어디예요? – Hojatxona qayerda? 지하철역은 여기에서 가까워요 – Metro bekati bu yerdan yaqin.' }, { title: 'Yo\'l tushuntirish', body: '똑바로 가세요 – To\'g\'ri boring. 왼쪽으로 가세요 – Chapga boring. (으)로 – yo\'nalish: 오른쪽으로 – o\'ngga.' }, { title: '~(으)로 – vosita', body: '버스로 가요 – avtobusda boraman; 지하철로 가요 – metroda boraman.' }]);
  addTest(2, 't-final2', 'TOPIK I – 2-daraja yakuniy imtihon', 'final', 15, null, [
    q('«먹다» ning 해요체 shakli qaysi?', ['먹어요', '먹아요', '먹해요', '먹요'], 0),
    q('«가다» ning 해요체 shakli qaysi?', ['가요', '가아요', '가어요', '갑'], 0),
    q('«하다» ning 해요체 shakli qaysi?', ['해요', '하아요', '하어요', '하요'], 0),
    q('Bo\'sh joyni to\'ldiring: 저는 사과___ 먹어요.', ['를', '을', '가', '에서'], 0, 'Unli bilan tugasa 를'),
    q('«학교에서 공부해요» gapida 에서:', ['Harakat bajariladigan joyni bildiradi', 'Egani bildiradi', 'Vaqtni bildiradi', 'Savol yasaydi'], 0),
    q('«어제 영화를 봤어요» nima degani?', ['Kecha kino ko\'rdim', 'Ertaga kino ko\'raman', 'Hozir kino ko\'ryapman', 'Kino ko\'rmadim'], 0),
    q('«안 가요» nima degani?', ['Bormayman', 'Bora olmayman', 'Bordim', 'Boraman'], 0),
    q('«수영을 못 해요» nima degani?', ['Suzishni bilmayman / qila olmayman', 'Suzishni yoqtirmayman', 'Suzdim', 'Suzmayman'], 0),
    q('2 kishi qanday aytiladi?', ['두 명', '이 명', '둘 명', '이 사람'], 0, 'Kishi sanog\'i sof koreys raqam bilan: 한/두/세/네 명'),
    q('«왼쪽» nima degani?', ['Chap', 'O\'ng', 'To\'g\'ri', 'Orqa'], 0),
    q('«지하철» nima degani?', ['Metro', 'Avtobus', 'Taksi', 'Poyezd'], 0),
    q('Bo\'sh joyni to\'ldiring: 저는 도서관___ 가요.', ['에', '를', '이', '와'], 0),
    q('«이거 얼마예요?» ga mos javob qaysi?', ['오천 원이에요', '네, 맞아요', '학교에 가요', '어제 왔어요'], 0),
    q('«마시다» ning 해요체 shakli?', ['마셔요', '마시어요', '마시아요', '맛요'], 0),
    q('«비가 와요» da 가 nima vazifada?', ['Ega qo\'shimchasi', 'Obyekt', 'Joy', 'Vosita'], 0)
  ]);

  /* ===== 3–6 TOPIK II ===== */
  const G = (lv, id, title, ko, summary, vocab, grammar) => addLesson(lv, id, title, ko, summary, V(vocab), grammar);
  G(3, 'l-3a', 'Reja va xohish', '계획과 희망', '-고 싶다, -(으)ㄹ 거예요, -(으)려고, -(으)ㄹ게요.', '계획|gyehoek|reja;여행|yeohaeng|sayohat;준비하다|junbihada|tayyorlanmoq;시험|siheom|imtihon;합격하다|hapgyeokada|o\'tmoq (imtihondan);취직하다|chwijikada|ishga joylashmoq',
    [{ title: '-고 싶다 – xohlamoq', body: '한국에 가고 싶어요 – Koreyaga bormoqchiman. Uchinchi shaxs uchun -고 싶어 하다.' }, { title: '-(으)ㄹ 거예요 – kelasi zamon/reja', body: '내일 공부할 거예요 – Ertaga o\'qiyman. Taxmin ma\'nosi ham bor: 비가 올 거예요 – Yomg\'ir yog\'sa kerak.' }, { title: '-(으)려고 – maqsad', body: '한국어를 배우려고 한국에 왔어요 – Koreys tilini o\'rganish uchun Koreyaga keldim.' }]);
  G(3, 'l-3b', 'Sabab va shart', '이유와 조건', '-아서/어서, -(으)니까, -(으)면, -지만.', '이유|iyu|sabab;조건|jogeon|shart;그래서|geuraeseo|shuning uchun;하지만|hajiman|lekin;만약|manyak|agar;늦다|neutda|kechikmoq',
    [{ title: '-아서/어서 va -(으)니까', body: 'Ikkalasi ham «…gani uchun». Farqi: -(으)니까 dan keyin buyruq (-(으)세요) va taklif (-(으)ㅂ시다, -(으)ㄹ까요?) kela oladi; -아서/어서 dan keyin kelmaydi. 비가 오니까 우산을 가져가세요 – Yomg\'ir yog\'ayotgani uchun soyabon oling.' }, { title: '-(으)면 – agar', body: '시간이 있으면 같이 가요 – Vaqtingiz bo\'lsa, birga boramiz.' }, { title: '-지만 – lekin', body: '비싸지만 맛있어요 – Qimmat, lekin mazali.' }]);
  G(3, 'l-3c', 'Ketma-ketlik va sifatlar', '순서와 관형형', '-고, -기 전에, -(으)ㄴ 후에, sifat + ot shakllari.', '먼저|meonjeo|avval;다음에|daeume|keyin;전|jeon|oldin;후|hu|keyin;예쁘다|yeppeuda|chiroyli;크다|keuda|katta',
    [{ title: 'Ketma-ketlik', body: '밥을 먹기 전에 손을 씻어요 – Ovqatdan oldin qo\'l yuvaman. 밥을 먹은 후에 커피를 마셔요 – Ovqatdan keyin qahva ichaman.' }, { title: 'Sifat + ot', body: 'Sifat o\'zagi + -(으)ㄴ + ot: 예쁜 꽃 (chiroyli gul), 큰 집 (katta uy). Fe\'l hozirgi zamon: -는 + ot: 먹는 사람.' }]);
  addTest(3, 't-final3', 'TOPIK II – 3-daraja yakuniy imtihon', 'final', 15, null, [
    q('«-고 싶다» nimani bildiradi?', ['Xohish', 'Taqiq', 'Majburiyat', 'O\'tgan zamon'], 0),
    q('«내일 갈 거예요» nima degani?', ['Ertaga boraman', 'Kecha bordim', 'Hozir boryapman', 'Bormayman'], 0),
    q('Qaysi biri taklif bilan ishlatiladi? «비가 오___ 가지 맙시다.»', ['니까', '아서', '고', '지만'], 0),
    q('«-(으)면» nimani bildiradi?', ['Agar (shart)', 'Lekin', 'Chunki', 'Keyin'], 0),
    q('«-지만» nimani bildiradi?', ['Lekin / ammo', 'Va', 'Agar', 'Uchun'], 0),
    q('«먹기 전에» nima degani?', ['Yeyishdan oldin', 'Yegandan keyin', 'Yeyayotganda', 'Yemasdan'], 0),
    q('«먹은 후에» nima degani?', ['Yegandan keyin', 'Yeyishdan oldin', 'Yeyotib', 'Yemagan'], 0),
    q('«-(으)려고» nimani bildiradi?', ['Niyat/maqsad (… uchun)', 'Shart', 'Sabab', 'Zid'], 0),
    q('«예쁘다» ni otdan oldin qo\'ying: ___ 꽃', ['예쁜', '예쁠', '예뻐', '예쁘고'], 0),
    q('«값이 비싸지만 맛있어요» nima degani?', ['Narxi qimmat, lekin mazali', 'Arzon va mazali', 'Qimmat va mazasiz', 'Narxi so\'ralmadi'], 0)
  ]);
  G(4, 'l-4a', 'Fon, taxmin va tajriba', '배경과 추측', '-는데/-(으)ㄴ데, -(으)ㄴ/는 것 같다, -아/어 보다.', '경험|gyeongheom|tajriba;추측|chucheuk|taxmin;아마|ama|ehtimol;정말|jeongmal|haqiqatan;처음|cheoeum|birinchi marta;이미|imi|allaqachon',
    [{ title: '-는데 / -(으)ㄴ데', body: 'Fon yoki kontrast: 한국어를 공부하는데 재미있어요 – Koreys tilini o\'rganyapman, qiziq ekan. 어제 갔는데 문이 닫혀 있었어요 – Kecha bordim, lekin eshik yopiq ekan.' }, { title: '-(으)ㄴ/는 것 같다 – «…ga o\'xshaydi»', body: '비가 올 것 같아요 – Yomg\'ir yog\'adiganga o\'xshaydi. 맛있는 것 같아요 – Mazali ko\'rinadi.' }, { title: '-아/어 보다 – sinab ko\'rmoq', body: '김치를 먹어 봤어요 – Kimchini yeb ko\'rdim.' }]);
  G(4, 'l-4b', 'Imkoniyat va iltimos', '가능과 부탁', '-(으)ㄹ 수 있다/없다, -(으)ㄹ 줄 알다, -아/어 주다.', '가능하다|ganeunghada|mumkin;부탁|butak|iltimos;도와주다|dowajuda|yordam bermoq;열다|yeolda|ochmoq;닫다|datda|yopmoq;창문|changmun|deraza',
    [{ title: '-(으)ㄹ 수 있다/없다', body: '수영할 수 있어요 – Suzishni bilaman/suza olaman. 갈 수 없어요 – Bora olmayman.' }, { title: '-(으)ㄹ 줄 알다/모르다', body: 'Ko\'nikma bor yoki yo\'qligi: 운전할 줄 알아요 – Mashina hayday olaman.' }, { title: '-아/어 주세요 – iltimos', body: '창문 좀 열어 주세요 – Iltimos, derazani ochib bering.' }]);
  G(4, 'l-4c', 'Majhul nisbat', '피동', 'Fe\'l o\'zagiga -이-, -히-, -리-, -기- qo\'shilib «o\'zi bo\'ladi» ma\'nosi.', '열리다|yeollida|ochilmoq;닫히다|dachida|yopilmoq;보이다|boida|ko\'rinmoq;들리다|deullida|eshitilmoq;쓰이다|sseuida|yozilmoq;잡히다|japida|tutilmoq',
    [{ title: 'Majhul nisbat', body: '문이 열렸어요 – Eshik ochildi (o\'zi). 소리가 들려요 – Tovush eshitilyapti. 산이 보여요 – Tog\' ko\'rinyapti.' }]);
  addTest(4, 't-final4', 'TOPIK II – 4-daraja yakuniy imtihon', 'final', 15, null, [
    q('«-는데/-(으)ㄴ데» ning asosiy vazifasi?', ['Fon yoki kontrast berish', 'Buyruq', 'Faqat o\'tgan zamon', 'Savol berish'], 0),
    q('«수영할 수 있어요» nima degani?', ['Suza olaman', 'Suzmayman', 'Suzdim', 'Suzish yoqmaydi'], 0),
    q('«수영할 수 없어요» nima degani?', ['Suza olmayman', 'Suzaman', 'Suzdim', 'Suzmoqchiman'], 0),
    q('«-아/어 보다» ma\'nosi?', ['Sinab ko\'rmoq', 'Tugatmoq', 'Boshlamoq', 'To\'xtatmoq'], 0),
    q('«-아/어 주다» ma\'nosi?', ['Birovga qilib bermoq', 'Xohlamoq', 'Sinab ko\'rmoq', 'Qila olmoq'], 0),
    q('«문이 열렸어요» nima degani?', ['Eshik ochildi', 'Men eshikni ochdim', 'Eshikni oching', 'Eshik yopiq'], 0),
    q('«비가 올 것 같아요» nima degani?', ['Yomg\'ir yog\'adiganga o\'xshaydi', 'Yomg\'ir yog\'di', 'Yomg\'ir yog\'maydi', 'Yomg\'ir yoqmaydi'], 0),
    q('«김치를 먹어 봤어요» nima degani?', ['Kimchini yeb ko\'rdim', 'Kimchi yeyman', 'Kimchi yemayman', 'Kimchi tayyorladim'], 0),
    q('«창문 좀 열어 주세요» nima degani?', ['Iltimos, derazani ochib bering', 'Derazani yoping', 'Deraza ochiq', 'Deraza yo\'q'], 0),
    q('«운전할 줄 알아요» nima degani?', ['Mashina hayday olaman', 'Mashinam bor', 'Mashina haydamayman', 'Mashina oldim'], 0)
  ]);
  G(5, 'l-5a', 'Sabab va xavotir', '이유와 걱정', '-기 때문에, -(으)ㄹ까 봐, -느라고, -더니.', '때문에|ttaemune|… sababli;걱정하다|geokjeonghada|xavotirlanmoq;피곤하다|pigonhada|charchagan;늦잠|neutjam|uyqudan kech turish;결과|gyeolgwa|natija;원인|wonin|sabab',
    [{ title: '-기 때문에 – rasmiy sabab', body: '비가 오기 때문에 취소됐어요 – Yomg\'ir yog\'gani sababli bekor qilindi.' }, { title: '-(으)ㄹ까 봐 – xavotir', body: '늦을까 봐 택시를 탔어요 – Kechikib qolaman deb taksiga o\'tirdim.' }, { title: '-느라고 – band bo\'lib', body: 'Odatda salbiy natija: 공부하느라고 못 잤어요 – O\'qiyman deb uxlay olmadim.' }, { title: '-더니 – kuzatilgan o\'zgarish', body: '어제는 춥더니 오늘은 따뜻하네요 – Kecha sovuq edi, bugun iliq ekan.' }]);
  G(5, 'l-5b', 'Bilvosita nutq', '간접화법', 'Boshqalarning gapini yetkazish: -다고 하다, -냐고 하다, -(으)라고 하다, -자고 하다.', '말하다|malhada|gapirmoq;전하다|jeonhada|yetkazmoq;묻다|mutda|so\'ramoq;대답하다|daedaphada|javob bermoq;제안하다|jeanhada|taklif qilmoq;소식|sosik|xabar',
    [{ title: 'Darak gap: -다고 하다', body: '친구가 간다고 했어요 – Do\'stim boraman dedi.' }, { title: 'So\'roq: -냐고 하다', body: '어디에 가냐고 물었어요 – Qayerga borasan deb so\'radi.' }, { title: 'Buyruq va taklif', body: '일찍 오라고 했어요 – Erta kel dedi. 같이 가자고 했어요 – Birga boraylik dedi.' }]);
  G(5, 'l-5c', 'Qo\'shimcha va qarama-qarshilik', '첨가와 대조', '-(으)ㄹ 뿐만 아니라, -(으)ㄴ/는 반면(에), -도록, -게 되다.', '뿐만 아니라|ppunman anira|nafaqat…balki;반면|banmyeon|aksincha;장점|jangjeom|afzallik;단점|danjeom|kamchilik;점점|jeomjeom|asta-sekin;변하다|byeonhada|o\'zgarmoq',
    [{ title: '-(으)ㄹ 뿐만 아니라', body: '이 식당은 맛있을 뿐만 아니라 싸요 – Bu restoran nafaqat mazali, balki arzon ham.' }, { title: '-(으)ㄴ/는 반면(에)', body: '도시는 편리한 반면 복잡해요 – Shahar qulay, lekin gavjum.' }, { title: '-도록 va -게 되다', body: '잊지 않도록 메모했어요 – Unutmaslik uchun yozib qo\'ydim. 한국에서 살게 되었어요 – Koreyada yashaydigan bo\'ldim.' }]);
  addTest(5, 't-final5', 'TOPIK II – 5-daraja yakuniy imtihon', 'final', 15, null, [
    q('«-기 때문에» nimani bildiradi?', ['Sabab', 'Shart', 'Niyat', 'Zid'], 0),
    q('«-(으)ㄹ까 봐» nimani bildiradi?', ['Xavotir (… bo\'lib qolmasin)', 'Taklif', 'Majburiyat', 'Imkoniyat'], 0),
    q('«-도록» ning ma\'nosi?', ['Maqsad/daraja (… uchun, … gacha)', 'Shart', 'Sabab', 'O\'tgan zamon'], 0),
    q('«-게 되다» ma\'nosi?', ['Vaziyat o\'zgarib … bo\'lib qolmoq', 'Xohlamoq', 'Sinab ko\'rmoq', 'Bera olmoq'], 0),
    q('«-더니» qaysi holatda ishlatiladi?', ['O\'zi kuzatgan o\'tgan holat va uning natijasi', 'Kelasi zamon', 'Buyruq', 'Savol'], 0),
    q('«간다고 했어요» nima degani?', ['Boraman dedi', 'Bordi', 'Bor dedi', 'Bormaydi'], 0),
    q('«같이 가자고 했어요» nima degani?', ['Birga boraylik dedi', 'Birga bordik', 'Birga bormaydi', 'Birga boring dedi'], 0),
    q('«-(으)ㄹ 뿐만 아니라» ma\'nosi?', ['Nafaqat … balki …', 'Lekin', 'Agar', 'Shuning uchun'], 0),
    q('«-(으)ㄴ/는 반면(에)» ma\'nosi?', ['Aksincha / boshqa tomondan', 'Chunki', 'Keyin', 'Shu payt'], 0),
    q('«열심히 공부하면 합격할 수 있을 거예요» nima degani?', ['Agar qattiq o\'qisangiz o\'tishingiz mumkin', 'Qattiq o\'qidim va o\'tdim', 'Imtihonga bormayman', 'O\'qimasangiz ham o\'tasiz'], 0)
  ]);
  G(6, 'l-6a', 'Nozik ma\'no ottenkalari', '미묘한 뉘앙스', '-(으)ㄹ 텐데, -(으)ㄹ 걸 그랬다, -(으)ㄹ 뻔하다, -(으)ㄴ/는 척하다.', '후회|huhoe|afsus;아쉽다|aswipda|afsuski;하마터면|hamateomyeon|ozgina qoldi;모르는 척|moreuneun cheok|bilmaganday;눈치|nunchi|farosat;분위기|bunwigi|muhit',
    [{ title: '-(으)ㄹ 텐데', body: 'Taxmin + fon: 바쁠 텐데 와 줘서 고마워요 – Band bo\'lsangiz kerak, kelganingiz uchun rahmat.' }, { title: '-(으)ㄹ 걸 그랬다', body: 'Afsus: 일찍 출발할 걸 그랬어요 – Erta chiqsam bo\'lardi.' }, { title: '-(으)ㄹ 뻔하다', body: 'Ozgina qoldi: 넘어질 뻔했어요 – Yiqilib ketishimga oz qoldi.' }, { title: '-(으)ㄴ/는 척하다', body: 'Go\'yo: 모르는 척했어요 – Bilmaganga oldim.' }]);
  G(6, 'l-6b', 'Ketma-ket harakat', '연속 동작', '-자마자, -는 대로, -다가, -(으)ㄴ 채로.', '도착하다|dochakada|yetib kelmoq;출발하다|chulbalhada|yo\'lga chiqmoq;동시에|dongsie|bir vaqtda;곧|got|tez orada;잠깐|jamkkan|bir lahza;갑자기|gapjagi|to\'satdan',
    [{ title: '-자마자', body: '집에 도착하자마자 잤어요 – Uyga kelishim bilan uxlab qoldim.' }, { title: '-는 대로', body: 'Tugashi bilan darhol: 도착하는 대로 전화할게요 – Yetib borishim bilanoq qo\'ng\'iroq qilaman.' }, { title: '-다가', body: 'Harakat jarayonida boshqa harakatga o\'tish: 걷다가 넘어졌어요 – Yurib ketayotib yiqildim.' }]);
  G(6, 'l-6c', 'Yangiliklar va yozma ish', '뉴스와 쓰기', 'Rasmiy uslub: -ㄹ 전망이다, -고 있다. TOPIK II tuzilishi va 쓰기 strategiyasi.', '전망|jeonmang|prognoz;발표하다|balpyohada|e\'lon qilmoq;증가하다|jeunggahada|ko\'paymoq;감소하다|gamsohada|kamaymoq;사회|sahoe|jamiyat;경제|gyeongje|iqtisod',
    [{ title: 'Yangiliklar uslubi', body: 'Kelasi zamon prognozi: -(으)ㄹ 전망이다 – 내년에 물가가 오를 전망이다 (kelasi yil narxlar oshishi kutilmoqda). -(이)라고 밝혔다 – …deb ma\'lum qildi.' }, { title: 'TOPIK II tuzilishi', body: 'Uch bo\'lim: 듣기 (tinglash, 50 savol), 쓰기 (yozish, 4 topshiriq: 51–54), 읽기 (o\'qish, 50 savol). Maksimal ball: 300. Darajalar: 3-daraja 120+, 4-daraja 150+, 5-daraja 190+, 6-daraja 230+.' }, { title: '쓰기 53–54 strategiyasi', body: '53-topshiriq – grafik/diagramma tavsifi (200–300 belgi), 54-topshiriq – ijtimoiy mavzuda esse (600–700 belgi). Reja: kirish – asosiy fikr – dalillar – xulosa. Rasmiy -ㄴ/는다 uslubida yozing.' }]);
  addTest(6, 't-final6', 'TOPIK II – 6-daraja yakuniy imtihon', 'final', 15, null, [
    q('«-(으)ㄹ 텐데» nimani bildiradi?', ['Taxmin + fon (…bo\'lsa kerak, shunday ekan…)', 'Buyruq', 'O\'tgan zamon', 'Sabab'], 0),
    q('«-자마자» ma\'nosi?', ['…ishi bilan', 'Agar', 'Lekin', 'Uchun'], 0),
    q('«-는 대로» ma\'nosi?', ['…bilanoq darhol', 'Garchi', 'Uchun', 'Hech qachon'], 0),
    q('«걷다가 넘어졌어요» nima degani?', ['Yurib ketayotib yiqildim', 'Yurdim va dam oldim', 'Yurmayman', 'Yiqilmadim'], 0),
    q('«모르는 척했어요» nima degani?', ['Bilmaganga oldim', 'Bilmadim', 'Bilaman', 'Bilib oldim'], 0),
    q('«일찍 출발할 걸 그랬어요» nima degani?', ['Erta chiqsam bo\'lardi (afsus)', 'Erta chiqdim', 'Erta chiqaman', 'Erta chiqmayman'], 0),
    q('«-(으)ㄹ 전망이다» qayerda ishlatiladi?', ['Yangiliklar va rasmiy matnlarda prognoz uchun', 'Do\'stlar suhbatida', 'Taklif uchun', 'Savol uchun'], 0),
    q('TOPIK II ning bo\'limlari qaysilar?', ['Tinglash, yozish, o\'qish (듣기·쓰기·읽기)', 'Faqat tinglash', 'Gapirish va tinglash', 'Faqat grammatika'], 0),
    q('«-(으)ㄹ 뻔하다» ma\'nosi?', ['Ozgina qoldi (… bo\'lib qolishiga oz qoldi)', 'Xohlamoq', 'Sinab ko\'rmoq', 'Qila olmoq'], 0),
    q('«-느라고» odatda qanday ma\'noda keladi?', ['Biror ish bilan band bo\'lib (ko\'pincha salbiy natija)', 'Shart', 'Maqsad', 'Taklif'], 0)
  ]);

  // Video yo'q darslar uchun ham bo'sh holat; barcha 6 ta video /videos/ papkasida
  return { levels: L, lessons, tests };
}
module.exports = { buildSeed };
