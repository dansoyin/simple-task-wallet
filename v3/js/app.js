/* ========================================
   CATETIN v2 — app.js
   Rendering, the chat-style composer, sheets, swipe gestures.
   ======================================== */
(function () {
    'use strict';
    const C = window.Catetin;
    const U = C.util, P = C.parser, S = C.store, Q = C.sched;
    const CAT = P.CAT;
    const esc = U.esc;
    const $ = (sel, el = document) => el.querySelector(sel);

    // ========================================
    // ICONS
    // ========================================
    const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
    const I = {
        check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
        left: svg('<path d="m15 18-6-6 6-6"/>'),
        right: svg('<path d="m9 18 6-6-6-6"/>'),
        close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
        trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
        skip: svg('<path d="M5 5l9 7-9 7zM19 5v14"/>'),
        share: svg('<path d="M12 3v12M7 8l5-5 5 5M5 14v5h14v-5"/>'),
        download: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
        upload: svg('<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>'),
        table: svg('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 4v16"/>'),
        help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17.5v.01"/>'),
        box: svg('<path d="M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8"/>'),
        install: svg('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M12 7v7M9 11l3 3 3-3"/>'),
        repeat: svg('<path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h16M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4"/>'),
        target: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
        caret: '<svg class="caret" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    };

    // ========================================
    // UI STATE
    // ========================================
    const app = $('#app');
    const input = $('#input');
    const composer = $('#composer');
    const preview = $('#preview');
    const quick = $('#quick');
    const sheet = $('#sheet');

    const PREFS_KEY = 'catetin.ui';
    const prefs = (() => {
        try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch (e) { return {}; }
    })();
    const savePrefs = () => {
        try { localStorage.setItem(PREFS_KEY, JSON.stringify({ tab: ui.tab, view: ui.view })); } catch (e) { /* private mode */ }
    };

    const T0 = U.todayKey();
    const ui = {
        today: T0,
        tab: prefs.tab === 'money' ? 'money' : 'tasks',
        view: ['day', 'week', 'month', 'more'].includes(prefs.view) ? prefs.view : 'day',
        day: T0,
        week: U.weekStart(T0),
        month: U.monthOf(T0),
        calSel: T0,
        moneyMonth: U.monthOf(T0),
        catFilter: null,
        chartSel: null,
        showDone: false,
        showAllTxns: false,
        override: {},
    };

    let suppressClick = false;
    let deferredInstall = null;
    const isWide = () => window.matchMedia('(min-width: 960px)').matches;
    const D = () => S.data;

    // ========================================
    // LABELS
    // ========================================
    function weekName(ws) {
        const cur = U.weekStart(ui.today);
        if (ws === cur) return 'Minggu ini';
        if (ws === U.addDays(cur, 7)) return 'Minggu depan';
        if (ws === U.addDays(cur, -7)) return 'Minggu lalu';
        return U.weekLabel(ws);
    }

    function monthName(mk) {
        const cur = U.monthOf(ui.today);
        if (mk === cur) return 'Bulan ini';
        if (mk === U.monthAdd(cur, 1)) return 'Bulan depan';
        if (mk === U.monthAdd(cur, -1)) return 'Bulan lalu';
        return U.fmtMonth(mk);
    }

    function whenText(t) {
        if (t.repeat) return `🔁 ${Q.repeatText(t.repeat)}${t.time ? ` · ${t.time}` : ''}`;
        if (t.date) return `📅 ${U.relDay(t.date, ui.today)}${t.time ? ` · ${t.time}` : ''}`;
        if (t.scope === 'week') return `🗓️ ${weekName(t.period)}`;
        if (t.scope === 'month') return `🗓️ ${monthName(t.period)}`;
        return '📥 Kapan-kapan';
    }

    const fmtTitle = (s) => esc(s).replace(/(^|\s)(#[\p{L}\p{N}_-]+)/gu, '$1<span class="tag">$2</span>');
    const money = (t) => `${t.amountType === 'in' ? '+' : ''}${U.rupiah(t.amount)}`;
    const plural = (n, w) => `${n} ${w}`;

    // ========================================
    // ROWS
    // ========================================
    function taskRow(e, opt = {}) {
        const t = e.t;
        const done = Q.entryDone(e);
        const meta = [];
        if (opt.late) meta.push(`<span class="late">${esc(lateLabel(e))}</span>`);
        if (opt.when) meta.push(`<span>${esc(whenText(t))}</span>`);
        else if (t.repeat && !opt.noRepeat) meta.push(`<span>🔁 ${esc(Q.repeatText(t.repeat))}</span>`);
        if (t.repeat && (t.repeat.freq === 'day' || t.repeat.freq === 'week')) {
            const st = Q.streak(t, ui.today);
            if (st >= 2) meta.push(`<span class="flame" title="Beruntun">🔥 ${st}</span>`);
        }
        if (t.amount > 0) meta.push(`<span>${CAT[t.cat] ? CAT[t.cat].emoji + ' ' : ''}${money(t)}</span>`);
        if (t.note) meta.push('<span title="Ada catatan">📝</span>');
        const recurringOcc = !!(t.repeat && e.occ);
        return `<li class="row-wrap" data-swipe="task">
            <div class="row-bg right">${I.check}<span>Selesai</span></div>
            <div class="row-bg left"><span>${recurringOcc ? 'Lewati' : 'Hapus'}</span>${recurringOcc ? I.skip : I.trash}</div>
            <div class="row${done ? ' done' : ''}${t.star ? ' star' : ''}" data-act="open-task" data-id="${t.id}" data-occ="${e.occ || ''}" tabindex="0">
                <button class="check" type="button" data-act="toggle" data-id="${t.id}" data-occ="${e.occ || ''}" role="checkbox" aria-checked="${done}" aria-label="Tandai selesai: ${esc(t.title)}">${I.check}</button>
                <div class="body">
                    <div class="title">${t.star ? '<span class="star-mark" aria-label="Penting">★</span>' : ''}${fmtTitle(t.title)}</div>
                    ${meta.length ? `<div class="meta">${meta.join('')}</div>` : ''}
                </div>
                ${t.time && !opt.when ? `<div class="side"><div class="time">${t.time}</div></div>` : ''}
            </div>
        </li>`;
    }

    function routineRow(t) {
        const next = Q.nextPending(t, ui.today);
        const st = Q.streak(t, ui.today);
        const meta = [`<span>${esc(Q.repeatText(t.repeat))}${t.time ? ` · ${t.time}` : ''}</span>`];
        if (next) {
            const n = U.diffDays(ui.today, next);
            meta.push(`<span>Berikutnya: ${esc(n <= 2 ? U.relDay(next, ui.today) : U.fmtDate(next, { short: true }))}</span>`);
        }
        if (st >= 2) meta.push(`<span class="flame">🔥 ${st}</span>`);
        return `<li class="row-wrap">
            <div class="row${t.star ? ' star' : ''}" data-act="open-task" data-id="${t.id}" data-occ="" tabindex="0">
                <span class="check" style="border-style:dashed;color:var(--ink-3)" aria-hidden="true">${I.repeat}</span>
                <div class="body"><div class="title">${t.star ? '<span class="star-mark">★</span>' : ''}${fmtTitle(t.title)}</div><div class="meta">${meta.join('')}</div></div>
                ${t.amount > 0 ? `<div class="side">${money(t)}</div>` : ''}
            </div>
        </li>`;
    }

    function txnRow(x) {
        const c = CAT[x.cat];
        return `<li class="row-wrap" data-swipe="txn">
            <div class="row-bg left"><span>Hapus</span>${I.trash}</div>
            <div class="row txn" data-act="open-txn" data-id="${x.id}" tabindex="0">
                <div class="avatar" aria-hidden="true">${c.emoji}</div>
                <div class="body">
                    <div class="title">${fmtTitle(x.title)}</div>
                    <div class="meta"><span>${esc(c.name)}</span>${x.src ? '<span>✅ dari tugas</span>' : ''}${x.note ? '<span>📝</span>' : ''}</div>
                </div>
                <div class="amount ${x.type}">${x.type === 'in' ? '+' : '−'}${U.rupiah(x.amount)}</div>
            </div>
        </li>`;
    }

    function lateLabel(e) {
        if (e.t.scope === 'week' && !e.t.date) return `Target ${weekName(e.t.period).toLowerCase()}`;
        if (e.t.scope === 'month' && !e.t.date) return `Target ${monthName(e.t.period).toLowerCase()}`;
        return U.relDay(e.due || e.occ || e.t.date, ui.today);
    }

    const card = (head, inner, extraCls = '') => `<section class="card ${extraCls}">${head}${inner}</section>`;
    const head = (title, right = '', cls = '') => `<div class="sec-head ${cls}"><h2>${title}</h2><span class="spacer"></span>${right}</div>`;
    const list = (rows) => `<ul class="list">${rows.join('')}</ul>`;

    // ========================================
    // TASKS: DAY VIEW
    // ========================================
    function ring(done, total) {
        const r = 24, c = 2 * Math.PI * r;
        const pct = total ? done / total : 0;
        return `<div class="ring" role="img" aria-label="${done} dari ${total} selesai">
            <svg viewBox="0 0 58 58"><circle class="track" cx="29" cy="29" r="${r}"/><circle class="fill" cx="29" cy="29" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/></svg>
            <span>${total ? `${done}/${total}` : '–'}</span>
        </div>`;
    }

    function strip(k) {
        const ws = U.weekStart(k);
        let html = `<button class="arrow" data-act="strip" data-n="-7" aria-label="Minggu sebelumnya">${I.left}</button>`;
        for (let i = 0; i < 7; i++) {
            const d = U.addDays(ws, i);
            // a missed habit on a past day isn't something left to do
            const pending = Q.dayEntries(d).some((e) => !Q.entryDone(e) && (d >= ui.today || !e.occ));
            const cls = ['sday', d === k ? 'sel' : '', d === ui.today ? 'today' : ''].join(' ');
            html += `<button class="${cls}" data-act="day" data-key="${d}" aria-label="${U.fmtDate(d)}"${d === k ? ' aria-current="date"' : ''}>
                <small>${U.HARI3[U.weekday(d)]}</small><b>${Number(d.slice(8))}</b>${pending ? '<i class="dot"></i>' : ''}</button>`;
        }
        html += `<button class="arrow" data-act="strip" data-n="7" aria-label="Minggu berikutnya">${I.right}</button>`;
        return `<div class="strip">${html}</div>`;
    }

    function viewDay() {
        const k = ui.day, T = ui.today, isToday = k === T;
        const entries = Q.dayEntries(k);
        const pending = entries.filter((e) => !Q.entryDone(e));
        const late = isToday ? Q.overdue(T) : [];
        const ws = U.weekStart(k), mk = U.monthOf(k);
        const wk = Q.targets('week', ws).filter((e) => !e.t.done);
        const mo = Q.targets('month', mk).filter((e) => !e.t.done);
        const done = Q.doneOn(k);
        const left = pending.length + late.length;
        const name = D().settings.name.trim();

        let sub;
        if (!left && !done.length) sub = isToday ? 'Belum ada rencana. Ketik aja di bawah 👇' : 'Belum ada apa-apa di hari ini.';
        else if (!left) sub = 'Semua beres! 🎉';
        else sub = `${plural(left, 'tugas')} lagi${done.length ? ` · ${done.length} selesai` : ''}`;

        let html = `<div class="day-head">
            <div class="txt">
                <p class="greet">${isToday ? `${U.greeting()}${name ? `, ${esc(name)}` : ''} 👋` : esc(U.relDay(k, T))}</p>
                <h1 class="day-title">${esc(U.fmtDate(k))}</h1>
                <p class="day-sub">${sub}</p>
            </div>
            ${ring(done.length, done.length + left)}
        </div>`;
        html += strip(k);
        if (!isToday) html += `<div class="back-today"><button class="link-btn" data-act="day" data-key="${T}">← Kembali ke hari ini</button></div>`;

        html += v1Banner();
        if (isToday) html += backupBanner();

        if (late.length) {
            const movable = late.some((e) => !e.t.repeat);
            html += card(head(`Terlewat <span class="count">${late.length}</span>`,
                movable ? '<button class="link-btn" data-act="bring-forward">Pindah ke hari ini</button>' : '', 'late'),
                list(late.map((e) => taskRow(e, { late: true, noRepeat: true }))));
        }

        const shareBtn = pending.length || done.length ? `<button class="icon-btn sm" data-act="share-day" aria-label="Kirim daftar ke WhatsApp" title="Kirim daftar ke WhatsApp">${I.share}</button>` : '';
        html += card(head(isToday ? 'Hari ini' : esc(U.relDay(k, T)), shareBtn),
            pending.length ? list(pending.map((e) => taskRow(e)))
                : `<p class="empty">${done.length ? 'Tidak ada yang tersisa. Mantap!' : 'Kosong. Tulis tugas di bawah, misal “beli galon jam 5 sore”.'}</p>`);

        if (wk.length) html += card(head(`Target ${weekName(ws).toLowerCase()}`, `<button class="link-btn" data-act="go-view" data-view="week">Lihat</button>`), list(wk.map((e) => taskRow(e))));
        if (mo.length) html += card(head(`Target ${monthName(mk).toLowerCase()}`, `<button class="link-btn" data-act="go-view" data-view="month">Lihat</button>`), list(mo.map((e) => taskRow(e))));

        if (done.length) {
            html += `<section class="card"><button class="done-toggle" data-act="toggle-done" aria-expanded="${ui.showDone}">${I.right} Selesai (${done.length})</button>
                ${ui.showDone ? list(done.map((e) => taskRow(e))) : ''}</section>`;
        }

        if (isToday) html += miniMoney();
        if (!D().tasks.length && !D().txns.length) html += welcome();
        return html;
    }

    function miniMoney() {
        const T = ui.today;
        const today = D().txns.filter((x) => x.date === T && isSpend(x)).reduce((a, x) => a + x.amount, 0);
        const b = budgetInfo(U.monthOf(T), budgetSpend(Q.monthTxns(U.monthOf(T))));
        let small = 'Ketuk untuk lihat ringkasan uang';
        if (b && b.status === 'over') small = `⛔ Lewat anggaran ${U.rupiah(-b.left)}`;
        else if (b) small = `Sisa anggaran aman ${U.rupiah(b.perDay)}/hari`;
        return `<section class="card"><button class="mini-money" data-act="tab" data-tab="money">
            <span class="emo" aria-hidden="true">💸</span>
            <span class="txt"><b>${today ? `Keluar hari ini ${U.rupiah(today)}` : 'Belum ada pengeluaran hari ini'}</b><small>${small}</small></span>
            ${I.right}</button></section>`;
    }

    const EXAMPLES = [
        ['beli galon besok', 'Tugas untuk besok'],
        ['kopi 18rb', 'Pengeluaran Rp18.000 · Makan & Minum'],
        ['gajian +5jt', 'Pemasukan Rp5.000.000'],
        ['bayar wifi 350rb tiap tgl 5', 'Tagihan bulanan, tercatat saat dicentang'],
        ['olahraga tiap hari jam 6', 'Rutinitas harian'],
        ['beresin laporan minggu ini', 'Target minggu ini'],
    ];

    const exampleBubbles = () => EXAMPLES.map(([text, what]) =>
        `<button class="bubble" data-act="example" data-text="${esc(text)}">${esc(text)}<small>${esc(what)}</small></button>`).join('');

    function welcome() {
        return `<section class="card welcome">
            <h2>Halo! Catat apa aja, kayak ngetik chat 👋</h2>
            <p>Nggak perlu isi form. Ketik bebas di kolom bawah, nanti otomatis jadi tugas atau catatan uang. Coba ketuk salah satu:</p>
            <div class="examples">${exampleBubbles()}</div>
        </section>`;
    }

    function v1Banner() {
        const m = D().meta;
        if (m.v1Imported || m.v1Dismissed) return '';
        const v1 = S.readV1();
        if (!v1.todos.length && !v1.txns.length) return '';
        return `<section class="card banner"><span aria-hidden="true">📦</span>
            <span class="txt">Ada data dari versi lama: ${v1.todos.length} tugas, ${v1.txns.length} transaksi.</span>
            <button class="link-btn" data-act="import-v1">Impor</button>
            <button class="icon-btn sm" data-act="dismiss-v1" aria-label="Tutup">${I.close}</button></section>`;
    }

    // Data only lives in this browser, so nudge (gently) for a backup every 2 weeks.
    function backupBanner() {
        const m = D().meta;
        if (D().tasks.length + D().txns.length < 10) return '';
        const days = U.diffDays(U.keyOf(new Date(m.lastBackup || m.created)), ui.today);
        if (!(days >= 14) || (m.backupSnooze && m.backupSnooze > ui.today)) return '';
        return `<section class="card banner"><span aria-hidden="true">🛟</span>
            <span class="txt">${m.lastBackup ? `Sudah ${days} hari belum backup.` : 'Datamu belum pernah dibackup.'} Isinya cuma tersimpan di perangkat ini.</span>
            <button class="link-btn" data-act="backup">Backup</button>
            <button class="icon-btn sm" data-act="snooze-backup" aria-label="Nanti saja">${I.close}</button></section>`;
    }

    // ========================================
    // TASKS: WEEK VIEW
    // ========================================
    function viewWeek() {
        const ws = ui.week, T = ui.today;
        const label = weekName(ws);
        let html = `<div class="nav-row">
            <button class="icon-btn" data-act="week" data-n="-7" aria-label="Minggu sebelumnya">${I.left}</button>
            <div class="title">${esc(U.weekLabel(ws))}<small>${label === U.weekLabel(ws) ? '&nbsp;' : esc(label)}</small></div>
            <button class="icon-btn" data-act="week" data-n="7" aria-label="Minggu berikutnya">${I.right}</button>
        </div>`;
        if (ws !== U.weekStart(T)) html += `<div class="back-today"><button class="link-btn" data-act="week-now">← Ke minggu ini</button></div>`;

        const tg = Q.targets('week', ws);
        const tgSorted = [...tg.filter((e) => !e.t.done), ...tg.filter((e) => e.t.done)];
        const doneN = tg.filter((e) => e.t.done).length;
        html += card(head(`Target ${label.toLowerCase()}`, tg.length ? `<span class="count">${doneN}/${tg.length}</span>` : ''),
            tg.length ? list(tgSorted.map((e) => taskRow(e)))
                : '<p class="empty">Belum ada target. Ketik di bawah selagi di tab ini — otomatis jadi target minggu ini.</p>');

        let days = '';
        for (let i = 0; i < 7; i++) {
            const d = U.addDays(ws, i);
            const es = Q.dayEntries(d);
            const sorted = [...es.filter((e) => !Q.entryDone(e)), ...es.filter(Q.entryDone)];
            days += `<button class="wday-head${d === T ? ' today' : ''}" data-act="goto-day" data-key="${d}">
                <b>${U.HARI[U.weekday(d)]}</b><small>${esc(U.fmtDate(d, { noDay: true, short: true }))}${d === T ? ' · Hari ini' : ''}</small>
                <span class="spacer"></span>${es.length ? `<span class="pill">${es.filter(Q.entryDone).length}/${es.length}</span>` : '<small>—</small>'}</button>`;
            if (sorted.length) days += list(sorted.map((e) => taskRow(e)));
        }
        html += `<section class="card">${days}<div style="height:6px"></div></section>`;
        return html;
    }

    // ========================================
    // TASKS: MONTH VIEW
    // ========================================
    function viewMonth() {
        const mk = ui.month, T = ui.today;
        const [y, m] = mk.split('-').map(Number);
        const dim = U.daysInMonth(y, m);
        if (U.monthOf(ui.calSel) !== mk) ui.calSel = U.monthOf(T) === mk ? T : `${mk}-01`;

        let html = `<div class="nav-row">
            <button class="icon-btn" data-act="month" data-n="-1" aria-label="Bulan sebelumnya">${I.left}</button>
            <div class="title">${esc(U.fmtMonth(mk))}<small>${mk === U.monthOf(T) ? 'Bulan ini' : '&nbsp;'}</small></div>
            <button class="icon-btn" data-act="month" data-n="1" aria-label="Bulan berikutnya">${I.right}</button>
        </div>`;

        const tg = Q.targets('month', mk);
        const tgSorted = [...tg.filter((e) => !e.t.done), ...tg.filter((e) => e.t.done)];
        html += card(head(`Target ${monthName(mk).toLowerCase()}`, tg.length ? `<span class="count">${tg.filter((e) => e.t.done).length}/${tg.length}</span>` : ''),
            tg.length ? list(tgSorted.map((e) => taskRow(e)))
                : '<p class="empty">Belum ada target bulan ini. Ketik di bawah selagi di tab ini.</p>');

        let cal = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => `<div class="dow">${d}</div>`).join('');
        const lead = (U.weekday(`${mk}-01`) + 6) % 7;
        for (let i = 0; i < lead; i++) cal += '<div class="cday out"></div>';
        for (let d = 1; d <= dim; d++) {
            const k = `${mk}-${U.pad(d)}`;
            const es = Q.dayEntries(k).filter((e) => k >= T || !e.occ || Q.entryDone(e));
            const dots = es.slice(0, 3).map((e) => {
                const done = Q.entryDone(e);
                return `<i class="${done ? 'd' : k < T ? 'l' : ''}"></i>`;
            }).join('');
            const cls = ['cday', k === T ? 'today' : '', k === ui.calSel ? 'sel' : ''].join(' ');
            cal += `<button class="${cls}" data-act="cal-day" data-key="${k}" aria-label="${U.fmtDate(k)}${es.length ? `, ${es.length} tugas` : ''}">${d}<span class="dots">${dots}</span></button>`;
        }
        html += `<section class="card"><div class="cal">${cal}</div></section>`;

        const sel = Q.dayEntries(ui.calSel);
        const sorted = [...sel.filter((e) => !Q.entryDone(e)), ...sel.filter(Q.entryDone)];
        html += card(head(esc(U.fmtDate(ui.calSel)), `<button class="link-btn" data-act="goto-day" data-key="${ui.calSel}">Buka harian</button>`),
            sorted.length ? list(sorted.map((e) => taskRow(e))) : '<p class="empty">Tidak ada tugas.</p>');
        return html;
    }

    // ========================================
    // TASKS: LIST VIEW (kapan-kapan, rutin, selesai)
    // ========================================
    function viewMore() {
        const inbox = Q.inbox();
        const routines = Q.routines().sort((a, b) => (a.repeat.freq + a.title).localeCompare(b.repeat.freq + b.title));
        const done = Q.doneTasks();
        let html = card(head(`Kapan-kapan <span class="count">${inbox.length || ''}</span>`),
            inbox.length ? list(inbox.map((e) => taskRow(e)))
                : '<p class="empty">Ide atau tugas tanpa tanggal masuk ke sini. Tulis “kapan-kapan” di kalimatnya, atau ketik selagi di tab ini.</p>');
        html += card(head(`Rutin <span class="count">${routines.length || ''}</span>`),
            routines.length ? list(routines.map(routineRow))
                : '<p class="empty">Contoh: “olahraga tiap hari jam 6”, “buang sampah tiap selasa & jumat”, “bayar kos 1,5jt tiap tgl 1”.</p>');
        html += card(head(`Selesai <span class="count">${done.length || ''}</span>`,
            done.length ? '<button class="link-btn" data-act="clear-done">Bersihkan</button>' : ''),
            done.length ? list(done.slice(0, 40).map((t) => taskRow({ t, occ: null }, { when: true })))
                : '<p class="empty">Tugas yang sudah dicentang muncul di sini.</p>');
        return html;
    }

    function renderTasks() {
        document.querySelectorAll('.subtab').forEach((b) => {
            b.classList.toggle('on', b.dataset.view === ui.view);
            b.setAttribute('aria-selected', b.dataset.view === ui.view);
        });
        const v = { day: viewDay, week: viewWeek, month: viewMonth, more: viewMore }[ui.view];
        $('#tasks-view').innerHTML = v();
    }

    // ========================================
    // MONEY VIEW
    // ========================================
    // Money moved into savings isn't "spending": saving more must never look like overspending.
    const isSaving = (x) => x.type === 'out' && x.cat === 'tabungan';
    const isSpend = (x) => x.type === 'out' && x.cat !== 'tabungan';
    const budgetSpend = (list) => list.filter(isSpend).reduce((a, x) => a + x.amount, 0);

    function budgetInfo(mk, spent) {
        const b = Number(D().settings.budget) || 0;
        if (!b) return null;
        const [y, m] = mk.split('-').map(Number);
        const dim = U.daysInMonth(y, m);
        const cur = U.monthOf(ui.today);
        const day = mk === cur ? Number(ui.today.slice(8)) : mk < cur ? dim : 0;
        const left = b - spent;
        const daysLeft = mk === cur ? dim - day + 1 : 0;
        let status = 'good';
        if (spent > b) status = 'over';
        else if (mk === cur && spent / b > day / dim + 0.1) status = 'warn';
        return { b, left, pct: spent / b, perDay: daysLeft > 0 && left > 0 ? left / daysLeft : 0, daysLeft, status };
    }

    function viewMoney() {
        const mk = ui.moneyMonth, T = ui.today, cur = mk === U.monthOf(T);
        const all = Q.monthTxns(mk);
        const s = Q.sums(all);
        const [y, m] = mk.split('-').map(Number);
        const dim = U.daysInMonth(y, m);

        let html = `<div class="nav-row">
            <button class="icon-btn" data-act="money-month" data-n="-1" aria-label="Bulan sebelumnya">${I.left}</button>
            <div class="title">${esc(U.fmtMonth(mk))}<small>${cur ? 'Bulan ini' : '&nbsp;'}</small></div>
            <button class="icon-btn" data-act="money-month" data-n="1" aria-label="Bulan berikutnya">${I.right}</button>
        </div>`;

        // hero + KPIs + budget meter
        const spent = budgetSpend(all);
        const savedMonth = all.filter(isSaving).reduce((a, x) => a + x.amount, 0);
        const todayOut = cur ? all.filter((x) => x.date === T && isSpend(x)).reduce((a, x) => a + x.amount, 0) : 0;
        // average over the days since the first entry this month, not since the 1st
        const lastDay = cur ? Number(T.slice(8)) : mk < U.monthOf(T) ? dim : 0;
        const firstDay = all.length ? Math.min(...all.map((x) => Number(x.date.slice(8)))) : 1;
        const elapsed = Math.max(0, lastDay - firstDay + 1);
        let kpis = `<div class="kpi"><small>Pemasukan</small><b class="in">${U.rupiah(s.in)}</b></div>`;
        if (savedMonth) kpis += `<div class="kpi"><small>Ditabung</small><b>🐷 ${U.rupiah(savedMonth)}</b></div>`;
        kpis += `<div class="kpi"><small>Masuk − keluar</small><b>${U.rupiah(s.net, { sign: true })}</b></div>`;
        if (cur) kpis += `<div class="kpi"><small>Belanja hari ini</small><b>${U.rupiah(todayOut)}</b></div>`;
        if (elapsed && spent) kpis += `<div class="kpi"><small>Rata-rata/hari</small><b>${U.rupiah(spent / elapsed)}</b></div>`;

        const b = budgetInfo(mk, spent);
        let budget;
        if (b) {
            const label = { good: '✓ Aman', warn: '⚠ Agak boros', over: '⛔ Lewat anggaran' }[b.status];
            const right = b.status === 'over' ? `Lebih ${U.rupiah(-b.left)}`
                : cur ? `Sisa ${U.rupiah(b.left)} · ${U.rupiah(b.perDay)}/hari` : `Sisa ${U.rupiah(b.left)}`;
            budget = `<div class="budget">
                <div class="meter ${b.status === 'good' ? '' : b.status}" role="meter" aria-valuemin="0" aria-valuemax="${b.b}" aria-valuenow="${spent}" aria-label="Anggaran terpakai"><i style="width:${Math.min(100, b.pct * 100).toFixed(1)}%"></i></div>
                <div class="budget-line"><span class="status ${b.status}">${label}</span><span>${right}</span></div>
                <div class="budget-line"><span>${Math.round(b.pct * 100)}% dari anggaran ${U.rupiah(b.b)}</span><button class="link-btn" data-act="budget">Ubah</button></div>
            </div>`;
        } else {
            budget = '<div class="budget"><button class="link-btn" data-act="budget">+ Atur anggaran bulanan</button></div>';
        }
        const goal = Number(D().settings.savingsGoal) || 0;
        if (!goal) {
            budget += '<div><button class="link-btn" data-act="goal">+ Pasang target tabungan</button></div>';
        }
        html += `<section class="card hero-card">
            <div style="display:flex;align-items:flex-start;gap:8px"><p class="hero-label" style="flex:1">Pengeluaran ${esc(U.BULAN[m - 1])}</p>
            ${all.length ? `<button class="icon-btn sm" data-act="share-money" aria-label="Kirim ringkasan ke WhatsApp" title="Kirim ringkasan ke WhatsApp">${I.share}</button>` : ''}</div>
            <p class="hero">${U.rupiah(spent)}</p>
            <div class="kpis">${kpis}</div>${budget}</section>`;

        if (goal) {
            const saved = Q.savedTotal();
            const pct = Math.min(1, saved / goal);
            html += `<section class="card card-pad">
                <div style="display:flex;align-items:center;gap:8px"><p class="hero-label" style="flex:1">🐷 Target tabungan</p><button class="link-btn" data-act="goal">Ubah</button></div>
                <p style="margin:2px 0 8px;font-size:15px"><b>${U.rupiah(saved)}</b> <span class="muted">terkumpul dari ${U.rupiah(goal)}</span></p>
                <div class="meter" role="meter" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${saved}" aria-label="Tabungan terkumpul"><i style="width:${(pct * 100).toFixed(1)}%"></i></div>
                <div class="budget-line"><span class="status good">${saved >= goal ? '🎉 Tercapai!' : `${Math.round(pct * 100)}%`}</span><span>${saved >= goal ? '' : `Kurang ${U.rupiah(goal - saved)}`}</span></div>
            </section>`;
        }

        // upcoming bills / planned spending
        if (cur) {
            const up = Q.upcomingMoney(T, 14);
            if (up.length) html += card(head('Tagihan & rencana 2 minggu ke depan'), list(up.map((e) => taskRow(e, { when: true }))));
        }

        if (!all.length) {
            html += `<section class="card welcome"><h2>Belum ada catatan uang di ${esc(U.fmtMonth(mk))}</h2>
                <p>Ketik nominal di kolom bawah, kategori ditebak otomatis. Contoh:</p>
                <div class="examples">${exampleBubbles().split('</button>').filter((b) => /kopi|gajian|wifi/.test(b)).map((b) => b + '</button>').join('')}</div></section>`;
            return html;
        }

        // daily columns
        const byDay = new Array(dim).fill(0);
        all.forEach((x) => { if (isSpend(x)) byDay[Number(x.date.slice(8)) - 1] += x.amount; });
        const max = Math.max(...byDay, 1);
        const maxDay = byDay.indexOf(max) + 1;
        let cols = '';
        for (let d = 1; d <= dim; d++) {
            const k = `${mk}-${U.pad(d)}`, v = byDay[d - 1];
            const h = v ? Math.max(3, (v / max) * 100) : 0;
            const cls = ['col', k > T ? 'future' : '', k === T ? 'today' : '', ui.chartSel === k ? 'hl' : ''].join(' ');
            cols += `<button class="${cls}" data-act="bar" data-key="${k}" aria-label="${esc(U.fmtDate(k, { short: true }))}: ${U.rupiah(v)}"><i style="height:${h}%"></i></button>`;
        }
        const ticks = [1, 8, 15, 22, dim].map((d) => `<span>${d}</span>`).join('');
        let tip;
        if (ui.chartSel && ui.chartSel.startsWith(mk)) {
            tip = `${esc(U.fmtDate(ui.chartSel, { short: true }))} · <b>${U.rupiah(byDay[Number(ui.chartSel.slice(8)) - 1])}</b>`;
        } else {
            tip = `Tertinggi tgl ${maxDay}: <b>${U.rupiah(max)}</b>`;
        }
        if (spent) {
            html += card(head('Pengeluaran per hari'), `<div class="chart">
                <div class="chart-top">maks ${U.rupiahShort(max)}</div>
                <div class="cols">${cols}</div>
                <div class="col-axis">${ticks}</div>
                <div class="chart-tip" id="chart-tip">${tip}</div></div>`);
        }

        // categories (expense, then income)
        const catBlock = (rows, title) => {
            if (!rows.length) return '';
            const total = rows.reduce((a, r) => a + r.total, 0);
            const top = rows[0].total;
            return card(head(title), `<div style="padding-bottom:8px">${rows.map((r) => {
                const c = CAT[r.cat];
                return `<button class="cat-row${ui.catFilter === r.cat ? ' on' : ''}" data-act="cat" data-cat="${r.cat}" aria-pressed="${ui.catFilter === r.cat}">
                    <span class="emo" aria-hidden="true">${c.emoji}</span>
                    <span class="name">${esc(c.name)} <span class="muted" style="font-weight:500">· ${r.count}x</span></span>
                    <span class="amt">${U.rupiah(r.total)}</span>
                    <span class="bar"><i style="width:${((r.total / top) * 100).toFixed(1)}%"></i></span>
                    <span class="pct">${Math.round((r.total / total) * 100)}%</span>
                </button>`;
            }).join('')}</div>`);
        };
        html += catBlock(Q.byCat(all.filter((x) => !isSaving(x)), 'out'), 'Pengeluaran per kategori');
        html += catBlock(Q.byCat(all, 'in'), 'Pemasukan per kategori');

        // history grouped by day
        let txns = [...all].sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1));
        if (ui.catFilter) txns = txns.filter((x) => x.cat === ui.catFilter);
        const LIMIT = 60;
        const shown = ui.showAllTxns ? txns : txns.slice(0, LIMIT);
        let hist = '';
        let curDay = null, rows = [];
        const flush = () => {
            if (!curDay) return;
            const dayList = txns.filter((x) => x.date === curDay);
            const out = dayList.filter((x) => x.type === 'out').reduce((a, x) => a + x.amount, 0);
            const inn = dayList.filter((x) => x.type === 'in').reduce((a, x) => a + x.amount, 0);
            const tot = [out ? `−${U.rupiah(out)}` : '', inn ? `+${U.rupiah(inn)}` : ''].filter(Boolean).join(' · ');
            hist += `<div class="tday" id="day-${curDay}"><span>${esc(curDay === T ? 'Hari ini' : U.relDay(curDay, T) === 'Kemarin' ? 'Kemarin' : U.fmtDate(curDay, { short: true }))}</span><span>${tot}</span></div>${list(rows)}`;
        };
        shown.forEach((x) => {
            if (x.date !== curDay) { flush(); curDay = x.date; rows = []; }
            rows.push(txnRow(x));
        });
        flush();
        const filter = ui.catFilter ? `<button class="filter-chip" data-act="cat" data-cat="${ui.catFilter}">${CAT[ui.catFilter].emoji} ${esc(CAT[ui.catFilter].name)} ${I.close}</button>` : '';
        const more = !ui.showAllTxns && txns.length > LIMIT ? `<div class="back-today" style="margin:8px 0"><button class="link-btn" data-act="all-txns">Tampilkan semua (${txns.length})</button></div>` : '';
        html += `<section class="card" id="history">${head('Riwayat', `<span class="count">${txns.length} transaksi</span>`)}
            ${filter ? `<div style="padding:4px 16px 0">${filter}</div>` : ''}${hist}${more}<div style="height:6px"></div></section>`;
        return html;
    }

    function renderMoney() {
        $('#money-view').innerHTML = viewMoney();
    }

    // ========================================
    // RENDER
    // ========================================
    function render() {
        app.dataset.tab = ui.tab;
        document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === ui.tab));
        renderTasks();
        renderMoney();
        updatePreview();
    }

    function flash(ids) {
        ids.forEach((id) => {
            document.querySelectorAll(`.row[data-id="${id}"]`).forEach((row) => {
                if (!row.offsetParent) return;
                row.classList.remove('flash');
                void row.offsetWidth;
                row.classList.add('flash');
                row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            });
        });
    }

    const isVisible = (id) => [...document.querySelectorAll(`.row[data-id="${id}"]`)].some((r) => r.offsetParent);

    // ========================================
    // TOAST, HAPTICS, CONFETTI
    // ========================================
    let toastTimer = null;
    const toastEl = $('#toast');

    function toast(msg, actions = [], ms) {
        toastEl.innerHTML = `<span class="msg">${esc(msg)}</span>${actions.map((a, i) => `<button type="button" data-i="${i}">${esc(a.label)}</button>`).join('')}`;
        toastEl.onclick = (e) => {
            const b = e.target.closest('button');
            if (!b) return;
            hideToast();
            actions[Number(b.dataset.i)].fn();
        };
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(hideToast, ms || (actions.length ? 5500 : 2800));
    }

    function hideToast() {
        toastEl.classList.remove('show');
    }

    const undo = (snap) => ({
        label: 'Urungkan',
        fn: () => { S.restore(snap); render(); toast('Dibatalkan'); },
    });

    const haptic = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* unsupported */ } };

    function confetti() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const cv = $('#confetti');
        const ctx = cv.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth, h = window.innerHeight;
        cv.width = w * dpr;
        cv.height = h * dpr;
        ctx.scale(dpr, dpr);
        const colors = ['#00a884', '#25d366', '#fab219', '#53bdeb', '#ff6b8b', '#a78bfa'];
        const parts = Array.from({ length: 110 }, () => ({
            x: w / 2 + (Math.random() - 0.5) * 80, y: h * 0.35,
            vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 13 - 4,
            s: Math.random() * 6 + 5, c: colors[Math.floor(Math.random() * colors.length)],
            r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        }));
        const t0 = performance.now();
        (function frame(t) {
            const el = t - t0;
            ctx.clearRect(0, 0, w, h);
            for (const p of parts) {
                p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.r);
                ctx.globalAlpha = Math.max(0, 1 - el / 1800);
                ctx.fillStyle = p.c;
                ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
                ctx.restore();
            }
            if (el < 1800) requestAnimationFrame(frame);
            else ctx.clearRect(0, 0, w, h);
        })(t0);
    }

    // ========================================
    // TASK ACTIONS
    // ========================================
    function todayCounts() {
        const T = ui.today;
        const pending = Q.dayEntries(T).filter((e) => !Q.entryDone(e)).length + Q.overdue(T).length;
        return { pending, done: Q.doneOn(T).length };
    }

    function onToggle(id, occ, fromEl) {
        const before = todayCounts();
        const snap = S.snapshot();
        const hadTxn = !!S.linkedTxn(id, occ || null);
        const res = S.toggle(id, occ || null, ui.today);
        if (!res) return;
        S.save();
        haptic(res.done ? 15 : 8);
        const row = fromEl && fromEl.closest('.row');
        if (res.done && row) {
            row.classList.add('done', 'just-done');
            const chk = row.querySelector('.check');
            if (chk) chk.setAttribute('aria-checked', 'true');
            setTimeout(render, 420);
        } else render();

        if (res.txn) {
            toast(`${res.txn.type === 'in' ? '💰' : '💸'} ${U.rupiah(res.txn.amount)} tercatat sebagai ${res.txn.type === 'in' ? 'pemasukan' : 'pengeluaran'}`, [undo(snap)]);
        } else if (!res.done && hadTxn) {
            toast('Catatan uangnya ikut dihapus', [undo(snap)]);
        }
        const after = todayCounts();
        if (res.done && before.pending > 0 && after.pending === 0) {
            setTimeout(() => {
                confetti();
                if (!res.txn) toast('Semua beres hari ini! 🎉');
            }, 250);
        }
    }

    function deleteTask(id) {
        const t = S.getTask(id);
        if (!t) return;
        const snap = S.snapshot();
        S.removeTask(id);
        S.save();
        render();
        toast(`“${t.title}” dihapus`, [undo(snap)]);
    }

    function skipOcc(id, occ) {
        const t = S.getTask(id);
        if (!t) return;
        const snap = S.snapshot();
        S.skip(id, occ);
        S.save();
        render();
        toast(`${t.title} dilewati (${U.relDay(occ, ui.today).toLowerCase()})`, [undo(snap)]);
    }

    function deleteTxn(id) {
        const x = S.getTxn(id);
        if (!x) return;
        const snap = S.snapshot();
        S.removeTxn(id);
        // a payment logged by ticking a task: untick it too, so the two stay in sync
        if (x.src) {
            const t = S.getTask(x.src.task);
            if (t && t.repeat && x.src.occ) t.doneDates = t.doneDates.filter((d) => d !== x.src.occ);
            else if (t && !t.repeat) { t.done = false; t.doneAt = null; }
        }
        S.save();
        render();
        toast(`${x.title} ${U.rupiah(x.amount)} dihapus`, [undo(snap)]);
    }

    // ========================================
    // COMPOSER
    // ========================================
    function composerCtx() {
        if (ui.tab === 'money' && !isWide()) return { date: ui.today };
        if (ui.view === 'day') return { date: ui.day };
        if (ui.view === 'week') return { scope: 'week', period: ui.week };
        if (ui.view === 'month') return { scope: 'month', period: ui.month };
        return {};
    }

    const parseOpts = () => ({ today: ui.today, ctx: composerCtx(), learned: D().learned, override: ui.override });

    function autoGrow() {
        input.style.height = 'auto';
        input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
    }

    function placeholder() {
        if (ui.tab === 'money' && !isWide()) return 'Catat uang, misal “kopi 18rb”';
        const ctx = composerCtx();
        if (ctx.scope === 'week') return `Target ${weekName(ctx.period).toLowerCase()}…`;
        if (ctx.scope === 'month') return `Target ${monthName(ctx.period).toLowerCase()}…`;
        if (!ctx.date && !ctx.scope) return 'Tugas kapan-kapan…';
        if (ctx.date !== ui.today) return `Tugas ${U.relDay(ctx.date, ui.today).toLowerCase()}…`;
        return 'Ketik tugas atau pengeluaran…';
    }

    function updatePreview() {
        input.placeholder = placeholder();
        const text = input.value.trim();
        composer.classList.toggle('empty', !text);
        if (!text) {
            preview.innerHTML = '';
            ui.override = {};
            if (!input.value) input.style.height = '';
            renderQuick();
            return;
        }
        quick.innerHTML = '';
        const items = P.parseMany(text, parseOpts());
        if (!items.length) { preview.innerHTML = ''; return; }
        if (items.length > 1) {
            const nt = items.filter((i) => i.kind === 'task').length;
            const nm = items.length - nt;
            preview.innerHTML = `<span class="chip kind">📋 ${items.length} catatan</span>
                ${nt ? `<span class="chip">✅ ${nt} tugas</span>` : ''}${nm ? `<span class="chip">💸 ${nm} transaksi</span>` : ''}`;
            return;
        }
        const it = items[0];
        const KIND = { task: '✅ Tugas', out: '💸 Pengeluaran', in: '💰 Pemasukan' };
        let html = `<button type="button" class="chip kind" data-act="chip-kind" title="Ketuk untuk ganti jenis">${KIND[it.kind]}${I.caret}</button>`;
        if (it.kind === 'task') {
            html += `<button type="button" class="chip" data-act="chip-when">${esc(whenText(it))}${I.caret}</button>`;
            if (it.amount) html += `<span class="chip">${CAT[it.cat] ? CAT[it.cat].emoji : ''} ${money(it)}</span>`;
            if (it.star) html += '<span class="chip">★ Penting</span>';
        } else {
            html += it.amount ? `<span class="chip">${U.rupiah(it.amount)}</span>` : '<span class="chip warn">Tulis nominalnya, misal 25rb</span>';
            html += `<button type="button" class="chip" data-act="chip-cat">${CAT[it.cat].emoji} ${esc(CAT[it.cat].name)}${I.caret}</button>`;
            html += `<button type="button" class="chip${it.date === ui.today ? ' ghost' : ''}" data-act="chip-date">📅 ${esc(U.relDay(it.date, ui.today))}${I.caret}</button>`;
        }
        preview.innerHTML = html;
    }

    let quickItems = [];
    function renderQuick() {
        if (document.activeElement !== input || input.value.trim()) { quick.innerHTML = ''; return; }
        quickItems = Q.frequent(ui.today, 8);
        quick.innerHTML = quickItems.map((f, i) =>
            `<button type="button" class="chip" data-act="quick" data-i="${i}" title="Catat lagi: ${esc(f.title)} ${U.rupiah(f.amount)}">${CAT[f.cat].emoji} ${esc(f.title.length > 18 ? f.title.slice(0, 17) + '…' : f.title)} · ${U.rupiahShort(f.amount)}</button>`).join('');
    }

    function createFrom(it) {
        if (it.kind === 'task') {
            return {
                kind: 'task',
                obj: S.addTask({
                    title: it.title, date: it.date, time: it.time, scope: it.scope, period: it.period, repeat: it.repeat,
                    star: it.star, amount: it.amount || 0, amountType: it.amountType || 'out', cat: it.cat,
                    done: !!it.done, doneAt: it.done ? new Date().toISOString() : null,
                }),
            };
        }
        if (!it.amount) return null;
        return { kind: 'txn', obj: S.addTxn({ type: it.kind, amount: it.amount, title: it.title, cat: it.cat, date: it.date }) };
    }

    function submit() {
        const text = input.value.trim();
        if (!text) { input.focus(); return; }
        const items = P.parseMany(text, parseOpts());
        if (!items.length) return;
        if (items.length === 1 && items[0].kind !== 'task' && !items[0].amount) {
            toast('Nominalnya belum ada — tulis misalnya “25rb” 🙂');
            return;
        }
        const snap = S.snapshot();
        if (items.length === 1 && ui.override.cat && items[0].kind !== 'task') S.learn(items[0].title, items[0].kind, ui.override.cat);
        const created = items.map(createFrom).filter(Boolean);
        if (!S.save()) toast('Gagal menyimpan — memori browser penuh?');
        askPersist();
        input.value = '';
        ui.override = {};
        autoGrow();
        render();
        haptic(10);

        const first = created[0];
        let msg;
        if (created.length > 1) msg = `${created.length} catatan ditambahkan`;
        else if (first.kind === 'task') msg = `Ditambahkan: ${first.obj.title} · ${whenText(first.obj).replace(/^\S+ /, '')}`;
        else msg = `${CAT[first.obj.cat].emoji} ${first.obj.title} ${U.rupiah(first.obj.amount)} dicatat`;
        const actions = [];
        if (created.length === 1 && !isVisible(first.obj.id)) actions.push({ label: 'Lihat', fn: () => reveal(first) });
        actions.push(undo(snap));
        toast(msg, actions);
        flash(created.map((c) => c.obj.id));
    }

    // Jump to wherever an item lives.
    function reveal(c) {
        const o = c.obj;
        if (c.kind === 'txn') {
            ui.tab = 'money';
            ui.moneyMonth = U.monthOf(o.date);
        } else {
            ui.tab = 'tasks';
            if (o.repeat) { ui.view = 'day'; ui.day = Q.nextPending(o, ui.today) || ui.today; }
            else if (o.date) { ui.view = 'day'; ui.day = o.date; }
            else if (o.scope === 'week') { ui.view = 'week'; ui.week = o.period; }
            else if (o.scope === 'month') { ui.view = 'month'; ui.month = o.period; }
            else ui.view = 'more';
        }
        savePrefs();
        render();
        flash([o.id]);
    }

    function logQuick(i) {
        const f = quickItems[i];
        if (!f) return;
        const snap = S.snapshot();
        const x = S.addTxn({ type: f.type, amount: f.amount, title: f.title, cat: f.cat, date: ui.today });
        S.save();
        render();
        haptic(10);
        toast(`${CAT[x.cat].emoji} ${x.title} ${U.rupiah(x.amount)} dicatat`, [undo(snap)]);
        flash([x.id]);
        renderQuick();
    }

    // ========================================
    // SHEETS
    // ========================================
    let sheetOnClose = null;

    // Each sheet lives in a fresh wrapper, so listeners added in onMount die with it
    // (the <dialog> itself is reused).
    function openSheet({ title, body, foot = '', onMount, onClose }) {
        sheet.innerHTML = `<div class="sheet-wrap"><div class="sheet-head"><h2 id="sheet-title" tabindex="-1">${esc(title)}</h2>
            <button class="icon-btn" type="button" data-close aria-label="Tutup">${I.close}</button></div>
            <div class="sheet-body">${body}</div>${foot ? `<div class="sheet-foot">${foot}</div>` : ''}</div>`;
        sheet.classList.remove('closing');
        sheetOnClose = onClose || null;
        if (!sheet.open) sheet.showModal();
        $('#sheet-title').focus({ preventScroll: true });
        if (onMount) onMount(sheet.firstElementChild);
    }

    // Run fn once the sheet is fully closed (the dialog restores focus on close,
    // so focusing the composer before that would be undone).
    function afterSheet(fn) {
        if (!sheet.open) { fn(); return; }
        const prev = sheetOnClose;
        sheetOnClose = () => { if (prev) prev(); fn(); };
        closeSheet();
    }

    function closeSheet() {
        if (!sheet.open || sheet.classList.contains('closing')) return;
        sheet.classList.add('closing');
        setTimeout(() => {
            sheet.close();
            sheet.classList.remove('closing');
        }, 180);
    }

    sheet.addEventListener('click', (e) => {
        if (e.target === sheet || e.target.closest('[data-close]')) closeSheet();
    });
    sheet.addEventListener('cancel', (e) => { e.preventDefault(); closeSheet(); });
    // Search inputs swallow Escape (to clear themselves), so handle it directly.
    sheet.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.preventDefault(); closeSheet(); }
    });
    sheet.addEventListener('close', () => {
        const fn = sheetOnClose;
        sheetOnClose = null;
        if (fn) fn();
    });

    // "When" options shared by the composer chip and the task editor.
    function whenOptions() {
        const T = ui.today, ws = U.weekStart(T), mk = U.monthOf(T);
        return [
            { label: 'Hari ini', v: { date: T } },
            { label: 'Besok', v: { date: U.addDays(T, 1) } },
            { label: 'Lusa', v: { date: U.addDays(T, 2) } },
            { label: 'Minggu ini', v: { scope: 'week', period: ws } },
            { label: 'Minggu depan', v: { scope: 'week', period: U.addDays(ws, 7) } },
            { label: 'Bulan ini', v: { scope: 'month', period: mk } },
            { label: 'Bulan depan', v: { scope: 'month', period: U.monthAdd(mk, 1) } },
            { label: 'Kapan-kapan', v: {} },
        ];
    }

    const sameWhen = (a, b) => (a.date || null) === (b.date || null) && (a.scope || null) === (b.scope || null) && (a.period || null) === (b.period || null);

    function amountFromText(s) {
        s = String(s || '').trim();
        if (!s) return 0;
        if (/[a-z]/i.test(s)) return P.parse(`x ${s}`, { today: ui.today }).amount || 0;
        return parseInt(s.replace(/\D/g, ''), 10) || 0;
    }

    const fmtAmountInput = (n) => (n ? new Intl.NumberFormat('id-ID').format(n) : '');

    function bindAmountInput(el) {
        el.addEventListener('input', () => {
            if (/[a-z]/i.test(el.value)) return; // "350rb" — formatted on blur
            const n = parseInt(el.value.replace(/\D/g, ''), 10) || 0;
            el.value = fmtAmountInput(n);
        });
        el.addEventListener('blur', () => { el.value = fmtAmountInput(amountFromText(el.value)); });
    }

    // ---------- composer chips ----------
    function pickWhen() {
        const it = P.parse(input.value, parseOpts());
        const opts = whenOptions();
        openSheet({
            title: 'Kapan?',
            body: `<div class="opts">${opts.map((o, i) => `<button class="opt${!it.repeat && sameWhen(it, o.v) ? ' on' : ''}" data-f="w" data-i="${i}">${o.label}</button>`).join('')}</div>
                <div class="field" style="margin-top:14px"><label for="w-date">Atau pilih tanggal</label><input class="input" type="date" id="w-date" value="${it.date || ''}"></div>
                <p class="sheet-note">Tips: tulis langsung di kalimat juga bisa — “besok”, “senin depan”, “tgl 20”, “tiap bulan tgl 5”.</p>`,
            onMount(el) {
                el.querySelector('.sheet-body').addEventListener('click', (e) => {
                    const b = e.target.closest('[data-f="w"]');
                    if (!b) return;
                    ui.override.when = opts[Number(b.dataset.i)].v;
                    closeSheet();
                });
                $('#w-date').addEventListener('change', (e) => {
                    if (e.target.value) { ui.override.when = { date: e.target.value }; closeSheet(); }
                });
            },
            onClose: () => { updatePreview(); input.focus(); },
        });
    }

    function pickTxnDate() {
        const T = ui.today;
        const opts = [['Hari ini', T], ['Kemarin', U.addDays(T, -1)], ['2 hari lalu', U.addDays(T, -2)]];
        const cur = P.parse(input.value, parseOpts()).date;
        openSheet({
            title: 'Tanggal transaksi',
            body: `<div class="opts">${opts.map(([l, k]) => `<button class="opt${cur === k ? ' on' : ''}" data-f="d" data-k="${k}">${l}</button>`).join('')}</div>
                <div class="field" style="margin-top:14px"><label for="d-date">Atau pilih tanggal</label><input class="input" type="date" id="d-date" value="${cur || ''}" max="${U.addDays(T, 366)}"></div>`,
            onMount(el) {
                el.querySelector('.sheet-body').addEventListener('click', (e) => {
                    const b = e.target.closest('[data-f="d"]');
                    if (!b) return;
                    ui.override.when = { date: b.dataset.k };
                    closeSheet();
                });
                $('#d-date').addEventListener('change', (e) => {
                    if (e.target.value) { ui.override.when = { date: e.target.value }; closeSheet(); }
                });
            },
            onClose: () => { updatePreview(); input.focus(); },
        });
    }

    function catGrid(type, sel) {
        return `<div class="cat-grid">${P.CATS.filter((c) => c.type === type).map((c) =>
            `<button type="button" class="cat-opt${c.id === sel ? ' on' : ''}" data-cat="${c.id}"><span aria-hidden="true">${c.emoji}</span>${esc(c.name)}</button>`).join('')}</div>`;
    }

    function pickCat() {
        const it = P.parse(input.value, parseOpts());
        openSheet({
            title: 'Kategori',
            body: `${catGrid(it.kind === 'in' ? 'in' : 'out', it.cat)}<p class="sheet-note">Catetin akan mengingat pilihanmu untuk catatan dengan judul yang sama.</p>`,
            onMount(el) {
                el.querySelector('.sheet-body').addEventListener('click', (e) => {
                    const b = e.target.closest('[data-cat]');
                    if (!b) return;
                    ui.override.cat = b.dataset.cat;
                    closeSheet();
                });
            },
            onClose: () => { updatePreview(); input.focus(); },
        });
    }

    function cycleKind() {
        const it = P.parse(input.value, parseOpts());
        const next = { task: 'out', out: 'in', in: 'task' }[it.kind];
        ui.override = { kind: next };
        updatePreview();
        input.focus();
    }

    // ---------- task editor ----------
    function openTask(id, occ) {
        const t = S.getTask(id);
        if (!t) return;
        const T = ui.today;
        const st = {
            title: t.title, star: t.star, note: t.note || '', time: t.time || '',
            when: { date: t.date, scope: t.scope, period: t.period },
            rep: t.repeat ? JSON.parse(JSON.stringify(t.repeat)) : null,
            amount: t.amount || 0, amountType: t.amountType || 'out',
            pick: false,
        };
        const opts = whenOptions();

        const repFreq = () => (st.rep ? st.rep.freq : 'none');
        function repDetail() {
            const r = st.rep;
            if (!r) return '';
            const every = (unit) => `<div class="inline">Setiap <input class="input" type="number" min="1" max="99" id="t-every" value="${r.every || 1}" style="max-width:80px"> ${unit}</div>`;
            if (r.freq === 'day') return every('hari');
            if (r.freq === 'week') {
                const order = [1, 2, 3, 4, 5, 6, 0];
                return `<div class="wd-toggles">${order.map((d) => `<button type="button" class="opt${(r.days || []).includes(d) ? ' on' : ''}" data-f="wd" data-d="${d}" aria-pressed="${(r.days || []).includes(d)}">${U.HARI3[d]}</button>`).join('')}</div>${every('minggu')}`;
            }
            if (r.freq === 'month') {
                return `<div class="inline">Tanggal <input class="input" type="number" min="1" max="31" id="t-mday" value="${r.mday === -1 ? '' : r.mday || ''}" style="max-width:80px" ${r.mday === -1 ? 'disabled' : ''}>
                    <button type="button" class="opt${r.mday === -1 ? ' on' : ''}" data-f="eom">Akhir bulan</button></div>${every('bulan')}`;
            }
            return `<div class="inline">Tanggal <input class="input" type="date" id="t-ystart" value="${r.start}"></div>`;
        }

        function body() {
            const freq = repFreq();
            const whenIdx = opts.findIndex((o) => sameWhen(st.when, o.v));
            const showPick = st.pick || (whenIdx < 0 && !!st.when.date);
            return `
                <div class="field"><input class="input" id="t-title" value="${esc(st.title)}" aria-label="Judul tugas" maxlength="200"></div>
                <div class="field"><div class="label">Ulangi</div>
                    <div class="opts">${[['none', 'Tidak'], ['day', 'Harian'], ['week', 'Mingguan'], ['month', 'Bulanan'], ['year', 'Tahunan']].map(([f, l]) =>
                        `<button type="button" class="opt${freq === f ? ' on' : ''}" data-f="rep" data-v="${f}">${l}</button>`).join('')}</div>
                    ${repDetail()}
                </div>
                ${st.rep ? '' : `<div class="field"><div class="label">Kapan</div>
                    <div class="opts">${opts.map((o, i) => `<button type="button" class="opt${i === whenIdx && !st.pick ? ' on' : ''}" data-f="when" data-i="${i}">${o.label}</button>`).join('')}
                        <button type="button" class="opt${showPick ? ' on' : ''}" data-f="pick">Pilih tanggal…</button></div>
                    ${showPick ? `<div class="inline"><input class="input" type="date" id="t-date" value="${st.when.date || ''}"></div>` : ''}
                </div>`}
                ${st.rep || st.when.date ? `<div class="field"><label for="t-time">Jam (opsional)</label>
                    <div class="inline" style="margin-top:0"><input class="input" type="time" id="t-time" value="${st.time}">${st.time ? '<button type="button" class="link-btn" data-f="notime">Hapus jam</button>' : ''}</div></div>` : ''}
                <div class="field"><div class="label">Nominal (opsional) — tercatat otomatis saat dicentang</div>
                    <div class="seg" style="margin-bottom:8px"><button type="button" class="opt out${st.amountType === 'out' ? ' on' : ''}" data-f="at" data-v="out">Pengeluaran</button><button type="button" class="opt in${st.amountType === 'in' ? ' on' : ''}" data-f="at" data-v="in">Pemasukan</button></div>
                    <div class="money-input"><span>Rp</span><input class="input" id="t-amount" inputmode="numeric" placeholder="0" value="${fmtAmountInput(st.amount)}"></div></div>
                <div class="field"><button type="button" class="opt${st.star ? ' on' : ''}" data-f="star" aria-pressed="${st.star}">★ Penting</button></div>
                <div class="field"><label for="t-note">Catatan</label><textarea class="input" id="t-note" rows="3" placeholder="Detail, link, nomor telepon…">${esc(st.note)}</textarea></div>
                ${t.repeat && occ ? `<button type="button" class="btn" data-f="skip" style="width:100%">${I.skip} Lewati yang ${esc(U.relDay(occ, T).toLowerCase())}</button>` : ''}
                ${t.repeat ? `<p class="sheet-note">Sudah dicentang ${t.doneDates.length}x${Q.streak(t, T) >= 2 ? ` · beruntun ${Q.streak(t, T)} 🔥` : ''}.</p>` : ''}`;
        }

        function readInputs(el) {
            const v = (id) => { const x = el.querySelector(id); return x ? x.value : null; };
            if (v('#t-title') !== null) st.title = v('#t-title');
            if (v('#t-note') !== null) st.note = v('#t-note');
            if (v('#t-time') !== null) st.time = v('#t-time');
            if (v('#t-amount') !== null) st.amount = amountFromText(v('#t-amount'));
            if (v('#t-date')) st.when = { date: v('#t-date') };
            if (st.rep) {
                if (v('#t-every') !== null) st.rep.every = Math.max(1, parseInt(v('#t-every'), 10) || 1);
                if (v('#t-mday')) st.rep.mday = Math.min(31, Math.max(1, parseInt(v('#t-mday'), 10) || 1));
                if (v('#t-ystart')) st.rep.start = v('#t-ystart');
            }
        }

        openSheet({
            title: t.repeat ? 'Tugas rutin' : 'Ubah tugas',
            body: body(),
            foot: `<button type="button" class="btn danger" data-f="del">${I.trash} Hapus</button><button type="button" class="btn primary" data-f="save">Simpan</button>`,
            onMount(el) {
                const bodyEl = el.querySelector('.sheet-body');
                const rerender = () => { readInputs(el); bodyEl.innerHTML = body(); bindAmountInput($('#t-amount')); };
                bindAmountInput($('#t-amount'));
                el.addEventListener('click', (e) => {
                    const b = e.target.closest('[data-f]');
                    if (!b) return;
                    const f = b.dataset.f;
                    if (f === 'save' || f === 'del' || f === 'skip') readInputs(el);
                    if (f === 'rep') {
                        readInputs(el);
                        const v = b.dataset.v;
                        const start = st.when.date && st.when.date >= T ? st.when.date : T;
                        if (v === 'none') st.rep = null;
                        else if (!st.rep || st.rep.freq !== v) {
                            st.rep = { freq: v, every: 1, start };
                            if (v === 'week') st.rep.days = [U.weekday(start)];
                            if (v === 'month') st.rep.mday = Number(start.slice(8));
                        }
                        if (!st.rep && !st.when.date && !st.when.scope) st.when = { date: T };
                        rerender();
                    } else if (f === 'wd') {
                        readInputs(el);
                        const d = Number(b.dataset.d);
                        const days = new Set(st.rep.days || []);
                        days.has(d) ? days.delete(d) : days.add(d);
                        if (days.size) st.rep.days = [...days];
                        rerender();
                    } else if (f === 'eom') {
                        readInputs(el);
                        st.rep.mday = st.rep.mday === -1 ? Number(T.slice(8)) : -1;
                        rerender();
                    } else if (f === 'when') {
                        readInputs(el);
                        st.when = { ...opts[Number(b.dataset.i)].v };
                        st.pick = false;
                        if (!st.when.date) st.time = '';
                        rerender();
                    } else if (f === 'pick') {
                        readInputs(el);
                        st.pick = true;
                        if (!st.when.date) st.when = { date: T };
                        rerender();
                        const d = $('#t-date');
                        if (d && d.showPicker) { try { d.showPicker(); } catch (err) { /* needs user gesture */ } }
                    } else if (f === 'notime') {
                        readInputs(el);
                        st.time = '';
                        rerender();
                    } else if (f === 'at') {
                        readInputs(el);
                        st.amountType = b.dataset.v;
                        rerender();
                    } else if (f === 'star') {
                        readInputs(el);
                        st.star = !st.star;
                        rerender();
                    } else if (f === 'skip') {
                        closeSheet();
                        skipOcc(t.id, occ);
                    } else if (f === 'del') {
                        closeSheet();
                        deleteTask(t.id);
                    } else if (f === 'save') {
                        const title = st.title.trim() || t.title;
                        const snap = S.snapshot();
                        const patch = {
                            title, star: st.star, note: st.note.trim(), time: st.time || null,
                            amount: st.amount, amountType: st.amountType,
                            cat: st.amount ? P.guessCat(title, st.amountType, D().learned) : null,
                        };
                        if (st.rep) {
                            if (!t.repeat) Object.assign(patch, { done: false, doneAt: null, doneDates: [], skipDates: [] });
                            Object.assign(patch, { repeat: st.rep, date: null, scope: null, period: null });
                        } else {
                            Object.assign(patch, { repeat: null, date: st.when.date || null, scope: st.when.date ? null : st.when.scope || null, period: st.when.date ? null : st.when.period || null });
                            if (!patch.date) patch.time = null;
                        }
                        S.updateTask(t.id, patch);
                        S.save();
                        closeSheet();
                        render();
                        toast('Tersimpan', [undo(snap)]);
                    }
                });
                el.querySelector('#t-title').addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') { e.preventDefault(); el.querySelector('[data-f="save"]').click(); }
                });
            },
        });
    }

    // ---------- transaction editor ----------
    function openTxn(id) {
        const x = S.getTxn(id);
        if (!x) return;
        const T = ui.today;
        const st = { type: x.type, amount: x.amount, title: x.title, cat: x.cat, date: x.date, note: x.note || '' };
        const srcTask = x.src ? S.getTask(x.src.task) : null;

        const body = () => `
            <div class="seg" style="margin-bottom:12px"><button type="button" class="opt out${st.type === 'out' ? ' on' : ''}" data-f="type" data-v="out">Pengeluaran</button><button type="button" class="opt in${st.type === 'in' ? ' on' : ''}" data-f="type" data-v="in">Pemasukan</button></div>
            <div class="field money-input big"><span>Rp</span><input class="input big" id="x-amount" inputmode="numeric" value="${fmtAmountInput(st.amount)}" aria-label="Nominal"></div>
            <div class="field"><label for="x-title">Keterangan</label><input class="input" id="x-title" value="${esc(st.title)}" maxlength="200"></div>
            <div class="field"><div class="label">Kategori</div>${catGrid(st.type, st.cat)}</div>
            <div class="field"><label for="x-date">Tanggal</label>
                <div class="opts" style="margin-bottom:8px">${[['Hari ini', T], ['Kemarin', U.addDays(T, -1)]].map(([l, k]) => `<button type="button" class="opt${st.date === k ? ' on' : ''}" data-f="date" data-k="${k}">${l}</button>`).join('')}</div>
                <input class="input" type="date" id="x-date" value="${st.date}"></div>
            <div class="field"><label for="x-note">Catatan</label><textarea class="input" id="x-note" rows="2">${esc(st.note)}</textarea></div>
            ${srcTask ? `<p class="sheet-note">Tercatat otomatis waktu tugas “${esc(srcTask.title)}” dicentang. Menghapus transaksi ini juga membatalkan centangnya.</p>` : ''}`;

        function readInputs(el) {
            st.amount = amountFromText(el.querySelector('#x-amount').value);
            st.title = el.querySelector('#x-title').value;
            st.date = el.querySelector('#x-date').value || st.date;
            st.note = el.querySelector('#x-note').value;
        }

        openSheet({
            title: x.type === 'in' ? 'Pemasukan' : 'Pengeluaran',
            body: body(),
            foot: `<button type="button" class="btn danger" data-f="del">${I.trash} Hapus</button><button type="button" class="btn primary" data-f="save">Simpan</button>`,
            onMount(el) {
                const bodyEl = el.querySelector('.sheet-body');
                const rerender = () => { bodyEl.innerHTML = body(); bindAmountInput($('#x-amount')); };
                bindAmountInput($('#x-amount'));
                el.addEventListener('click', (e) => {
                    const c = e.target.closest('[data-cat]');
                    if (c) { readInputs(el); st.cat = c.dataset.cat; rerender(); return; }
                    const b = e.target.closest('[data-f]');
                    if (!b) return;
                    const f = b.dataset.f;
                    readInputs(el);
                    if (f === 'type') {
                        st.type = b.dataset.v;
                        if (CAT[st.cat].type !== st.type) st.cat = P.guessCat(st.title, st.type, D().learned);
                        rerender();
                    } else if (f === 'date') {
                        st.date = b.dataset.k;
                        rerender();
                    } else if (f === 'del') {
                        closeSheet();
                        deleteTxn(x.id);
                    } else if (f === 'save') {
                        if (!st.amount) { toast('Nominalnya masih kosong'); return; }
                        const snap = S.snapshot();
                        if (st.cat !== x.cat) S.learn(st.title || x.title, st.type, st.cat);
                        S.updateTxn(x.id, { type: st.type, amount: st.amount, title: st.title.trim() || CAT[st.cat].name, cat: st.cat, date: st.date, note: st.note.trim() });
                        S.save();
                        closeSheet();
                        render();
                        toast('Tersimpan', [undo(snap)]);
                    }
                });
            },
        });
    }

    // ---------- budget ----------
    function openBudget() {
        const cur = Number(D().settings.budget) || 0;
        openSheet({
            title: 'Anggaran bulanan',
            body: `<p class="muted" style="margin-top:0">Batas pengeluaran per bulan (uang yang ditabung tidak dihitung). Catetin akan menghitung sisa yang aman dipakai per hari.</p>
                <div class="field money-input big"><span>Rp</span><input class="input big" id="b-amount" inputmode="numeric" placeholder="misal 4.000.000" value="${fmtAmountInput(cur)}" aria-label="Anggaran per bulan"></div>
                <div class="opts">${[2e6, 3e6, 4e6, 5e6, 7.5e6, 10e6].map((v) => `<button type="button" class="opt" data-v="${v}">${U.rupiahShort(v)}</button>`).join('')}</div>`,
            foot: `${cur ? '<button type="button" class="btn danger" data-f="off">Matikan</button>' : ''}<button type="button" class="btn primary" data-f="save">Simpan</button>`,
            onMount(el) {
                const inp = $('#b-amount');
                bindAmountInput(inp);
                el.addEventListener('click', (e) => {
                    const v = e.target.closest('[data-v]');
                    if (v) { inp.value = fmtAmountInput(Number(v.dataset.v)); return; }
                    const b = e.target.closest('[data-f]');
                    if (!b) return;
                    S.setSettings({ budget: b.dataset.f === 'off' ? 0 : amountFromText(inp.value) });
                    S.save();
                    closeSheet();
                    render();
                });
            },
        });
    }

    // ---------- savings goal ----------
    function openGoal() {
        const cur = Number(D().settings.savingsGoal) || 0;
        openSheet({
            title: 'Target tabungan',
            body: `<p class="muted" style="margin-top:0">Progresnya dihitung dari semua catatan kategori <b>Tabungan & Investasi</b> — cukup ketik misalnya “nabung 500rb”.</p>
                <div class="field money-input big"><span>Rp</span><input class="input big" id="g-amount" inputmode="numeric" placeholder="misal 10.000.000" value="${fmtAmountInput(cur)}" aria-label="Target tabungan"></div>
                <div class="opts">${[5e6, 10e6, 25e6, 50e6].map((v) => `<button type="button" class="opt" data-v="${v}">${U.rupiahShort(v)}</button>`).join('')}</div>`,
            foot: `${cur ? '<button type="button" class="btn danger" data-f="off">Hapus target</button>' : ''}<button type="button" class="btn primary" data-f="save">Simpan</button>`,
            onMount(el) {
                const inp = $('#g-amount');
                bindAmountInput(inp);
                el.addEventListener('click', (e) => {
                    const v = e.target.closest('[data-v]');
                    if (v) { inp.value = fmtAmountInput(Number(v.dataset.v)); return; }
                    const b = e.target.closest('[data-f]');
                    if (!b) return;
                    S.setSettings({ savingsGoal: b.dataset.f === 'off' ? 0 : amountFromText(inp.value) });
                    S.save();
                    closeSheet();
                    render();
                });
            },
        });
    }

    // ---------- backup ----------
    // On phones the share sheet lets the file go straight to WhatsApp / Drive.
    function backupNow() {
        const name = `catetin-backup-${ui.today}.json`;
        const json = S.exportJSON();
        const done = (msg) => {
            D().meta.lastBackup = new Date().toISOString();
            D().meta.backupSnooze = null;
            S.save();
            render();
            toast(msg);
        };
        let file = null;
        try { file = new File([json], name, { type: 'application/json' }); } catch (e) { /* very old browser */ }
        const touch = window.matchMedia('(pointer: coarse)').matches;
        if (touch && file && navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], title: 'Backup Catetin' })
                .then(() => done('Backup terkirim 👍'))
                .catch((err) => {
                    if (err && err.name === 'AbortError') return;
                    download(name, json, 'application/json');
                    done('Backup diunduh 👍');
                });
        } else {
            download(name, json, 'application/json');
            done('Backup diunduh. Simpan juga di Drive/WA biar aman 👍');
        }
    }

    // Ask the browser not to evict our data (Chrome grants silently; asked once there's real data).
    function askPersist() {
        const m = D().meta;
        if (m.persistAsked || !navigator.storage || !navigator.storage.persist) return;
        if (D().tasks.length + D().txns.length < 5) return;
        m.persistAsked = true;
        S.save();
        navigator.storage.persist().catch(() => { /* not granted */ });
    }

    // ---------- settings ----------
    function download(name, text, type) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], { type }));
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }

    function openSettings() {
        const s = D().settings, m = D().meta;
        const v1 = S.readV1();
        const lastBackup = m.lastBackup ? U.relDay(U.keyOf(new Date(m.lastBackup)), ui.today).toLowerCase() : 'belum pernah';
        openSheet({
            title: 'Pengaturan',
            body: `
                <div class="field"><label for="s-name">Nama panggilan</label><input class="input" id="s-name" value="${esc(s.name)}" placeholder="Biar disapa tiap pagi" maxlength="30"></div>
                <div class="field"><div class="label">Tema</div><div class="seg">${[['auto', 'Otomatis'], ['light', 'Terang'], ['dark', 'Gelap']].map(([v, l]) =>
                    `<button type="button" class="opt${s.theme === v ? ' on' : ''}" data-f="theme" data-v="${v}">${l}</button>`).join('')}</div></div>
                <ul class="menu">
                    <li><button type="button" data-f="budget">${I.table}<span>Anggaran bulanan<small>${s.budget ? U.rupiah(s.budget) : 'Belum diatur'}</small></span></button></li>
                    <li><button type="button" data-f="goal">${I.target}<span>Target tabungan<small>${s.savingsGoal ? U.rupiah(s.savingsGoal) : 'Belum diatur'}</small></span></button></li>
                    ${deferredInstall ? `<li><button type="button" data-f="install">${I.install}<span>Pasang sebagai aplikasi<small>Muncul di layar utama, bisa dibuka tanpa internet</small></span></button></li>` : ''}
                    <li><button type="button" data-f="help">${I.help}<span>Cara pakai & contoh</span></button></li>
                    <li><button type="button" data-f="backup">${I.download}<span>Backup data<small>Kirim ke WhatsApp/Drive atau simpan file · terakhir: ${esc(lastBackup)}</small></span></button></li>
                    <li><label>${I.upload}<span>Pulihkan dari file backup<small>Juga bisa file ekspor dari versi lama</small></span><input type="file" id="s-file" accept=".json,application/json" hidden></label></li>
                    <li><button type="button" data-f="csv">${I.table}<span>Ekspor transaksi (.csv)<small>Buat dibuka di Excel / Google Sheets</small></span></button></li>
                    ${v1.todos.length || v1.txns.length ? `<li><button type="button" data-f="v1">${I.box}<span>Impor data versi lama<small>${v1.todos.length} tugas, ${v1.txns.length} transaksi${m.v1Imported ? ' · sudah pernah diimpor' : ''}</small></span></button></li>` : ''}
                    <li><button type="button" class="danger" data-f="wipe">${I.trash}<span>Hapus semua data</span></button></li>
                </ul>
                <p class="sheet-note">Semua data tersimpan di perangkat & browser ini saja, tidak dikirim ke mana pun. Kalau ganti HP atau bersihin data browser, data ikut hilang — rajin unduh backup ya.</p>`,
            onMount(el) {
                $('#s-name').addEventListener('change', (e) => { S.setSettings({ name: e.target.value.trim() }); S.save(); render(); });
                $('#s-file').addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    file.text().then((txt) => {
                        let obj;
                        try { obj = JSON.parse(txt); } catch (err) { toast('File-nya bukan JSON yang valid'); return; }
                        if (obj && obj.app === 'catetin' && !window.confirm('Ganti semua data sekarang dengan isi backup ini?')) return;
                        const snap = S.snapshot();
                        try {
                            const r = S.importFile(obj);
                            S.save();
                            applyTheme();
                            closeSheet();
                            render();
                            toast(`${r.mode === 'replace' ? 'Dipulihkan' : 'Diimpor'}: ${r.tasks} tugas, ${r.txns} transaksi`, [undo(snap)]);
                        } catch (err) {
                            toast(err.message);
                        }
                    });
                });
                el.querySelector('.sheet-body').addEventListener('click', (e) => {
                    const b = e.target.closest('[data-f]');
                    if (!b) return;
                    const f = b.dataset.f;
                    if (f === 'theme') {
                        S.setSettings({ theme: b.dataset.v });
                        S.save();
                        applyTheme();
                        el.querySelectorAll('[data-f="theme"]').forEach((x) => x.classList.toggle('on', x === b));
                    } else if (f === 'budget') openBudget();
                    else if (f === 'goal') openGoal();
                    else if (f === 'help') openHelp();
                    else if (f === 'install') {
                        deferredInstall.prompt();
                        deferredInstall.userChoice.finally(() => { deferredInstall = null; });
                        closeSheet();
                    } else if (f === 'backup') {
                        closeSheet();
                        backupNow();
                    } else if (f === 'csv') {
                        download(`catetin-transaksi-${ui.today}.csv`, S.exportCSV(), 'text/csv;charset=utf-8');
                        closeSheet();
                    } else if (f === 'v1') {
                        closeSheet();
                        importV1();
                    } else if (f === 'wipe') {
                        if (!window.confirm('Hapus SEMUA tugas dan catatan uang di perangkat ini?')) return;
                        const snap = S.snapshot();
                        S.wipe();
                        S.save();
                        applyTheme();
                        closeSheet();
                        render();
                        toast('Semua data dihapus', [undo(snap)], 8000);
                    }
                });
            },
        });
    }

    function importV1() {
        const v1 = S.readV1();
        const snap = S.snapshot();
        const r = S.importV1(v1.todos, v1.txns, v1.goal);
        S.save();
        render();
        toast(`Diimpor: ${r.tasks} tugas, ${r.txns} transaksi`, [undo(snap)]);
    }

    // ---------- help ----------
    function openHelp() {
        const ex = (rows) => `<div class="examples">${rows.map(([a, b]) => `<button class="bubble" data-act="example" data-text="${esc(a)}">${esc(a)}<small>${esc(b)}</small></button>`).join('')}</div>`;
        openSheet({
            title: 'Cara pakai Catetin',
            body: `<div class="help">
                <p>Ketik bebas di kolom bawah seperti chat ke diri sendiri. Sebelum dikirim, chip di atas kolom ketik menunjukkan hasil tebakannya — ketuk chip-nya kalau mau ganti.</p>
                <h3>✅ Tugas</h3>
                ${ex([['beli galon', 'Tugas untuk hari yang sedang dibuka'], ['telpon ibu besok jam 7 malam', 'Besok · 19:00'], ['meeting senin depan jam 9', 'Senin minggu depan'], ['servis motor tgl 20', 'Tanggal 20 terdekat'], ['beresin laporan minggu ini', 'Target mingguan'], ['ide konten kapan-kapan', 'Tanpa tanggal'], ['bayar pajak penting!', 'Ditandai penting ★']])}
                <h3>🔁 Rutin</h3>
                ${ex([['olahraga tiap hari jam 6', 'Harian + hitungan beruntun 🔥'], ['buang sampah tiap selasa & jumat', 'Hari tertentu'], ['kerja senin-jumat', 'Hari kerja'], ['bayar kos 1,5jt tiap tgl 1', 'Bulanan + tercatat saat dicentang'], ['ultah ibu tiap 17 agustus', 'Tahunan']])}
                <h3>💸 Uang</h3>
                ${ex([['kopi 18rb', 'Pengeluaran, kategori ditebak'], ['makan 25rb, parkir 2rb', 'Jadi 2 transaksi sekaligus'], ['kemarin bensin 30rb', 'Tanggal kemarin'], ['gajian +5jt', 'Pemasukan (tanda +)'], ['jual sepatu 300rb', 'Pemasukan (kata “jual”)'], ['nabung 500rb', 'Masuk ke target tabungan 🐷']])}
                <h3>💡 Tips</h3>
                <p>• Tempel daftar dari WhatsApp — tiap baris jadi satu catatan.<br>
                • Geser tugas ke kanan = selesai, ke kiri = hapus (atau lewati, untuk tugas rutin).<br>
                • Ketuk apa saja untuk mengubahnya. Salah hapus? Tekan “Urungkan”.<br>
                • Pengeluaran yang sering kamu catat muncul sebagai tombol cepat saat kolom ketik kosong.<br>
                • Di laptop: tekan <b>/</b> untuk langsung mengetik.</p>
            </div>`,
        });
    }

    // ---------- search ----------
    function openSearch() {
        openSheet({
            title: 'Cari',
            body: `<div class="field"><input class="input" id="q" type="search" placeholder="Cari tugas atau transaksi…" aria-label="Kata kunci"></div><div id="q-res" class="search-results"></div>`,
            onMount() {
                const q = $('#q');
                const res = $('#q-res');
                const run = () => {
                    const term = U.normTitle(q.value);
                    if (!term) { res.innerHTML = '<p class="muted">Ketik minimal satu kata.</p>'; return; }
                    const match = (s) => U.normTitle(s).includes(term);
                    const tasks = D().tasks.filter((t) => match(t.title) || match(t.note)).slice(0, 30);
                    const txns = [...D().txns].filter((x) => match(x.title) || match(x.note) || match(CAT[x.cat].name))
                        .sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 40);
                    const total = txns.filter((x) => x.type === 'out').reduce((a, x) => a + x.amount, 0);
                    res.innerHTML = (tasks.length ? `<div class="sec-head" style="padding-left:0"><h3>Tugas</h3></div>${list(tasks.map((t) => taskRow({ t, occ: null }, { when: true })))}` : '')
                        + (txns.length ? `<div class="sec-head" style="padding-left:0"><h3>Transaksi</h3><span class="spacer"></span>${total ? `<span class="count">total keluar ${U.rupiah(total)}</span>` : ''}</div>${list(txns.map(txnRow))}` : '')
                        || '<p class="muted">Nggak ketemu.</p>';
                };
                q.addEventListener('input', run);
                run();
                setTimeout(() => q.focus(), 50);
            },
        });
    }

    // ---------- share ----------
    function share(text) {
        if (navigator.share) {
            navigator.share({ text }).catch(() => { /* cancelled */ });
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
        }
    }

    function shareDay() {
        const k = ui.day;
        const late = k === ui.today ? Q.overdue(k) : [];
        const lines = [`📋 *Tugas ${U.fmtDate(k)}*`];
        late.forEach((e) => lines.push(`⬜ ${e.t.title} _(${lateLabel(e).toLowerCase()})_`));
        Q.dayEntries(k).forEach((e) => lines.push(`${Q.entryDone(e) ? '✅' : '⬜'} ${e.t.time ? e.t.time + ' ' : ''}${e.t.title}`));
        share(lines.join('\n'));
    }

    function shareMoney() {
        const mk = ui.moneyMonth;
        const all = Q.monthTxns(mk);
        const s = Q.sums(all);
        const saved = all.filter(isSaving).reduce((a, x) => a + x.amount, 0);
        const lines = [`💰 *Ringkasan ${U.fmtMonth(mk)}*`, `Pengeluaran: ${U.rupiah(budgetSpend(all))}`];
        if (saved) lines.push(`Ditabung: ${U.rupiah(saved)}`);
        lines.push(`Pemasukan: ${U.rupiah(s.in)}`, `Masuk − keluar: ${U.rupiah(s.net, { sign: true })}`);
        const cats = Q.byCat(all.filter((x) => !isSaving(x)), 'out').slice(0, 5);
        if (cats.length) {
            lines.push('', '*Terbesar:*');
            cats.forEach((c) => lines.push(`${CAT[c.cat].emoji} ${CAT[c.cat].name}: ${U.rupiah(c.total)}`));
        }
        share(lines.join('\n'));
    }

    // ========================================
    // THEME
    // ========================================
    function applyTheme() {
        const th = D().settings.theme;
        if (th === 'light' || th === 'dark') document.documentElement.dataset.theme = th;
        else delete document.documentElement.dataset.theme;
        const dark = th === 'dark' || (th !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        $('#theme-color').setAttribute('content', dark ? '#111b21' : '#ffffff');
    }

    // ========================================
    // GLOBAL ACTIONS (event delegation on [data-act])
    // ========================================
    const scrollTop = (sel) => { const p = $(sel); if (p) p.scrollTop = 0; };

    const ACTIONS = {
        tab(el) {
            ui.tab = el.dataset.tab;
            savePrefs();
            render();
        },
        view(el) {
            ui.view = el.dataset.view;
            if (ui.view === 'day') ui.day = ui.today;
            savePrefs();
            render();
            scrollTop('#pane-tasks');
        },
        'go-view'(el) {
            ui.view = el.dataset.view;
            if (ui.view === 'week') ui.week = U.weekStart(ui.day);
            if (ui.view === 'month') ui.month = U.monthOf(ui.day);
            savePrefs();
            render();
            scrollTop('#pane-tasks');
        },
        strip(el) { ui.day = U.addDays(ui.day, Number(el.dataset.n)); render(); },
        day(el) { ui.day = el.dataset.key; render(); },
        week(el) { ui.week = U.addDays(ui.week, Number(el.dataset.n)); render(); },
        'week-now'() { ui.week = U.weekStart(ui.today); render(); },
        month(el) { ui.month = U.monthAdd(ui.month, Number(el.dataset.n)); render(); },
        'cal-day'(el) { ui.calSel = el.dataset.key; render(); },
        'goto-day'(el) {
            ui.view = 'day';
            ui.day = el.dataset.key;
            savePrefs();
            render();
            scrollTop('#pane-tasks');
        },
        toggle(el) { onToggle(el.dataset.id, el.dataset.occ, el); },
        'open-task'(el) { openTask(el.dataset.id, el.dataset.occ || null); },
        'open-txn'(el) { openTxn(el.dataset.id); },
        'toggle-done'() { ui.showDone = !ui.showDone; render(); },
        'bring-forward'() {
            const snap = S.snapshot();
            const n = S.bringForward(Q.overdue(ui.today), ui.today);
            S.save();
            render();
            toast(`${n} tugas dipindah ke hari ini`, [undo(snap)]);
        },
        'clear-done'() {
            const snap = S.snapshot();
            const n = S.clearDone();
            S.save();
            render();
            toast(`${n} tugas selesai dibersihkan`, [undo(snap)]);
        },
        'money-month'(el) {
            ui.moneyMonth = U.monthAdd(ui.moneyMonth, Number(el.dataset.n));
            ui.catFilter = null;
            ui.chartSel = null;
            ui.showAllTxns = false;
            render();
        },
        cat(el) {
            ui.catFilter = ui.catFilter === el.dataset.cat ? null : el.dataset.cat;
            render();
            if (ui.catFilter) { const h = $('#history'); if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        },
        bar(el) {
            const k = el.dataset.key;
            ui.chartSel = ui.chartSel === k ? null : k;
            render();
            const target = document.getElementById(`day-${k}`);
            if (ui.chartSel && target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },
        'all-txns'() { ui.showAllTxns = true; render(); },
        budget() { openBudget(); },
        goal() { openGoal(); },
        backup() { backupNow(); },
        'snooze-backup'() { D().meta.backupSnooze = U.addDays(ui.today, 7); S.save(); render(); },
        example(el) {
            const text = el.dataset.text;
            afterSheet(() => {
                input.value = text;
                ui.override = {};
                autoGrow();
                updatePreview();
                input.focus();
            });
        },
        quick(el) { logQuick(Number(el.dataset.i)); },
        'chip-kind'() { cycleKind(); },
        'chip-when'() { pickWhen(); },
        'chip-cat'() { pickCat(); },
        'chip-date'() { pickTxnDate(); },
        settings() { openSettings(); },
        search() { openSearch(); },
        'import-v1'() { importV1(); },
        'dismiss-v1'() { D().meta.v1Dismissed = true; S.save(); render(); },
        'share-day'() { shareDay(); },
        'share-money'() { shareMoney(); },
    };

    document.addEventListener('click', (e) => {
        if (suppressClick) { suppressClick = false; e.preventDefault(); return; }
        const el = e.target.closest('[data-act]');
        if (!el) return;
        const fn = ACTIONS[el.dataset.act];
        if (!fn) return;
        e.preventDefault();
        fn(el, e);
    });

    // Keep the keyboard open when tapping chips above the composer.
    [preview, quick].forEach((el) => el.addEventListener('pointerdown', (e) => {
        if (e.target.closest('[data-act="chip-kind"], [data-act="quick"]')) e.preventDefault();
    }));

    // ========================================
    // COMPOSER EVENTS
    // ========================================
    let shiftDown = false;
    input.addEventListener('input', () => { autoGrow(); updatePreview(); });
    input.addEventListener('focus', renderQuick);
    input.addEventListener('blur', () => setTimeout(renderQuick, 150));
    input.addEventListener('keydown', (e) => {
        shiftDown = e.shiftKey;
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
            e.preventDefault();
            submit();
        } else if (e.key === 'Escape') {
            input.blur();
        }
    });
    // Android keyboards may not report Enter in keydown; catch the line break instead.
    input.addEventListener('beforeinput', (e) => {
        if (e.inputType === 'insertLineBreak' && !shiftDown) {
            e.preventDefault();
            submit();
        }
    });
    composer.addEventListener('submit', (e) => {
        e.preventDefault();
        submit();
    });

    // Rows are focusable divs: Enter opens them like a click.
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.matches && e.target.matches('.row[data-act]')) {
            e.preventDefault();
            e.target.click();
        }
    });

    document.addEventListener('keydown', (e) => {
        const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || sheet.open;
        if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === '/' || e.key === 'n') {
            e.preventDefault();
            input.focus();
        }
    });

    // ========================================
    // SWIPE (right = selesai, left = hapus / lewati)
    // ========================================
    function initSwipe(root) {
        let st = null;
        root.addEventListener('pointerdown', (e) => {
            const wrap = e.target.closest('[data-swipe]');
            if (!wrap || e.button !== 0 || e.target.closest('.check')) return;
            st = { wrap, row: wrap.querySelector('.row'), x: e.clientX, y: e.clientY, dx: 0, active: false, id: e.pointerId, w: wrap.offsetWidth };
        });
        root.addEventListener('pointermove', (e) => {
            if (!st || e.pointerId !== st.id) return;
            const dx = e.clientX - st.x, dy = e.clientY - st.y;
            if (!st.active) {
                if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { st = null; return; }
                if (Math.abs(dx) < 12) return;
                st.active = true;
                st.row.classList.add('swiping');
                try { st.row.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            }
            let d = dx;
            if (st.wrap.dataset.swipe === 'txn' && d > 0) d = 0;
            st.dx = d;
            st.row.style.transform = `translateX(${d}px)`;
            const r = st.wrap.querySelector('.row-bg.right'), l = st.wrap.querySelector('.row-bg.left');
            if (r) r.style.opacity = d > 0 ? Math.min(1, d / (st.w * 0.3)) : 0;
            if (l) l.style.opacity = d < 0 ? Math.min(1, -d / (st.w * 0.3)) : 0;
        });
        const end = (e) => {
            if (!st || e.pointerId !== st.id) return;
            const s = st;
            st = null;
            if (!s.active) return;
            suppressClick = true;
            setTimeout(() => { suppressClick = false; }, 400);
            s.row.classList.remove('swiping');
            s.row.style.transition = 'transform .2s';
            const th = s.w * 0.3;
            const reset = () => {
                s.row.style.transform = '';
                s.wrap.querySelectorAll('.row-bg').forEach((b) => { b.style.opacity = 0; });
            };
            if (s.dx > th) {
                reset();
                const chk = s.row.querySelector('.check');
                if (chk) onToggle(chk.dataset.id, chk.dataset.occ, chk);
            } else if (s.dx < -th && e.type === 'pointerup') {
                s.row.style.transform = `translateX(${-s.w}px)`;
                setTimeout(() => {
                    const id = s.row.dataset.id;
                    if (s.row.dataset.act === 'open-txn') deleteTxn(id);
                    else if (s.row.dataset.occ && S.getTask(id) && S.getTask(id).repeat) skipOcc(id, s.row.dataset.occ);
                    else deleteTask(id);
                }, 180);
            } else reset();
        };
        root.addEventListener('pointerup', end);
        root.addEventListener('pointercancel', end);
    }
    initSwipe($('#pane-tasks'));
    initSwipe($('#pane-money'));
    initSwipe(sheet);

    // ========================================
    // SYSTEM: viewport, day change, other tabs, install, offline
    // ========================================
    if (window.visualViewport) {
        const vv = window.visualViewport;
        const fit = () => {
            if (vv.scale > 1.01) return; // pinch-zoomed: leave layout alone
            document.documentElement.style.setProperty('--app-h', `${vv.height}px`);
            document.documentElement.style.setProperty('--vv-top', `${vv.offsetTop}px`);
        };
        vv.addEventListener('resize', fit);
        vv.addEventListener('scroll', fit);
        fit();
    }

    const dock = $('#dock');
    const setDockH = () => document.documentElement.style.setProperty('--dock-h', `${dock.offsetHeight}px`);
    if (window.ResizeObserver) new ResizeObserver(setDockH).observe(dock);
    setDockH();

    function checkDayChange() {
        const now = U.todayKey();
        if (now === ui.today) return;
        const old = ui.today;
        ui.today = now;
        if (ui.day === old) ui.day = now;
        if (ui.calSel === old) ui.calSel = now;
        if (ui.week === U.weekStart(old)) ui.week = U.weekStart(now);
        if (ui.month === U.monthOf(old)) ui.month = U.monthOf(now);
        if (ui.moneyMonth === U.monthOf(old)) ui.moneyMonth = U.monthOf(now);
        render();
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDayChange(); });
    setInterval(checkDayChange, 60 * 1000);

    window.addEventListener('storage', (e) => {
        if (e.key === S.KEY) { S.reload(); applyTheme(); render(); }
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    window.matchMedia('(min-width: 960px)').addEventListener('change', render);

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstall = e;
    });

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
        window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ }));
    }

    // ========================================
    // START
    // ========================================
    applyTheme();
    render();
    autoGrow();
    askPersist();
})();
