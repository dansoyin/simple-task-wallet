/* ========================================
   CATETIN v2 — store.js
   Data + localStorage, recurring-task engine, queries, backup & v1 import.
   ======================================== */
(function (root) {
    'use strict';
    const C = root.Catetin || (root.Catetin = {});
    const U = C.util;

    const KEY = 'catetin.v2';
    const now = () => new Date().toISOString();
    const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);

    // ========================================
    // SHAPE
    // ========================================
    function blank() {
        return {
            app: 'catetin',
            v: 2,
            tasks: [],
            txns: [],
            settings: { name: '', theme: 'auto', budget: 0, savingsGoal: 0 },
            learned: {},
            meta: { created: now(), lastBackup: null, backupSnooze: null, persistAsked: false, v1Imported: false, v1Dismissed: false },
        };
    }

    function fixTask(t) {
        return {
            id: U.uid(), title: '', note: '', star: false,
            date: null, time: null, scope: null, period: null, repeat: null,
            done: false, doneAt: null, amount: 0, amountType: 'out', cat: null, createdAt: now(),
            ...t,
            doneDates: Array.isArray(t.doneDates) ? t.doneDates.filter(isKey) : [],
            skipDates: Array.isArray(t.skipDates) ? t.skipDates.filter(isKey) : [],
        };
    }

    function fixTxn(x) {
        const type = x.type === 'in' ? 'in' : 'out';
        const cat = x.cat && C.parser.CAT[x.cat] && C.parser.CAT[x.cat].type === type ? x.cat : C.parser.DEFAULT_CAT[type];
        return {
            id: U.uid(), title: '', note: '', src: null, createdAt: now(),
            ...x,
            type, cat,
            amount: Math.round(Number(x.amount) || 0),
            date: isKey(x.date) ? x.date : U.todayKey(),
        };
    }

    function sanitize(d) {
        const b = blank();
        if (!d || typeof d !== 'object') return b;
        return {
            ...b,
            tasks: Array.isArray(d.tasks) ? d.tasks.filter((t) => t && t.id && typeof t.title === 'string').map(fixTask) : [],
            txns: Array.isArray(d.txns) ? d.txns.filter((x) => x && x.id && Number(x.amount) > 0).map(fixTxn) : [],
            settings: { ...b.settings, ...(d.settings || {}) },
            learned: d.learned && typeof d.learned === 'object' ? d.learned : {},
            meta: { ...b.meta, ...(d.meta || {}) },
        };
    }

    // ========================================
    // PERSISTENCE
    // ========================================
    let data = load();

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            return raw ? sanitize(JSON.parse(raw)) : blank();
        } catch (e) {
            console.warn('Catetin: data tidak bisa dibaca', e);
            return blank();
        }
    }

    function save() {
        try {
            localStorage.setItem(KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.warn('Catetin: gagal menyimpan', e);
            return false;
        }
    }

    const reload = () => { data = load(); };
    const snapshot = () => JSON.stringify(data);
    function restore(snap) {
        data = sanitize(JSON.parse(snap));
        save();
    }

    // ========================================
    // RECURRENCE ENGINE
    // repeat = { freq: 'day'|'week'|'month'|'year', every, days?, mday?, start }
    // start is always the first real occurrence, so it doubles as the anchor
    // for "every 2 weeks" / "every 3 months".
    // ========================================
    function occursOn(r, k) {
        if (!r || k < r.start) return false;
        const every = r.every || 1;
        switch (r.freq) {
            case 'day':
                return U.diffDays(r.start, k) % every === 0;
            case 'week': {
                if (!(r.days || []).includes(U.weekday(k))) return false;
                const weeks = Math.round(U.diffDays(U.weekStart(r.start), U.weekStart(k)) / 7);
                return weeks % every === 0;
            }
            case 'month': {
                if (U.monthsBetween(U.monthOf(r.start), U.monthOf(k)) % every !== 0) return false;
                const [y, m, d] = k.split('-').map(Number);
                const dim = U.daysInMonth(y, m);
                return d === (r.mday === -1 ? dim : Math.min(r.mday || 1, dim));
            }
            case 'year': {
                const [ys, ms, ds] = r.start.split('-').map(Number);
                const [y, m, d] = k.split('-').map(Number);
                return m === ms && (y - ys) % every === 0 && d === Math.min(ds, U.daysInMonth(y, m));
            }
        }
        return false;
    }

    // First date >= from that matches the rule's pattern (ignoring "every").
    function firstOcc(r, from) {
        if (r.freq === 'year') {
            const [, ms, ds] = (r.start || from).split('-').map(Number);
            const y = Number(from.slice(0, 4));
            const k = U.makeKey(y, ms, ds);
            return k >= from ? k : U.makeKey(y + 1, ms, ds);
        }
        const probe = { ...r, every: 1, start: from };
        for (let i = 0, k = from; i < 400; i++, k = U.addDays(k, 1)) if (occursOn(probe, k)) return k;
        return from;
    }

    function normalizeRepeat(r, from) {
        const rule = { freq: r.freq, every: Math.max(1, parseInt(r.every, 10) || 1), start: r.start || from };
        if (rule.freq === 'week') rule.days = (r.days && r.days.length ? [...new Set(r.days)] : [U.weekday(rule.start)]).sort();
        if (rule.freq === 'month') rule.mday = r.mday === -1 ? -1 : Math.min(31, Math.max(1, parseInt(r.mday, 10) || Number(rule.start.slice(8, 10))));
        rule.start = firstOcc(rule, rule.start < from ? from : rule.start);
        return rule;
    }

    const scanLimit = (r) => (r.freq === 'year' ? 366 * (r.every || 1) + 2 : r.freq === 'month' ? 31 * (r.every || 1) + 2 : 7 * (r.every || 1) + 2);

    function nextOcc(r, from) {
        for (let i = 0, k = from, n = scanLimit(r); i <= n; i++, k = U.addDays(k, 1)) if (occursOn(r, k)) return k;
        return null;
    }

    // Next occurrence that hasn't been ticked off or skipped yet.
    function nextPending(t, from) {
        let n = nextOcc(t.repeat, from);
        for (let i = 0; n && i < 12 && (t.doneDates.includes(n) || t.skipDates.includes(n)); i++) n = nextOcc(t.repeat, U.addDays(n, 1));
        return n;
    }

    function lastOccBefore(r, k) {
        for (let i = 0, d = U.addDays(k, -1), n = scanLimit(r); i <= n && d >= r.start; i++, d = U.addDays(d, -1)) {
            if (occursOn(r, d)) return d;
        }
        return null;
    }

    function repeatText(r) {
        if (!r) return '';
        const n = r.every || 1;
        switch (r.freq) {
            case 'day':
                return n > 1 ? `Tiap ${n} hari` : 'Tiap hari';
            case 'week': {
                const days = [...(r.days || [])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
                let label;
                if (days.length === 7) label = 'hari';
                else if (days.join() === '1,2,3,4,5') label = 'hari kerja';
                else if (days.join() === '6,0') label = 'akhir pekan';
                else {
                    const names = days.map((d) => U.HARI[d]);
                    label = names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}` : names[0];
                }
                return n > 1 ? `Tiap ${n} minggu, ${label}` : `Tiap ${label}`;
            }
            case 'month': {
                const d = r.mday === -1 ? 'akhir bulan' : `tgl ${r.mday}`;
                return n > 1 ? `Tiap ${n} bulan, ${d}` : `Tiap bulan ${d}`;
            }
            case 'year':
                return `Tiap tahun, ${U.fmtDate(r.start, { noDay: true, short: true }).replace(/ \d{4}$/, '')}`;
        }
        return '';
    }

    function streak(t, today) {
        if (!t.repeat) return 0;
        const done = new Set(t.doneDates);
        let n = 0;
        for (let i = 0, k = today; i < 400 && k >= t.repeat.start; i++, k = U.addDays(k, -1)) {
            if (!occursOn(t.repeat, k) || t.skipDates.includes(k)) continue;
            if (done.has(k)) n++;
            else if (k !== today) break;
        }
        return n;
    }

    // ========================================
    // QUERIES — an "entry" is a task as it appears on a day: { t, occ }
    // (occ is the occurrence date for recurring tasks, null otherwise)
    // ========================================
    const entryDone = (e) => (e.occ ? e.t.doneDates.includes(e.occ) : e.t.done);
    const entryKey = (e) => `${e.t.id}|${e.occ || ''}`;

    function sortEntries(list) {
        return list.sort((a, b) => {
            const ta = a.t.time || '99', tb = b.t.time || '99';
            if (ta !== tb) return ta < tb ? -1 : 1;
            if (a.t.star !== b.t.star) return a.t.star ? -1 : 1;
            return a.t.createdAt < b.t.createdAt ? -1 : 1;
        });
    }

    function dayEntries(k) {
        const out = [];
        for (const t of data.tasks) {
            if (t.repeat) {
                if (occursOn(t.repeat, k) && !t.skipDates.includes(k)) out.push({ t, occ: k });
            } else if (t.date === k) out.push({ t, occ: null });
        }
        return sortEntries(out);
    }

    // Unfinished dated tasks from the past, plus the latest missed monthly/yearly
    // occurrence (bills). Daily/weekly habits are never "late" — a missed day is just missed.
    function overdue(today) {
        const ws = U.weekStart(today), mk = U.monthOf(today);
        const out = [];
        for (const t of data.tasks) {
            if (t.repeat) {
                if (t.repeat.freq !== 'month' && t.repeat.freq !== 'year') continue;
                const last = lastOccBefore(t.repeat, today);
                if (last && !t.doneDates.includes(last) && !t.skipDates.includes(last)) out.push({ t, occ: last, due: last });
            } else if (!t.done) {
                if (t.date && t.date < today) out.push({ t, occ: null, due: t.date });
                else if (!t.date && t.scope === 'week' && t.period < ws) out.push({ t, occ: null, due: U.addDays(t.period, 6) });
                else if (!t.date && t.scope === 'month' && t.period < mk) out.push({ t, occ: null, due: U.lastDayOfMonth(t.period) });
            }
        }
        return out.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : (b.t.star - a.t.star)));
    }

    const targets = (scope, period) => sortEntries(data.tasks
        .filter((t) => !t.repeat && !t.date && t.scope === scope && t.period === period)
        .map((t) => ({ t, occ: null })));

    const inbox = () => sortEntries(data.tasks
        .filter((t) => !t.repeat && !t.date && !t.scope && !t.done)
        .map((t) => ({ t, occ: null })));

    const routines = () => data.tasks.filter((t) => t.repeat);

    const doneTasks = () => data.tasks
        .filter((t) => !t.repeat && t.done)
        .sort((a, b) => (a.doneAt < b.doneAt ? 1 : -1));

    // Everything finished on day k: that day's own entries plus any task ticked off that day.
    function doneOn(k) {
        const out = dayEntries(k).filter(entryDone);
        const seen = new Set(out.map(entryKey));
        for (const t of data.tasks) {
            if (!t.repeat && t.done && t.doneAt && U.keyOf(new Date(t.doneAt)) === k && !seen.has(`${t.id}|`)) out.push({ t, occ: null });
        }
        return out;
    }

    // Upcoming money-linked tasks (bills, planned purchases) within `days`.
    function upcomingMoney(today, days) {
        const end = U.addDays(today, days);
        const out = [];
        for (const t of data.tasks) {
            if (!(t.amount > 0)) continue;
            if (t.repeat) {
                const n = nextPending(t, today);
                if (n && n <= end) out.push({ t, occ: n, due: n });
            } else if (!t.done) {
                const due = t.date || (t.scope === 'week' ? U.addDays(t.period, 6) : t.scope === 'month' ? U.lastDayOfMonth(t.period) : null);
                if (due && due <= end) out.push({ t, occ: null, due });
            }
        }
        return out.sort((a, b) => (a.due < b.due ? -1 : 1));
    }

    // ---------- money ----------
    const monthTxns = (mk) => data.txns.filter((x) => x.date.startsWith(mk));

    // Everything logged as "Tabungan & Investasi" counts toward the savings goal.
    const savedTotal = () => data.txns.filter((x) => x.type === 'out' && x.cat === 'tabungan').reduce((a, x) => a + x.amount, 0);

    function sums(list) {
        let inn = 0, out = 0;
        for (const x of list) x.type === 'in' ? (inn += x.amount) : (out += x.amount);
        return { in: inn, out, net: inn - out };
    }

    function byCat(list, type) {
        const m = new Map();
        for (const x of list) {
            if (x.type !== type) continue;
            const c = m.get(x.cat) || { cat: x.cat, total: 0, count: 0 };
            c.total += x.amount;
            c.count++;
            m.set(x.cat, c);
        }
        return [...m.values()].sort((a, b) => b.total - a.total);
    }

    // Repeated entries (same title + amount) from the last 60 days → one-tap chips.
    function frequent(today, limit = 8) {
        const since = U.addDays(today, -60);
        const m = new Map();
        for (const x of data.txns) {
            if (x.date < since || x.src) continue;
            const key = `${x.type}|${U.normTitle(x.title)}|${x.amount}`;
            const e = m.get(key) || { type: x.type, title: x.title, amount: x.amount, cat: x.cat, n: 0, last: '' };
            e.n++;
            if (x.date >= e.last) { e.last = x.date; e.title = x.title; e.cat = x.cat; }
            m.set(key, e);
        }
        return [...m.values()].filter((e) => e.n >= 2)
            .sort((a, b) => b.n - a.n || (a.last < b.last ? 1 : -1))
            .slice(0, limit);
    }

    // ========================================
    // MUTATIONS (callers save() after a batch)
    // ========================================
    const getTask = (id) => data.tasks.find((t) => t.id === id);
    const getTxn = (id) => data.txns.find((x) => x.id === id);

    function addTask(f) {
        const t = fixTask({ ...f, id: U.uid(), createdAt: now() });
        if (t.repeat) t.repeat = normalizeRepeat(t.repeat, U.todayKey());
        data.tasks.push(t);
        return t;
    }

    // What makes a rule "the same rule": editing only the title/note/time must keep
    // the original anchor, otherwise streaks and missed bills are lost.
    const ruleKey = (r) => JSON.stringify([r.freq, r.every || 1, [...(r.days || [])].sort(), r.mday == null ? null : r.mday,
        r.freq === 'year' ? String(r.start).slice(5) : null]);

    function updateTask(id, patch) {
        const t = getTask(id);
        if (!t) return null;
        const old = t.repeat;
        Object.assign(t, patch);
        if (patch.repeat) {
            t.repeat = old && ruleKey(old) === ruleKey(patch.repeat) ? old : normalizeRepeat(patch.repeat, U.todayKey());
        }
        return t;
    }

    function removeTask(id) {
        data.tasks = data.tasks.filter((t) => t.id !== id);
    }

    function addTxn(f) {
        const x = fixTxn({ ...f, id: U.uid(), createdAt: now() });
        data.txns.push(x);
        return x;
    }

    function updateTxn(id, patch) {
        const x = getTxn(id);
        if (!x) return null;
        Object.assign(x, fixTxn({ ...x, ...patch }));
        return x;
    }

    function removeTxn(id) {
        data.txns = data.txns.filter((x) => x.id !== id);
    }

    const linkedTxn = (taskId, occ) => data.txns.find((x) => x.src && x.src.task === taskId && (x.src.occ || null) === (occ || null));

    // Ticking a task that carries an amount records the payment; unticking removes it.
    function toggle(id, occ, today) {
        const t = getTask(id);
        if (!t) return null;
        let done;
        if (t.repeat) {
            const i = t.doneDates.indexOf(occ);
            done = i < 0;
            if (done) t.doneDates.push(occ);
            else t.doneDates.splice(i, 1);
        } else {
            done = !t.done;
            t.done = done;
            t.doneAt = done ? now() : null;
        }
        let txn = null;
        if (done && t.amount > 0) {
            txn = addTxn({ type: t.amountType || 'out', amount: t.amount, title: t.title, cat: t.cat, date: today, src: { task: t.id, occ: occ || null } });
        } else if (!done) {
            const linked = linkedTxn(t.id, occ);
            if (linked) removeTxn(linked.id);
        }
        return { t, done, txn };
    }

    function skip(id, occ) {
        const t = getTask(id);
        if (t && t.repeat && !t.skipDates.includes(occ)) t.skipDates.push(occ);
    }

    // Move late tasks to today (or to this week/month for horizon tasks).
    function bringForward(entries, today) {
        let n = 0;
        for (const { t } of entries) {
            if (t.repeat) continue;
            if (t.date) t.date = today;
            else if (t.scope === 'week') t.period = U.weekStart(today);
            else if (t.scope === 'month') t.period = U.monthOf(today);
            n++;
        }
        return n;
    }

    function clearDone() {
        const before = data.tasks.length;
        data.tasks = data.tasks.filter((t) => t.repeat || !t.done);
        return before - data.tasks.length;
    }

    function learn(title, type, cat) {
        const k = U.normTitle(title);
        if (k) data.learned[`${type}:${k}`] = cat;
    }

    const setSettings = (patch) => Object.assign(data.settings, patch);

    // ========================================
    // BACKUP & IMPORT
    // ========================================
    function exportJSON() {
        return JSON.stringify({ ...data, exportedAt: now() }, null, 2);
    }

    function exportCSV() {
        const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
        const rows = [['Tanggal', 'Jenis', 'Kategori', 'Judul', 'Jumlah', 'Catatan']];
        [...data.txns].sort((a, b) => (a.date < b.date ? -1 : 1)).forEach((x) => {
            rows.push([x.date, x.type === 'in' ? 'Pemasukan' : 'Pengeluaran', C.parser.CAT[x.cat].name, x.title, x.type === 'in' ? x.amount : -x.amount, x.note || '']);
        });
        return '﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n');
    }

    const V1_CAT = {
        food: 'makan', transport: 'transport', shopping: 'belanja', bills: 'tagihan', entertainment: 'hiburan',
        health: 'kesehatan', education: 'pendidikan', 'other-expense': 'lainnya',
        salary: 'gaji', freelance: 'proyek', investment: 'investasi', gift: 'pemberian', 'other-income': 'masuk_lain',
    };

    function tsToIso(id) {
        const d = new Date(Number(id));
        return isNaN(d) ? now() : d.toISOString();
    }

    function readV1() {
        const read = (k) => {
            try {
                const v = JSON.parse(localStorage.getItem(k) || 'null');
                return Array.isArray(v) ? v : [];
            } catch (e) {
                return [];
            }
        };
        let goal = 0;
        try { goal = Number(JSON.parse(localStorage.getItem('finance_savingsGoal') || '0')) || 0; } catch (e) { /* none */ }
        return { todos: read('todos'), txns: read('finance_transactions'), goal };
    }

    // v1 (the old todo.html / finance.html) → v2. Safe to run twice: rows are matched by their old id.
    function importV1(todos, txns, goal) {
        const have = new Set([...data.tasks, ...data.txns].map((o) => o.v1id).filter(Boolean));
        let nt = 0, nx = 0;
        for (const o of todos || []) {
            if (!o || !o.title || have.has(`t${o.id}`)) continue;
            data.tasks.push(fixTask({
                v1id: `t${o.id}`, title: String(o.title), done: !!o.completed, doneAt: o.completed ? tsToIso(o.id) : null,
                date: isKey(o.dueDate) ? o.dueDate : null, star: o.priority === 'high', createdAt: tsToIso(o.id),
            }));
            nt++;
        }
        for (const o of txns || []) {
            if (!o || !(Number(o.amount) > 0) || have.has(`x${o.id}`)) continue;
            const type = o.type === 'income' ? 'in' : 'out';
            data.txns.push(fixTxn({
                v1id: `x${o.id}`, type, amount: Number(o.amount), title: String(o.title || ''),
                cat: V1_CAT[o.category], date: o.date, createdAt: tsToIso(o.id),
            }));
            nx++;
        }
        if (goal > 0 && !data.settings.savingsGoal) data.settings.savingsGoal = Math.round(goal);
        data.meta.v1Imported = true;
        return { tasks: nt, txns: nx };
    }

    // Accepts a Catetin backup (replaces everything) or v1 exports (merged in).
    function importFile(obj) {
        if (obj && obj.app === 'catetin') {
            data = sanitize(obj);
            return { mode: 'replace', tasks: data.tasks.length, txns: data.txns.length };
        }
        if (obj && Array.isArray(obj.transactions)) return { mode: 'merge', ...importV1([], obj.transactions, Number(obj.savingsGoal) || 0) };
        if (Array.isArray(obj) && obj.some((o) => o && 'completed' in o)) return { mode: 'merge', ...importV1(obj, []) };
        if (obj && (Array.isArray(obj.todos) || Array.isArray(obj.finance_transactions))) {
            return { mode: 'merge', ...importV1(obj.todos, obj.finance_transactions) };
        }
        throw new Error('Format file tidak dikenali');
    }

    function wipe() {
        data = blank();
        data.meta.v1Dismissed = true;
    }

    C.store = {
        KEY,
        get data() { return data; },
        save, reload, snapshot, restore,
        getTask, getTxn, addTask, updateTask, removeTask, addTxn, updateTxn, removeTxn,
        toggle, skip, bringForward, clearDone, learn, setSettings, linkedTxn,
        exportJSON, exportCSV, readV1, importV1, importFile, wipe,
    };

    C.sched = {
        occursOn, nextOcc, nextPending, lastOccBefore, normalizeRepeat, repeatText, streak,
        entryDone, entryKey, sortEntries, dayEntries, overdue, targets, inbox, routines, doneTasks, doneOn,
        upcomingMoney, monthTxns, savedTotal, sums, byCat, frequent,
    };
})(typeof window !== 'undefined' ? window : globalThis);
