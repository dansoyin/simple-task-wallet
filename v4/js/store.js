/* ========================================
   TASK WALLET v4 — store.js
   The data layer: shape, persistence, migrations, recurring-task engine,
   queries and the "life" modules (habits, health, learning, projects, reviews).
   Only the `storage` adapter below touches localStorage, so moving to a
   REST API later means replacing that one object (see README).
   ======================================== */
(function (root) {
    'use strict';
    const C = root.Catetin || (root.Catetin = {});
    const U = C.util;

    const KEY = 'taskwallet.v4';
    const OLD_KEYS = { catetin: 'catetin.v2', revamp: 'task_wallet_v2_state', todos: 'todos', txns: 'finance_transactions', goal: 'finance_savingsGoal' };
    const now = () => new Date().toISOString();
    const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
    const isMonth = (k) => typeof k === 'string' && /^\d{4}-\d{2}$/.test(k);

    // ========================================
    // STORAGE ADAPTER
    // ========================================
    const storage = {
        read: (k) => localStorage.getItem(k),
        write: (k, v) => localStorage.setItem(k, v),
    };

    function readJSON(k) {
        try { return JSON.parse(storage.read(k) || 'null'); } catch (e) { return null; }
    }

    // ========================================
    // DEFAULTS
    // ========================================
    const DEFAULT_HABITS = [
        ['Tidur cukup', '😴', true], ['Olahraga', '🏃', true], ['Belajar coding', '💻', true], ['Minum air', '💧', true],
        ['Membaca', '📖', false], ['Kurangi minuman manis', '🥤', false], ['Merawat diri', '🧴', false],
        ['Rapikan kamar', '🛏️', false], ['Catat pengeluaran', '🧾', false], ['Baca update AI maks 15 menit', '🤖', false],
    ];

    // Roadmap with keywords, so "belajar node 45 menit" lands on "Node.js".
    const DEFAULT_TOPICS = [
        ['HTML', 'html'], ['CSS', 'css|tailwind|flexbox|grid'], ['JavaScript', 'javascript|js|dom'], ['TypeScript', 'typescript|ts'],
        ['Git dan GitHub', 'git|github'], ['HTTP', 'http'], ['SQL', 'sql|mysql|postgres|postgresql|query'], ['Node.js', 'node|nodejs|node.js|npm'],
        ['Express', 'express|routing|middleware'], ['REST API', 'rest|rest api|endpoint'], ['Database', 'database|db|prisma|orm'],
        ['Authentication', 'auth|authentication|login|jwt|session'], ['React atau Next.js', 'react|next|nextjs|next.js'],
        ['Testing', 'testing|test|jest|vitest|playwright'], ['Security', 'security|keamanan|xss|csrf'], ['Docker', 'docker|container'],
        ['Deployment', 'deploy|deployment|hosting|vercel|cloudflare'], ['AI API', 'ai api|llm|claude api|openai'],
        ['AI-assisted development', 'ai assisted|copilot|claude code|prompt|prompting'],
    ];

    const defaultHabits = () => DEFAULT_HABITS.map(([name, emoji, active], i) => ({ id: U.uid() + i, name, emoji, active, createdAt: now() }));
    const defaultTopics = () => DEFAULT_TOPICS.map(([name, kw], i) => ({ id: `t${i}${U.uid()}`, name, kw, status: 'todo', note: '', links: [] }));
    const defaultProjects = () => [{
        id: U.uid(), name: 'Task Wallet', status: 'dikerjakan',
        problem: 'Mencatat tugas dan uang di Draft WhatsApp berantakan; aplikasi lama terasa seperti dua aplikasi terpisah.',
        users: 'Diri sendiri (dan orang yang ingin ruang kendali pribadi yang sederhana).',
        tech: 'HTML, CSS, JavaScript, localStorage, PWA. Rencana: Node.js, Express, PostgreSQL, autentikasi, REST API.',
        features: 'Quick capture bahasa sehari-hari, tugas, kebiasaan, check-in kesehatan, roadmap belajar, keuangan, evaluasi bulanan.',
        github: 'https://github.com/dansoyin/simple-task-wallet', demo: 'https://task-wallet.pages.dev/',
        obstacles: '', lessons: '', screenshot: '', createdAt: now(),
    }];

    // ========================================
    // SHAPE
    // ========================================
    function blank() {
        return {
            app: 'taskwallet',
            v: 4,
            tasks: [],
            txns: [],
            habits: defaultHabits(),
            habitLog: {},
            health: {},
            topics: defaultTopics(),
            sessions: [],
            notes: [],
            projects: defaultProjects(),
            reviews: {},
            settings: { name: '', theme: 'auto', budget: 0, savingsGoal: 0, reminders: false },
            learned: {},
            meta: { created: now(), lastBackup: null, backupSnooze: null, persistAsked: false, migratedFrom: [], v1Imported: false, v1Dismissed: false },
        };
    }

    const PRIORITIES = ['high', 'medium', 'low'];
    const PRIO_RANK = { high: 0, medium: 1, low: 2 };

    function fixTask(t) {
        const out = {
            id: U.uid(), title: '', note: '',
            date: null, time: null, scope: null, period: null, repeat: null,
            done: false, doneAt: null, amount: 0, amountType: 'out', cat: null, createdAt: now(),
            priority: t.star ? 'high' : 'medium', category: 'pribadi', estimate: 0, focus: null, moved: 0,
            ...t,
            doneDates: Array.isArray(t.doneDates) ? t.doneDates.filter(isKey) : [],
            skipDates: Array.isArray(t.skipDates) ? t.skipDates.filter(isKey) : [],
        };
        if (!PRIORITIES.includes(out.priority)) out.priority = 'medium';
        if (!C.parser.TASK_CAT[out.category]) out.category = 'pribadi';
        out.estimate = Math.max(0, Math.round(Number(out.estimate) || 0));
        delete out.star;
        return out;
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

    const arr = (v) => (Array.isArray(v) ? v : null);
    const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : null);

    // Older backups lack the life modules: those get the defaults.
    function sanitize(d) {
        const b = blank();
        if (!d || typeof d !== 'object') return b;
        const habits = arr(d.habits) ? d.habits.filter((h) => h && h.id && h.name) : b.habits;
        const topics = arr(d.topics) ? d.topics.filter((t) => t && t.id && t.name).map((t) => ({ note: '', links: [], kw: '', status: 'todo', ...t })) : b.topics;
        return {
            ...b,
            tasks: (arr(d.tasks) || []).filter((t) => t && t.id && typeof t.title === 'string').map(fixTask),
            txns: (arr(d.txns) || []).filter((x) => x && x.id && Number(x.amount) > 0).map(fixTxn),
            habits,
            habitLog: obj(d.habitLog) || {},
            health: obj(d.health) || {},
            topics,
            sessions: (arr(d.sessions) || []).filter((x) => x && x.id && isKey(x.date)),
            notes: (arr(d.notes) || []).filter((x) => x && x.id && typeof x.text === 'string'),
            projects: arr(d.projects) ? d.projects.filter((x) => x && x.id && x.name) : b.projects,
            reviews: obj(d.reviews) || {},
            settings: { ...b.settings, ...(obj(d.settings) || {}) },
            learned: obj(d.learned) || {},
            meta: { ...b.meta, ...(obj(d.meta) || {}) },
        };
    }

    // ========================================
    // PERSISTENCE + FIRST-RUN MIGRATION
    // ========================================
    let data = null;
    let migration = null; // what the first run imported, shown once by the UI

    function load() {
        let raw = null;
        try {
            raw = storage.read(KEY);
            if (raw) return sanitize(JSON.parse(raw));
        } catch (e) {
            // Never overwrite something we couldn't read: park it for recovery.
            console.warn('Task Wallet: data tidak bisa dibaca, disimpan sebagai cadangan', e);
            try { if (raw) storage.write(`${KEY}.rusak-${Date.now()}`, raw); } catch (err) { /* full */ }
        }
        return null;
    }

    function save() {
        try {
            storage.write(KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.warn('Task Wallet: gagal menyimpan', e);
            return false;
        }
    }

    function init() {
        data = load();
        if (data) return;
        data = blank();
        migration = migrateOld();
        save();
    }

    const reload = () => { data = load() || data; };
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
            const pa = PRIO_RANK[a.t.priority] ?? 1, pb = PRIO_RANK[b.t.priority] ?? 1;
            if (pa !== pb) return pa - pb;
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
        return out.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : (PRIO_RANK[a.t.priority] ?? 1) - (PRIO_RANK[b.t.priority] ?? 1)));
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
            if (!t.repeat && t.done && t.doneAt && U.keyAt(t.doneAt) === k && !seen.has(`${t.id}|`)) out.push({ t, occ: null });
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
            t.moved = (t.moved || 0) + 1; // feeds "sering tertunda" in the monthly review
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
    // HABITS — counted as "x of y days", never as a streak to lose
    // ========================================
    const getHabit = (id) => data.habits.find((h) => h.id === id);
    const activeHabits = () => data.habits.filter((h) => h.active);
    const habitDone = (id, k) => (data.habitLog[id] || []).includes(k);

    function toggleHabit(id, k) {
        const log = data.habitLog[id] || (data.habitLog[id] = []);
        const i = log.indexOf(k);
        if (i >= 0) log.splice(i, 1);
        else log.push(k);
        return i < 0;
    }

    function setHabit(id, k, on) {
        if (habitDone(id, k) !== on) toggleHabit(id, k);
    }

    function addHabit(name, emoji) {
        const h = { id: U.uid(), name: name.trim(), emoji: emoji || '✨', active: true, createdAt: now() };
        data.habits.push(h);
        return h;
    }

    function updateHabit(id, patch) {
        const h = getHabit(id);
        if (h) Object.assign(h, patch);
        return h;
    }

    function removeHabit(id) {
        data.habits = data.habits.filter((h) => h.id !== id);
        delete data.habitLog[id];
    }

    // Days done between from..to (inclusive) and the share of those days.
    function habitStats(id, from, to) {
        const log = data.habitLog[id] || [];
        const days = Math.max(0, U.diffDays(from, to) + 1);
        const done = log.filter((k) => k >= from && k <= to).length;
        return { done, days, pct: days > 0 ? done / days : 0 };
    }

    // A habit is only judged from the day it started (its creation, or the earliest tick).
    function habitSince(h) {
        const log = data.habitLog[h.id] || [];
        const created = h.createdAt ? U.keyAt(h.createdAt) : U.todayKey();
        return log.reduce((m, k) => (k < m ? k : m), created);
    }

    // Stats for a period, never counting days before the habit existed.
    function habitPeriod(h, from, to) {
        const since = habitSince(h);
        return habitStats(h.id, since > from ? since : from, to);
    }

    const exerciseHabit = () => data.habits.find((h) => /olahraga/i.test(h.name));

    // ========================================
    // HEALTH CHECK-IN (simple daily notes, not medical data)
    // ========================================
    const getHealth = (k) => data.health[k] || null;

    function setHealth(k, patch) {
        const rec = data.health[k] || (data.health[k] = {});
        Object.assign(rec, patch, { updatedAt: now() });
        // keep the "Olahraga" habit and the check-in in agreement
        const ex = exerciseHabit();
        if (ex && 'exercise' in patch) setHabit(ex.id, k, !!patch.exercise);
        return rec;
    }

    // An exercise day counts whether it was logged in the check-in or the habit.
    function exercisedOn(k) {
        const h = data.health[k];
        const ex = exerciseHabit();
        return !!((h && h.exercise) || (ex && habitDone(ex.id, k)));
    }

    function healthStats(from, to) {
        const days = U.diffDays(from, to) + 1;
        const recs = Object.entries(data.health).filter(([k]) => k >= from && k <= to).map(([, v]) => v);
        const avg = (field) => {
            const xs = recs.map((r) => r[field]).filter((v) => typeof v === 'number' && v > 0);
            return xs.length ? xs.reduce((a, v) => a + v, 0) / xs.length : 0;
        };
        let exerciseDays = 0;
        for (let k = from; k <= to; k = U.addDays(k, 1)) if (exercisedOn(k)) exerciseDays++;
        return {
            days, logged: recs.length, exerciseDays,
            sleep: avg('sleep'), water: avg('water'), mood: avg('mood'), activity: avg('activity'),
            selfcareDays: recs.filter((r) => r.selfcare).length,
            goodFoodDays: recs.filter((r) => r.food === 3).length,
        };
    }

    // ========================================
    // LEARNING — roadmap topics + study sessions
    // ========================================
    const getTopic = (id) => data.topics.find((t) => t.id === id);

    function matchTopic(text) {
        const t = ` ${U.normTitle(text).replace(/\./g, ' ')} `;
        const tDots = ` ${U.normTitle(text)} `;
        let best = null, bestLen = 0;
        for (const tp of data.topics) {
            const words = [tp.name, ...String(tp.kw || '').split('|')].map((w) => U.normTitle(w)).filter(Boolean);
            for (const w of words) {
                if (w.length > bestLen && (t.includes(` ${w} `) || tDots.includes(` ${w} `))) { best = tp.id; bestLen = w.length; }
            }
        }
        return best;
    }

    function addTopic(name) {
        const t = { id: U.uid(), name: name.trim(), kw: '', status: 'todo', note: '', links: [] };
        data.topics.push(t);
        return t;
    }

    function updateTopic(id, patch) {
        const t = getTopic(id);
        if (t) Object.assign(t, patch);
        return t;
    }

    function removeTopic(id) {
        data.topics = data.topics.filter((t) => t.id !== id);
        data.sessions.forEach((x) => { if (x.topicId === id) x.topicId = null; });
    }

    function addSession(f) {
        const x = {
            id: U.uid(), date: isKey(f.date) ? f.date : U.todayKey(), topicId: f.topicId || null, topic: f.topic || '',
            minutes: Math.max(0, Math.round(Number(f.minutes) || 0)), learned: f.learned || '', confused: f.confused || '', next: f.next || '',
            createdAt: now(),
        };
        data.sessions.push(x);
        // first session on a topic moves it to "sedang dipelajari"
        const t = x.topicId && getTopic(x.topicId);
        if (t && t.status === 'todo') t.status = 'doing';
        return x;
    }

    const getSession = (id) => data.sessions.find((x) => x.id === id);
    function updateSession(id, patch) {
        const x = getSession(id);
        if (x) Object.assign(x, patch);
        return x;
    }
    const removeSession = (id) => { data.sessions = data.sessions.filter((x) => x.id !== id); };

    function topicStats(id) {
        const xs = data.sessions.filter((x) => x.topicId === id);
        return { count: xs.length, minutes: xs.reduce((a, x) => a + x.minutes, 0) };
    }

    function learnStats(from, to) {
        const xs = data.sessions.filter((x) => x.date >= from && x.date <= to);
        return { count: xs.length, minutes: xs.reduce((a, x) => a + x.minutes, 0) };
    }

    // Tasks and projects that mention a topic (by name or keyword).
    function topicLinks(id) {
        const tp = getTopic(id);
        if (!tp) return { tasks: [], projects: [] };
        const words = [tp.name, ...String(tp.kw || '').split('|')].map((w) => U.normTitle(w)).filter((w) => w.length >= 2);
        const hit = (text) => { const t = ` ${U.normTitle(text)} `; return words.some((w) => t.includes(` ${w} `)); };
        return {
            tasks: data.tasks.filter((t) => hit(t.title)),
            projects: data.projects.filter((p) => hit(`${p.name} ${p.tech}`)),
        };
    }

    // ========================================
    // NOTES & IDEAS, PROJECTS, REVIEWS
    // ========================================
    function addNote(kind, text) {
        const n = { id: U.uid(), kind: kind === 'idea' ? 'idea' : 'note', text: String(text).trim(), createdAt: now() };
        data.notes.push(n);
        return n;
    }
    const getNote = (id) => data.notes.find((n) => n.id === id);
    const removeNote = (id) => { data.notes = data.notes.filter((n) => n.id !== id); };
    function updateNote(id, patch) {
        const n = getNote(id);
        if (n) Object.assign(n, patch);
        return n;
    }

    const getProject = (id) => data.projects.find((x) => x.id === id);
    function addProject(f) {
        const x = { id: U.uid(), name: '', status: 'ide', problem: '', users: '', tech: '', features: '', github: '', demo: '', obstacles: '', lessons: '', screenshot: '', createdAt: now(), ...f };
        data.projects.push(x);
        return x;
    }
    function updateProject(id, patch) {
        const x = getProject(id);
        if (x) Object.assign(x, patch);
        return x;
    }
    const removeProject = (id) => { data.projects = data.projects.filter((x) => x.id !== id); };

    const REVIEW_QUESTIONS = [
        'Apa yang sudah berhasil saya lakukan?',
        'Apa yang belum selesai?',
        'Mengapa hal tersebut tertunda?',
        'Apa yang saya pelajari?',
        'Kebiasaan apa yang ingin saya pertahankan?',
        'Apa yang perlu saya kurangi atau hentikan?',
        'Apa tiga fokus utama bulan depan?',
    ];

    const getReview = (mk) => data.reviews[mk] || null;
    function setReview(mk, answers) {
        data.reviews[mk] = { answers: REVIEW_QUESTIONS.map((_, i) => String((answers && answers[i]) || '')), updatedAt: now() };
        return data.reviews[mk];
    }
    const reviewDone = (mk) => { const r = data.reviews[mk]; return !!(r && r.answers && r.answers.some((a) => a.trim())); };

    // Everything the monthly review computes by itself.
    function monthMetrics(mk) {
        const from = `${mk}-01`, last = U.lastDayOfMonth(mk);
        const today = U.todayKey();
        const to = last < today ? last : today < from ? from : today; // don't count future days
        const inMonth = (t) => (t.date && t.date.startsWith(mk))
            || (!t.date && t.scope === 'month' && t.period === mk)
            || (!t.date && t.scope === 'week' && t.period && (t.period.startsWith(mk) || U.addDays(t.period, 6).startsWith(mk)))
            || (!t.date && !t.scope && t.done && t.doneAt && U.keyAt(t.doneAt).startsWith(mk));
        const tasks = data.tasks.filter((t) => !t.repeat && inMonth(t));
        const done = tasks.filter((t) => t.done).length;
        const learn = learnStats(from, last);
        const hs = healthStats(from, to);
        const habits = activeHabits();
        const consistency = habits.length ? habits.reduce((a, h) => a + habitPeriod(h, from, to).pct, 0) / habits.length : 0;
        const txns = data.txns.filter((x) => x.date.startsWith(mk));
        const inn = txns.filter((x) => x.type === 'in').reduce((a, x) => a + x.amount, 0);
        const saved = txns.filter((x) => x.type === 'out' && x.cat === 'tabungan').reduce((a, x) => a + x.amount, 0);
        const spent = txns.filter((x) => x.type === 'out' && x.cat !== 'tabungan').reduce((a, x) => a + x.amount, 0);
        const postponed = data.tasks.filter((t) => !t.done && (t.moved || 0) >= 2).sort((a, b) => b.moved - a.moved).slice(0, 5);
        return {
            tasks: tasks.length, done, pct: tasks.length ? done / tasks.length : 0,
            sessions: learn.count, minutes: learn.minutes,
            exerciseDays: hs.exerciseDays, days: U.diffDays(from, to) + 1, consistency, habits: habits.length,
            in: inn, spent, saved, net: inn - spent - saved, reviewDone: reviewDone(mk), postponed,
        };
    }

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

    // v1 (todo.html / finance.html) categories → v4
    const V1_CAT = {
        food: 'makan', transport: 'transport', shopping: 'belanja', bills: 'tagihan', entertainment: 'hiburan',
        health: 'kesehatan', education: 'pendidikan', 'other-expense': 'lainnya', other: 'lainnya',
        salary: 'gaji', freelance: 'proyek', investment: 'investasi', gift: 'pemberian', 'other-income': 'masuk_lain', business: 'usaha',
    };
    const REVAMP_TASK_CAT = { personal: 'pribadi', study: 'belajar', work: 'kerja', home: 'rumah', health: 'kesehatan', finance: 'keuangan' };

    function tsToIso(id) {
        const d = new Date(Number(id));
        return isNaN(d) ? now() : d.toISOString();
    }

    function readV1() {
        const list = (k) => { const v = readJSON(k); return Array.isArray(v) ? v : []; };
        return { todos: list(OLD_KEYS.todos), txns: list(OLD_KEYS.txns), goal: Number(readJSON(OLD_KEYS.goal)) || 0 };
    }

    const seenIds = () => new Set([...data.tasks, ...data.txns].map((o) => o.v1id).filter(Boolean));

    // v1 → v4. Safe to run twice: rows are matched by their old id.
    function importV1(todos, txns, goal) {
        const have = seenIds();
        let nt = 0, nx = 0;
        for (const o of todos || []) {
            if (!o || !o.title || have.has(`t${o.id}`)) continue;
            data.tasks.push(fixTask({
                v1id: `t${o.id}`, title: String(o.title), done: !!o.completed, doneAt: o.completed ? tsToIso(o.id) : null,
                date: isKey(o.dueDate) ? o.dueDate : null, priority: PRIORITIES.includes(o.priority) ? o.priority : 'medium',
                category: C.parser.guessTaskCat(o.title), createdAt: tsToIso(o.id),
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

    // The "task-wallet-revamp" build (key task_wallet_v2_state).
    function importRevamp(st) {
        const have = seenIds();
        let nt = 0, nx = 0;
        for (const o of st.tasks || []) {
            if (!o || !o.title) continue;
            const v1id = /^\d{12,}$/.test(String(o.id)) ? `t${o.id}` : `r${o.id}`;
            if (have.has(v1id)) continue;
            data.tasks.push(fixTask({
                v1id, title: String(o.title), done: !!o.completed, doneAt: o.completed ? (o.completedAt || now()) : null,
                date: isKey(o.dueDate) ? o.dueDate : null, priority: PRIORITIES.includes(o.priority) ? o.priority : 'medium',
                category: REVAMP_TASK_CAT[o.category] || 'pribadi', note: o.note || '', estimate: parseInt(o.estimate, 10) || 0,
                createdAt: o.createdAt || now(),
            }));
            nt++;
        }
        for (const o of st.transactions || []) {
            if (!o || !(Number(o.amount) > 0)) continue;
            const v1id = /^\d{12,}$/.test(String(o.id)) ? `x${o.id}` : `r${o.id}`;
            if (have.has(v1id)) continue;
            const type = o.type === 'income' ? 'in' : 'out';
            data.txns.push(fixTxn({ v1id, type, amount: Number(o.amount), title: String(o.title || ''), cat: V1_CAT[o.category], date: o.date, createdAt: o.createdAt || now() }));
            nx++;
        }
        for (const [mk, r] of Object.entries(st.reviews || {})) {
            if (!isMonth(mk) || data.reviews[mk] || !r) continue;
            setReview(mk, [r.wins, '', r.blockers, r.lessons, '', '', r.focus]);
        }
        if (Number(st.savingsGoal) > 0 && !data.settings.savingsGoal) data.settings.savingsGoal = Math.round(Number(st.savingsGoal));
        return { tasks: nt, txns: nx };
    }

    // First run of v4: pull in everything older versions left in this browser.
    // The old keys are left untouched, so they double as the backup.
    function migrateOld() {
        const report = { from: [], tasks: 0, txns: 0 };
        const add = (label, r) => { if (r.tasks || r.txns) { report.from.push(label); report.tasks += r.tasks; report.txns += r.txns; } };
        const cat = readJSON(OLD_KEYS.catetin);
        if (cat && Array.isArray(cat.tasks)) {
            const old = sanitize(cat);
            data.tasks = old.tasks;
            data.txns = old.txns;
            data.learned = old.learned;
            data.settings = { ...data.settings, ...old.settings };
            data.meta.lastBackup = old.meta.lastBackup;
            add('Catetin (v2/v3)', { tasks: old.tasks.length, txns: old.txns.length });
        }
        const rev = readJSON(OLD_KEYS.revamp);
        if (rev && (Array.isArray(rev.tasks) || Array.isArray(rev.transactions))) add('Task Wallet revamp', importRevamp(rev));
        const v1 = readV1();
        if (v1.todos.length || v1.txns.length || v1.goal) add('Task Wallet lama', importV1(v1.todos, v1.txns, v1.goal));
        data.meta.migratedFrom = report.from;
        return report.from.length ? report : null;
    }

    // Accepts a v4 backup or a Catetin backup (replace everything), or older
    // Task Wallet exports (merged in).
    function importFile(o) {
        if (o && (o.app === 'taskwallet' || o.app === 'catetin')) {
            data = sanitize(o);
            return { mode: 'replace', tasks: data.tasks.length, txns: data.txns.length };
        }
        if (o && Array.isArray(o.tasks) && Array.isArray(o.transactions)) return { mode: 'merge', ...importRevamp(o) };
        if (o && Array.isArray(o.transactions)) return { mode: 'merge', ...importV1([], o.transactions, Number(o.savingsGoal) || 0) };
        if (Array.isArray(o) && o.some((x) => x && 'completed' in x)) return { mode: 'merge', ...importV1(o, []) };
        if (o && (Array.isArray(o.todos) || Array.isArray(o.finance_transactions))) {
            return { mode: 'merge', ...importV1(o.todos, o.finance_transactions) };
        }
        throw new Error('Format file tidak dikenali');
    }

    function wipe() {
        data = blank();
        data.meta.v1Dismissed = true;
        data.meta.v1Imported = true;
    }

    init();

    C.store = {
        KEY,
        get data() { return data; },
        get migration() { return migration; },
        clearMigration() { migration = null; },
        save, reload, snapshot, restore,
        getTask, getTxn, addTask, updateTask, removeTask, addTxn, updateTxn, removeTxn,
        toggle, skip, bringForward, clearDone, learn, setSettings, linkedTxn,
        getHabit, activeHabits, habitDone, toggleHabit, addHabit, updateHabit, removeHabit, habitStats, habitPeriod, habitSince,
        getHealth, setHealth, exercisedOn, healthStats,
        getTopic, matchTopic, addTopic, updateTopic, removeTopic, addSession, getSession, updateSession, removeSession,
        topicStats, learnStats, topicLinks,
        addNote, getNote, updateNote, removeNote, getProject, addProject, updateProject, removeProject,
        REVIEW_QUESTIONS, getReview, setReview, reviewDone, monthMetrics,
        exportJSON, exportCSV, readV1, importV1, importFile, wipe,
    };

    C.sched = {
        occursOn, nextOcc, nextPending, lastOccBefore, normalizeRepeat, repeatText, streak,
        entryDone, entryKey, sortEntries, dayEntries, overdue, targets, inbox, routines, doneTasks, doneOn,
        upcomingMoney, monthTxns, savedTotal, sums, byCat, frequent,
    };
})(typeof window !== 'undefined' ? window : globalThis);
