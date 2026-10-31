// Unit tests for the data layer & parser (no dependencies).  Run:  node tests/unit.test.js
const assert = require('node:assert/strict');
const mem = {}; globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
// old data from three generations
mem.todos = JSON.stringify([{ id: 1700000000000, title: 'Nyetrika baju', completed: false, priority: 'high', dueDate: '2026-10-01' }]);
mem.finance_transactions = JSON.stringify([{ id: 1700000000002, type: 'expense', title: 'Makan', amount: 25000, category: 'food', date: '2026-10-10' }]);
mem.finance_savingsGoal = '5000000';
mem['catetin.v2'] = JSON.stringify({ app: 'catetin', v: 2, tasks: [{ id: 'c1', title: 'Beli galon', star: true, date: '2026-10-31' }], txns: [{ id: 'x1', type: 'out', amount: 18000, title: 'Kopi', cat: 'makan', date: '2026-10-31' }], settings: { name: 'Len', budget: 3000000 } });
mem.task_wallet_v2_state = JSON.stringify({ tasks: [{ id: '1700000000000', title: 'Nyetrika baju', priority: 'high' }, { id: 'task_x', title: 'Tugas MTK', category: 'study', estimate: '30 menit', dueDate: '2026-11-02' }], transactions: [{ id: 'tx_1', type: 'income', title: 'Gaji', amount: 5000000, category: 'salary', date: '2026-10-25' }], reviews: { '2026-09': { wins: 'Lulus', focus: 'Belajar' } }, savingsGoal: 0 });
const V = require('path').join(__dirname, '..', 'js') + '/';
require(V + 'util.js'); require(V + 'parser.js'); require(V + 'store.js');
const { store: S, util: U } = globalThis.Catetin;
const D = S.data;
console.log('migration:', S.migration);
assert.deepEqual(S.migration.from, ['Catetin (v2/v3)', 'Task Wallet revamp', 'Task Wallet lama']);
assert.equal(D.tasks.filter(t => t.title === 'Nyetrika baju').length, 1, 'v1 + revamp duplicate removed');
assert.equal(D.tasks.find(t => t.title === 'Beli galon').priority, 'high', 'star → high');
assert.equal(D.tasks.find(t => t.title === 'Tugas MTK').category, 'belajar');
assert.equal(D.tasks.find(t => t.title === 'Tugas MTK').estimate, 30);
assert.equal(D.settings.savingsGoal, 5000000); assert.equal(D.settings.name, 'Len');
assert.equal(S.getReview('2026-09').answers[0], 'Lulus');
assert.ok(mem['taskwallet.v4'] && mem['catetin.v2'] && mem.todos, 'old keys untouched, v4 saved');
assert.ok(D.habits.length >= 9 && D.topics.length === 19 && D.projects[0].name === 'Task Wallet');
// habits & health
const T = U.todayKey(); const ex = D.habits.find(h => h.name === 'Olahraga');
S.setHealth(T, { exercise: true, sleep: 7, water: 6, mood: 4 });
assert.ok(S.habitDone(ex.id, T), 'check-in exercise ticks habit');
assert.equal(S.healthStats(U.addDays(T, -6), T).exerciseDays, 1);
S.toggleHabit(ex.id, U.addDays(T, -1));
assert.equal(S.habitStats(ex.id, U.addDays(T, -6), T).done, 2);
// learning
const node = S.matchTopic('Node.js'); assert.equal(S.getTopic(node).name, 'Node.js');
assert.equal(S.getTopic(S.matchTopic('express routing')).name, 'Express');
S.addSession({ topicId: node, topic: 'Node.js', minutes: 45, date: T });
assert.equal(S.getTopic(node).status, 'doing'); assert.deepEqual(S.topicStats(node), { count: 1, minutes: 45 });
// review metrics
const m = S.monthMetrics(T.slice(0, 7));
assert.equal(m.sessions, 1); assert.equal(m.minutes, 45); assert.ok(m.exerciseDays >= 1);
console.log('metrics', { tasks: m.tasks, done: m.done, in: m.in, spent: m.spent, consistency: m.consistency.toFixed(2) });
// backup roundtrip incl. life data
const json = S.exportJSON(); S.wipe(); assert.equal(S.data.sessions.length, 0);
S.importFile(JSON.parse(json)); assert.equal(S.data.sessions.length, 1); assert.equal(S.data.settings.name, 'Len');
console.log('store v4: all checks passed');
