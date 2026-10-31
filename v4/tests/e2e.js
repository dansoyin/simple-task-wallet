// End-to-end validation for Task Wallet v4.
// Run: (in v4/) python3 -m http.server 8767   then   node tests/e2e.js http://127.0.0.1:8767/
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('fs');
// Needs: npm i playwright-core  +  a Chromium (set CHROME=/path/to/chrome, or `npx playwright install chromium`).
const exe = process.env.CHROME || undefined;
const URL = process.argv[2] || 'http://127.0.0.1:8767/';
const SH = require('path').join(__dirname, 'shots') + '/';
fs.mkdirSync(SH, { recursive: true });
const results = [];

(async () => {
  const browser = await chromium.launch({ executablePath: exe });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Asia/Jakarta', acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'Prisma ORM' : undefined));
  const W = (ms = 180) => page.waitForTimeout(ms);
  const data = () => page.evaluate(() => JSON.parse(localStorage.getItem('taskwallet.v4')));
  const send = async (t) => { await page.fill('#input', t); await W(60); await page.keyboard.press('Enter'); await W(160); };
  const tab = async (t) => { await page.click(`.nav [data-tab="${t}"]`); await W(220); };
  const check = async (name, fn) => {
    try { await fn(); results.push(['✅', name]); console.log('  ✓', name); }
    catch (e) { results.push(['❌', name + ' — ' + e.message.split('\n')[0]]); console.log('  ✗', name, e.message.split('\n')[0]); }
  };
  const closeSheet = async () => { if (await page.$('#sheet[open]')) { await page.keyboard.press('Escape'); await W(300); } };

  // ---- migration from the old app (task-wallet.pages.dev keys) ----
  await page.goto(URL);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('todos', JSON.stringify([{ id: 1700000000000, title: 'Tugas dari versi lama', completed: false, priority: 'high', dueDate: null }]));
    localStorage.setItem('finance_transactions', JSON.stringify([{ id: 1700000000002, type: 'expense', title: 'Makan lama', amount: 30000, category: 'food', date: '2026-10-05' }]));
    localStorage.setItem('finance_savingsGoal', '2000000');
  });
  await page.reload(); await W(400);
  await check('Migrasi otomatis data lama (todos, finance_transactions, finance_savingsGoal)', async () => {
    const d = await data();
    assert.ok(d.tasks.some((t) => t.title === 'Tugas dari versi lama' && t.priority === 'high'));
    assert.ok(d.txns.some((x) => x.title === 'Makan lama' && x.amount === 30000));
    assert.equal(d.settings.savingsGoal, 2000000);
    assert.ok(await page.evaluate(() => !!localStorage.getItem('todos')), 'old key kept as backup');
    assert.match(await page.textContent('#page'), /Data lama sudah dipindahkan/);
  });
  await page.click('[data-act="ack-migration"]'); await W();

  // ---- quick capture: every kind ----
  await check('Quick capture: 7 jenis dari kalimat bebas', async () => {
    for (const t of ['Nyetrika baju', 'Mengerjakan tugas Matematika besok', 'Belajar Node.js 45 menit', 'Olahraga sore', 'Membeli sabun',
      'Ide membuat aplikasi jurnal kesehatan', 'Pengeluaran makan siang Rp25.000', 'catatan: lagi semangat', 'gajian +5jt']) await send(t);
    const d = await data();
    assert.ok(d.tasks.find((t) => t.title === 'Nyetrika baju' && t.category === 'rumah'));
    assert.ok(d.tasks.find((t) => t.title === 'Mengerjakan tugas Matematika' && t.category === 'belajar'));
    assert.equal(d.sessions.length, 1); assert.equal(d.sessions[0].minutes, 45);
    const ex = d.habits.find((h) => h.name === 'Olahraga'); assert.equal((d.habitLog[ex.id] || []).length, 1);
    assert.equal(d.notes.filter((n) => n.kind === 'idea').length, 1); assert.equal(d.notes.filter((n) => n.kind === 'note').length, 1);
    assert.ok(d.txns.find((x) => x.title === 'Makan siang' && x.amount === 25000 && x.type === 'out'));
    assert.ok(d.txns.find((x) => x.type === 'in' && x.amount === 5000000));
  });
  await check('Quick capture: pilih jenis manual (Sesi belajar)', async () => {
    await page.fill('#input', 'Express routing 30 menit'); await W();
    await page.click('[data-act="chip-kind"]'); await W(350);
    await page.click('#sheet [data-k="learn"]'); await W(350);
    assert.match(await page.textContent('#preview'), /Sesi belajar/);
    await page.keyboard.press('Enter'); await W();
    const d = await data(); const s = d.sessions.find((x) => x.minutes === 30);
    assert.equal(d.topics.find((t) => t.id === s.topicId).name, 'Express');
  });

  // ---- tasks ----
  await tab('tasks');
  await check('Menambah tugas', async () => {
    await send('Rapikan meja belajar');
    assert.ok(await page.$('#page .row:has-text("Rapikan meja belajar")'));
  });
  await check('Mengedit tugas (judul, prioritas, kategori, estimasi, fokus)', async () => {
    await page.click('#page .row:has-text("Rapikan meja belajar") .body'); await W(350);
    await page.fill('#t-title', 'Rapikan meja belajar dan kabel');
    await page.click('#sheet [data-f="prio"][data-v="high"]'); await W(80);
    await page.click('#sheet [data-f="tcat"][data-v="rumah"]'); await W(80);
    await page.click('#sheet [data-f="est"][data-v="15"]'); await W(80);
    await page.click('#sheet [data-f="focus"]'); await W(80);
    await page.click('#sheet [data-f="save"]'); await W(400);
    const t = (await data()).tasks.find((x) => x.title === 'Rapikan meja belajar dan kabel');
    assert.equal(t.priority, 'high'); assert.equal(t.category, 'rumah'); assert.equal(t.estimate, 15); assert.ok(t.focus);
  });
  await check('Menandai tugas selesai', async () => {
    await page.click('#page .row:has-text("Nyetrika baju") .check'); await W(600);
    assert.ok((await data()).tasks.find((x) => x.title === 'Nyetrika baju').done);
  });
  await check('Filter kategori & prioritas + pencarian', async () => {
    await page.click('[data-act="tf-toggle"]'); await W();
    await page.selectOption('#tf-pri', 'high'); await W();
    let titles = await page.$$eval('#page .row .title', (els) => els.map((e) => e.textContent));
    assert.ok(titles.every((t) => /Rapikan meja|Tugas dari versi lama/.test(t)), 'priority filter: ' + titles.join('|'));
    await page.click('[data-act="tf-clear"]'); await W();
    await page.click('.subtab[data-view="upcoming"]'); await W();
    await page.fill('#tf-q', 'matematika'); await W(250);
    titles = await page.$$eval('#page .row .title', (els) => els.map((e) => e.textContent));
    assert.deepEqual(titles, ['Mengerjakan tugas Matematika']);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'tf-q', 'focus kept while typing');
    await page.click('[data-act="tf-clear"]'); await W();
  });
  await check('Inbox, Selesai, Kalender', async () => {
    await page.click('.subtab[data-view="inbox"]'); await W();
    assert.match(await page.textContent('#page'), /Tugas dari versi lama/);
    assert.match(await page.textContent('#page'), /Membuat aplikasi jurnal kesehatan/);
    await page.click('.subtab[data-view="done"]'); await W();
    assert.match(await page.textContent('#page'), /Nyetrika baju/);
    await page.click('.subtab[data-view="cal"]'); await W();
    await page.click('[data-act="cal-mode"][data-v="month"]'); await W();
    assert.ok(await page.$('.cal'));
  });
  await check('Ide → jadikan tugas', async () => {
    await page.click('.subtab[data-view="inbox"]'); await W();
    await page.click('#page .row.note:has-text("jurnal kesehatan") [data-act="note-task"]'); await W(300);
    assert.ok((await data()).tasks.find((t) => t.title === 'Membuat aplikasi jurnal kesehatan'));
  });
  await check('Menghapus tugas (+ urungkan)', async () => {
    await page.click('.subtab[data-view="day"]'); await W();
    await page.click('#page .row:has-text("Membeli sabun") .body'); await W(350);
    await page.click('#sheet [data-f="del"]'); await W(400);
    assert.ok(!(await data()).tasks.find((x) => x.title === 'Membeli sabun'));
    await page.click('#toast button:has-text("Urungkan")'); await W();
    assert.ok((await data()).tasks.find((x) => x.title === 'Membeli sabun'));
  });

  // ---- health & habits ----
  await tab('habits');
  await check('Check-in kesehatan harian', async () => {
    for (let i = 0; i < 14; i++) await page.click('[data-act="hc-step"][data-f="sleep"][data-n="0.5"]');
    await page.click('[data-act="hc-set"][data-f="mood"][data-v="4"]'); await W(100);
    await page.click('[data-act="hc-set"][data-f="food"][data-v="3"]'); await W(100);
    for (let i = 0; i < 6; i++) await page.click('[data-act="hc-step"][data-f="water"][data-n="1"]');
    await page.click('[data-act="hc-set"][data-f="selfcare"][data-v="1"]'); await W(100);
    const d = await data(); const T = Object.keys(d.health)[0]; const h = d.health[T];
    assert.equal(h.sleep, 7); assert.equal(h.mood, 4); assert.equal(h.food, 3); assert.equal(h.water, 6); assert.equal(h.selfcare, true); assert.equal(h.exercise, true);
    assert.match(await page.textContent('#page'), /Rata-rata tidur/);
  });
  await check('Kebiasaan: centang + konsistensi (bukan streak)', async () => {
    await page.click('#page .row.habit:has-text("Minum air") .check'); await W();
    assert.match(await page.textContent('#page .row.habit:has-text("Minum air")'), /1\/\d+ hari minggu ini/);
    await page.click('[data-act="habit-manage"]'); await W(350);
    await page.click('#sheet [data-f="toggle"]:has-text("Membaca")'); await W();
    await closeSheet();
    assert.ok(await page.$('#page .row.habit:has-text("Membaca")'));
  });

  // ---- learning ----
  await tab('learn');
  await check('Roadmap: ubah status, catatan, tautan', async () => {
    await page.click('#page .row.topic:has-text("HTML")'); await W(350);
    await page.click('#sheet [data-f="status"][data-v="done"]');
    await page.fill('#tp-note', 'Semantic HTML & form');
    await page.fill('#tp-links', 'https://developer.mozilla.org/id/docs/Web/HTML');
    await page.click('#sheet [data-f="save"]'); await W(400);
    const t = (await data()).topics.find((x) => x.name === 'HTML');
    assert.equal(t.status, 'done'); assert.equal(t.links.length, 1);
    assert.match(await page.textContent('#page'), /1\/19/);
  });
  await check('Sesi belajar: catat dengan detail', async () => {
    await page.click('.subtab[data-v="sessions"]'); await W();
    await page.click('[data-act="session-add"]'); await W(350);
    await page.selectOption('#ss-topic', { label: 'SQL' });
    await page.fill('#ss-min', '60');
    await page.fill('#ss-learned', 'JOIN dan GROUP BY'); await page.fill('#ss-confused', 'Index'); await page.fill('#ss-next', 'Latihan query JOIN 3 tabel');
    await page.click('#sheet [data-f="save"]'); await W(400);
    const d = await data(); const s = d.sessions.find((x) => x.minutes === 60);
    assert.equal(d.topics.find((t) => t.id === s.topicId).name, 'SQL'); assert.equal(s.next, 'Latihan query JOIN 3 tabel');
  });
  await check('Proyek: tambah dengan validasi tautan', async () => {
    await page.click('.subtab[data-v="projects"]'); await W();
    assert.match(await page.textContent('#page'), /Task Wallet/);
    await page.click('[data-act="project-add"]'); await W(350);
    await page.fill('#pj-name', 'Jurnal Sehat'); await page.fill('#pj-github', 'github.com/x'); await page.click('#sheet [data-f="save"]'); await W(250);
    assert.match(await page.textContent('#toast'), /https/);
    await page.fill('#pj-github', 'https://github.com/x/jurnal'); await page.fill('#pj-tech', 'Node.js, Express, PostgreSQL');
    await page.click('#sheet [data-f="save"]'); await W(400);
    assert.ok((await data()).projects.find((p) => p.name === 'Jurnal Sehat'));
  });

  // ---- money ----
  await tab('money');
  await check('Pemasukan, pengeluaran & saldo bersih', async () => {
    await send('kopi 18rb'); await send('nabung 500rb');
    const txt = await page.textContent('#page');
    // spending this month (Oct 31 seed: 30rb from v1 is on Oct 5) = 30.000 + 25.000 + 18.000
    const T = await page.evaluate(() => Catetin.util.todayKey());
    const d = await data(); const mk = T.slice(0, 7);
    const m = d.txns.filter((x) => x.date.startsWith(mk));
    const inn = m.filter((x) => x.type === 'in').reduce((a, x) => a + x.amount, 0);
    const out = m.filter((x) => x.type === 'out').reduce((a, x) => a + x.amount, 0);
    const fmt = (n) => 'Rp' + new Intl.NumberFormat('id-ID').format(n);
    assert.ok(txt.includes(fmt(inn)), 'income shown');
    assert.ok(txt.includes('+' + fmt(inn - out)), 'saldo bersih = masuk − keluar');
    assert.match(txt, /Ditabung/);
  });
  await check('Target simpanan (dari data lama) + progres', async () => {
    const txt = await page.textContent('#page');
    assert.match(txt, /Target tabungan/); assert.match(txt, /Rp500\.000 terkumpul dari Rp2\.000\.000/);
  });
  await check('Cari, edit & hapus transaksi', async () => {
    await page.fill('#mq', 'kopi'); await W(250);
    assert.equal((await page.$$('#history .row.txn')).length, 1);
    await page.click('#history .row.txn'); await W(350);
    await page.fill('#x-amount', '20000'); await page.click('#sheet [data-f="save"]'); await W(400);
    assert.ok((await data()).txns.find((x) => x.title === 'Kopi' && x.amount === 20000));
    await page.click('#history .row.txn'); await W(350);
    await page.click('#sheet [data-f="del"]'); await W(400);
    assert.ok(!(await data()).txns.find((x) => x.title === 'Kopi'));
    await page.fill('#mq', ''); await W();
  });

  // ---- review ----
  await tab('review');
  await check('Evaluasi bulanan: angka otomatis + template + simpan otomatis', async () => {
    const txt = await page.textContent('#page');
    assert.match(txt, /Sesi belajar/); assert.match(txt, /Hari olahraga/); assert.match(txt, /Konsistensi kebiasaan/);
    await page.click('[data-act="r-template"]'); await W(300);
    assert.match(await page.inputValue('#rv-0'), /Menyelesaikan \d+ dari \d+ tugas/);
    await page.fill('#rv-6', '1. Belajar Express\n2. Tidur sebelum jam 11\n3. Nabung rutin'); await W(800);
    const r = Object.values((await data()).reviews)[0];
    assert.match(r.answers[6], /Belajar Express/);
  });

  // ---- export / import ----
  await check('Ekspor data (JSON) & impor kembali', async () => {
    await page.click('[data-act="settings"]'); await W(350);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#sheet [data-f="backup"]')]);
    const file = SH + 'backup-test.json'; await dl.saveAs(file);
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(json.app, 'taskwallet'); assert.ok(json.sessions.length >= 3 && json.habits.length && json.reviews);
    // wipe, then restore from the file
    await W(300);
    await page.click('[data-act="settings"]'); await W(350);
    await page.click('#sheet [data-f="wipe"]'); await W(400);
    assert.equal((await data()).tasks.length, 0);
    await page.click('[data-act="settings"]'); await W(350);
    await page.setInputFiles('#s-file', file); await W(600);
    const d = await data();
    assert.equal(d.sessions.length, json.sessions.length); assert.equal(d.tasks.length, json.tasks.length);
  });

  // ---- persistence, dark mode, layouts ----
  await check('Data tetap ada setelah reload', async () => {
    const before = await data();
    await page.reload(); await W(400);
    const after = await data();
    assert.equal(after.tasks.length, before.tasks.length); assert.equal(after.sessions.length, before.sessions.length);
    assert.match(await page.textContent('#page'), /Evaluasi/);
  });
  await check('Mode gelap', async () => {
    await page.click('[data-act="settings"]'); await W(350);
    await page.click('#sheet [data-f="theme"][data-v="dark"]'); await W(150);
    await closeSheet();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert.equal(bg, 'rgb(11, 20, 26)');
  });
  await check('Tampilan HP (390px & 320px) tanpa scroll horizontal', async () => {
    for (const t of ['home', 'tasks', 'habits', 'learn', 'money', 'review']) {
      await tab(t);
      await page.screenshot({ path: SH + `v4m-${t}-dark.png` });
    }
    await page.setViewportSize({ width: 320, height: 640 });
    for (const t of ['home', 'tasks', 'habits', 'learn', 'money', 'review']) {
      await tab(t);
      const over = await page.evaluate(() => [...document.querySelectorAll('#page *, .nav *, .topbar *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && !e.closest('.subtabs, .quick'); }).length);
      assert.equal(over, 0, `overflow on ${t} @320`);
    }
  });
  await check('Tampilan laptop (1366px)', async () => {
    await page.setViewportSize({ width: 1366, height: 820 });
    await page.click('[data-act="settings"]'); await W(350);
    await page.click('#sheet [data-f="theme"][data-v="light"]'); await W(150);
    await closeSheet();
    for (const t of ['home', 'tasks', 'learn', 'money']) { await tab(t); await page.screenshot({ path: SH + `v4d-${t}.png` }); }
    const navW = await page.evaluate(() => document.querySelector('.nav').getBoundingClientRect().width);
    assert.ok(navW > 150 && navW < 300, 'sidebar nav');
  });
  await check('Pengingat: tombol aktif hanya bila browser mendukung', async () => {
    await page.click('[data-act="settings"]'); await W(350);
    assert.match(await page.textContent('#sheet'), /Pengingat tugas berjam/);
    await closeSheet();
  });
  await check('Tidak ada error JavaScript di console', async () => { assert.deepEqual(errors, []); });

  // file:// (double-click from Explorer)
  const p2 = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const e2 = [];
  p2.on('pageerror', (e) => e2.push(e.message)); p2.on('console', (m) => m.type() === 'error' && e2.push(m.text()));
  await p2.goto('file://' + require('path').join(__dirname, '..', 'index.html')); await p2.waitForTimeout(400);
  await p2.fill('#input', 'tes file lokal'); await p2.keyboard.press('Enter'); await p2.waitForTimeout(200);
  await check('Dibuka langsung dari file (tanpa server)', async () => { assert.deepEqual(e2, []); assert.ok(await p2.$('.row:has-text("Tes file lokal")')); });

  // service worker (PWA)
  const p3 = await (await browser.newContext()).newPage();
  await p3.goto(URL);
  await check('PWA: service worker aktif & manifest dengan ikon', async () => {
    const st = await p3.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
    const man = await p3.evaluate(async () => (await (await fetch('manifest.webmanifest')).json()).icons.length);
    assert.ok(st); assert.ok(man >= 3);
  });

  await browser.close();
  fs.writeFileSync(SH + 'results.json', JSON.stringify(results, null, 1));
  const failed = results.filter((r) => r[0] === '❌').length;
  console.log(`\n${results.length - failed}/${results.length} lolos`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
