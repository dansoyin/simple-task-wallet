/* ========================================
   CATETIN v2 — parser.js
   Free text → task or money entry, the way people type in WhatsApp:
     "kopi 18rb"                    → pengeluaran Rp18.000 (Makan & Minum)
     "gajian +5jt"                  → pemasukan Rp5.000.000
     "beli galon besok"             → tugas besok
     "bayar wifi 350rb tiap tgl 5"  → tugas rutin bulanan + nominal
   Pure functions (no DOM), so it runs in Node for tests too.
   ======================================== */
(function (root) {
    'use strict';
    const C = root.Catetin || (root.Catetin = {});
    const U = C.util;

    // ========================================
    // CATEGORIES (keywords are matched as whole words/phrases)
    // ========================================
    const CATS = [
        { id: 'makan', type: 'out', emoji: '🍜', name: 'Makan & Minum',
            kw: 'makan|maem|mamam|sarapan|brunch|lunch|dinner|kopi|ngopi|coffee|cafe|kafe|teh|es teh|esteh|jus|juice|susu|boba|minum|minuman|air mineral|aqua|snack|cemilan|camilan|jajan|jajanan|gorengan|roti|kue|martabak|nasi|nasgor|mie|mi|bakso|soto|sate|ayam|bebek|ikan|seafood|pecel|lele|geprek|warteg|padang|warung|resto|restoran|bakmi|dimsum|sushi|ramen|pizza|burger|kfc|mcd|mekdi|hokben|richeese|starbucks|sbux|janji jiwa|kenangan|fore|tomoro|chatime|mixue|gofood|grabfood|shopeefood|indomie|seblak|siomay|batagor|cilok|cireng|thai tea|buah|katering|catering|kantin' },
        { id: 'transport', type: 'out', emoji: '🛵', name: 'Transportasi',
            kw: 'bensin|pertalite|pertamax|shell|solar|bbm|parkir|parkiran|tol|e-toll|etoll|emoney|e-money|flazz|ojek|ojol|gojek|goride|gocar|grab|grabbike|grabcar|maxim|indrive|taksi|taxi|bluebird|krl|commuter|kereta|kai|mrt|lrt|transjakarta|tije|busway|bus|angkot|travel|damri|pesawat|tiket pesawat|tiket kereta|garuda|lion|citilink|servis|service|servis motor|servis mobil|bengkel|oli|ganti oli|ban|tambal ban|cuci motor|cuci mobil|sparepart|helm' },
        { id: 'belanja', type: 'out', emoji: '🛍️', name: 'Belanja',
            kw: 'belanja|shopee|tokopedia|tokped|lazada|blibli|tiktok shop|checkout|baju|kaos|kemeja|celana|jaket|hoodie|sepatu|sandal|sendal|tas|dompet|jam tangan|aksesoris|hp|handphone|gadget|laptop|charger|casing|headset|earphone|tws|skincare|kosmetik|parfum|makeup' },
        { id: 'rumah', type: 'out', emoji: '🏠', name: 'Kebutuhan Rumah',
            kw: 'belanja bulanan|belanja dapur|belanja sayur|belanja pasar|pasar|indomaret|alfamart|alfa|alfamidi|superindo|hypermart|transmart|lotte|sayur|sayuran|beras|minyak|minyak goreng|telur|telor|gula|garam|bumbu|galon|isi galon|gas|elpiji|lpg|sabun|shampo|sampo|odol|pasta gigi|detergen|deterjen|rinso|pewangi|tisu|tissue|pembalut|popok|pampers|diapers|laundry|londri|setrika|perabot' },
        { id: 'tagihan', type: 'out', emoji: '🧾', name: 'Tagihan',
            kw: 'tagihan|listrik|pln|token|token listrik|pdam|air pdam|wifi|internet|indihome|biznet|firstmedia|first media|myrepublic|iconnet|pulsa|kuota|paket data|telkomsel|indosat|im3|smartfren|bpjs|asuransi|cicilan|kredit|kpr|angsuran|paylater|spaylater|sewa|kos|kost|kosan|kontrakan|iuran|ipl|sampah|keamanan|netflix|spotify|youtube premium|disney|vidio|langganan|subscription|pajak|pbb|stnk|icloud|google one' },
        { id: 'hiburan', type: 'out', emoji: '🎮', name: 'Hiburan',
            kw: 'nonton|bioskop|film|cgv|xxi|cinepolis|game|steam|top up|topup|top-up|diamond|voucher game|liburan|jalan-jalan|jalan2|healing|wisata|hotel|villa|staycation|tiket|konser|karaoke|hobi|mainan|nongkrong|futsal|badminton|bulu tangkis|renang|sewa lapangan' },
        { id: 'kesehatan', type: 'out', emoji: '💊', name: 'Kesehatan',
            kw: 'obat|apotek|apotik|dokter|klinik|puskesmas|rumah sakit|rs|vitamin|suplemen|periksa|cek lab|lab|gigi|dokter gigi|kacamata|gym|fitness|masker|terapi|pijat|urut' },
        { id: 'pendidikan', type: 'out', emoji: '📚', name: 'Pendidikan',
            kw: 'buku|kursus|les|kuliah|ukt|spp|sekolah|seminar|workshop|webinar|kelas|course|udemy|sertifikasi|ujian|print|ngeprint|fotokopi|fotocopy|atk|alat tulis|pulpen|kertas' },
        { id: 'sosial', type: 'out', emoji: '🎁', name: 'Keluarga & Sosial',
            kw: 'kado|hadiah|sumbangan|donasi|sedekah|zakat|infaq|infak|kondangan|nikahan|amplop|arisan|ortu|orang tua|ibu|bapak|ayah|mama|papa|mamah|papah|adik|kakak|anak|istri|suami|pacar|traktir|angpao|angpau|thr' },
        { id: 'tabungan', type: 'out', emoji: '🐷', name: 'Tabungan & Investasi',
            kw: 'nabung|menabung|tabung|tabungan|investasi|invest|saham|reksadana|reksa dana|emas|logam mulia|antam|deposito|crypto|kripto|bitcoin|dana darurat' },
        { id: 'lainnya', type: 'out', emoji: '📦', name: 'Lainnya', kw: '' },

        { id: 'gaji', type: 'in', emoji: '💼', name: 'Gaji',
            kw: 'gaji|gajian|salary|thr|bonus|lembur|insentif|tunjangan|payroll' },
        { id: 'usaha', type: 'in', emoji: '🏪', name: 'Usaha & Jualan',
            kw: 'jual|jualan|terjual|laku|penjualan|omzet|omset|dagangan|untung|cuan|profit|toko|orderan|pesanan' },
        { id: 'proyek', type: 'in', emoji: '💻', name: 'Freelance & Proyek',
            kw: 'freelance|project|proyek|fee|honor|honorarium|klien|client|komisi|job|ngajar|ngelesin' },
        { id: 'investasi', type: 'in', emoji: '📈', name: 'Hasil Investasi',
            kw: 'dividen|bunga bank|bunga deposito|bunga tabungan|saham|reksadana|crypto|kripto|emas|capital gain' },
        { id: 'pemberian', type: 'in', emoji: '🎁', name: 'Pemberian',
            kw: 'dikasih|dikasi|kiriman|angpao|angpau|hadiah|warisan|ortu|orang tua|ibu|bapak|ayah|mama|papa|mamah|papah|kakak|adik|uang jajan|uang saku' },
        { id: 'masuk_lain', type: 'in', emoji: '💰', name: 'Lainnya',
            kw: 'refund|cashback|kembalian|reimburse|reimbursement|klaim|pencairan' },
    ].map((c) => ({ ...c, kws: c.kw ? c.kw.split('|') : [] }));

    const CAT = Object.fromEntries(CATS.map((c) => [c.id, c]));
    const DEFAULT_CAT = { out: 'lainnya', in: 'masuk_lain' };

    function guessCat(text, type, learned) {
        const t = U.normTitle(text);
        if (learned) {
            const hit = learned[`${type}:${t}`] ||
                learned[`${type}:${t.replace(/^(?:beli|bayar|isi|top up|topup)\s+/, '')}`];
            if (hit && CAT[hit]) return hit;
        }
        const padded = ` ${t} `;
        let best = null, bestLen = 0;
        for (const c of CATS) {
            if (c.type !== type) continue;
            for (const k of c.kws) {
                if (k.length > bestLen && padded.includes(` ${k} `)) { best = c.id; bestLen = k.length; }
            }
        }
        return best || DEFAULT_CAT[type];
    }

    // ========================================
    // VOCABULARY
    // ========================================
    const MONTHS = 'januari|februari|pebruari|maret|april|mei|juni|juli|agustus|agust|september|sept|oktober|november|nopember|desember|jan|feb|peb|mar|apr|may|jun|jul|agu|agt|ags|aug|sep|okt|oct|nov|nop|des|dec';
    const MONTH_NUM = { jan: 1, feb: 2, peb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, agt: 8, ags: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, nop: 11, des: 12, dec: 12 };
    const monthNum = (w) => MONTH_NUM[w.slice(0, 3)];

    const WDNAMES = "senin|selasa|rabu|kamis|jum'?at|sabtu|minggu|ahad";
    const WD = { minggu: 0, ahad: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6 };
    const wdNum = (w) => WD[w.replace("'", '')];

    const NUMWORD = { se: 1, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10 };
    const NUMW = '(\\d+|se|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)';
    const toNum = (w) => (/^\d+$/.test(w) ? parseInt(w, 10) : NUMWORD[w] || 0);

    const DAYPART_TIME = { pagi: '08:00', siang: '12:00', sore: '16:00', malam: '19:00', malem: '19:00' };
    const EV = '(?:setiap|tiap(?:-tiap|2)?|saban)';
    const DP = String.raw`(?:\s+(pagi|siang|sore|malam|malem))?`;
    const R = (src) => new RegExp(src, 'g');

    const INCOME_RE = /\b(gaji|gajian|salary|thr|bonus|insentif|lembur|tunjangan|payroll|honor|honorarium|fee|komisi|upah|bayaran|dibayar|terima|nerima|menerima|diterima|dapat|dapet|dpt|dikasih|dikasi|dikirimin|kiriman|transferan|ditransfer|pemasukan|income|pendapatan|jual|jualan|terjual|laku|penjualan|omzet|omset|untung|profit|cuan|dividen|refund|cashback|kembalian|angpao|angpau|warisan|pencairan|cair|reimburse|reimbursement|klaim)\b/;
    const EXPENSE_RE = /\b(beli|beliin|bayar|bayarin|belanja|jajan|kasih|ngasih|bagi|bagiin|transfer\s+ke|tf\s+ke|kirim\s+ke|top\s*-?\s*up|isi|langganan|sewa|cicil|nyicil|traktir|sedekah|donasi|zakat|infaq|infak|nabung|menabung|keluar|pengeluaran|habis)\b/;
    const TASK_RE = /\b(jangan\s+lupa|jgn\s+lupa|ingetin|ingatkan|ingatin|ingat|inget|harus|hrs|mesti|wajib|rencana|rencananya|plan|mau|mo|pengen|pgn|pingin|ingin|target|todo|to\s*do|reminder)\b/;

    // ========================================
    // SCANNER — consumed words are blanked out so the rest becomes the title
    // ========================================
    function lower(s) {
        let out = '';
        for (const ch of s) {
            const lc = ch.toLowerCase();
            out += lc.length === ch.length ? lc : ch;
        }
        return out;
    }

    class Scanner {
        constructor(text) {
            this.o = text;
            this.l = lower(text);
        }

        // fn(match) returns false to reject a match (it then stays in the text)
        take(re, fn) {
            re.lastIndex = 0;
            const hits = [];
            let m;
            while ((m = re.exec(this.l))) {
                if (!m[0]) { re.lastIndex++; continue; }
                if (fn(m) !== false) hits.push([m.index, m.index + m[0].length]);
            }
            hits.forEach(([a, b]) => this.blank(a, b));
            return hits.length > 0;
        }

        blank(a, b) {
            const sp = ' '.repeat(b - a);
            this.o = this.o.slice(0, a) + sp + this.o.slice(b);
            this.l = this.l.slice(0, a) + sp + this.l.slice(b);
        }
    }

    // ========================================
    // MONEY
    // ========================================
    const MONEY_RE = /(^|[\s(:=,;])([+\-−]?)\s?(rp\.?\s?|idr\s?)?(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d+)?)\s?(ribu|rebu|rb|k|juta|jt|jeti|miliar|milyar)?(?:an)?(?=$|[\s),.;:!?/-])/g;
    const MULT = { ribu: 1e3, rebu: 1e3, rb: 1e3, k: 1e3, juta: 1e6, jt: 1e6, jeti: 1e6, miliar: 1e9, milyar: 1e9 };
    const QTY_AFTER = /^(kg|kilo|gr|gram|ons|liter|ltr|ml|pcs|buah|bh|biji|bks|bungkus|lembar|lbr|porsi|kali|x|orang|org|km|meter|cm|mm|menit|mnt|detik|hari|minggu|bulan|tahun|thn|%|persen|langkah|kalori|kkal|mah|gb|mb|tb|watt|cc|undangan|halaman|hal|kata|unit|kotak|dus|karung|botol|gelas|butir|ekor|batang|sachet|pasang|lusin|rim|eksemplar|peserta|siswa|soal|views|follower|followers)\b/;
    const NOT_MONEY_BEFORE = /(?:tahun|thn|th|no|nomor|nomer|nmr|kode|rek|rekening|lt|lantai|kamar|blok|rt|rw|gang|gg)\.?$/;

    function moneyValue(m, l) {
        const sign = m[2], rp = !!m[3], num = m[4], unit = m[5] || '';
        let n;
        if (unit) {
            n = /^\d+[.,]\d{1,2}$/.test(num) ? parseFloat(num.replace(',', '.')) : parseInt(num.replace(/[.,]/g, ''), 10);
            n *= MULT[unit];
        } else if (/^\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?$/.test(num)) {
            n = parseInt(num.replace(/[.,]\d{1,2}$/, '').replace(/[.,]/g, ''), 10);
        } else if (/^\d+$/.test(num)) {
            n = parseInt(num, 10);
            if (!rp && (/^0\d{3,}/.test(num) || num.length >= 10 || n < 1000)) return null;
            if (!rp && !unit && num.length === 4 && n >= 1900 && n <= 2100 && n % 100 !== 0) return null; // a year
        } else {
            if (!rp) return null; // "2,5" without Rp/unit is not money
            n = parseFloat(num.replace(',', '.'));
        }
        if (!unit && !rp) {
            const after = l.slice(m.index + m[0].length).trimStart();
            const before = l.slice(0, m.index + m[1].length).trimEnd();
            if (QTY_AFTER.test(after) || NOT_MONEY_BEFORE.test(before)) return null;
        }
        if (!(n > 0) || !isFinite(n)) return null;
        return { amount: Math.round(n), sign: sign === '+' ? 1 : sign ? -1 : 0 };
    }

    function takeMoney(s) {
        MONEY_RE.lastIndex = 0;
        let m, first = null, extra = 0;
        while ((m = MONEY_RE.exec(s.l))) {
            const v = moneyValue(m, s.l);
            if (!v) continue;
            if (!first) first = { ...v, a: m.index + m[1].length, b: m.index + m[0].length };
            else extra++;
        }
        if (first) s.blank(first.a, first.b);
        return first ? { amount: first.amount, sign: first.sign, extra } : null;
    }

    // ========================================
    // DATES
    // ========================================
    // A date spec is resolved after we know whether this is a task (prefers the
    // future: "tgl 5" → next 5th) or a money entry (prefers the past: last 5th).
    function resolve(spec, today, preferPast) {
        if (!spec) return null;
        if (spec.t === 'fixed') return spec.date;
        if (spec.t === 'wd') {
            const t = U.weekday(today);
            const mon = (spec.wd + 6) % 7; // offset from Monday
            if (spec.mod === 'next') return U.addDays(U.addDays(U.weekStart(today), 7), mon);
            if (spec.mod === 'prev') return U.addDays(today, -(((t - spec.wd + 7) % 7) || 7));
            if (preferPast) return U.addDays(today, -((t - spec.wd + 7) % 7));
            return U.addDays(today, (spec.wd - t + 7) % 7);
        }
        // day of month (+ optional month/year)
        const [ty, tm] = today.split('-').map(Number);
        if (spec.y && spec.m) return U.makeKey(spec.y, spec.m, spec.d);
        if (spec.m) {
            let k = U.makeKey(ty, spec.m, spec.d);
            if (preferPast && k > today) k = U.makeKey(ty - 1, spec.m, spec.d);
            if (!preferPast && k < today) k = U.makeKey(ty + 1, spec.m, spec.d);
            return k;
        }
        let k = U.makeKey(ty, tm, spec.d);
        if (preferPast && k > today) { const pm = U.monthAdd(U.monthOf(today), -1).split('-').map(Number); k = U.makeKey(pm[0], pm[1], spec.d); }
        if (!preferPast && k < today) { const nm = U.monthAdd(U.monthOf(today), 1).split('-').map(Number); k = U.makeKey(nm[0], nm[1], spec.d); }
        return k;
    }

    function applyDaypart(h, dp) {
        if (!dp || dp === 'wib' || dp === 'wita' || dp === 'wit') return h;
        if (dp === 'pagi' || dp === 'subuh' || dp === 'am') return h === 12 ? 0 : h;
        if (dp === 'siang') return h < 11 ? h + 12 : h;
        if (dp === 'sore' || dp === 'pm') return h < 12 ? h + 12 : h;
        if (dp === 'malam' || dp === 'malem') return h === 12 ? 0 : (h >= 5 && h < 12 ? h + 12 : h);
        return h;
    }

    const fixed = (date) => ({ t: 'fixed', date });

    // ========================================
    // TITLE CLEANUP
    // ========================================
    const LEAD_RE = /^(?:jangan\s+lupa|jgn\s+lupa|ingetin|ingatkan|ingatin|ingat|inget|tolong|todo|to\s*do|reminder|remind\s+me\s+to|catat|catet|catetin|catatin|nyatet|note)\b[\s:,-]*/i;
    const LEAD_FILLER = /^(?:pada|pd|mulai|dan|&|[,.;:\-–+])\s*/i;
    const TRAIL_FILLER = /\s*(?:\b(?:pada|pd|di|ke|untuk|utk|buat|tanggal|tgl|hari|jam|pukul|pkl|mulai|sampai|smp|yang|yg|dan|atau|setiap|tiap|rp)\b|[,.;:\-–&+])$/i;

    function cleanTitle(t) {
        t = t.replace(/\s+/g, ' ').trim();
        let prev;
        do {
            prev = t;
            t = t.replace(LEAD_RE, '').trim();
            t = t.replace(LEAD_FILLER, '').trim();
            t = t.replace(TRAIL_FILLER, '').trim();
        } while (t !== prev);
        t = t.replace(/\s+([,.;:!?])/g, '$1').replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').trim();
        return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
    }

    // ========================================
    // PARSE ONE ENTRY
    // ========================================
    function parse(text, opts = {}) {
        const today = opts.today || U.todayKey();
        const ov = opts.override || {};
        const raw = String(text).replace(/\s/g, ' ').replace(/[’‘`]/g, "'");
        const s = new Scanner(raw);
        const low0 = s.l;

        let rep = null, spec = null, scope = null, period = null, noDate = false;
        let yearly = null, dp = null, time = null, star = false;
        let futureHint = false, pastHint = false;

        // ---- importance ----
        s.take(/(?:^|\s)!{1,3}(?=\s|$)/g, () => { star = true; });
        s.take(/!+(?=\s*$)/g, () => { star = true; });
        s.take(/\b(?:penting|urgent|urgen|prioritas|asap)\b/g, () => { star = true; });

        // ---- explicitly undated ----
        s.take(/\b(?:kapan[\s-]?kapan|kapan2|kpn[\s-]?kpn|kpn2|someday|suatu\s+(?:saat|hari)|nanti\s+(?:aja|saja|deh))\b/g, () => { noDate = true; });

        // ---- repetition ----
        const setRep = (r) => { if (!rep) rep = r; };
        const dpIn = (str) => { const m = /(pagi|siang|sore|malam|malem)\s*$/.exec(str); if (m) dp = m[1]; };
        s.take(R(String.raw`\b${EV}\s+hari\s+kerja\b|\bhari\s+kerja\b|\bweekdays?\b|\bsenin\s*(?:-|–|s\.?/?d\.?|sampai|sampe|smp|hingga)\s*jum'?at\b`),
            () => setRep({ freq: 'week', every: 1, days: [1, 2, 3, 4, 5] }));
        s.take(R(String.raw`\b${EV}\s+(?:akhir\s+pekan|akhir\s+minggu|weekend|wiken|sabtu\s*(?:-|,|&|dan)\s*minggu)\b`),
            () => setRep({ freq: 'week', every: 1, days: [6, 0] }));
        s.take(R(String.raw`\b${EV}\s+(\d+)\s+hari\b|\b(\d+)\s+hari\s+sekali\b`), (m) => {
            const n = toNum(m[1] || m[2]);
            if (!n) return false;
            setRep({ freq: 'day', every: n });
        });
        s.take(R(String.raw`\b${EV}\s+(\d+)\s+(?:minggu|pekan)\b|\b(\d+)\s+(?:minggu|pekan)\s+sekali\b`), (m) => {
            const n = toNum(m[1] || m[2]);
            if (!n) return false;
            setRep({ freq: 'week', every: n, days: null });
        });
        s.take(R(String.raw`\b${EV}\s+(\d+)\s+(?:bulan|bln)\b|\b(\d+)\s+(?:bulan|bln)\s+sekali\b`), (m) => {
            const n = toNum(m[1] || m[2]);
            if (!n) return false;
            setRep({ freq: 'month', every: n, mday: null });
        });
        const WD_ITEM = String.raw`(?:hari\s+)?(?:${WDNAMES})`;
        const WD_FIRST = String.raw`(?:hari\s+(?:${WDNAMES})|senin|selasa|rabu|kamis|jum'?at|sabtu|ahad)`;
        s.take(R(String.raw`\b${EV}\s+(${WD_FIRST}(?:\s*(?:,|&|\+|/|dan)\s*${WD_ITEM})*)${DP}\b`), (m) => {
            const days = [...m[1].matchAll(new RegExp(WDNAMES, 'g'))].map((x) => wdNum(x[0]));
            setRep({ freq: 'week', every: 1, days: [...new Set(days)] });
            if (m[2]) dp = m[2];
        });
        s.take(R(String.raw`\b${EV}\s+(?:hari|hr)${DP}\b|\b${EV}\s+(?:pagi|siang|sore|malam|malem)\b|\bsehari\s+sekali\b|\bdaily\b|\beveryday\b|\bevery\s+day\b`), (m) => {
            setRep({ freq: 'day', every: 1 });
            dpIn(m[0]);
        });
        s.take(R(String.raw`\b${EV}\s+(?:minggu|pekan|mgg)\b|\bseminggu\s+sekali\b|\bweekly\b|\bevery\s+week\b`),
            () => setRep({ freq: 'week', every: 1, days: null }));
        s.take(R(String.raw`\b${EV}\s+(?:akhir|ujung)\s+bulan\b`), () => setRep({ freq: 'month', every: 1, mday: -1 }));
        s.take(R(String.raw`\b${EV}\s+awal\s+bulan\b`), () => setRep({ freq: 'month', every: 1, mday: 1 }));
        s.take(R(String.raw`\b${EV}\s+(?:bulan\s+|bln\s+)?(?:tgl|tanggal|tg|tang|tggl)\.?\s*(\d{1,2})\b`), (m) => {
            const d = +m[1];
            if (d < 1 || d > 31) return false;
            setRep({ freq: 'month', every: 1, mday: d });
        });
        s.take(R(String.raw`\b${EV}\s+(?:bulan|bln)\b|\bsebulan\s+sekali\b|\bmonthly\b|\bevery\s+month\b`),
            () => setRep({ freq: 'month', every: 1, mday: null }));
        s.take(R(String.raw`\b${EV}\s+(?:tgl\s+|tanggal\s+)?(\d{1,2})\s+(${MONTHS})\b`), (m) => {
            const d = +m[1], mo = monthNum(m[2]);
            if (d < 1 || d > 31 || !mo) return false;
            setRep({ freq: 'year', every: 1 });
            yearly = { t: 'dom', d, m: mo };
        });
        s.take(R(String.raw`\b${EV}\s+(?:tahun|thn)\b|\bsetahun\s+sekali\b|\byearly\b|\bevery\s+year\b`),
            () => setRep({ freq: 'year', every: 1 }));

        // ---- week / month horizons (and their edges) ----
        s.take(/\b(?:akhir\s+(?:pekan|minggu)|weekend|wiken|wikend)(?:\s+(ini|depan|dpn))?\b/g, (m) => {
            const wd = U.weekday(today);
            let k = wd === 0 ? today : U.addDays(today, 6 - wd); // upcoming Saturday (Sunday counts as weekend)
            if (m[1] && m[1] !== 'ini') k = U.addDays(U.addDays(U.weekStart(today), 7), 5);
            spec = fixed(k);
        });
        s.take(/\b(?:akhir|ujung)\s+bulan(?:\s+(ini|depan|dpn))?\b/g, (m) => {
            const mk = m[1] && m[1] !== 'ini' ? U.monthAdd(U.monthOf(today), 1) : U.monthOf(today);
            spec = fixed(U.lastDayOfMonth(mk));
        });
        s.take(/\bawal\s+bulan(?:\s+(ini|depan|dpn))?\b/g, (m) => {
            const mk = m[1] === 'ini' ? U.monthOf(today) : U.monthAdd(U.monthOf(today), 1);
            spec = fixed(`${mk}-01`);
        });
        s.take(/\bawal\s+(?:minggu|pekan)(?:\s+(?:depan|dpn))?\b/g, () => { spec = fixed(U.addDays(U.weekStart(today), 7)); });
        s.take(/\b(?:minggu|pekan|mgg)\s+(?:ini|ni)\b/g, () => { scope = 'week'; period = U.weekStart(today); });
        s.take(/\b(?:minggu|pekan|mgg)\s+(?:depan|dpn)\b/g, () => { scope = 'week'; period = U.addDays(U.weekStart(today), 7); futureHint = true; });
        s.take(/\b(?:minggu|pekan)\s+(?:lalu|kemarin|kemaren|kmrn)\b/g, () => { scope = 'week'; period = U.addDays(U.weekStart(today), -7); pastHint = true; });
        s.take(/\b(?:bulan|bln)\s+(?:ini|ni)\b/g, () => { scope = 'month'; period = U.monthOf(today); });
        s.take(/\b(?:bulan|bln)\s+(?:depan|dpn)\b/g, () => { scope = 'month'; period = U.monthAdd(U.monthOf(today), 1); futureHint = true; });
        s.take(/\b(?:bulan|bln)\s+(?:lalu|kemarin|kemaren|kmrn)\b/g, () => { scope = 'month'; period = U.monthAdd(U.monthOf(today), -1); pastHint = true; });

        // ---- relative days ----
        s.take(R(String.raw`\b(?:hari\s+ini|hr\s+ini|hariini|today|sekarang|skrg|skrng|saat\s+ini)${DP}\b`), (m) => { spec = fixed(today); dp = m[1] || dp; });
        s.take(R(String.raw`\b(?:nanti|ntar|entar|nnt|ntr)${DP}\b`), (m) => { spec = spec || fixed(today); dp = m[1] || dp; futureHint = true; });
        s.take(/\b(pagi|siang|sore|malam|malem)\s+(?:ini|ni)\b/g, (m) => { spec = fixed(today); dp = m[1]; });
        s.take(R(String.raw`\b(?:tadi|td)${DP}\b`), (m) => { spec = fixed(today); dp = m[1] || dp; pastHint = true; });
        s.take(/\b(?:kemarin|kemaren|kmrn)\s+lusa\b/g, () => { spec = fixed(U.addDays(today, -2)); pastHint = true; });
        s.take(R(String.raw`\b(?:kemarin|kemaren|kmrn|kmarin|kmaren|kmren|yesterday)${DP}\b`), (m) => { spec = fixed(U.addDays(today, -1)); dp = m[1] || dp; pastHint = true; });
        s.take(R(String.raw`\blusa${DP}\b`), (m) => { spec = fixed(U.addDays(today, 2)); dp = m[1] || dp; futureHint = true; });
        s.take(R(String.raw`\b(?:besok|bsk|besuk|bsok|esok|tomorrow)${DP}\b`), (m) => { spec = fixed(U.addDays(today, 1)); dp = m[1] || dp; futureHint = true; });
        const addUnit = (n, unit) => (/hari/.test(unit) ? U.addDays(today, n)
            : /minggu|pekan/.test(unit) ? U.addDays(today, 7 * n)
                : /bulan|bln/.test(unit) ? U.addMonths(today, n) : U.addMonths(today, 12 * n));
        s.take(R(String.raw`\b${NUMW}\s*(hari|minggu|pekan|bulan|bln|tahun|thn)\s+(?:lagi|ke\s*depan|kedepan|dari\s+sekarang)\b`), (m) => {
            const n = toNum(m[1]);
            if (!n) return false;
            spec = fixed(addUnit(n, m[2]));
            futureHint = true;
        });
        s.take(R(String.raw`\b${NUMW}\s*(hari|minggu|pekan|bulan|bln)\s+(?:yang\s+lalu|yg\s+lalu|lalu|kemarin|kemaren|kmrn)\b`), (m) => {
            const n = toNum(m[1]);
            if (!n) return false;
            spec = fixed(addUnit(-n, m[2]));
            pastHint = true;
        });

        // ---- time of day ----
        const setTime = (hs, ms, part) => {
            let h = +hs;
            const mi = ms ? +ms : 0;
            if (h > 24 || mi > 59) return false;
            h = applyDaypart(h % 24, part || dp);
            time = `${U.pad(h)}:${U.pad(mi)}`;
        };
        s.take(/\b(?:jam|jm|pukul|pkl)\.?\s+setengah\s+(\d{1,2})\b/g, (m) => {
            const h = +m[1];
            if (h < 1 || h > 24) return false;
            setTime(String(h - 1), '30');
        });
        s.take(/\b(?:jam|jm|pukul|pkl)\.?\s*(\d{1,2})(?:[.:](\d{2}))?(?:an)?(?:\s*(pagi|siang|sore|malam|malem|subuh|wib|wita|wit|am|pm))?\b/g,
            (m) => setTime(m[1], m[2], m[3]));
        s.take(/(?:^|\s)(\d{1,2})[.:](\d{2})(?:\s*(pagi|siang|sore|malam|malem|wib|am|pm))?(?=\s|$|[,;!?])/g,
            (m) => setTime(m[1], m[2], m[3]));
        s.take(/\b(\d{1,2})\s*(am|pm)\b/g, (m) => setTime(m[1], null, m[2]));

        // ---- calendar dates ----
        const dom = (d, mo, y) => {
            if (d < 1 || d > 31 || (mo && (mo < 1 || mo > 12))) return false;
            if (y && y < 100) y += 2000;
            spec = { t: 'dom', d, m: mo || 0, y: y || 0 };
        };
        s.take(R(String.raw`\b(?:tgl|tanggal|tg|tang|tggl)\.?\s*(\d{1,2})(?:\s*[/.-]\s*(\d{1,2})(?:\s*[/.-]\s*(\d{2,4}))?|\s+(${MONTHS})(?:\s+(\d{4}))?)?\b`),
            (m) => dom(+m[1], m[2] ? +m[2] : m[4] ? monthNum(m[4]) : 0, m[3] ? +m[3] : m[5] ? +m[5] : 0));
        s.take(R(String.raw`\b(\d{1,2})\s+(${MONTHS})(?:\s+(\d{4}))?\b`), (m) => dom(+m[1], monthNum(m[2]), m[3] ? +m[3] : 0));
        s.take(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g, (m) => {
            if (QTY_AFTER.test(s.l.slice(m.index + m[0].length).trimStart())) return false; // "1/2 kg"
            return dom(+m[1], +m[2], m[3] ? +m[3] : 0);
        });

        // ---- weekday names ----
        s.take(R(String.raw`\b(?:hari\s+)?(${WDNAMES})(?:\s+(depan|dpn|ini|lalu|kemarin|kemaren|kmrn))?${DP}\b`), (m) => {
            const mod = /^(depan|dpn)$/.test(m[2] || '') ? 'next' : /^(lalu|kemarin|kemaren|kmrn)$/.test(m[2] || '') ? 'prev' : '';
            spec = { t: 'wd', wd: wdNum(m[1]), mod };
            if (m[3]) dp = m[3];
            if (mod === 'next') futureHint = true;
            if (mod === 'prev') pastHint = true;
        });

        // ---- money ----
        const money = takeMoney(s);

        // ---- kind ----
        const expenseVerb = EXPENSE_RE.test(low0);
        const incomeWord = INCOME_RE.test(low0);
        let kind;
        if (ov.kind) kind = ov.kind;
        else if (money) {
            const fixedFuture = spec && spec.t === 'fixed' && spec.date > today;
            const plan = !pastHint && (rep || futureHint || fixedFuture || (scope && !pastHint) || TASK_RE.test(low0));
            if (plan) kind = 'task';
            else if (money.sign > 0) kind = 'in';
            else if (money.sign < 0 || expenseVerb) kind = 'out';
            else kind = incomeWord ? 'in' : 'out';
        } else kind = 'task';

        const isTask = kind === 'task';
        let date = resolve(spec, today, !isTask);
        if (!time && dp && isTask) time = DAYPART_TIME[dp];

        // ---- title ----
        let title = cleanTitle(s.o);
        const amount = money ? money.amount : 0;
        const amountType = money && (money.sign > 0 || (incomeWord && !expenseVerb && money.sign >= 0)) ? 'in' : 'out';

        const out = {
            kind, title, amount, star,
            time: isTask ? time : null,
            date: null, scope: null, period: null, repeat: null,
            cat: null, amountType: null,
            explicitWhen: !!(spec || scope || rep || noDate),
            extraAmounts: money ? money.extra : 0,
        };

        if (isTask) {
            if (amount) {
                out.amountType = amountType;
                out.cat = ov.cat || guessCat(title || low0, amountType, opts.learned);
            }
            if (rep) {
                const r = { ...rep };
                let start = date || today;
                if (r.freq === 'year' && yearly) start = resolve(yearly, today, false);
                if (r.freq === 'week' && !r.days) r.days = [U.weekday(start)];
                if (r.freq === 'month' && !r.mday) r.mday = spec && spec.t === 'dom' ? spec.d : Number(start.slice(8, 10));
                if (start < today) start = today;
                r.start = start;
                out.repeat = r;
            } else if (ov.when) {
                Object.assign(out, { date: ov.when.date || null, scope: ov.when.scope || null, period: ov.when.period || null });
            } else if (noDate) {
                // stays undated ("kapan-kapan")
            } else if (date) {
                out.date = date;
            } else if (scope) {
                out.scope = scope;
                out.period = period;
            } else {
                const ctx = opts.ctx || { date: today };
                out.date = ctx.date || null;
                out.scope = ctx.scope || null;
                out.period = ctx.period || null;
            }
            if (!out.date && !out.repeat) out.time = null;
            if (!title) out.title = cleanTitle(raw) || 'Tugas baru';
        } else {
            out.amount = amount;
            let past = null;
            if (!date && scope && pastHint) past = scope === 'week' ? U.addDays(today, -7) : U.addMonths(today, -1);
            out.date = (ov.when && ov.when.date) || date || past || today;
            out.cat = ov.cat && CAT[ov.cat] && CAT[ov.cat].type === kind ? ov.cat : guessCat(title || low0, kind, opts.learned);
            if (!title) out.title = CAT[out.cat].name;
        }
        return out;
    }

    // ========================================
    // MANY LINES / SEGMENTS
    // ========================================
    // Pasted WhatsApp lists: "- beli galon", "1. kopi 18rb", "[x] olahraga", "✅ bayar wifi"
    const BULLET_RE = /^\s*(?:[-*•·▪◦‣–—]|\d{1,2}[.)]|\[[ xX✓✔]?\]|[☐☑✅✔✓]️?)\s+/;
    const DONE_BULLET_RE = /^\s*(?:\[[xX✓✔]\]|[☑✅✔✓]️?)\s+/;

    function splitSegments(line, opts) {
        const parts = line.split(/\s*[,;]\s*(?=[^\d\s])|\s+(?:\+|&|dan)\s+/i).filter((p) => p.trim());
        if (parts.length < 2) return null;
        const items = parts.map((p) => parse(p, opts));
        if (!items.every((it) => it.amount > 0 && it.extraAmounts === 0)) return null;
        // a date mentioned once ("kemarin bensin 30rb, parkir 2rb") applies to every part
        const dated = items.find((it) => it.explicitWhen && it.date);
        if (dated) items.forEach((it) => { if (!it.explicitWhen && it.kind !== 'task') it.date = dated.date; });
        return items;
    }

    function parseMany(text, opts = {}) {
        const lines = String(text).split(/\r?\n/).filter((l) => l.trim());
        const single = lines.length === 1;
        const out = [];
        for (let line of lines) {
            let done = false;
            while (BULLET_RE.test(line)) {
                if (DONE_BULLET_RE.test(line)) done = true;
                line = line.replace(BULLET_RE, '');
            }
            if (!line.trim()) continue;
            const lineOpts = single ? opts : { ...opts, override: {} };
            const split = single && opts.override && opts.override.kind ? null : splitSegments(line, lineOpts);
            const items = split || [parse(line, lineOpts)];
            items.forEach((it) => { if (done && it.kind === 'task') it.done = true; });
            out.push(...items);
        }
        return out;
    }

    C.parser = { parse, parseMany, guessCat, cleanTitle, CATS, CAT, DEFAULT_CAT };
})(typeof window !== 'undefined' ? window : globalThis);
