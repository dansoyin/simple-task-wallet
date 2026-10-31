/* ========================================
   TASK WALLET v4 — life.js
   Pages beyond tasks & money: Beranda (dashboard), Kebiasaan & Sehat,
   Belajar (roadmap, sesi, proyek) and Evaluasi bulanan.
   Shared UI helpers come from app.js through Catetin.ui (read at call time,
   so this file can load before app.js).
   ======================================== */
(function () {
    'use strict';
    const C = window.Catetin;
    const U = C.util, S = C.store, Q = C.sched, P = C.parser;
    const X = () => C.ui;
    const esc = U.esc;
    const D = () => S.data;

    const durText = (min) => {
        min = Math.round(min || 0);
        if (min < 60) return `${min} mnt`;
        const h = Math.floor(min / 60), m = min % 60;
        return m ? `${h} j ${m} mnt` : `${h} jam`;
    };
    const pct = (v) => `${Math.round((v || 0) * 100)}%`;
    const MOODS = ['😫', '😕', '😐', '🙂', '😄'];
    const FOOD = ['', 'Kurang', 'Cukup', 'Baik'];
    const TOPIC_STATUS = { todo: 'Belum mulai', doing: 'Sedang dipelajari', done: 'Selesai' };
    const PROJECT_STATUS = { ide: 'Ide', dikerjakan: 'Dikerjakan', selesai: 'Selesai', jeda: 'Dijeda' };

    function tile(act, tab, label, value, sub) {
        return `<button class="tile" data-act="${act}" data-tab="${tab}"><small>${label}</small><b>${value}</b><span>${sub}</span></button>`;
    }

    // ========================================
    // BERANDA
    // ========================================
    // Up to three focus tasks: the ones pinned for today, topped up by priority.
    function topThree(T) {
        const pending = [...Q.overdue(T), ...Q.dayEntries(T)].filter((e) => !Q.entryDone(e));
        const pinned = pending.filter((e) => e.t.focus === T);
        const rest = Q.sortEntries(pending.filter((e) => e.t.focus !== T));
        return { list: [...pinned, ...rest].slice(0, 3), pinned: pinned.length, pending };
    }

    function home() {
        const x = X(), T = x.ui.today, mk = T.slice(0, 7);
        const name = D().settings.name.trim();
        let html = `<div class="day-head"><div class="txt">
            <p class="greet">${U.greeting()}${name ? `, ${esc(name)}` : ''} 👋</p>
            <h1 class="day-title">${esc(U.fmtDate(T))}</h1>
            <p class="day-sub">Pelan-pelan, satu per satu.</p></div></div>`;

        const mig = S.migration;
        if (mig) {
            html += `<section class="card banner"><span aria-hidden="true">📦</span><span class="txt">Data lama sudah dipindahkan: ${mig.tasks} tugas, ${mig.txns} transaksi (dari ${esc(mig.from.join(', '))}). Data aslinya tetap disimpan.</span>
                <button class="icon-btn sm" data-act="ack-migration" aria-label="Tutup">${x.I.close}</button></section>`;
        }
        html += x.backupBanner();

        // three priorities
        const top = topThree(T);
        html += x.card(x.head('3 prioritas hari ini', `<button class="link-btn" data-act="tab" data-tab="tasks">Semua tugas</button>`),
            top.list.length ? x.list(top.list.map((e) => x.taskRow(e, { late: e.occ ? e.occ < T : !!(e.t.date && e.t.date < T) })))
                + (top.pinned ? '' : '<p class="hint">Ketuk tugas → 📌 “Fokus hari ini” untuk memilih prioritasmu sendiri.</p>')
                : '<p class="empty">Belum ada tugas untuk hari ini. Ketik di bawah, misal “nyetrika baju”.</p>');
        const restCount = top.pending.length - top.list.length;
        if (restCount > 0) html += `<div class="back-today"><button class="link-btn" data-act="tab" data-tab="tasks">+${restCount} tugas lain hari ini →</button></div>`;

        // quick add types
        html += `<section class="card card-pad"><p class="hero-label">Tambah cepat</p><div class="opts" style="margin-top:8px">
            ${[['task', '✅ Tugas'], ['habit', '🔁 Kebiasaan'], ['learn', '📚 Sesi belajar'], ['out', '💸 Transaksi'], ['idea', '💡 Ide'], ['note', '📝 Catatan']]
                .map(([k, l]) => `<button class="opt" data-act="compose" data-kind="${k}">${l}</button>`).join('')}</div></section>`;

        // summary tiles
        const m = S.monthMetrics(mk);
        const hs = S.getHealth(T);
        const habits = S.activeHabits();
        const habitsDone = habits.filter((h) => S.habitDone(h.id, T)).length;
        const ws = U.weekStart(T);
        const lw = S.learnStats(ws, T);
        const doing = D().topics.filter((t) => t.status === 'doing').map((t) => t.name);
        const spent = x.budgetSpend(Q.monthTxns(mk));
        const b = x.budgetInfo(mk, spent);
        const daysLeft = U.diffDays(T, U.lastDayOfMonth(mk));
        let tiles = '';
        tiles += tile('tab', 'tasks', 'Tugas bulan ini', `${m.done}/${m.tasks}`, m.tasks ? `${pct(m.pct)} selesai` : 'belum ada');
        tiles += tile('tab', 'habits', 'Kebiasaan hari ini', `${habitsDone}/${habits.length}`, habits.length ? `${pct(m.consistency)} konsisten bulan ini` : 'pilih kebiasaanmu');
        tiles += tile('tab', 'habits', 'Kesehatan', hs ? `${hs.sleep ? `😴 ${hs.sleep} j` : '✓'}${hs.mood ? ` ${MOODS[hs.mood - 1]}` : ''}` : '—',
            hs ? `check-in tersimpan · olahraga ${m.exerciseDays} hari` : 'belum check-in hari ini');
        tiles += tile('tab', 'learn', 'Belajar minggu ini', durText(lw.minutes), doing.length ? `sedang: ${esc(doing.slice(0, 2).join(', '))}` : `${lw.count} sesi`);
        tiles += tile('tab', 'money', 'Pengeluaran bulan ini', U.rupiahShort(spent), b ? (b.status === 'over' ? '⛔ lewat anggaran' : `aman ${U.rupiahShort(b.perDay)}/hari`) : `saldo ${U.rupiah(m.net, { sign: true })}`);
        tiles += tile('tab', 'review', 'Evaluasi bulanan', m.reviewDone ? '✓ Sudah' : 'Belum', m.reviewDone ? 'bisa diubah kapan saja' : daysLeft <= 3 ? 'akhir bulan — saatnya isi' : `${daysLeft} hari lagi`);
        html += `<div class="tiles">${tiles}</div>`;

        if (!D().tasks.length && !D().txns.length && !D().sessions.length) html += x.welcome();
        return html;
    }

    // ========================================
    // KEBIASAAN & SEHAT
    // ========================================
    function stepper(field, value, unit, step) {
        return `<div class="stepper"><button class="icon-btn sm" data-act="hc-step" data-f="${field}" data-n="${-step}" aria-label="Kurangi">−</button>
            <b>${value || 0}</b><small>${unit}</small>
            <button class="icon-btn sm" data-act="hc-step" data-f="${field}" data-n="${step}" aria-label="Tambah">+</button></div>`;
    }

    function healthCard() {
        const x = X(), k = x.ui.hday, T = x.ui.today;
        const h = S.getHealth(k) || {};
        const nav = `<div class="nav-row" style="margin:0">
            <button class="icon-btn sm" data-act="hc-day" data-n="-1" aria-label="Hari sebelumnya">${x.I.left}</button>
            <div class="title">${k === T ? 'Check-in hari ini' : esc(U.relDay(k, T))}<small>${esc(U.fmtDate(k, { short: true }))}</small></div>
            <button class="icon-btn sm" data-act="hc-day" data-n="1" aria-label="Hari berikutnya" ${k >= T ? 'disabled' : ''}>${x.I.right}</button></div>`;
        const opt = (field, v, label, on) => `<button class="opt${on ? ' on' : ''}" data-act="hc-set" data-f="${field}" data-v="${v}">${label}</button>`;
        return `<section class="card card-pad checkin">${nav}
            <div class="hc-row"><span>😴 Tidur</span>${stepper('sleep', h.sleep, 'jam', 0.5)}</div>
            <div class="hc-row"><span>🏃 Olahraga</span><div class="opts">${opt('exercise', 1, 'Ya', h.exercise)}${opt('exercise', 0, 'Belum', h.exercise === false)}</div></div>
            <div class="hc-row"><span>⏱️ Aktivitas fisik</span>${stepper('activity', h.activity, 'mnt', 10)}</div>
            <div class="hc-row"><span>⚡ Energi</span><div class="opts moods">${MOODS.map((e, i) => opt('mood', i + 1, e, h.mood === i + 1)).join('')}</div></div>
            <div class="hc-row"><span>🍽️ Makan</span><div class="opts">${[1, 2, 3].map((v) => opt('food', v, FOOD[v], h.food === v)).join('')}</div></div>
            <div class="hc-row"><span>💧 Minum air</span>${stepper('water', h.water, 'gelas', 1)}</div>
            <div class="hc-row"><span>🧴 Rawat diri</span><div class="opts">${opt('selfcare', 1, 'Sudah', h.selfcare)}${opt('selfcare', 0, 'Belum', h.selfcare === false)}</div></div>
            <div class="field" style="margin:10px 0 0"><input class="input" data-hc-note placeholder="Catatan singkat (opsional): badan pegal, tidur nyenyak…" value="${esc(h.note || '')}" aria-label="Catatan kesehatan"></div>
            <p class="hint" style="padding:8px 0 0">Bukan alat medis — cuma catatan kebiasaan. Kalau ada keluhan, tanyakan ke tenaga kesehatan.</p>
        </section>`;
    }

    function healthSummary() {
        const x = X(), T = x.ui.today;
        const month = x.ui.hRange === 'month';
        const from = month ? `${T.slice(0, 7)}-01` : U.addDays(T, -6);
        const s = S.healthStats(from, T);
        const seg = `<div class="seg small">${[['week', '7 hari'], ['month', 'Bulan ini']].map(([v, l]) =>
            `<button class="opt${(x.ui.hRange || 'week') === v ? ' on' : ''}" data-act="h-range" data-v="${v}">${l}</button>`).join('')}</div>`;
        let dots = '';
        if (!month) {
            for (let i = 6; i >= 0; i--) {
                const k = U.addDays(T, -i), h = S.getHealth(k);
                dots += `<div class="wk"><small>${U.HARI3[U.weekday(k)]}</small><span>${h && h.mood ? MOODS[h.mood - 1] : '·'}</span><i class="${S.exercisedOn(k) ? 'on' : ''}" title="Olahraga"></i></div>`;
            }
        }
        const fmt = (v, d = 1) => (v ? (Math.round(v * 10 ** d) / 10 ** d).toString().replace('.', ',') : '–');
        return x.card(x.head('Perkembangan', seg), `<div class="card-pad" style="padding-top:4px">
            ${dots ? `<div class="week-dots">${dots}</div>` : ''}
            <div class="kpis">
                <div class="kpi"><small>Rata-rata tidur</small><b>${fmt(s.sleep)} jam</b></div>
                <div class="kpi"><small>Hari olahraga</small><b>${s.exerciseDays}/${s.days}</b></div>
                <div class="kpi"><small>Rata-rata minum</small><b>${fmt(s.water)} gelas</b></div>
                <div class="kpi"><small>Rawat diri</small><b>${s.selfcareDays}/${s.days} hari</b></div>
            </div>
            <p class="hint" style="padding:8px 0 0">${s.logged ? `Check-in terisi ${s.logged} dari ${s.days} hari.` : 'Belum ada check-in di periode ini.'}</p></div>`);
    }

    function habitRow(h) {
        const x = X(), T = x.ui.today;
        const done = S.habitDone(h.id, T);
        const ws = U.weekStart(T);
        let week = '';
        for (let i = 0; i < 7; i++) {
            const k = U.addDays(ws, i);
            week += `<i class="${S.habitDone(h.id, k) ? 'on' : ''}${k === T ? ' today' : ''}${k > T ? ' future' : ''}" title="${esc(U.fmtDate(k, { short: true }))}"></i>`;
        }
        const w = S.habitPeriod(h, ws, T);
        const m = S.habitPeriod(h, `${T.slice(0, 7)}-01`, T);
        return `<li class="row-wrap"><div class="row habit${done ? ' done' : ''}" data-act="habit-edit" data-id="${h.id}" tabindex="0">
            <button class="check" type="button" data-act="habit-toggle" data-id="${h.id}" role="checkbox" aria-checked="${done}" aria-label="Sudah: ${esc(h.name)}">${x.I.check}</button>
            <div class="body"><div class="title">${esc(h.emoji || '')} ${esc(h.name)}</div>
                <div class="meta"><span>${w.done}/${w.days} hari minggu ini</span><span>${pct(m.pct)} bulan ini (${m.done}/${m.days})</span></div></div>
            <div class="hweek" aria-hidden="true">${week}</div></div></li>`;
    }

    function habits() {
        const x = X();
        const list = S.activeHabits();
        let html = healthCard();
        html += x.card(x.head('Kebiasaan', `<button class="link-btn" data-act="habit-manage">Atur</button>`),
            list.length ? x.list(list.map(habitRow)) + '<p class="hint">Dihitung sebagai “berapa hari dari berapa”, bukan rantai beruntun — melewatkan satu hari itu wajar.</p>'
                : '<p class="empty">Belum ada kebiasaan aktif. Ketuk “Atur” untuk memilih.</p>');
        html += healthSummary();
        return html;
    }

    function openHabitManage() {
        const x = X();
        const body = () => `<ul class="menu">${D().habits.map((h) => `<li><button type="button" data-f="toggle" data-id="${h.id}">
                <span class="emo-lg">${esc(h.emoji || '✨')}</span><span>${esc(h.name)}<small>${h.active ? 'Aktif' : 'Tidak dipakai'}</small></span>
                <span class="switch${h.active ? ' on' : ''}" aria-hidden="true"></span></button></li>`).join('')}</ul>
            <div class="inline" style="margin-top:12px"><input class="input" id="hb-emoji" value="✨" style="max-width:64px;text-align:center" aria-label="Emoji">
                <input class="input" id="hb-name" placeholder="Kebiasaan baru, misal: stretching 5 menit" aria-label="Nama kebiasaan">
                <button class="btn primary" type="button" data-f="add" style="flex:none">Tambah</button></div>`;
        x.openSheet({
            title: 'Pilih kebiasaan',
            body: body(),
            onMount(el) {
                el.addEventListener('click', (e) => {
                    const b = e.target.closest('[data-f]');
                    if (!b) return;
                    if (b.dataset.f === 'toggle') {
                        const h = S.getHabit(b.dataset.id);
                        S.updateHabit(h.id, { active: !h.active });
                    } else if (b.dataset.f === 'add') {
                        const name = el.querySelector('#hb-name').value.trim();
                        if (!name) return;
                        S.addHabit(name, el.querySelector('#hb-emoji').value.trim());
                    }
                    S.save();
                    el.querySelector('.sheet-body').innerHTML = body();
                    x.render();
                });
            },
        });
    }

    function openHabitEdit(id) {
        const x = X();
        const h = S.getHabit(id);
        if (!h) return;
        const T = x.ui.today;
        let cal = '';
        for (let i = 29; i >= 0; i--) {
            const k = U.addDays(T, -i);
            cal += `<button type="button" class="hday${S.habitDone(id, k) ? ' on' : ''}" data-f="day" data-k="${k}" title="${esc(U.fmtDate(k, { short: true }))}">${Number(k.slice(8))}</button>`;
        }
        const st = S.habitPeriod(h, U.addDays(T, -29), T);
        x.openSheet({
            title: 'Kebiasaan',
            body: `<div class="inline" style="margin-top:0"><input class="input" id="he-emoji" value="${esc(h.emoji || '')}" style="max-width:64px;text-align:center" aria-label="Emoji">
                <input class="input" id="he-name" value="${esc(h.name)}" aria-label="Nama kebiasaan"></div>
                <p class="hint" style="padding:12px 0 6px">30 hari terakhir — ketuk tanggal untuk mengubah (${st.done}/${st.days} hari, ${pct(st.pct)}).</p>
                <div class="hcal">${cal}</div>`,
            foot: `<button type="button" class="btn danger" data-f="del">${x.I.trash} Hapus</button><button type="button" class="btn" data-f="off">Nonaktifkan</button><button type="button" class="btn primary" data-f="save">Simpan</button>`,
            onMount(el) {
                el.addEventListener('click', (e) => {
                    const b = e.target.closest('[data-f]');
                    if (!b) return;
                    const f = b.dataset.f;
                    if (f === 'day') {
                        const on = S.toggleHabit(id, b.dataset.k);
                        b.classList.toggle('on', on);
                        S.save();
                        x.render();
                        return;
                    }
                    const snap = S.snapshot();
                    if (f === 'del') {
                        if (!window.confirm(`Hapus kebiasaan “${h.name}” beserta catatannya?`)) return;
                        S.removeHabit(id);
                    } else if (f === 'off') S.updateHabit(id, { active: false });
                    else S.updateHabit(id, { name: el.querySelector('#he-name').value.trim() || h.name, emoji: el.querySelector('#he-emoji').value.trim() });
                    S.save();
                    x.closeSheet();
                    x.render();
                    x.toast(f === 'del' ? 'Kebiasaan dihapus' : 'Tersimpan', [x.undo(snap)]);
                });
            },
        });
    }

    // ========================================
    // BELAJAR — roadmap, sesi, proyek
    // ========================================
    function learnTabs() {
        const v = X().ui.lview || 'roadmap';
        return `<div class="subtabs inpage">${[['roadmap', 'Roadmap'], ['sessions', 'Sesi belajar'], ['projects', 'Proyek']].map(([k, l]) =>
            `<button class="subtab${v === k ? ' on' : ''}" data-act="lview" data-v="${k}">${l}</button>`).join('')}</div>`;
    }

    function learn() {
        const v = X().ui.lview || 'roadmap';
        return learnTabs() + (v === 'sessions' ? sessionsView() : v === 'projects' ? projectsView() : roadmapView());
    }

    function roadmapView() {
        const x = X(), T = x.ui.today;
        const topics = D().topics;
        const done = topics.filter((t) => t.status === 'done').length;
        const doing = topics.filter((t) => t.status === 'doing').length;
        const mStats = S.learnStats(`${T.slice(0, 7)}-01`, T);
        let html = `<section class="card hero-card"><p class="hero-label">Roadmap full-stack & AI</p>
            <p class="hero">${done}/${topics.length}</p>
            <div class="meter"><i style="width:${topics.length ? (done / topics.length) * 100 : 0}%"></i></div>
            <div class="budget-line"><span>${doing} sedang dipelajari</span><span>Bulan ini ${mStats.count} sesi · ${durText(mStats.minutes)}</span></div></section>`;
        const rows = topics.map((t) => {
            const st = S.topicStats(t.id);
            return `<li class="row-wrap"><div class="row topic" data-act="topic-edit" data-id="${t.id}" tabindex="0">
                <span class="status-dot ${t.status}" aria-hidden="true"></span>
                <div class="body"><div class="title">${esc(t.name)}</div>
                    <div class="meta"><span>${TOPIC_STATUS[t.status]}</span>${st.count ? `<span>${st.count} sesi · ${durText(st.minutes)}</span>` : ''}${t.links.length ? `<span>🔗 ${t.links.length}</span>` : ''}${t.note ? '<span>📝</span>' : ''}</div></div></div></li>`;
        });
        html += x.card(x.head('Materi', '<button class="link-btn" data-act="topic-add">+ Materi</button>'), x.list(rows));
        html += '<p class="hint">Tips: ketik “belajar express routing 45 menit” di bawah — tercatat sebagai sesi dan masuk ke materi Express.</p>';
        return html;
    }

    function sessionsView() {
        const x = X(), T = x.ui.today;
        const ws = U.weekStart(T);
        const w = S.learnStats(ws, T), m = S.learnStats(`${T.slice(0, 7)}-01`, T);
        let html = `<section class="card card-pad"><div class="kpis">
            <div class="kpi"><small>Minggu ini</small><b>${w.count} sesi · ${durText(w.minutes)}</b></div>
            <div class="kpi"><small>Bulan ini</small><b>${m.count} sesi · ${durText(m.minutes)}</b></div></div>
            <button class="btn primary" style="width:100%;margin-top:12px" data-act="session-add">+ Catat sesi belajar</button></section>`;
        const list = [...D().sessions].sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1)).slice(0, 60);
        if (!list.length) return html + '<p class="empty">Belum ada sesi. Contoh cepat: ketik “belajar Node.js 45 menit”.</p>';
        let cur = null, rows = [], out = '';
        const flush = () => { if (cur) out += `<div class="tday"><span>${esc(U.relDay(cur, T))}</span><span>${durText(list.filter((s) => s.date === cur).reduce((a, s) => a + s.minutes, 0))}</span></div>${x.list(rows)}`; };
        list.forEach((s) => {
            if (s.date !== cur) { flush(); cur = s.date; rows = []; }
            const tp = s.topicId && S.getTopic(s.topicId);
            rows.push(`<li class="row-wrap"><div class="row" data-act="session-edit" data-id="${s.id}" tabindex="0">
                <span class="avatar" aria-hidden="true">📚</span>
                <div class="body"><div class="title">${esc(tp ? tp.name : s.topic || 'Sesi belajar')}</div>
                    <div class="meta">${s.learned ? `<span>✓ ${esc(s.learned.slice(0, 60))}</span>` : ''}${s.next ? `<span>→ ${esc(s.next.slice(0, 40))}</span>` : ''}</div></div>
                <div class="side"><div class="time">${durText(s.minutes)}</div></div></div></li>`);
        });
        flush();
        return html + `<section class="card">${out}<div style="height:6px"></div></section>`;
    }

    function projectsView() {
        const x = X();
        const rows = D().projects.map((p) => `<li class="row-wrap"><div class="row" data-act="project-edit" data-id="${p.id}" tabindex="0">
            <span class="avatar" aria-hidden="true">${p.screenshot ? `<img src="${p.screenshot}" alt="">` : '🧩'}</span>
            <div class="body"><div class="title">${esc(p.name)}</div><div class="meta"><span class="pill">${PROJECT_STATUS[p.status] || p.status}</span><span>${esc((p.tech || '').slice(0, 60))}</span></div></div></div></li>`);
        return x.card(x.head('Proyek & proof of work', '<button class="link-btn" data-act="project-add">+ Proyek</button>'),
            rows.length ? x.list(rows) : '<p class="empty">Catat proyek portofoliomu di sini.</p>')
            + '<p class="hint">Proof of work: tulis masalah yang diselesaikan, teknologi, link GitHub & demo, kendala, dan pelajaran — bahan bagus untuk CV dan wawancara.</p>';
    }

    function openTopic(id) {
        const x = X();
        const t = S.getTopic(id);
        if (!t) return;
        const st = S.topicStats(id);
        const links = S.topicLinks(id);
        const sessions = D().sessions.filter((s) => s.topicId === id).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10);
        x.openSheet({
            title: t.name,
            body: `<div class="field"><label for="tp-name">Nama materi</label><input class="input" id="tp-name" value="${esc(t.name)}"></div>
                <div class="field"><div class="label">Status</div><div class="seg">${Object.entries(TOPIC_STATUS).map(([k, l]) =>
                    `<button type="button" class="opt${t.status === k ? ' on' : ''}" data-f="status" data-v="${k}">${l}</button>`).join('')}</div></div>
                <p class="hint" style="padding:0 0 10px">${st.count} sesi · ${durText(st.minutes)} total</p>
                <div class="field"><label for="tp-note">Catatan</label><textarea class="input" id="tp-note" rows="3">${esc(t.note)}</textarea></div>
                <div class="field"><label for="tp-links">Tautan referensi (satu per baris)</label><textarea class="input" id="tp-links" rows="3" placeholder="https://developer.mozilla.org/…">${esc(t.links.join('\n'))}</textarea></div>
                ${t.links.length ? `<div class="links">${t.links.map((l) => `<a href="${esc(l)}" target="_blank" rel="noopener noreferrer">${esc(l.replace(/^https?:\/\//, '').slice(0, 50))}</a>`).join('')}</div>` : ''}
                <div class="field"><label for="tp-kw">Kata kunci (dipisah |) — untuk menebak materi dari ketikan</label><input class="input" id="tp-kw" value="${esc(t.kw || '')}"></div>
                ${sessions.length ? `<div class="label">Sesi terakhir</div><ul class="plain">${sessions.map((s) => `<li>${esc(U.fmtDate(s.date, { short: true }))} · ${durText(s.minutes)}${s.learned ? ` — ${esc(s.learned.slice(0, 80))}` : ''}</li>`).join('')}</ul>` : ''}
                ${links.tasks.length ? `<div class="label">Tugas terkait</div><ul class="plain">${links.tasks.slice(0, 8).map((k) => `<li>${k.done ? '✅' : '⬜'} ${esc(k.title)}</li>`).join('')}</ul>` : ''}
                ${links.projects.length ? `<div class="label">Proyek terkait</div><ul class="plain">${links.projects.map((p) => `<li>🧩 ${esc(p.name)}</li>`).join('')}</ul>` : ''}`,
            foot: `<button type="button" class="btn danger" data-f="del">${x.I.trash} Hapus</button><button type="button" class="btn primary" data-f="save">Simpan</button>`,
            onMount(el) {
                let status = t.status;
                el.addEventListener('click', (e) => {
                    const b = e.target.closest('[data-f]');
                    if (!b) return;
                    if (b.dataset.f === 'status') {
                        status = b.dataset.v;
                        el.querySelectorAll('[data-f="status"]').forEach((o) => o.classList.toggle('on', o === b));
                        return;
                    }
                    const snap = S.snapshot();
                    if (b.dataset.f === 'del') {
                        if (!window.confirm(`Hapus materi “${t.name}”? Sesi belajarnya tetap tersimpan.`)) return;
                        S.removeTopic(id);
                    } else {
                        S.updateTopic(id, {
                            name: el.querySelector('#tp-name').value.trim() || t.name, status,
                            note: el.querySelector('#tp-note').value.trim(), kw: el.querySelector('#tp-kw').value.trim(),
                            links: el.querySelector('#tp-links').value.split('\n').map((l) => l.trim()).filter(Boolean),
                        });
                    }
                    S.save();
                    x.closeSheet();
                    x.render();
                    x.toast(b.dataset.f === 'del' ? 'Materi dihapus' : 'Tersimpan', [x.undo(snap)]);
                });
            },
        });
    }

    function openSession(id, preset) {
        const x = X();
        const s = id ? S.getSession(id) : { date: x.ui.today, topicId: null, topic: '', minutes: 30, learned: '', confused: '', next: '', ...(preset || {}) };
        if (!s) return;
        const opts = D().topics.map((t) => `<option value="${t.id}"${s.topicId === t.id ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
        x.openSheet({
            title: id ? 'Sesi belajar' : 'Catat sesi belajar',
            body: `<div class="field"><label for="ss-topic">Materi</label><select class="input" id="ss-topic"><option value="">— Lainnya —</option>${opts}</select></div>
                <div class="field"><label for="ss-text">Topik spesifik</label><input class="input" id="ss-text" value="${esc(s.topic)}" placeholder="misal: Express routing & middleware"></div>
                <div class="inline" style="margin-top:0"><div class="field" style="flex:1;margin:0"><label for="ss-min">Durasi (menit)</label><input class="input" id="ss-min" type="number" min="1" max="720" inputmode="numeric" value="${s.minutes || ''}"></div>
                    <div class="field" style="flex:1;margin:0"><label for="ss-date">Tanggal</label><input class="input" id="ss-date" type="date" value="${s.date}"></div></div>
                <div class="opts" style="margin:8px 0 14px">${[15, 30, 45, 60, 90, 120].map((m) => `<button type="button" class="opt" data-f="min" data-v="${m}">${durText(m)}</button>`).join('')}</div>
                <div class="field"><label for="ss-learned">Apa yang dipelajari?</label><textarea class="input" id="ss-learned" rows="2">${esc(s.learned)}</textarea></div>
                <div class="field"><label for="ss-confused">Apa yang belum dipahami?</label><textarea class="input" id="ss-confused" rows="2">${esc(s.confused)}</textarea></div>
                <div class="field"><label for="ss-next">Langkah berikutnya</label><textarea class="input" id="ss-next" rows="2">${esc(s.next)}</textarea></div>
                ${id && s.next ? '<button type="button" class="btn" data-f="totask" style="width:100%">✅ Jadikan “langkah berikutnya” tugas</button>' : ''}`,
            foot: `${id ? `<button type="button" class="btn danger" data-f="del">${x.I.trash} Hapus</button>` : ''}<button type="button" class="btn primary" data-f="save">Simpan</button>`,
            onMount(el) {
                el.addEventListener('click', (e) => {
                    const b = e.target.closest('[data-f]');
                    if (!b) return;
                    const f = b.dataset.f;
                    if (f === 'min') { el.querySelector('#ss-min').value = b.dataset.v; return; }
                    const snap = S.snapshot();
                    const v = (q) => el.querySelector(q).value.trim();
                    const fields = {
                        topicId: v('#ss-topic') || null, topic: v('#ss-text'), minutes: Math.max(0, parseInt(v('#ss-min'), 10) || 0),
                        date: v('#ss-date') || x.ui.today, learned: v('#ss-learned'), confused: v('#ss-confused'), next: v('#ss-next'),
                    };
                    if (f === 'del') S.removeSession(id);
                    else if (f === 'totask') {
                        S.addTask({ title: fields.next, date: x.ui.today, category: 'belajar' });
                    } else {
                        if (!fields.minutes) { x.toast('Isi durasinya dulu ya'); return; }
                        if (!fields.topicId && fields.topic) fields.topicId = S.matchTopic(fields.topic);
                        if (id) S.updateSession(id, fields);
                        else S.addSession(fields);
                    }
                    S.save();
                    x.closeSheet();
                    x.render();
                    x.toast(f === 'del' ? 'Sesi dihapus' : f === 'totask' ? 'Ditambahkan ke tugas hari ini' : 'Sesi belajar tersimpan', [x.undo(snap)]);
                });
            },
        });
    }

    // Screenshots are shrunk on the device so localStorage doesn't fill up.
    function shrinkImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, 900 / Math.max(img.width, img.height));
                const cv = document.createElement('canvas');
                cv.width = Math.round(img.width * scale);
                cv.height = Math.round(img.height * scale);
                cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
                URL.revokeObjectURL(img.src);
                resolve(cv.toDataURL('image/jpeg', 0.72));
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    function openProject(id) {
        const x = X();
        const p = id ? S.getProject(id) : { name: '', status: 'ide', problem: '', users: '', tech: '', features: '', github: '', demo: '', obstacles: '', lessons: '', screenshot: '' };
        if (!p) return;
        let shot = p.screenshot || '';
        const F = [['name', 'Nama proyek', 'input'], ['problem', 'Masalah yang diselesaikan', 'area'], ['users', 'Target pengguna', 'input'],
            ['tech', 'Teknologi', 'input'], ['features', 'Fitur', 'area'], ['github', 'Tautan GitHub', 'url'], ['demo', 'Tautan demo', 'url'],
            ['obstacles', 'Kendala', 'area'], ['lessons', 'Hal yang dipelajari', 'area']];
        const field = ([k, l, type]) => `<div class="field"><label for="pj-${k}">${l}</label>${type === 'area'
            ? `<textarea class="input" id="pj-${k}" rows="2">${esc(p[k])}</textarea>`
            : `<input class="input" id="pj-${k}" ${type === 'url' ? 'type="url" inputmode="url" placeholder="https://"' : ''} value="${esc(p[k])}">`}${type === 'url' && p[k] ? ` <a class="link-btn" href="${esc(p[k])}" target="_blank" rel="noopener noreferrer">Buka ↗</a>` : ''}</div>`;
        x.openSheet({
            title: id ? 'Proyek' : 'Proyek baru',
            body: `${field(F[0])}<div class="field"><div class="label">Status</div><div class="seg">${Object.entries(PROJECT_STATUS).map(([k, l]) =>
                `<button type="button" class="opt${p.status === k ? ' on' : ''}" data-f="status" data-v="${k}">${l}</button>`).join('')}</div></div>
                ${F.slice(1).map(field).join('')}
                <div class="field"><div class="label">Screenshot (opsional)</div><div id="pj-shot">${shot ? `<img class="shot" src="${shot}" alt="Screenshot proyek">` : ''}</div>
                    <div class="inline"><label class="btn">🖼️ Pilih gambar<input type="file" id="pj-file" accept="image/*" hidden></label>${shot ? '<button type="button" class="link-btn" data-f="noshot">Hapus gambar</button>' : ''}</div></div>`,
            foot: `${id ? `<button type="button" class="btn danger" data-f="del">${x.I.trash} Hapus</button>` : ''}<button type="button" class="btn primary" data-f="save">Simpan</button>`,
            onMount(el) {
                let status = p.status;
                el.querySelector('#pj-file').addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    shrinkImage(file).then((url) => {
                        shot = url;
                        el.querySelector('#pj-shot').innerHTML = `<img class="shot" src="${url}" alt="Screenshot proyek">`;
                    }).catch(() => x.toast('Gambar tidak bisa dibaca'));
                });
                el.addEventListener('click', (e) => {
                    const b = e.target.closest('[data-f]');
                    if (!b) return;
                    const f = b.dataset.f;
                    if (f === 'status') {
                        status = b.dataset.v;
                        el.querySelectorAll('[data-f="status"]').forEach((o) => o.classList.toggle('on', o === b));
                        return;
                    }
                    if (f === 'noshot') { shot = ''; el.querySelector('#pj-shot').innerHTML = ''; b.remove(); return; }
                    const snap = S.snapshot();
                    if (f === 'del') {
                        if (!window.confirm(`Hapus proyek “${p.name}”?`)) return;
                        S.removeProject(id);
                    } else {
                        const vals = Object.fromEntries(F.map(([k]) => [k, el.querySelector(`#pj-${k}`).value.trim()]));
                        if (!vals.name) { x.toast('Nama proyeknya diisi dulu'); return; }
                        const bad = ['github', 'demo'].find((k) => vals[k] && !/^https?:\/\//i.test(vals[k]));
                        if (bad) { x.toast('Tautan harus diawali https://'); return; }
                        const fields = { ...vals, status, screenshot: shot };
                        if (id) S.updateProject(id, fields);
                        else S.addProject(fields);
                    }
                    if (!S.save()) { x.toast('Penyimpanan penuh — coba gambar yang lebih kecil'); S.restore(snap); return; }
                    x.closeSheet();
                    x.render();
                    x.toast(f === 'del' ? 'Proyek dihapus' : 'Proyek tersimpan', [x.undo(snap)]);
                });
            },
        });
    }

    // ========================================
    // EVALUASI BULANAN
    // ========================================
    function review() {
        const x = X(), mk = x.ui.rmonth, T = x.ui.today;
        const m = S.monthMetrics(mk);
        const r = S.getReview(mk);
        const answers = r ? r.answers : S.REVIEW_QUESTIONS.map(() => '');
        let html = `<div class="nav-row">
            <button class="icon-btn" data-act="r-month" data-n="-1" aria-label="Bulan sebelumnya">${x.I.left}</button>
            <div class="title">Evaluasi ${esc(U.fmtMonth(mk))}<small>${m.reviewDone ? '✓ sudah diisi' : 'belum diisi'}</small></div>
            <button class="icon-btn" data-act="r-month" data-n="1" aria-label="Bulan berikutnya" ${mk >= T.slice(0, 7) ? 'disabled' : ''}>${x.I.right}</button></div>`;
        const k = (label, value, sub = '') => `<div class="kpi"><small>${label}</small><b>${value}</b>${sub ? `<span class="muted" style="font-size:12px;display:block">${sub}</span>` : ''}</div>`;
        html += `<section class="card card-pad"><div class="kpis">
            ${k('Tugas selesai', `${m.done}/${m.tasks}`, `${pct(m.pct)} penyelesaian`)}
            ${k('Sesi belajar', `${m.sessions}`, durText(m.minutes))}
            ${k('Hari olahraga', `${m.exerciseDays}`, `dari ${m.days} hari`)}
            ${k('Konsistensi kebiasaan', pct(m.consistency), `${m.habits} kebiasaan aktif`)}
            ${k('Pemasukan', U.rupiah(m.in))}
            ${k('Pengeluaran', U.rupiah(m.spent), m.saved ? `ditabung ${U.rupiah(m.saved)}` : '')}
            ${k('Saldo bersih', U.rupiah(m.net, { sign: true }), 'masuk − keluar − tabungan')}
            ${k('Evaluasi', m.reviewDone ? '✓ Sudah' : 'Belum')}
        </div></section>`;
        if (m.postponed.length) {
            html += x.card(x.head('Sering tertunda'), `<ul class="plain card-pad" style="padding-top:0">${m.postponed.map((t) => `<li>${esc(t.title)} — dipindah ${t.moved}x</li>`).join('')}</ul>`);
        }
        html += `<section class="card card-pad review">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><p class="hero-label" style="flex:1">Pertanyaan refleksi</p>
            <button class="btn" data-act="r-template" style="height:38px">✨ Isi template otomatis</button></div>
            <p class="hint" style="padding:0 0 10px">Evaluasi bukan untuk menyalahkan diri. Template diisi dari datamu — ubah sesukamu. Tersimpan otomatis.</p>
            ${S.REVIEW_QUESTIONS.map((q, i) => `<div class="field"><label for="rv-${i}">${i + 1}. ${esc(q)}</label>
                <textarea class="input" id="rv-${i}" data-review="${i}" rows="3">${esc(answers[i] || '')}</textarea></div>`).join('')}
            <p class="hint" id="rv-status" style="padding:0">${r ? `Terakhir disimpan ${esc(U.relDay(U.keyAt(r.updatedAt), T).toLowerCase())}` : ''}</p></section>`;
        return html;
    }

    // Draft answers from the month's own numbers; the person edits from there.
    function reviewTemplate(mk) {
        const m = S.monthMetrics(mk);
        const D0 = D();
        const inMonth = (t) => (t.date || '').startsWith(mk) || (t.doneAt && U.keyAt(t.doneAt).startsWith(mk));
        const doneTitles = D0.tasks.filter((t) => !t.repeat && t.done && inMonth(t)).slice(-5).map((t) => t.title);
        const open = D0.tasks.filter((t) => !t.repeat && !t.done && inMonth(t)).slice(0, 5).map((t) => t.title);
        const sessions = D0.sessions.filter((s) => s.date.startsWith(mk));
        const topicNames = [...new Set(sessions.map((s) => (s.topicId && S.getTopic(s.topicId) ? S.getTopic(s.topicId).name : s.topic)).filter(Boolean))];
        const learned = sessions.map((s) => s.learned).filter(Boolean).slice(-3);
        const nexts = sessions.map((s) => s.next).filter(Boolean).slice(-3);
        const from = `${mk}-01`, last = U.lastDayOfMonth(mk), to = last < U.todayKey() ? last : U.todayKey();
        const habitPct = S.activeHabits().map((h) => ({ h, p: S.habitPeriod(h, from, to).pct }));
        const keep = habitPct.filter((x) => x.p >= 0.6).map((x) => x.h.name);
        const weak = habitPct.filter((x) => x.p < 0.3).map((x) => x.h.name);
        const topCat = Q.byCat(D0.txns.filter((x) => x.date.startsWith(mk) && x.cat !== 'tabungan'), 'out')[0];
        const bullets = (xs) => xs.map((s) => `- ${s}`).join('\n');
        return [
            `Menyelesaikan ${m.done} dari ${m.tasks} tugas (${pct(m.pct)}).${m.sessions ? ` Belajar ${m.sessions} sesi (${durText(m.minutes)})${topicNames.length ? `: ${topicNames.join(', ')}` : ''}.` : ''} Olahraga ${m.exerciseDays} hari.${doneTitles.length ? `\n${bullets(doneTitles)}` : ''}`,
            open.length ? bullets(open) : 'Semua tugas bulan ini selesai.',
            m.postponed.length ? `Sering dipindah: ${m.postponed.map((t) => t.title).join(', ')}.\nAlasannya: ` : 'Alasannya: ',
            learned.length ? bullets(learned) : '',
            keep.length ? `Pertahankan: ${keep.join(', ')}.` : '',
            [weak.length ? `Kebiasaan yang perlu dicek ulang (mungkin terlalu berat?): ${weak.join(', ')}.` : '', topCat ? `Pengeluaran terbesar: ${P.CAT[topCat.cat].name} (${U.rupiah(topCat.total)}).` : ''].filter(Boolean).join('\n'),
            ['1. ', '2. ', '3. '].map((n, i) => n + (nexts[i] || '')).join('\n'),
        ];
    }

    // ========================================
    // ACTIONS
    // ========================================
    function healthPatch(patch) {
        const x = X();
        S.setHealth(x.ui.hday, patch);
        S.save();
        x.render();
    }

    const ACT = {
        'ack-migration'() { S.clearMigration(); X().render(); },
        compose(el) { X().compose(el.dataset.kind); },
        'hc-day'(el) {
            const x = X();
            const k = U.addDays(x.ui.hday, Number(el.dataset.n));
            if (k > x.ui.today) return;
            x.ui.hday = k;
            x.render();
        },
        'hc-step'(el) {
            const x = X();
            const f = el.dataset.f;
            const cur = (S.getHealth(x.ui.hday) || {})[f] || 0;
            const max = { sleep: 16, activity: 600, water: 20 }[f];
            healthPatch({ [f]: Math.min(max, Math.max(0, Math.round((cur + Number(el.dataset.n)) * 10) / 10)) });
        },
        'hc-set'(el) {
            const f = el.dataset.f, v = Number(el.dataset.v);
            const cur = (S.getHealth(X().ui.hday) || {})[f];
            if (f === 'exercise' || f === 'selfcare') healthPatch({ [f]: cur === !!v ? undefined : !!v });
            else healthPatch({ [f]: cur === v ? 0 : v });
        },
        'h-range'(el) { X().ui.hRange = el.dataset.v; X().render(); },
        'habit-toggle'(el) {
            const x = X();
            const on = S.toggleHabit(el.dataset.id, x.ui.today);
            const h = S.getHabit(el.dataset.id);
            if (h && /olahraga/i.test(h.name)) S.setHealth(x.ui.today, { exercise: on });
            S.save();
            x.haptic(on ? 12 : 6);
            x.render();
        },
        'habit-edit'(el) { openHabitEdit(el.dataset.id); },
        'habit-manage'() { openHabitManage(); },
        lview(el) { X().ui.lview = el.dataset.v; X().savePrefs(); X().render(); },
        'topic-edit'(el) { openTopic(el.dataset.id); },
        'topic-add'() {
            const name = window.prompt('Nama materi baru:');
            if (!name || !name.trim()) return;
            const t = S.addTopic(name);
            S.save();
            X().render();
            openTopic(t.id);
        },
        'session-add'() { openSession(null); },
        'session-edit'(el) { openSession(el.dataset.id); },
        'project-add'() { openProject(null); },
        'project-edit'(el) { openProject(el.dataset.id); },
        'r-month'(el) {
            const x = X();
            const mk = U.monthAdd(x.ui.rmonth, Number(el.dataset.n));
            if (mk > x.ui.today.slice(0, 7)) return;
            x.ui.rmonth = mk;
            x.render();
        },
        'r-template'() {
            const x = X(), mk = x.ui.rmonth;
            const cur = (S.getReview(mk) || { answers: [] }).answers;
            const tpl = reviewTemplate(mk);
            const filled = cur.some((a) => a && a.trim());
            if (filled && !window.confirm('Isi template hanya ke pertanyaan yang masih kosong?')) return;
            const snap = S.snapshot();
            S.setReview(mk, tpl.map((t, i) => (cur[i] && cur[i].trim() ? cur[i] : t)));
            S.save();
            x.render();
            x.toast('Template diisi — silakan ubah', [x.undo(snap)]);
        },
    };

    // Review answers and the health note save as you type (no re-render, so focus stays).
    let reviewTimer = null;
    document.addEventListener('input', (e) => {
        const el = e.target;
        if (el.matches('[data-review]')) {
            clearTimeout(reviewTimer);
            reviewTimer = setTimeout(() => {
                const x = X(), mk = x.ui.rmonth;
                const answers = [...document.querySelectorAll('[data-review]')].map((t) => t.value);
                S.setReview(mk, answers);
                S.save();
                const st = document.getElementById('rv-status');
                if (st) st.textContent = 'Tersimpan ✓';
            }, 500);
        }
    });
    document.addEventListener('change', (e) => {
        if (e.target.matches('[data-hc-note]')) {
            S.setHealth(X().ui.hday, { note: e.target.value.trim() });
            S.save();
        }
    });

    C.life = { home, habits, learn, review, ACT, openSession, durText, topThree };
})();
