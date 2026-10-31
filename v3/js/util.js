/* ========================================
   CATETIN v2 — util.js
   Date keys, Indonesian formatting, small helpers.
   Dates are always local 'YYYY-MM-DD' strings (never toISOString, which is UTC).
   ======================================== */
(function (root) {
    'use strict';
    const C = root.Catetin || (root.Catetin = {});

    const pad = (n) => String(n).padStart(2, '0');

    // ---------- date keys ----------
    function keyOf(d) {
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    // Noon avoids DST edge cases when adding days.
    function parseKey(k) {
        const [y, m, d] = k.split('-').map(Number);
        return new Date(y, m - 1, d || 1, 12);
    }

    const todayKey = (now = new Date()) => keyOf(now);

    function addDays(k, n) {
        const d = parseKey(k);
        d.setDate(d.getDate() + n);
        return keyOf(d);
    }

    // b - a, in whole days
    const diffDays = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5);

    const weekday = (k) => parseKey(k).getDay(); // 0 = Minggu

    // Weeks start on Monday (Senin), like Indonesian calendars.
    function weekStart(k) {
        const wd = weekday(k);
        return addDays(k, wd === 0 ? -6 : 1 - wd);
    }

    const monthOf = (k) => k.slice(0, 7);
    const daysInMonth = (y, m) => new Date(y, m, 0).getDate(); // m is 1-12

    function lastDayOfMonth(mk) {
        const [y, m] = mk.split('-').map(Number);
        return `${mk}-${pad(daysInMonth(y, m))}`;
    }

    function monthAdd(mk, n) {
        const [y, m] = mk.split('-').map(Number);
        const t = new Date(y, m - 1 + n, 1, 12);
        return `${t.getFullYear()}-${pad(t.getMonth() + 1)}`;
    }

    // Same day-of-month n months later, clamped (31 Jan + 1 month = 28/29 Feb).
    function addMonths(k, n) {
        const day = Number(k.slice(8, 10));
        const mk = monthAdd(monthOf(k), n);
        const [y, m] = mk.split('-').map(Number);
        return `${mk}-${pad(Math.min(day, daysInMonth(y, m)))}`;
    }

    function monthsBetween(a, b) {
        const [ya, ma] = a.split('-').map(Number);
        const [yb, mb] = b.split('-').map(Number);
        return (yb - ya) * 12 + (mb - ma);
    }

    function makeKey(y, m, d) {
        return `${y}-${pad(m)}-${pad(Math.min(d, daysInMonth(y, m)))}`;
    }

    // ---------- Indonesian names ----------
    const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const HARI3 = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
        'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const BULAN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    // 'Sabtu, 31 Oktober' / short: 'Sab, 31 Okt'. Year is added when it isn't this year.
    function fmtDate(k, opts = {}) {
        const d = parseKey(k);
        const short = !!opts.short;
        const day = (short ? HARI3 : HARI)[d.getDay()];
        const mon = (short ? BULAN3 : BULAN)[d.getMonth()];
        let s = `${opts.noDay ? '' : day + ', '}${d.getDate()} ${mon}`;
        if (opts.year || d.getFullYear() !== new Date().getFullYear()) s += ` ${d.getFullYear()}`;
        return s;
    }

    function fmtMonth(mk) {
        const [y, m] = mk.split('-').map(Number);
        return `${BULAN[m - 1]} ${y}`;
    }

    // Human label relative to today: 'Hari ini', 'Besok', 'Senin', 'Sab, 8 Nov', ...
    function relDay(k, today) {
        const n = diffDays(today, k);
        if (n === 0) return 'Hari ini';
        if (n === 1) return 'Besok';
        if (n === 2) return 'Lusa';
        if (n === -1) return 'Kemarin';
        if (n > 2 && n < 7) return HARI[weekday(k)];
        if (n < -1 && n > -7) return `${-n} hari lalu`;
        return fmtDate(k, { short: true });
    }

    function weekLabel(ws) {
        const we = addDays(ws, 6);
        const a = parseKey(ws), b = parseKey(we);
        if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${BULAN3[b.getMonth()]}`;
        return `${a.getDate()} ${BULAN3[a.getMonth()]} – ${b.getDate()} ${BULAN3[b.getMonth()]}`;
    }

    // ---------- money ----------
    const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

    function rupiah(n, opts = {}) {
        const sign = n < 0 ? '−' : (opts.sign && n > 0 ? '+' : '');
        return `${sign}Rp${nf.format(Math.abs(Math.round(n)))}`;
    }

    // Compact Indonesian shorthand: 18rb, 1,5jt, 2,3M
    function rupiahShort(n) {
        const a = Math.abs(n);
        const sign = n < 0 ? '−' : '';
        const dec = (v) => (Math.round(v * 10) / 10).toString().replace('.', ',');
        if (a >= 1e9) return `${sign}${dec(a / 1e9)}M`;
        if (a >= 1e6) return `${sign}${dec(a / 1e6)}jt`;
        if (a >= 1e3) return `${sign}${dec(a / 1e3)}rb`;
        return `${sign}${Math.round(a)}`;
    }

    // ---------- misc ----------
    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);

    function normTitle(s) {
        return String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
    }

    function greeting(now = new Date()) {
        const h = now.getHours();
        if (h >= 4 && h < 11) return 'Selamat pagi';
        if (h >= 11 && h < 15) return 'Selamat siang';
        if (h >= 15 && h < 18) return 'Selamat sore';
        return 'Selamat malam';
    }

    C.util = {
        pad, keyOf, parseKey, todayKey, addDays, diffDays, weekday, weekStart,
        monthOf, daysInMonth, lastDayOfMonth, monthAdd, addMonths, monthsBetween, makeKey,
        HARI, HARI3, BULAN, BULAN3, fmtDate, fmtMonth, relDay, weekLabel,
        rupiah, rupiahShort, uid, esc, normTitle, greeting,
    };
})(typeof window !== 'undefined' ? window : globalThis);
