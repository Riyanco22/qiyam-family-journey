/* ==========================================================
   رحلة القيم الأسرية — منطق التطبيق
   تطبيق صفحة واحدة: توجيه بالـ hash، حالة محفوظة في المتصفح،
   أنشطة تفاعلية، تنقّل بالأسهم لأجهزة التلفاز.
   ========================================================== */
(function () {
  'use strict';
  var B = window.BOOK, R = B.responsibility, ICONS = window.ICONS || {};
  var EMBED = !!window.QIYAM_EMBED; /* داخل إطار لا يسمح بالطباعة أو التنزيل */

  /* ---------------- helpers ---------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ic(n, cls) { return '<i class="ic ' + (cls || '') + '" aria-hidden="true">' + (ICONS[n] || '') + '</i>'; }
  function brand(n) { return (window.BRANDS || {})[n] || ''; }
  var AR = '٠١٢٣٤٥٦٧٨٩';
  function ar(n) { return String(n).replace(/\d/g, function (d) { return AR[d]; }); }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function today() { try { return new Date().toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return new Date().toLocaleDateString(); } }

  /* ---------------- state ---------------- */
  var KEY = 'qiyam-app-v1';
  function fresh() {
    return {
      registered: false, familyName: '', phone: '', familyId: null,
      family: [], charter: {},
      r: { notes: {}, done: {}, monthPledge: {}, weekly: [{}, {}, {}, {}], cards: [], levels: {}, stars: {}, where: {}, flipped: {},
        agree: {}, bed: {}, habit: { text: '', days: [] }, feel: null, final: null, medal: { name: '', what: '' }, thanks: [],
        color: null, drawing: null, adultList: [{}, {}, {}, {}, {}, {}], a2: false, leader: null }
    };
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.r) {
        var f = fresh();
        for (var k in f.r) if (!(k in s.r)) s.r[k] = f.r[k];
        if (!s.family) s.family = [];
        if (!s.charter) s.charter = {};
        if (s.registered === undefined) s.registered = !!(s.familyName || (s.family && s.family.length));
        if (!s.familyName) s.familyName = '';
        if (!s.phone) s.phone = '';
        return s;
      }
    } catch (e) {}
    return fresh();
  }
  var S = load();
  var saveT;
  var syncT;
  function updateCloudSyncBadge(status) {
    var el = document.getElementById('cloud-sync-badge');
    if (!el) return;
    if (!S.registered) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'inline-flex';
    if (status === 'syncing') {
      el.className = 'cloud-sync-badge syncing';
      el.innerHTML = ic('sparkles') + ' جاري الحفظ...';
    } else if (status === 'synced') {
      el.className = 'cloud-sync-badge synced';
      el.innerHTML = ic('shield-check') + ' متزامن مع السحابة';
    } else if (status === 'offline') {
      el.className = 'cloud-sync-badge offline';
      el.innerHTML = ic('check') + ' محفوظ محلياً';
    }
  }

  function buildSyncPayload() {
    return {
      phone: S.phone,
      familyName: S.familyName,
      familyData: {
        registered: true,
        familyName: S.familyName,
        phone: S.phone,
        family: S.family,
        charter: S.charter,
        r: S.r
      }
    };
  }

  function syncCloud() {
    if (!S.registered || !S.phone) return;
    clearTimeout(syncT);
    updateCloudSyncBadge('syncing');
    syncT = setTimeout(function () {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSyncPayload())
      })
      .then(function (res) { return res.json(); })
      .then(function (res) {
        if (res && res.success) {
          updateCloudSyncBadge('synced');
        } else {
          updateCloudSyncBadge('offline');
        }
      })
      .catch(function () {
        updateCloudSyncBadge('offline');
      });
    }, 600);
  }

  window.addEventListener('beforeunload', function () {
    if (!S.registered || !S.phone) return;
    try {
      var blob = new Blob([JSON.stringify(buildSyncPayload())], { type: 'application/json' });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/sync', blob);
    } catch (e) {}
  });

  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    }, 150);
    syncCloud();
  }

  var COLORS = ['#3DB56B', '#8E6BE0', '#2FA4E7', '#F5A623', '#F0646A', '#FF7EB6', '#4FB092', '#FF8A3D'];
  var ROLES = ['الأب', 'الأم', 'الابن', 'الابنة', 'الجد', 'الجدة', 'أخرى'];
  function fam() { return S.family; }
  function famOrMe() { return S.family.length ? S.family : [{ id: 'me', name: 'أنا', role: '', color: '#3DB56B' }]; }
  function member(id) { return famOrMe().filter(function (m) { return m.id === id; })[0]; }
  function avatar(m, size) { return '<span class="avatar" style="background:' + m.color + (size ? ';width:' + size + ';height:' + size : '') + '">' + esc((m.name || '؟').trim().charAt(0)) + '</span>'; }
  function memberOpts(sel, ph) {
    return '<option value="">' + (ph || 'اختر…') + '</option>' + famOrMe().map(function (m) { return '<option value="' + m.id + '"' + (m.id === sel ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('');
  }

  /* ---------------- stages & progress ---------------- */
  var STAGES = [
    { id: 'start', name: 'البداية', sub: 'قيمة الشهر', icon: 'star', t: 'orange', goal: 'نتعرّف على القيمة ونتعاهد عليها', acts: ['mpledge', 'impact', 'read'] },
    { id: 'intabeh', name: 'انتبه', sub: 'استثارة الوعي بالقيمة', icon: 'eye', t: 'sun', goal: 'الهدف: استثارة الوعي بالقيمة', acts: ['story', 'crit1', 'draw', 'color'] },
    { id: 'ifham', name: 'افهم', sub: 'فهم القيمة ومعناها', icon: 'lightbulb', t: 'sky', goal: 'الهدف: فهم القيمة ومعناها', acts: ['ideas', 'dialog', 'marsh', 'cq0', 'cq1'] },
    { id: 'tabbeq', name: 'طبّق', sub: 'أنشطة وألعاب وتحديات', icon: 'puzzle', t: 'green', goal: 'الهدف: تحويل القيمة إلى سلوك عبر أنشطة ولعب', acts: ['agree', 'weekly', 'card', 'levels', 'leader', 'stars', 'focus', 'adultlist', 'where'] },
    { id: 'istamer', name: 'استمر', sub: 'تثبيت القيمة كعادة', icon: 'repeat', t: 'lilac', goal: 'الهدف: تثبيت القيمة كعادة عبر الوعي بالعاطفة والاختيار', acts: ['feel', 'bed', 'habit', 'thanks', 'story2', 'final', 'medal'] }
  ];
  function stageOf(id) { return STAGES.filter(function (s) { return s.id === id; })[0]; }
  function pct(st) { var d = st.acts.filter(function (a) { return S.r.done[a]; }).length; return Math.round(d * 100 / st.acts.length); }
  function totalPct() { var all = 0, d = 0; STAGES.forEach(function (s) { all += s.acts.length; d += s.acts.filter(function (a) { return S.r.done[a]; }).length; }); return Math.round(d * 100 / all); }
  function done(a, val) {
    var v = val === undefined ? true : !!val;
    if (!!S.r.done[a] === v) return;
    S.r.done[a] = v; save(); updateRings();
    if (v) { var st = STAGES.filter(function (s) { return s.acts.indexOf(a) > -1; })[0]; if (st && pct(st) === 100) { confetti(); toast('أحسنتم! أكملتم مرحلة «' + st.name + '» 🎉'); } }
  }
  function ring(p, size, label) {
    size = size || 44; var r = 18, c = 2 * Math.PI * r;
    return '<svg class="ring" width="' + size + '" height="' + size + '" viewBox="0 0 44 44" aria-hidden="true"><circle class="bg" cx="22" cy="22" r="' + r + '"/>' +
      '<circle class="fg" cx="22" cy="22" r="' + r + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - p / 100)).toFixed(1) + '" transform="rotate(-90 22 22)"/>' +
      '<text x="22" y="26" text-anchor="middle">' + (label != null ? label : ar(p) + '٪') + '</text></svg>';
  }
  function updateRings() {
    $$('[data-ring]').forEach(function (el) {
      var id = el.getAttribute('data-ring'), p = id === 'all' ? totalPct() : pct(stageOf(id));
      el.innerHTML = ring(p, +el.getAttribute('data-size') || 44);
    });
  }

  /* ---------------- UI utils ---------------- */
  var toastT;
  function toast(msg, icon) {
    var t = $('#toast'); t.innerHTML = ic(icon || 'sparkles') + '<span>' + esc(msg) + '</span>'; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }
  function confetti(n) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var box = document.createElement('div'); box.className = 'confetti'; var h = '';
    var cols = ['#FF8A3D', '#FFC83D', '#2FA4E7', '#3DB56B', '#8E6BE0', '#F0646A', '#FF7EB6'];
    for (var i = 0; i < (n || 110); i++) {
      h += '<i style="left:' + (Math.random() * 100) + '%;background:' + cols[i % cols.length] + ';--dx:' + (Math.random() * 30 - 15) + 'vw;--r:' + (Math.random() * 900 - 450) + 'deg;animation-duration:' + (2.2 + Math.random() * 1.8) + 's;animation-delay:' + (Math.random() * .4) + 's;border-radius:' + (i % 3 ? '.15rem' : '50%') + '"></i>';
    }
    box.innerHTML = h; document.body.appendChild(box); setTimeout(function () { box.remove(); }, 4600);
  }
  function printHTML(html) {
    var a = document.createElement('div'); a.className = 'print-area'; a.innerHTML = html; document.body.appendChild(a);
    document.body.classList.add('printing');
    var clean = function () { document.body.classList.remove('printing'); a.remove(); window.removeEventListener('afterprint', clean); };
    window.addEventListener('afterprint', clean); setTimeout(function () { window.print(); }, 60);
  }

  /* blocks: re-render one part of a page without losing focus */
  var BLOCKS = {};
  function block(id, fn) { BLOCKS[id] = fn; return '<div data-block="' + id + '">' + fn() + '</div>'; }
  function refresh(id) {
    var el = $('[data-block="' + id + '"]'); if (!el || !BLOCKS[id]) return;
    var a = document.activeElement, k = a && a.getAttribute && a.getAttribute('data-k');
    el.innerHTML = BLOCKS[id]();
    if (k) { var n = $('[data-k="' + k + '"]', el); if (n) n.focus({ preventScroll: true }); }
    afterBlock(el);
  }

  /* ---------------- shared fragments ---------------- */
  function noteBox(key, ph, act, rows) {
    return '<div class="field"><textarea class="textarea" rows="' + (rows || 3) + '" data-note="' + key + '"' + (act ? ' data-done="' + act + '"' : '') + ' data-k="n-' + key + '" placeholder="' + esc(ph || 'اكتبوا هنا…') + '">' + esc(S.r.notes[key] || '') + '</textarea><span class="saved-hint" data-hint="' + key + '">' + ic('check') + ' حُفظ تلقائيًا</span></div>';
  }
  function famHint() {
    return S.family.length ? '' : '<div class="card soft row" style="--c:var(--sky);--cl:var(--sky-l);--cd:var(--sky-d)">' + ic('users', '') + '<span style="flex:1;font-weight:700">أضيفوا أسماء أفراد الأسرة لتظهر هنا لكل فرد على حدة.</span><a class="btn sm" href="#/family">' + ic('user-plus') + 'أضف أسرتك</a></div>';
  }
  function bh(num, title, extra, theme) {
    return '<div class="block-head">' + (num != null ? '<span class="num">' + num + '</span>' : '') + '<h3 class="h3">' + title + '</h3>' + (extra || '') + '</div>';
  }
  function journeySVG() {
    var stops = [[40, 270, '#FF8A3D'], [95, 232, '#F5A623'], [150, 248, '#2FA4E7'], [200, 262, '#3DB56B'], [250, 232, '#8E6BE0'], [300, 185, '#F0646A'], [350, 152, '#FF7EB6'], [398, 168, '#FFC83D'], [440, 203, '#4FB092'], [490, 214, '#2FA4E7'], [530, 182, '#8E6BE0'], [553, 138, '#F0646A']];
    var d = 'M40 270 C 120 200, 160 300, 240 240 S 360 120, 420 190 S 540 230, 560 90';
    var g = stops.map(function (s, i) {
      return '<g class="stop" style="animation-delay:' + (0.2 + i * 0.08) + 's"><circle cx="' + s[0] + '" cy="' + s[1] + '" r="' + (i ? 13 : 17) + '" fill="' + s[2] + '"/><text x="' + s[0] + '" y="' + (s[1] + 5) + '" fill="#fff" font-family="Tajawal" font-weight="800" font-size="14" text-anchor="middle">' + ar(i + 1) + '</text></g>';
    }).join('');
    return '<svg viewBox="0 0 600 330" role="img" aria-label="مسار الرحلة عبر ١٢ قيمة">' +
      '<path d="' + d + '" fill="none" stroke="#fff" stroke-width="30" stroke-linecap="round"/>' +
      '<path d="' + d + '" fill="none" stroke="#BFE8CC" stroke-width="30" stroke-linecap="round" opacity=".6"/>' +
      '<path class="road" d="' + d + '" fill="none" stroke="#fff" stroke-width="3.5" stroke-dasharray="10 12" stroke-linecap="round"/>' +
      '<g class="float" transform="translate(470 18)"><path d="M18 62 L70 18 L122 62 V128 H18 Z" fill="#FF8A3D"/><path d="M8 66 L70 10 L132 66" fill="none" stroke="#C0531A" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><rect x="56" y="86" width="28" height="42" rx="6" fill="#FFF0E2"/><rect x="30" y="76" width="18" height="18" rx="4" fill="#FFF5D9"/><rect x="92" y="76" width="18" height="18" rx="4" fill="#FFF5D9"/><path class="beat" d="M70 46 c-6 -9 -20 -4 -14 6 l14 12 l14 -12 c6 -10 -8 -15 -14 -6z" fill="#fff"/></g>' +
      g +
      '<g class="fam" transform="translate(60 120)"><circle cx="20" cy="18" r="15" fill="#3DB56B"/><rect x="2" y="38" width="36" height="58" rx="18" fill="#3DB56B"/><circle cx="64" cy="22" r="14" fill="#8E6BE0"/><rect x="47" y="40" width="34" height="56" rx="17" fill="#8E6BE0"/><circle cx="102" cy="44" r="10" fill="#2FA4E7"/><rect x="90" y="58" width="24" height="38" rx="12" fill="#2FA4E7"/><circle cx="134" cy="50" r="9" fill="#F5A623"/><rect x="123" y="62" width="22" height="34" rx="11" fill="#F5A623"/></g>' +
      '<path class="twinkle" d="M300 40 l5 12 l13 1 l-10 8 l3 13 l-11 -7 l-11 7 l3 -13 l-10 -8 l13 -1z" fill="#FFC83D"/>' +
      '<circle cx="230" cy="70" r="6" fill="#FF7EB6"/><circle cx="380" cy="60" r="4" fill="#FF7EB6"/><circle cx="420" cy="110" r="5" fill="#2FA4E7" opacity=".7"/><circle cx="190" cy="40" r="4" fill="#2FA4E7" opacity=".7"/></svg>';
  }
  function houseSVG() {
    return '<svg viewBox="0 0 400 300" aria-hidden="true"><circle cx="200" cy="160" r="130" fill="#fff" opacity=".18"/><circle cx="200" cy="160" r="95" fill="#fff" opacity=".22"/><path d="M120 170 L200 102 L280 170 V250 H120 Z" fill="#fff"/><path d="M104 176 L200 90 L296 176" fill="none" stroke="#FFE39A" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><rect x="182" y="198" width="36" height="52" rx="8" fill="#FF8A3D"/><rect x="140" y="186" width="26" height="26" rx="5" fill="#FFD6B5"/><rect x="234" y="186" width="26" height="26" rx="5" fill="#FFD6B5"/><path class="beat" d="M200 156 c-8 -12 -26 -5 -18 8 l18 16 l18 -16 c8 -13 -10 -20 -18 -8z" fill="#F0646A"/><g fill="#FFE39A"><path d="M60 70 l4 10 l11 1 l-8 7 l3 11 l-10 -6 l-10 6 l3 -11 l-8 -7 l11 -1z"/><path d="M340 50 l3 8 l9 1 l-7 5 l2 9 l-7 -5 l-8 5 l2 -9 l-7 -5 l9 -1z"/></g></svg>';
  }

  /* =========================================================
     VIEWS & ONBOARDING GATE
     ========================================================= */
  function normalizeSaudiPhone(raw) {
    if (!raw) return null;
    var p = String(raw).replace(/[\s\-\(\)]/g, '').trim();
    if (/^(\+?966|00966)5\d{8}$/.test(p)) return '05' + p.slice(-8);
    if (/^05\d{8}$/.test(p)) return p;
    if (/^5\d{8}$/.test(p)) return '0' + p;
    return null;
  }

  function gateFormHtml(banner) {
    return '<div class="gate-card reveal" id="gate-section">' +
      '<div class="center">' +
        '<span class="gate-badge">' + ic('sparkles') + 'انضمام الأسرة للرحلة</span>' +
        '<h2 class="h2" style="margin-bottom:.4rem">تسجيل الأسرة لبدء الرحلة</h2>' +
        '<p class="muted" style="margin-bottom:1.6rem">' + (banner || 'سجّلوا اسم العائلة ورقم الجوال لتفعيل مسار القيم والتحديات الأسبوعية.') + '</p>' +
      '</div>' +
      '<form id="gate-form" class="stack" style="--gap:1.2rem" onsubmit="return false">' +
        '<div class="field">' +
          '<label for="gate-name" style="font-weight:700">اسم العائلة <span style="color:var(--orange)">*</span></label>' +
          '<input type="text" id="gate-name" class="input" placeholder="مثال: عائلة أحمد / آل كليب" maxlength="50" autocomplete="off" value="' + esc(S.familyName || '') + '">' +
          '<div id="gate-name-err" class="form-err">يرجى إدخال اسم العائلة (حرفين على الأقل).</div>' +
        '</div>' +
        '<div class="field">' +
          '<label for="gate-phone" style="font-weight:700">رقم هاتف سعودي <span style="color:var(--orange)">*</span></label>' +
          '<div class="phone-field-wrap">' +
            '<div class="phone-flag">🇸🇦 +966</div>' +
            '<input type="tel" id="gate-phone" placeholder="05XXXXXXXX" dir="ltr" maxlength="14" autocomplete="tel" value="' + esc(S.phone || '') + '">' +
          '</div>' +
          '<div id="gate-phone-err" class="form-err">يرجى إدخال رقم جوال سعودي يبدأ بـ 05 ويتكون من 10 أرقام.</div>' +
        '</div>' +
        '<button type="button" class="btn lg t-orange center" data-act="submit-gate" style="width:100%;margin-top:.4rem">' +
          ic('rocket') + '<span>بدء الرحلة الآن</span>' +
        '</button>' +
        '<p class="small muted center" style="margin-top:.3rem">' + ic('shield-check') + ' تُحفظ بياناتكم بأمان لتوثيق مسار الأسرة وإنجازاتها.</p>' +
      '</form>' +
    '</div>';
  }

  function viewHome() {
    var tp = totalPct();
    var familyCard = S.registered
      ? (S.family.length
          ? '<div class="card plain row between reveal" style="gap:1.4rem"><div class="row" style="gap:1rem"><span data-ring="all" data-size="84">' + ring(tp, 84) + '</span><div><div class="h3">تقدّم ' + esc(S.familyName ? '«' + S.familyName + '»' : 'أسرتكم') + ' في قيمة المسؤولية</div><div class="row small" style="gap:.4rem;margin-top:.3rem">' + S.family.map(function (m) { return avatar(m, '2rem'); }).join('') + '</div></div></div><a class="btn t-orange" href="#/v/responsibility/' + nextStage() + '">' + ic('play') + 'أكملوا الرحلة</a></div>'
          : '<div class="card plain row between reveal" style="gap:1.4rem"><div class="row" style="gap:1rem"><span class="badge t-sky">' + ic('users') + '</span><div><div class="h3">أضيفوا أسماء أفراد الأسرة</div><p class="muted">لتظهر أسماؤهم في لوحة النجوم وتحديات المسؤولية.</p></div></div><a class="btn t-sky" href="#/family">' + ic('user-plus') + 'أضف أفراد الأسرة</a></div>')
      : gateFormHtml();

    var heroCta = S.registered
      ? '<a class="btn lg t-orange" href="#/v/responsibility">' + ic('rocket') + 'ابدأ رحلة المسؤولية</a><a class="btn lg ghost" href="#/about">' + ic('book-open') + 'عن الرحلة</a>'
      : '<a class="btn lg t-orange" href="#gate-section">' + ic('rocket') + 'سجّل أسرتك وابدأ الرحلة</a><a class="btn lg ghost" href="#/about">' + ic('book-open') + 'عن الرحلة</a>';

    return '' +
      '<section class="hero"><div class="wrap hero-grid">' +
        '<div class="reveal">' +
          '<div class="hero-pills"><span class="chip white">' + ic('sparkles') + '١٢ قيمة</span><span class="chip white t-orange">' + ic('calendar') + '١٢ شهرًا</span><span class="chip white t-lilac">' + ic('heart') + 'أسرة واحدة</span></div>' +
          '<h1 class="hero-title" style="margin-top:1rem"><span class="a">رحلة</span><span class="b">القيم الأسرية</span></h1>' +
          '<p class="lead">' + esc(B.intro.hook) + ' رحلة سنوية تفاعلية تعيشها الأسرة قيمةً بعد قيمة: ننتبه، نفهم، نطبّق، ثم نستمر.</p>' +
          '<div class="hero-cta">' + heroCta + '</div>' +
          '<div class="hero-by">إعداد: <b>' + esc(B.author) + '</b></div>' +
        '</div>' +
        '<div class="hero-art">' + journeySVG() + '</div>' +
      '</div></section>' +

      '<section class="section tight"><div class="wrap stack" style="--gap:1.4rem">' +
        '<div class="stats reveal"><div class="stat t-green"><b>١٢</b><span>قيمة أسرية</span></div><div class="stat t-orange"><b>١٢</b><span>شهرًا من الرحلة</span></div><div class="stat t-sky"><b>٣</b><span>مستويات للنمو</span></div><div class="stat t-lilac"><b>٤</b><span>مراحل لكل قيمة</span></div></div>' +
        familyCard +
      '</div></section>' +

      '<section class="section" id="journey"><div class="wrap">' +
        '<div class="sec-head center reveal"><span class="kicker t-green">' + ic('route') + 'خريطة الرحلة</span><h2 class="h2">من الذات… <em>إلى الرسالة</em></h2><p class="muted lead">ثلاثة مستويات، في كل مستوى أربع قيم، قيمة لكل شهر.</p></div>' +
        valuesMap() +
      '</div></section>' +

      '<section class="section" style="background:linear-gradient(180deg,transparent,var(--lilac-l) 30%,transparent)"><div class="wrap">' +
        '<div class="sec-head center reveal"><span class="kicker t-lilac">' + ic('lightbulb') + 'كيف تسير كل قيمة؟</span><h2 class="h2 t-lilac">أربع خطوات <em>تصنع عادة</em></h2></div>' +
        stagesFlow(true) +
        '<p class="big-quote center reveal" style="margin-top:2rem">' + esc(B.intro.close) + '</p>' +
      '</div></section>' +

      '<section class="section"><div class="wrap">' +
        '<div class="sec-head center reveal"><h2 class="h2">شركاء الرحلة</h2></div>' + partners() +
      '</div></section>';
  }
  function nextStage() { for (var i = 0; i < STAGES.length; i++) if (pct(STAGES[i]) < 100) return STAGES[i].id; return 'istamer'; }
  function valuesMap() {
    return '<div class="levels">' + B.levels.map(function (L) {
      return '<div class="level t-' + L.t + ' reveal"><div class="level-n">' + ar(L.n) + '<small>المستوى</small></div><div class="level-body">' +
        '<h3 class="h3">' + esc(L.name) + '</h3><p class="muted small">' + esc(L.desc) + '</p>' +
        '<div class="vtiles">' + B.values.filter(function (v) { return v.level === L.n; }).map(function (v) {
          if (v.open) {
            if (!S.registered) {
              return '<a class="vtile open" href="#gate-section"><span class="n">القيمة ' + ar(v.n) + ' · محرم</span><span class="t">' + esc(v.name) + '</span><span class="state">' + ic('lock') + 'سجّل الأسرة للبدء</span></a>';
            }
            return '<a class="vtile open" href="#/v/' + v.id + '"><span class="n">القيمة ' + ar(v.n) + ' · محرم</span><span class="t">' + esc(v.name) + '</span><span class="state">' + ic('play') + 'ابدأ الآن · ' + ar(totalPct()) + '٪</span></a>';
          }
          return '<div class="vtile" tabindex="0" aria-disabled="true" aria-label="القيمة ' + ar(v.n) + ': ' + esc(v.name) + ' — قريبًا"><span class="lock">' + ic('lock') + '</span><span class="n">القيمة ' + ar(v.n) + '</span><span class="t">' + esc(v.name) + '</span><span class="state">' + ic('clock') + 'قريبًا</span></div>';
        }).join('') + '</div>' +
        '<p class="level-q">' + esc(L.quote) + '</p></div></div>';
    }).join('') + '</div>';
  }
  function stagesFlow(link) {
    var subs = ['نوقظ الوعي بالقيمة', 'نفهم معناها بوضوح', 'نمارسها بأنشطة وتحديات', 'نثبتها كعادة يومية'];
    return '<div class="flow">' + STAGES.slice(1).map(function (s, i) {
      var tag = link ? 'a' : 'div';
      return '<' + tag + ' class="flow-item t-' + s.t + ' reveal"' + (link ? ' href="#/v/responsibility/' + s.id + '"' : '') + '>' + ic(s.icon) + '<b>' + s.name + '</b><span>' + subs[i] + '</span></' + tag + '>';
    }).join('') + '</div>';
  }
  function partners() {
    return '<div class="partners reveal"><img src="assets/img/soadaa.png" alt="جمعية سعداء للتنمية الأسرية" loading="lazy"><span class="sep"></span><img src="assets/img/fund.png" alt="صندوق دعم الجمعيات" loading="lazy"><span class="sep"></span><img src="assets/img/jomaih.svg" alt="الجميح الخيرية" loading="lazy"></div>';
  }

  /* ---------- ABOUT ---------- */
  function viewAbout() {
    var I = B.intro, P = B.philosophy;
    return '<section class="section"><div class="wrap stack" style="--gap:2.2rem">' +
      '<div class="sec-head reveal"><span class="kicker">' + ic('sprout') + 'قبل أن نبدأ</span><h1 class="h1">مقدمة</h1><p class="big-quote" style="color:var(--green)">' + esc(I.hook) + '</p></div>' +
      '<div class="card reveal" style="font-size:1.12rem"><p>' + esc(I.p1[0]) + '</p><p>' + esc(I.p1[1]) + '</p><div class="divider"></div><p>' + esc(I.p2[0]) + '</p><p><b style="color:var(--green-d)">' + esc(I.p2[1]) + '</b></p></div>' +
      '<div class="grid g3">' + I.trio.map(function (t) { return '<div class="card fill t-' + t.t + ' center reveal">' + ic(t.icon, '') + '<p style="font-weight:800;margin-top:.5rem">' + esc(t.a) + '</p><p class="display" style="color:#fff;font-size:1.8rem">' + esc(t.b) + '</p></div>'; }).join('') + '</div>' +
      '<div class="reveal"><p class="lead">' + esc(I.journey) + '</p></div>' +
      stagesFlow(false) +
      '<div class="card fill center reveal"><p class="big-quote" style="color:#fff">' + esc(I.close) + '</p></div>' +
    '</div></section>' +
    '<section class="section t-lilac" style="background:var(--lilac-l)"><div class="wrap stack" style="--gap:1.8rem">' +
      '<div class="sec-head reveal"><span class="kicker">' + ic('lightbulb') + 'كيف نستخدم الكتاب؟</span><h2 class="h2">فلسفة هذا الكتاب</h2></div>' +
      '<div class="card reveal"><p class="big-quote">' + esc(P.lead) + '</p><p class="lead">' + esc(P.sub) + '</p><p style="margin-top:.6rem">' + esc(P.how) + '</p></div>' +
      '<div class="h3 reveal">' + ic('sparkles') + 'أدوات تعزز التفكير وتنمّي السلوك</div>' +
      '<div class="grid g3">' + P.tools.map(function (t) { return '<div class="card row reveal" style="gap:.8rem"><span class="badge sm">' + ic(t.icon) + '</span><b style="flex:1">' + esc(t.t) + '</b></div>'; }).join('') + '</div>' +
      '<p class="card soft reveal" style="font-weight:700;background:#fff">' + ic('smile') + ' ' + esc(P.simple) + '</p>' +
      '<div class="stack" style="--gap:.7rem">' + P.make.map(function (m) { return '<div class="card fill reveal" style="padding:1rem 1.4rem;font-size:1.15rem;font-weight:700">' + esc(m[0]) + ' <b style="color:var(--sun-x)">' + esc(m[1]) + '</b></div>'; }).join('') + '</div>' +
    '</div></section>' +
    '<section class="section"><div class="wrap"><div class="sec-head center reveal"><h2 class="h2">مستويات <em>الرحلة الثلاثة</em></h2></div>' + valuesMap() +
    '<div class="center" style="margin-top:2rem"><a class="btn lg t-orange" href="#/v/responsibility">' + ic('rocket') + 'ابدأ بالقيمة الأولى: المسؤولية</a></div></div></section>';
  }

  /* ---------- CHARTER ---------- */
  function viewCharter() {
    var C = B.charter;
    return '<section class="section"><div class="wrap stack" style="--gap:2rem">' +
      '<div class="sec-head reveal"><span class="kicker">' + ic('scroll-text') + 'نتعاهد معًا</span><h1 class="h1">ميثاق الأسرة <em>القيمي</em></h1></div>' +
      '<div class="card soft reveal" style="font-size:1.12rem"><p><b style="color:var(--green-d)">' + esc(C.intro[0]) + '</b></p><p>' + esc(C.intro[1]) + '</p><p>' + esc(C.intro[2]) + '</p></div>' +
      '<div class="grid g2">' + C.groups.map(function (g) {
        return '<div class="ch t-' + g.theme + ' reveal"><div class="ch-h">' + ic(g.icon) + '<small>' + g.k + '</small>' + esc(g.t) + '</div><ul class="dots">' + g.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul></div>';
      }).join('') + '</div>' +
      '<div class="reveal"><div class="sec-head"><h2 class="h2">مساحة توقيع <em>أفراد الأسرة</em></h2><p class="muted">يختار كل فرد قيمة يتعهد أن يركز عليها هذا الشهر، ثم يوقّع.</p></div>' + famHint() + block('charterSign', charterSign) + '</div>' +
      '<div class="card fill center reveal t-orange"><p class="muted" style="color:#fff;opacity:.9;font-weight:700">نذكّر أنفسنا دائمًا:</p><p class="h2" style="color:#fff">' + esc(C.remind[0]) + ' <span style="color:var(--sun-x)">' + esc(C.remind[1]) + '</span></p></div>' +
    '</div></section>';
  }
  function charterSign() {
    return '<div class="grid g2" style="margin-top:1rem">' + famOrMe().map(function (m) {
      var p = S.charter[m.id] || {};
      return '<div class="member">' + avatar(m) + '<div class="grow"><b>' + esc(m.name) + '</b>' +
        (p.d ? '<div class="row" style="gap:.5rem;margin-top:.3rem"><span class="chip">' + esc(p.v) + '</span><span class="sign-stamp">' + ic('badge-check') + 'وقّع · ' + esc(p.d) + '</span></div>'
             : '<div class="row" style="gap:.5rem;margin-top:.4rem;flex-wrap:nowrap"><select class="select" style="min-height:2.4rem;padding:.3rem .7rem" data-k="pv-' + m.id + '" aria-label="القيمة التي أتعهد بها"><option value="">القيمة التي أتعهد بها…</option>' + B.values.map(function (v) { return '<option>' + esc(v.name) + '</option>'; }).join('') + '</select><button class="btn sm" data-act="charter-sign" data-id="' + m.id + '" data-k="cs-' + m.id + '">' + ic('signature') + 'أوقّع</button></div>') +
        '</div>' + (p.d ? '<button class="icon-btn" data-act="charter-unsign" data-id="' + m.id + '" aria-label="إلغاء التوقيع" data-k="cu-' + m.id + '">' + ic('rotate-ccw') + '</button>' : '') + '</div>';
    }).join('') + '</div>';
  }

  /* ---------- FAMILY ---------- */
  function viewFamily() {
    return '<section class="section"><div class="wrap stack" style="--gap:2rem">' +
      '<div class="sec-head reveal"><span class="kicker t-sky">' + ic('users') + 'أسرتي</span><h1 class="h1 t-sky">أفراد <em>الرحلة</em></h1><p class="muted lead">أضيفوا أسماء أفراد الأسرة. تُحفظ البيانات على هذا الجهاز فقط ولا تُرسل لأي جهة.</p></div>' +
      '<div class="grid g2 t-sky" style="align-items:start">' +
        '<form class="card stack" data-form="fam-add" style="--gap:.9rem"><div class="h3">' + ic('user-plus') + 'إضافة فرد</div>' +
          '<div class="field"><label for="fam-name">الاسم</label><input class="input" id="fam-name" name="name" required maxlength="30" placeholder="مثال: سارة" data-k="fam-name"></div>' +
          '<div class="field"><label for="fam-role">الصفة</label><select class="select" id="fam-role" name="role" data-k="fam-role">' + ROLES.map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select></div>' +
          '<button class="btn" type="submit" data-k="fam-submit">' + ic('plus') + 'أضف إلى الأسرة</button></form>' +
        block('famList', famList) +
      '</div>' +
      block('famBoard', famBoard) +
      '<div class="card plain stack reveal" style="--gap:.8rem"><div class="h3">' + ic('database') + 'بياناتكم</div><p class="muted">احفظوا نسخة من تقدّم الأسرة لنقلها إلى جهاز آخر، أو ابدؤوا من جديد.</p>' +
        '<div class="row">' + (EMBED ? '' : '<button class="btn sm ghost" data-act="export">' + ic('download') + 'تصدير نسخة</button>') + '<label class="btn sm ghost" style="cursor:pointer">' + ic('upload') + 'استيراد نسخة<input type="file" accept="application/json" data-act-change="import" hidden></label><button class="btn sm t-coral" data-act="reset">' + ic('trash-2') + '<span>مسح كل البيانات</span></button></div></div>' +
    '</div></section>';
  }
  function famList() {
    if (!S.family.length) return '<div class="empty">' + ic('users') + '<p style="margin-top:.5rem;font-weight:700">لم تُضف أسماء بعد</p><div class="row" style="justify-content:center;margin-top:.8rem">' + ['الأب', 'الأم', 'الابن', 'الابنة'].map(function (r) { return '<button class="btn sm ghost" data-act="fam-quick" data-role="' + r + '">' + ic('plus') + r + '</button>'; }).join('') + '</div></div>';
    return '<div class="stack" style="--gap:.6rem">' + S.family.map(function (m) {
      return '<div class="member">' + avatar(m) + '<div class="grow"><b>' + esc(m.name) + '</b><small>' + esc(m.role) + '</small></div><button class="icon-btn" data-act="fam-del" data-id="' + m.id + '" aria-label="حذف ' + esc(m.name) + '" data-k="fd-' + m.id + '">' + ic('x') + '</button></div>';
    }).join('') + '</div>';
  }
  function famBoard() {
    if (!S.family.length) return '';
    return '<div class="reveal in"><div class="sec-head"><h2 class="h2">لوحة <em>الإنجاز</em></h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>الفرد</th><th>النجوم</th><th>مستوى المسؤولية</th><th>ميثاق الأسرة</th><th>ميثاق الشهر</th></tr></thead><tbody>' +
      S.family.map(function (m) {
        var st = S.r.stars[m.id] || 0, lv = S.r.levels[m.id];
        return '<tr><td><span class="who">' + avatar(m) + esc(m.name) + '</span></td><td><b style="color:var(--sun-d)">' + ar(st) + '</b> / ١٠ ' + ic('star', '') + '</td><td>' + (lv ? 'المستوى ' + ar(lv) : '—') + '</td><td>' + (S.charter[m.id] ? '<span class="sign-stamp">' + ic('check') + esc(S.charter[m.id].v) + '</span>' : '—') + '</td><td>' + (S.r.monthPledge[m.id] ? '<span class="sign-stamp">' + ic('check') + 'وقّع</span>' : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  /* ---------- VALUE PAGE ---------- */
  function viewValue(stage, sub) {
    var st = stageOf(stage) || STAGES[0];
    return '<div class="v-hero"><div class="wrap"><div>' +
        '<span class="month">' + esc(R.month) + ' | ' + esc(R.hijri) + '</span>' +
        '<p class="lvl" style="margin-top:.8rem">' + esc(R.level) + '</p>' +
        '<h1>المسؤولية</h1><p class="motto">"' + esc(R.motto) + '"</p>' +
        '<div class="row" style="margin-top:1rem;gap:.8rem"><span data-ring="all" data-size="64" style="background:rgba(255,255,255,.95);border-radius:50%;padding:.2rem" class="t-orange">' + ring(totalPct(), 64) + '</span><b>تقدّم الأسرة في رحلة هذا الشهر</b></div>' +
      '</div><div class="art">' + houseSVG() + '</div></div></div>' +
      '<nav class="stage-nav" aria-label="مراحل القيمة"><div class="wrap"><div class="stage-tabs" role="tablist">' + STAGES.map(function (s) {
        return '<a class="stage-tab t-' + s.t + '" role="tab" href="#/v/responsibility/' + s.id + '" aria-current="' + (s.id === st.id) + '"><span data-ring="' + s.id + '" data-size="40">' + ring(pct(s), 40) + '</span><span style="min-width:0"><b>' + s.name + '</b><small>' + s.sub + '</small></span></a>';
      }).join('') + '</div></div></nav>' +
      '<section class="section tight t-' + st.t + '" id="stage"><div class="wrap">' + ({ start: stStart, intabeh: stIntabeh, ifham: stIfham, tabbeq: stTabbeq, istamer: stIstamer }[st.id])(sub) + nextBar(st.id) + '</div></section>';
  }
  function stageHead(st) {
    return '<div class="stage-head reveal"><div class="big">' + ic(st.icon) + '</div><div><div class="nm">' + st.name + '</div><div class="goal">' + st.goal + '</div></div></div>';
  }
  function nextBar(id) {
    var i = STAGES.map(function (s) { return s.id; }).indexOf(id), p = STAGES[i - 1], n = STAGES[i + 1];
    return '<div class="next-bar">' + (p ? '<a class="btn ghost t-' + p.t + '" href="#/v/responsibility/' + p.id + '">' + ic('arrow-right') + 'السابق: ' + p.name + '</a>' : '<span></span>') +
      (n ? '<a class="btn t-' + n.t + '" href="#/v/responsibility/' + n.id + '">التالي: ' + n.name + ic('arrow-left') + '</a>' : '<a class="btn t-lilac" href="#/">' + ic('house') + 'العودة للرئيسية</a>') + '</div>';
  }

  /* ----- stage: start ----- */
  function stStart() {
    return '<div class="stack" style="--gap:1.6rem">' +
      '<div class="sec-head reveal"><span class="kicker">' + ic('star') + 'قيمة الشهر: المسؤولية</span><h2 class="h1">"كلُّنا شركاء <em>في البيت</em>"</h2></div>' +
      '<div class="grid g2">' +
        '<div class="card center reveal"><div class="h4 row" style="justify-content:center;gap:.5rem"><span class="badge sm">' + ic('book-open') + '</span>آية القيمة</div><p class="quran" style="margin:.6rem 0">' + esc(R.ayah) + '</p><p class="src">' + esc(R.ayahSrc) + '</p></div>' +
        '<div class="card center reveal"><div class="h4 row" style="justify-content:center;gap:.5rem"><span class="badge sm">' + ic('moon-star') + '</span>حديث القيمة</div><p class="hadith" style="margin:.8rem 0">' + esc(R.hadith) + '</p><p class="src">' + esc(R.hadithSrc) + '</p></div>' +
      '</div>' +
      '<div class="card fill center reveal"><p class="big-quote" style="color:#fff">' + esc(R.meaning[0]) + '<br>' + esc(R.meaning[1]) + '</p></div>' +
      '<div class="name-box reveal"><div class="center" style="font-weight:800;color:var(--green-d);font-size:.9rem">' + ic('leaf', '') + '<br>اسم الله<br>المرتبط بالقيمة</div><div class="nm">' + esc(R.name.t) + '</div><div><p>' + esc(R.name.l1) + '</p><p><b>' + esc(R.name.l2) + '</b></p></div></div>' +
      '<div class="block reveal" id="mpledge">' + bh(null, ic('handshake') + 'ميثاق المسؤولية العائلية') + '<p class="lead">' + esc(R.pledge[0]) + ' ' + esc(R.pledge[1]) + '</p>' + famHint() + block('mpledge', mPledge) + '</div>' +
      '<div class="card fill center reveal" style="padding:1rem"><b style="font-size:1.15rem">' + esc(R.houseRule) + '</b></div>' +
      '<div class="grid g2">' +
        '<div class="card reveal"><div class="h3">' + ic('target') + 'القيمة التي سنعمل عليها</div><p style="font-size:1.15rem;margin-top:.6rem"><b style="color:var(--cd)">المسؤولية</b> — ' + esc(R.def) + '</p></div>' +
        '<div class="card reveal"><div class="h3">' + ic('pen-line') + 'مساحة للكتابة</div><p class="muted" style="margin:.4rem 0">' + esc(R.writeQ) + '</p>' + noteBox('impact', 'اكتبوا معًا…', 'impact') + '</div>' +
      '</div>' +
      '<div class="card soft center reveal"><div class="h3" style="justify-content:center">' + ic('sparkles') + 'كلمة تحفيزية للشهر</div><p style="margin-top:.4rem">' + esc(R.motivation.a) + '</p><p class="h2">' + esc(R.motivation.b) + '</p></div>' +
      '<div class="card fill row between t-green reveal" style="gap:1rem"><div class="row" style="gap:1rem"><span class="badge" style="background:rgba(255,255,255,.22);box-shadow:none">' + ic('rocket') + '</span><div><div class="display" style="color:#fff;font-size:1.7rem">جاهز للانطلاق</div><b>انتقل الآن إلى مرحلة «انتبه» لبدء أول خطوة من الرحلة.</b></div></div><a class="btn ghost" href="#/v/responsibility/intabeh" data-act="mark" data-a="read">' + ic('play') + 'انطلق</a></div>' +
    '</div>';
  }
  function mPledge() {
    return '<div class="grid g2" style="margin-top:1rem">' + famOrMe().map(function (m) {
      var p = S.r.monthPledge[m.id];
      return '<div class="member">' + avatar(m) + '<div class="grow"><b>' + esc(m.name) + '</b>' +
        (p ? '<div style="margin-top:.2rem">' + esc(p.t) + '</div><span class="sign-stamp" style="margin-top:.3rem">' + ic('badge-check') + 'وقّع · ' + esc(p.d) + '</span>'
           : '<div class="row" style="gap:.5rem;margin-top:.4rem;flex-wrap:nowrap"><input class="input" style="min-height:2.4rem;padding:.3rem .8rem" data-k="mp-' + m.id + '" placeholder="مسؤولية أختار الالتزام بها…" maxlength="60"><button class="btn sm" data-act="mp-sign" data-id="' + m.id + '" data-k="mps-' + m.id + '">' + ic('signature') + 'أوقّع</button></div>') +
        '</div>' + (p ? '<button class="icon-btn" data-act="mp-unsign" data-id="' + m.id + '" aria-label="تعديل" data-k="mpu-' + m.id + '">' + ic('rotate-ccw') + '</button>' : '') + '</div>';
    }).join('') + '</div>';
  }

  /* ----- stage: انتبه ----- */
  function stIntabeh() {
    var st = stageOf('intabeh');
    return stageHead(st) + '<div class="stack" style="--gap:1.6rem">' +
      block('story', storyBlock) +
      '<div class="card reveal block">' + bh(null, '<span class="badge sm t-sky">' + ic('brain') + '</span>تفكير ناقد') + '<p class="lead" style="margin-bottom:.8rem">' + esc(R.critical1) + '</p>' + noteBox('crit1', 'ما رأيكم؟', 'crit1') + '</div>' +
      '<div class="card reveal block">' + bh(null, '<span class="badge sm" style="background:var(--pink);box-shadow:0 3px 0 #C9457F">' + ic('palette') + '</span>تفكير إبداعي') + '<p style="margin-bottom:.8rem">' + esc(R.creative1) + '</p>' + drawBlock() + '</div>' +
      '<div class="card reveal block">' + bh(null, ic('palette') + esc(R.creative2)) + block('colorPick', colorPick) + '<div style="margin-top:.8rem">' + noteBox('colorWhy', 'لماذا اخترت هذا اللون؟', 'color', 2) + '</div></div>' +
    '</div>';
  }
  var storyStep = -1, storyAnim = -1;
  function storyBlock() {
    if (storyStep === -1 && S.r.storyStep != null) storyStep = S.r.storyStep;
    var shown = S.r.done.story ? R.story.length : storyStep + 1;
    return '<div class="story reveal in"><span class="kicker story-tag">' + ic('book-marked') + 'قصة قصيرة</span>' +
      (shown ? '' : '<p class="muted" style="font-size:1.1rem">قصة من صباح يوم جمعة في بيت يشبه بيوتنا… اقرؤوها معًا سطرًا سطرًا.</p>') +
      R.story.slice(0, shown).map(function (l, i) {
        var on = i === storyAnim ? '' : ' on';
        if (l.big) return '<p class="line big-quote' + on + '" style="margin-top:.6rem">' + esc(l.who) + '<br>' + esc(l.say) + '</p>';
        return '<p class="line' + on + '" style="font-size:1.12rem">' + (l.t ? esc(l.t) : esc(l.who) + ' <span class="say bubble">' + esc(l.say) + '</span>') + '</p>';
      }).join('') +
      (shown < R.story.length ? '<div style="margin-top:1rem"><button class="btn" data-act="story" data-k="story-btn">' + ic(shown ? 'chevron-left' : 'play') + (shown ? 'ماذا حدث بعد ذلك؟' : 'اقرؤوا القصة معًا') + '</button></div>'
        : '<div class="row" style="margin-top:1rem"><span class="chip">' + ic('check') + 'قرأتم القصة</span><button class="btn sm ghost" data-act="story-replay" data-k="story-re">' + ic('rotate-ccw') + 'إعادة</button></div>') + '</div>';
  }
  var PEN = ['#1E3A32', '#FF8A3D', '#F5A623', '#3DB56B', '#2FA4E7', '#8E6BE0', '#F0646A', '#FF7EB6'];
  var pen = { c: '#1E3A32', w: 6, erase: false };
  function drawBlock() {
    return '<div class="draw-wrap"><canvas id="pad" aria-label="مساحة الرسم"></canvas>' + (S.r.drawing ? '' : '<div class="draw-ph" id="pad-ph"><div>' + ic('pencil') + 'ارسموا هنا بإصبعكم أو بالفأرة</div></div>') +
      '<div class="draw-tools" role="toolbar" aria-label="أدوات الرسم">' + PEN.map(function (c) { return '<button class="swatch" style="background:' + c + '" data-act="pen" data-c="' + c + '" aria-pressed="' + (pen.c === c && !pen.erase) + '" aria-label="لون"></button>'; }).join('') +
      '<span style="flex:1"></span><button class="btn sm ghost" data-act="pen-size">' + ic('circle') + 'سُمك</button><button class="btn sm ghost" data-act="pen-erase" aria-pressed="' + pen.erase + '">' + ic('eraser') + 'ممحاة</button><button class="btn sm ghost t-coral" data-act="pad-clear">' + ic('trash-2') + 'مسح</button></div></div>';
  }
  var RESP_COLORS = [['#FF8A3D', 'برتقالي'], ['#3DB56B', 'أخضر'], ['#2FA4E7', 'أزرق'], ['#8E6BE0', 'بنفسجي'], ['#F5A623', 'أصفر'], ['#F0646A', 'أحمر'], ['#FF7EB6', 'وردي'], ['#1E3A32', 'داكن']];
  function colorPick() {
    return '<div class="row" style="gap:.7rem">' + RESP_COLORS.map(function (c) { return '<button class="swatch" style="width:3rem;height:3rem;background:' + c[0] + '" data-act="resp-color" data-c="' + c[0] + '" aria-pressed="' + (S.r.color === c[0]) + '" aria-label="' + c[1] + '" data-k="rc-' + c[1] + '"></button>'; }).join('') +
      (S.r.color ? '<span class="chip" style="background:' + S.r.color + ';color:#fff">لون المسؤولية عندي</span>' : '') + '</div>';
  }

  /* ----- stage: افهم ----- */
  function stIfham() {
    var st = stageOf('ifham');
    return stageHead(st) + '<div class="stack" style="--gap:1.6rem">' +
      '<div class="card reveal"><p class="hadith" style="font-size:1.25rem;text-align:justify">' + esc(R.longHadith) + ' <span class="src">[صحيح البخاري]</span></p></div>' +
      '<div class="grid g3">' + R.points.map(function (p) { return '<div class="card soft center reveal" style="font-weight:800">' + ic(p.icon, '') + '<p style="margin-top:.4rem">' + esc(p.t) + '</p></div>'; }).join('') + '</div>' +
      '<div class="block reveal">' + bh(null, ic('repeat') + 'تصحيح الفكرة', block('ideaCount', function () { var n = Object.keys(S.r.flipped).length; return '<span class="chip">' + ic('check') + 'صحّحتم ' + ar(n) + ' من ' + ar(R.ideas.length) + '</span>'; })) +
        '<p class="muted" style="margin-bottom:1rem">اضغطوا على كل فكرة غير صحيحة لتنقلب إلى الفكرة الصحيحة. ناقشوا كل واحدة قبل قلبها!</p>' +
        '<div class="ideas">' + R.ideas.map(function (d, i) {
          return '<button class="idea' + (S.r.flipped[i] ? ' flip' : '') + '" data-act="flip" data-i="' + i + '" data-k="idea-' + i + '" aria-label="فكرة ' + ar(i + 1) + '"><div class="idea-in"><div class="idea-face f"><span class="tag">' + ic('x') + 'فكرة غير صحيحة</span><span class="txt">' + esc(d[0]) + '</span><span class="hint">' + ic('refresh-cw') + 'اضغط للتصحيح</span></div><div class="idea-face b"><span class="tag">' + ic('check') + 'الفكرة الصحيحة</span><span class="txt">' + esc(d[1]) + '</span></div></div></button>';
        }).join('') + '</div></div>' +
      '<div class="card soft reveal block">' + bh(null, ic('message-circle-heart') + 'سؤال حوار عائلي') + '<p class="lead" style="margin-bottom:.8rem">' + esc(R.dialogQ) + '</p>' + noteBox('dialog', 'سجّلوا أجمل المواقف…', 'dialog') + '</div>' +
      '<div class="block reveal">' + bh(null, ic('timer') + 'تجربة المارشميلو') + block('marsh', marshBlock) + '</div>' +
      '<div class="eq reveal"><span>' + esc(R.marsh.eq[0]) + '</span><b>=</b><span>' + esc(R.marsh.eq[1]) + '</span><em>' + esc(R.marsh.eq[2]) + '</em></div>' +
      '<div class="card reveal block">' + bh(null, '<span class="badge sm">' + ic('brain') + '</span>أسئلة تفكير ناقد') +
        R.criticalQs.map(function (q, i) { return '<div style="margin-top:' + (i ? '1.2rem' : '0') + '"><p style="font-weight:800;margin-bottom:.5rem"><span class="chip">' + ar(i + 1) + '</span> ' + esc(q) + '</p>' + noteBox('cq' + i, '', 'cq' + i, 2) + '</div>'; }).join('') + '</div>' +
    '</div>';
  }
  var M = { phase: 'idle', left: 10, t: null };
  function marshBlock() {
    if (S.r.marsh && M.phase === 'idle') M.phase = S.r.marsh;
    var C = 2 * Math.PI * 46, off = M.phase === 'wait' ? C * (M.left / 10) : (M.phase === 'won' ? 0 : C);
    var mm = M.phase === 'won' ? '<span class="mm pop"></span><span class="mm pop"></span>' : (M.phase === 'ate' ? '' : '<span class="mm"></span>');
    var msg = { idle: '<b>جرّبوها بأنفسكم!</b> هل تأكل قطعة الآن… أم تنتظر ١٠ ثوانٍ وتحصل على قطعتين؟',
      wait: '<b>اصبر… </b>بقي ' + ar(M.left) + ' ثوانٍ فقط! حاول أن تُلهي نفسك 😊',
      won: '<b style="color:var(--green-d)">أحسنت! صبرت فحصلت على قطعتين 🎉</b> هكذا تصنع المسؤولية: تأجيل المتعة الآن… لنتيجة أفضل لاحقًا.',
      ate: '<b style="color:var(--coral-d)">أكلتها الآن!</b> لا بأس… التجربة تعلمنا أن الصبر قليلًا يصنع فرقًا كبيرًا. جرّب مرة أخرى؟' }[M.phase];
    return '<div class="marsh"><div class="marsh-stage"><svg class="marsh-timer" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 50 50)"/></svg><div class="m">' + mm + '</div></div>' +
      '<div class="stack" style="--gap:.6rem"><p>' + esc(R.marsh.intro) + ' <b>' + esc(R.marsh.offer) + '</b></p><p class="muted">' + esc(R.marsh.mid) + '</p>' +
      '<p class="card" style="padding:.8rem 1rem;box-shadow:none"><span class="chip">النتيجة</span> ' + esc(R.marsh.result) + '</p>' +
      '<p>' + msg + '</p><div class="row">' +
      (M.phase === 'idle' || M.phase === 'ate' || M.phase === 'won' ? '<button class="btn t-green" data-act="marsh-wait" data-k="mw">' + ic('timer') + 'سأنتظر ١٠ ثوانٍ</button><button class="btn ghost t-coral" data-act="marsh-eat" data-k="me">' + ic('utensils') + 'سآكلها الآن</button>'
        : '<button class="btn ghost t-coral" data-act="marsh-eat" data-k="me">' + ic('utensils') + 'لم أعد أستطيع… سآكلها!</button>') +
      '</div></div></div>';
  }

  /* ----- stage: طبّق ----- */
  function stTabbeq(sub) {
    var st = stageOf('tabbeq'); sub = sub || 'family';
    var tabs = [['family', 'للأسرة', 'users'], ['adults', 'للكبار', 'mountain'], ['where', 'أين تكون المسؤولية؟', 'map']];
    return stageHead(st) +
      '<div class="seg reveal" role="tablist" style="margin-bottom:1.6rem">' + tabs.map(function (t) { return '<a href="#/v/responsibility/tabbeq/' + t[0] + '" role="tab" aria-selected="' + (sub === t[0]) + '">' + ic(t[2]) + t[1] + '</a>'; }).join('') + '</div>' +
      ({ family: tbFamily, adults: tbAdults, where: tbWhere }[sub] || tbFamily)();
  }
  function tbFamily() {
    return '<div class="stack" style="--gap:1.6rem">' + famHint() +
      '<div class="card reveal block">' + bh(1, 'اتفاقية المسؤولية العائلية', '<span class="chip">تُوقّع من الجميع</span>') + block('agree', agreeBlock) + '</div>' +
      '<div class="card reveal block">' + bh(2, 'لوحة المسؤوليات الأسبوعية', '<span class="chip">تُعلق في الصالة</span>') + block('weekly', weeklyBlock) + '</div>' +
      '<div class="card reveal block">' + bh(3, 'بطاقات «مهمتي اليوم»', '<span class="chip">بطاقة لكل صباح</span>') + block('cards', cardsBlock) + '</div>' +
      '<div class="card reveal block">' + bh(4, 'مستويات المسؤولية الأربع', '<span class="chip">ترقٍّ تدريجي</span>') + '<p class="muted" style="margin-bottom:1rem">كل أسرة تقيّم كل طفل أسبوعيًا: إلى أي مستوى وصل؟ اختاروا المستوى لكل فرد.</p>' + block('levels', levelsBlock) + '</div>' +
      '<div class="grid g2">' +
        '<div class="card reveal block">' + bh(5, 'لعبة: كرسي القائد') + '<p class="muted small">ساعة قيادة في الأسبوع</p><ul class="dots" style="margin:.6rem 0 1rem">' + R.leader.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' + block('leader', leaderBlock) + '</div>' +
        '<div class="stack" style="--gap:1.1rem">' +
          '<div class="card fill reveal">' + bh(6, 'سؤال المسؤولية اليومي') + '<p class="big-quote" style="color:#fff">' + esc(R.dailyQ) + '</p></div>' +
          '<div class="card reveal">' + bh(7, 'مشهد تمثيلي <small class="muted" style="font-family:var(--font);font-size:.8rem">(قصير جدًا)</small>') + '<ul class="dots">' + R.roleplay.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul><p style="font-weight:800;color:var(--cd);margin-top:.5rem">' + ic('drama') + ' ثم سؤال: ' + esc(R.roleplayQ) + '</p></div>' +
        '</div>' +
      '</div>' +
      '<div class="card reveal block t-sun" style="border-width:2px">' + bh(8, 'تحدي الأسرة: ' + esc(R.challenge.t)) + '<p style="margin-bottom:1rem">' + esc(R.challenge.rule) + '</p>' + block('stars', starsBlock) + '<p class="card soft" style="margin-top:1rem;padding:.8rem 1rem;font-weight:700"><span class="chip white">تفاعل الأب والأم</span> ' + esc(R.challenge.parents) + '</p></div>' +
    '</div>';
  }
  function agreeBlock() {
    return '<p style="font-weight:800;color:var(--cd);margin-bottom:.7rem">ميثاق قيمة المسؤولية — ألتزم هذا الشهر بأن:</p><div class="grid g3" style="--gap:.7rem">' +
      R.agreement.map(function (a, i) { return '<button class="check" data-act="agree" data-i="' + i + '" aria-pressed="' + !!S.r.agree[i] + '" data-k="ag-' + i + '"><span class="box">' + ic('check') + '</span>' + esc(a) + '</button>'; }).join('') + '</div>' +
      (S.r.done.agree ? '<p style="margin-top:1rem"><span class="sign-stamp">' + ic('badge-check') + 'وقّعت الأسرة على الاتفاقية</span></p>' : '');
  }
  function weeklyBlock() {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>الأسبوع</th><th>الحالة</th><th>اسمي</th><th>مسؤولية واحدة ألتزم بها هذا الأسبوع</th><th>أنجزت؟</th></tr></thead><tbody>' +
      R.weekly.map(function (w, i) {
        var d = S.r.weekly[i] || {};
        var unlocked = (i === 0) || !!(S.r.weekly[i - 1] && S.r.weekly[i - 1].done);
        var statusHtml = d.done
          ? '<span class="wk-status done">' + ic('check') + 'مكتمل</span>'
          : (unlocked
              ? '<span class="wk-status current">' + ic('play') + 'الحالي</span>'
              : '<span class="wk-status locked">' + ic('lock') + 'مقفل</span>');
        var rowClass = unlocked ? '' : ' class="wk-locked"';
        var disabledAttr = unlocked ? '' : ' disabled';

        return '<tr' + rowClass + '><td class="lbl">' + w[0] + '</td>' +
          '<td>' + statusHtml + '</td>' +
          '<td><select class="select" data-bind="r.weekly.' + i + '.m" data-done-any="weekly" data-k="wm-' + i + '" aria-label="الاسم"' + disabledAttr + '>' + memberOpts(d.m) + '</select></td>' +
          '<td><input class="input" data-bind="r.weekly.' + i + '.task" data-k="wt-' + i + '" placeholder="' + esc(w[1]) + '" value="' + esc(d.task || '') + '" aria-label="المسؤولية"' + disabledAttr + '></td>' +
          '<td><button class="tick' + (unlocked ? '' : ' locked') + '" data-act="wk-done" data-i="' + i + '" data-v="' + (d.done ? 1 : '') + '" aria-pressed="' + !!d.done + '" aria-label="أنجزت" data-k="wd-' + i + '"' + disabledAttr + '>' + (unlocked ? ic('check') : ic('lock')) + '</button></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="small muted" style="margin-top:.6rem">' + ic('info') + ' نظام التتابع: يجب إنجاز كل أسبوع أولاً حتى يُفتح الأسبوع الذي يليه تلقائيًا.</p>';
  }
  function cardsBlock() {
    var last = S.r.cards[S.r.cards.length - 1];
    return '<div class="grid g2" style="align-items:center">' +
      '<div class="stack" style="--gap:.8rem"><div class="field"><label>من صاحب المهمة؟</label><select class="select" id="tc-m" data-k="tc-m">' + memberOpts('', 'اختر الاسم…') + '</select></div>' +
      '<div class="field"><label>اليوم مسؤول عن:</label><input class="input" id="tc-t" maxlength="60" placeholder="مثال: سقي النباتات" data-k="tc-t"></div>' +
      '<div class="row" style="gap:.5rem"><label class="chip white" style="cursor:pointer"><input type="radio" name="tc-c" value="self" checked> اخترتها بنفسي</label><label class="chip white" style="cursor:pointer"><input type="radio" name="tc-c" value="given"> تم تكليفي بها</label></div>' +
      '<button class="btn t-sun" data-act="card-add" data-k="tc-add">' + ic('plus') + 'أنجزها… وضعها في صندوق الإنجازات</button></div>' +
      '<div class="stack" style="--gap:1rem">' +
        '<div class="taskcard"><div class="h">' + ic('sun') + 'بطاقة مهمتي اليوم</div><div class="b"><p>' + (last ? '<b>' + esc((member(last.m) || {}).name || '') + '</b> مسؤول اليوم عن: <b style="color:var(--sun-d)">' + esc(last.t) + '</b>' : 'اليوم مسؤول عن: ____________') + '</p><p class="small muted" style="margin-top:.4rem">' + (last ? (last.c === 'self' ? '✔ اخترتها بنفسي' : '✔ تم تكليفي بها') + ' · ' + esc(last.d) : 'اخترتها بنفسي ☐  تم تكليفي بها ☐') + '</p></div></div>' +
        '<div><div class="lbl" style="margin-bottom:.4rem">' + ic('trophy') + ' صندوق الإنجازات (' + ar(S.r.cards.length) + ')</div><div class="trophy-box">' + (S.r.cards.length ? S.r.cards.slice(-12).reverse().map(function (c) { var m = member(c.m); return '<span class="chip">' + (m ? esc(m.name) + ': ' : '') + esc(c.t) + '</span>'; }).join('') : '<span class="muted small">بنهاية اليوم توضع البطاقة في «صندوق الإنجازات».</span>') + '</div></div>' +
      '</div></div>';
  }
  function levelsBlock() {
    var cols = ['#BFE8CC', '#8FD6A6', '#5FC683', '#3DB56B'], hs = ['5rem', '6.6rem', '8.2rem', '9.8rem'];
    return famOrMe().map(function (m) {
      return '<div style="margin-bottom:1.2rem"><div class="who" style="margin-bottom:.6rem">' + avatar(m) + esc(m.name) + '</div><div class="stairs">' +
        R.levels.map(function (l, i) { return '<button class="stair" style="background:' + cols[i] + ';min-height:' + hs[i] + (i === 3 ? ';color:#fff' : '') + '" data-act="lvl" data-id="' + m.id + '" data-n="' + (i + 1) + '" aria-pressed="' + (S.r.levels[m.id] === i + 1) + '" data-k="lv-' + m.id + '-' + i + '"><b>المستوى ' + ar(i + 1) + '</b>' + esc(l) + '</button>'; }).join('') + '</div></div>';
    }).join('');
  }
  function leaderBlock() {
    var L = S.r.leader && member(S.r.leader);
    return '<div class="spin"><div class="spin-box' + (L ? ' win' : '') + '" id="spin-box">' + (L ? ic('crown') + esc(L.name) : 'من القائد؟') + '</div><button class="btn t-sun" data-act="spin" data-k="spin">' + ic('shuffle') + 'اختر القائد</button></div>' +
      (L ? '<p class="small muted" style="margin-top:.6rem">' + ic('crown') + ' شارة القائد المسؤول لـ <b>' + esc(L.name) + '</b> هذا الأسبوع.</p>' : '');
  }
  var STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
  function starsBlock() {
    return famOrMe().map(function (m) {
      var n = S.r.stars[m.id] || 0, s = '';
      for (var i = 1; i <= 10; i++) s += '<button class="star' + (i <= n ? ' on' : '') + '" data-act="star" data-id="' + m.id + '" data-n="' + i + '" aria-label="نجمة ' + ar(i) + '" data-k="st-' + m.id + '-' + i + '">' + STAR + '</button>';
      return '<div class="star-row"><div class="who">' + avatar(m) + esc(m.name) + '</div><div class="stars">' + s + '</div><div>' + (n >= 10 ? '<span class="chip t-sun" style="background:var(--sun);color:#fff">' + ic('gift') + 'مكافأة!</span>' : '<b style="color:var(--sun-d)">' + ar(n) + '/١٠</b>') + '</div></div>';
    }).join('');
  }

  function tbAdults() {
    var A = R.adults;
    return '<div class="stack t-coral" style="--gap:1.6rem"><div class="sec-head reveal"><h2 class="h2">مسؤولية <em>البالغين</em></h2><p class="lead">' + esc(A.sub) + '</p></div>' +
      '<div class="card reveal block">' + bh(1, A.a1.t) + '<p style="margin-bottom:1rem">' + esc(A.a1.d) + '</p><div class="timer">' + block('timer', timerFace) +
        '<div class="stack" style="--gap:.8rem"><div class="field"><label>' + esc(A.a1.q) + '</label><input class="input" data-note-input="a1task" data-k="a1t" value="' + esc(S.r.notes.a1task || '') + '" placeholder="المهمة المؤجلة…"></div>' +
        '<div class="row"><button class="btn" data-act="tm-toggle" data-k="tm-go">' + ic('play') + '<span id="tm-lbl">ابدأ</span></button><button class="btn ghost" data-act="tm-reset" data-k="tm-rs">' + ic('rotate-ccw') + 'إعادة</button><button class="btn sm ghost" data-act="tm-set" data-m="25">٢٥ د</button><button class="btn sm ghost" data-act="tm-set" data-m="60">٦٠ د</button></div>' +
        '<p class="small muted">' + ic('bell-off') + ' أغلق الإشعارات… هذه الساعة لك.</p></div></div></div>' +
      '<div class="card reveal block">' + bh(2, A.a2.t) + '<p>' + esc(A.a2.d) + '</p><p class="big-quote" style="margin:.6rem 0">' + esc(A.a2.b) + '</p>' + noteBox('a2', 'ما العمل الذي ستُكمله؟', null, 2) + '</div>' +
      '<div class="card reveal block">' + bh(3, A.a3.t) + block('adultList', adultList) + '<p style="margin-top:.8rem;font-weight:800;color:var(--cd)">' + esc(A.a3.note) + '</p></div>' +
      '<div class="grid g2">' +
        '<div class="card reveal block">' + bh(4, A.a4.t) + '<p class="muted" style="margin-bottom:.8rem">' + esc(A.a4.d) + '</p><div class="stack" style="--gap:.7rem"><div class="field"><label>أتوقف عن:</label><input class="input" data-note-input="a4stop" data-k="a4s" value="' + esc(S.r.notes.a4stop || '') + '"></div><div class="field"><label>لأني أريد:</label><input class="input" data-note-input="a4want" data-k="a4w" value="' + esc(S.r.notes.a4want || '') + '"></div></div></div>' +
        '<div class="card reveal block">' + bh(5, A.a5.t) + '<p class="muted" style="margin-bottom:.8rem">' + esc(A.a5.d) + '</p><label class="lbl">' + esc(A.a5.q) + '</label>' + noteBox('a5', '', null, 3) + '</div>' +
      '</div>' +
      '<div class="card fill center reveal"><b style="font-size:1.2rem">' + esc(A.close) + '</b></div></div>';
  }
  var T = { total: 3600, left: 3600, run: false, id: null };
  function fmt(s) { var m = Math.floor(s / 60), x = s % 60; return (m < 10 ? '0' : '') + m + ':' + (x < 10 ? '0' : '') + x; }
  function timerFace() { var C = 2 * Math.PI * 54; return '<div class="timer-face"><svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="54"/><circle class="fg" id="tm-fg" cx="60" cy="60" r="54" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - T.left / T.total)).toFixed(1) + '"/></svg><div class="t" id="tm-t">' + fmt(T.left) + '</div></div>'; }
  function tick() {
    T.left--; var C = 2 * Math.PI * 54, fg = $('#tm-fg'), t = $('#tm-t');
    if (fg) fg.style.strokeDashoffset = (C * (1 - T.left / T.total)).toFixed(1); if (t) t.textContent = fmt(T.left);
    if (T.left <= 0) { clearInterval(T.id); T.run = false; done('focus'); confetti(); toast('أنجزت ساعة بلا مشتتات! 💪', 'trophy'); var l = $('#tm-lbl'); if (l) l.textContent = 'ابدأ'; }
  }
  function adultList() {
    var days = ['—', 'السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>المهمة</th><th>السبب</th><th>يوم الإنجاز</th><th>تمّت</th></tr></thead><tbody>' + S.r.adultList.map(function (d, i) {
      return '<tr><td><input class="input" data-bind="r.adultList.' + i + '.t" data-done-any="adultlist" value="' + esc(d.t || '') + '" data-k="al-t' + i + '" aria-label="المهمة"></td><td><input class="input" data-bind="r.adultList.' + i + '.w" value="' + esc(d.w || '') + '" data-k="al-w' + i + '" aria-label="السبب"></td><td><select class="select" data-bind="r.adultList.' + i + '.d" data-k="al-d' + i + '" aria-label="اليوم">' + days.map(function (x) { return '<option' + (d.d === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></td><td><button class="tick" data-act="al-done" data-i="' + i + '" data-v="' + (d.x ? 1 : '') + '" aria-label="تمت" data-k="al-x' + i + '">' + ic('check') + '</button></td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  function tbWhere() {
    return '<div class="stack t-orange" style="--gap:1.4rem"><div class="sec-head reveal"><h2 class="h2">أين تكون <em>المسؤولية؟</em></h2><p class="lead">اختاروا التصرف المسؤول في كل موقف، ثم سجّلوا: هل طبّقتموه اليوم؟</p></div>' +
      block('whereScore', whereScore) +
      '<div class="where-grid">' + R.where.map(function (w) { return '<div class="reveal" data-block="w-' + w.k + '">' + whereCard(w) + '</div>'; }).join('') + '</div></div>';
  }
  function whereScore() {
    var a = 0, c = 0, t = 0; R.where.forEach(function (w) { var s = S.r.where[w.k]; if (s && s.ans) { a++; if (s.ans === 'ok') c++; } if (s && s.today === 1) t++; });
    return '<div class="card plain score"><span data-size="64">' + ring(Math.round(a * 100 / R.where.length), 64, ar(a) + '/' + ar(R.where.length)) + '</span><div style="flex:1"><b>أجبتم عن ' + ar(a) + ' موقفًا</b> · الإجابات المسؤولة: ' + ar(c) + '<div class="muted small">طبّقتم المسؤولية اليوم في ' + ar(t) + ' مكان</div></div><button class="btn sm ghost" data-act="where-reset">' + ic('rotate-ccw') + 'من جديد</button></div>';
  }
  function whereCard(w) {
    var s = S.r.where[w.k] || {}, order = (w.k.length % 2) ? ['ok', 'bad'] : ['bad', 'ok'];
    var opts = order.map(function (o) {
      var cls = s.ans ? (o === 'ok' ? ' ok' : (s.ans === o ? ' bad' : ' dim')) : '';
      return '<button class="opt' + cls + '" data-act="where" data-k="' + w.k + '-' + o + '" data-w="' + w.k + '" data-o="' + o + '"' + (s.ans ? ' disabled' : '') + '>' + (s.ans ? ic(o === 'ok' ? 'check' : 'x') : ic('circle')) + '<span>' + esc(o === 'ok' ? w.ok : w.bad) + '</span></button>';
    }).join('');
    return '<div class="wcard"><div class="row" style="gap:.7rem"><span class="badge sm">' + ic(w.icon) + '</span><b class="h4" style="flex:1">' + esc(w.place) + '</b></div>' +
      '<p class="sit"><b>الموقف:</b> ' + esc(w.sit) + '</p><div class="opts">' + opts + '</div>' +
      (s.ans ? '<div class="tag">' + ic('sparkles') + esc(w.tag) + '</div><div class="today"><span style="font-weight:800;font-size:.9rem;flex:1">طبّقتها اليوم؟</span><button class="tick" data-act="where-today" data-w="' + w.k + '" data-v="' + (s.today === 1 ? 1 : s.today === 0 ? 0 : '') + '" data-k="wt-' + w.k + '" aria-label="طبقتها اليوم">' + ic(s.today === 0 ? 'x' : 'check') + '</button></div>' : '') + '</div>';
  }

  /* ----- stage: استمر ----- */
  function stIstamer() {
    var st = stageOf('istamer');
    return stageHead(st) + '<div class="stack" style="--gap:1.6rem">' +
      '<div class="card reveal block">' + bh(1, 'تدريب «سلوك رغم المشاعر»') + '<p>' + esc(R.feelings.d) + '</p><p style="font-weight:800;color:var(--cd);margin:.6rem 0">' + esc(R.feelings.q) + '</p>' + block('feel', function () {
        return '<div class="grid g3" style="--gap:.7rem">' + R.feelings.items.map(function (f, i) { return '<button class="check" data-act="feel" data-i="' + i + '" aria-pressed="' + (S.r.feel === i) + '" data-k="fe-' + i + '"><span class="box">' + ic('check') + '</span>' + esc(f) + '</button>'; }).join('') + '</div>' + (S.r.feel != null ? '<p class="big-quote center" style="margin-top:1rem">«' + esc(R.feelings.items[S.r.feel]) + '»</p>' : '');
      }) + '</div>' +
      '<div class="card reveal block">' + bh(2, 'خطة (دقيقة واحدة قبل النوم)') + '<div class="row" style="gap:.5rem;margin-bottom:.8rem"><b>قبل النوم، اسأل نفسك:</b>' + R.bedtime.qs.map(function (q) { return '<span class="chip">' + esc(q) + '</span>'; }).join('') + '</div>' + block('bed', bedBlock) + '<p class="center" style="margin-top:.8rem;font-weight:800;color:var(--cd)">' + esc(R.bedtime.note) + '</p></div>' +
      '<div class="card reveal block">' + bh(3, 'تمرين «العادة الصغيرة»') + '<p>' + esc(R.habit.d) + '</p><div class="row" style="gap:.4rem;margin:.6rem 0"><span class="muted" style="font-weight:700">أمثلة:</span>' + R.habit.ex.map(function (e) { return '<button class="chip white" data-act="habit-ex" data-t="' + esc(e) + '">' + esc(e) + '</button>'; }).join('') + '</div>' + block('habit', habitBlock) + '</div>' +
      '<div class="block reveal">' + bh(4, 'شهادة تقدير من الأسرة <small class="muted" style="font-family:var(--font);font-size:.8rem">(تفاعل عاطفي)</small>') + block('thanks', thanksBlock) + '</div>' +
      '<div class="card reveal block">' + bh(5, 'لوحة «قصة نجاح صغيرة»') + '<p style="margin-bottom:.6rem">أكتب أو ارسم:</p><div class="grid g3" style="--gap:.6rem;margin-bottom:1rem">' + R.success.map(function (q, i) { return '<div class="card soft center" style="padding:.8rem;font-weight:700">' + ic(['target', 'house', 'smile'][i], '') + '<p>' + esc(q) + '</p></div>'; }).join('') + '</div><label class="lbl">قصتي مع المسؤولية هذا الأسبوع:</label>' + noteBox('story2', '', 'story2', 6) + '</div>' +
      '<div class="card reveal block">' + bh(6, 'تقييم نهاية الشهر — مستوى المسؤولية') + '<p class="muted" style="margin-bottom:.8rem">اختر المستوى الذي وصلت إليه:</p>' + block('final', function () {
        return '<div class="grid g4" style="--gap:.7rem">' + R.finalLevels.map(function (l, i) { return '<button class="check" style="flex-direction:column;text-align:center;padding:1rem" data-act="final" data-n="' + (i + 1) + '" aria-pressed="' + (S.r.final === i + 1) + '" data-k="fl-' + i + '"><span class="num" style="transform:none;border-radius:50%;width:2.8rem;height:2.8rem;font-size:1.3rem">' + ar(i + 1) + '</span>' + esc(l) + '</button>'; }).join('') + '</div>';
      }) + '<div class="card fill center" style="margin-top:1rem;padding:.8rem"><b>' + esc(R.finalNote) + '</b></div></div>' +
      '<div class="card reveal block t-sun" style="border-width:2px">' + bh(7, 'وسام نهاية الشهر') + '<div class="grid g2" style="align-items:center"><div class="stack" style="--gap:.8rem">' +
        '<div class="field"><label>الاسم</label><input class="input" data-medal="name" maxlength="30" value="' + esc(S.r.medal.name) + '" data-k="md-n" placeholder="اسم صاحب الوسام"></div>' +
        '<div class="field"><label>المسؤولية التي نجحت فيها</label><input class="input" data-medal="what" maxlength="60" value="' + esc(S.r.medal.what) + '" data-k="md-w"></div>' +
        '<div class="row">' + (EMBED ? '' : '<button class="btn" data-act="medal-print">' + ic('printer') + 'اطبع الوسام</button>') + '<button class="btn ghost" data-act="medal-cheer">' + ic('party-popper') + 'احتفلوا!</button></div></div>' +
        '<div id="medal-prev">' + medalHTML() + '</div></div></div>' +
      '<div class="card fill reveal" style="background:linear-gradient(135deg,var(--lilac),#B06BD8 55%,var(--pink));box-shadow:0 5px 0 var(--lilac-d)">' + bh(8, '<span style="color:#fff">لحظة احتفال</span>') + '<p class="display" style="color:#fff;font-size:clamp(1.5rem,3vw,2.2rem)">' + esc(R.party.t) + '</p><p style="font-weight:800;margin:.8rem 0">اقتراحات للاحتفال:</p><div class="grid g3" style="--gap:.7rem">' + R.party.items.map(function (p) { return '<div class="card center" style="box-shadow:none;border:0;color:var(--lilac-d);font-weight:800">' + ic(p[0], '') + '<p>' + esc(p[1]) + '</p></div>'; }).join('') + '</div><div class="center" style="margin-top:1.2rem"><button class="btn lg ghost" data-act="party">' + ic('party-popper') + 'أكملنا الشهر! احتفلوا 🎉</button></div></div>' +
    '</div>';
  }
  function bedBlock() {
    var moods = [['smile', 'سعيد'], ['meh', 'محايد'], ['frown', 'متعب']];
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>اليوم</th><th>أنجزت مسؤوليتي؟</th><th>شعوري اليوم كان:</th></tr></thead><tbody>' + R.bedtime.days.map(function (d, i) {
      var b = S.r.bed[i] || {};
      return '<tr><td class="lbl">' + d + '</td><td><button class="tick" data-act="bed" data-i="' + i + '" data-v="' + (b.ok === 1 ? 1 : b.ok === 0 ? 0 : '') + '" aria-label="أنجزت" data-k="bd-' + i + '">' + ic(b.ok === 0 ? 'x' : 'check') + '</button></td><td><div class="moods">' + moods.map(function (m) { return '<button class="mood" data-act="mood" data-i="' + i + '" data-m="' + m[1] + '" aria-pressed="' + (b.mood === m[1]) + '" data-k="mo-' + i + m[0] + '">' + ic(m[0]) + m[1] + '</button>'; }).join('') + '</div></td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function habitBlock() {
    var h = S.r.habit, n = h.days.filter(Boolean).length;
    return '<div class="field" style="margin-bottom:1rem"><label>' + ic('pencil') + ' عادتي الصغيرة هذا الأسبوع هي:</label><input class="input" data-bind="r.habit.text" data-k="hb-t" value="' + esc(h.text) + '" placeholder="اكتب عادتك الصغيرة…"></div>' +
      '<div class="days">' + [1, 2, 3, 4, 5, 6, 7].map(function (d, i) { return '<button class="day" data-act="habit" data-i="' + i + '" aria-pressed="' + !!h.days[i] + '" data-k="hd-' + i + '"><span>يوم ' + ar(d) + '</span><span class="dot">' + ic('check') + '</span></button>'; }).join('') + '</div>' +
      '<div class="row" style="margin-top:1rem"><div class="streak" style="flex:1"><i style="width:' + (n * 100 / 7) + '%"></i></div><b>' + ar(n) + '/٧</b></div>' +
      '<p class="center" style="margin-top:.6rem;font-weight:800;color:var(--cd)">' + (n === 7 ? '🎉 أتممتم الأسبوع! العادة بدأت تتكوّن.' : esc(R.habit.note)) + '</p>';
  }
  function thanksBlock() {
    var last = S.r.thanks[S.r.thanks.length - 1];
    return '<div class="grid g2" style="align-items:start"><div class="card stack" style="--gap:.8rem"><p>' + esc(R.thanks.d) + '</p>' +
      '<div class="row" style="flex-wrap:nowrap"><div class="field" style="flex:1"><label>من</label><select class="select" id="th-f" data-k="th-f">' + memberOpts('', 'من…') + '</select></div><div class="field" style="flex:1"><label>إلى</label><select class="select" id="th-t" data-k="th-t">' + memberOpts('', 'إلى…') + '</select></div></div>' +
      '<div class="field"><label>' + esc(R.thanks.start) + '</label><textarea class="textarea" id="th-m" rows="3" maxlength="200" data-k="th-m"></textarea></div><button class="btn t-lilac" data-act="thanks-add">' + ic('heart-handshake') + 'أنشئ الشهادة</button></div>' +
      '<div class="stack" style="--gap:.8rem">' + (last ? certHTML(last) + '<div class="row">' + (EMBED ? '' : '<button class="btn sm ghost" data-act="thanks-print">' + ic('printer') + 'اطبع الشهادة</button>') + '<span class="muted small">عدد الشهادات: ' + ar(S.r.thanks.length) + '</span></div>' : '<div class="empty">' + ic('heart-handshake') + '<p style="margin-top:.5rem">ستظهر الشهادة هنا بعد كتابتها</p></div>') + '</div></div>';
  }
  function certHTML(c) {
    var f = member(c.f), t = member(c.t);
    return '<div class="cert"><div class="cert-in"><div class="ttl">شهادة تقدير</div><p class="muted" style="font-weight:700">إلى: <b style="color:var(--ink)">' + esc(t ? t.name : '') + '</b></p><p class="msg">«' + esc(R.thanks.start) + ' ' + esc(c.m) + '»</p><p class="small muted">من: <b>' + esc(f ? f.name : '') + '</b> · ' + esc(c.d) + '</p><p class="small" style="margin-top:.5rem;color:var(--lilac-d);font-weight:800">رحلة القيم الأسرية · قيمة المسؤولية</p></div></div>';
  }
  function medalHTML() {
    var md = S.r.medal;
    return '<div class="medal"><svg class="ribbon" viewBox="0 0 200 120" aria-hidden="true"><path d="M60 0 h30 l20 80 l-22 -10 l-14 22z" fill="#FF8A3D"/><path d="M140 0 h-30 l-20 80 l22 -10 l14 22z" fill="#2FA4E7"/></svg><div class="medal-disc">' + ic('medal') + '<b>' + esc(R.medal) + '</b></div><div class="medal-name">' + (md.name ? esc(md.name) : '…') + '</div><p style="font-weight:700">' + (md.what ? 'المسؤولية التي نجح فيها: <b style="color:var(--sun-d)">' + esc(md.what) + '</b>' : '<span class="muted">اكتب المسؤولية التي نجحت فيها</span>') + '</p></div>';
  }

  /* =========================================================
     ROUTER
     ========================================================= */
  var main, lastBase = null;
  function route() {
    var parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    var base = parts[0] || 'home', html, title = B.title, nav = base;
    clearInterval(M.t); if (M.phase === 'wait') M.phase = 'idle';
    BLOCKS = {};
    if (!S.registered && (base === 'v' || base === 'family' || base === 'charter')) {
      html = '<section class="section"><div class="wrap" style="padding-top:1.5rem">' +
        gateFormHtml('للوصول إلى قيمة «المسؤولية» والميثاق وأفراد الأسرة، يرجى تسجيل العائلة أولاً.') +
        '</div></section>';
      title = 'تسجيل العائلة · ' + title;
      nav = 'home';
    }
    else if (base === 'v') { html = viewValue(parts[2] || 'start', parts[3]); title = 'المسؤولية · ' + title; nav = 'v'; }
    else if (base === 'about') { html = viewAbout(); title = 'عن الرحلة · ' + title; }
    else if (base === 'charter') { html = viewCharter(); title = 'ميثاق الأسرة · ' + title; }
    else if (base === 'family') { html = viewFamily(); title = 'أسرتي · ' + title; }
    else { html = viewHome(); nav = 'home'; }
    main.innerHTML = html; document.title = title;
    $$('[data-nav]').forEach(function (a) { if (a.getAttribute('data-nav') === nav) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var key = base + '/' + (parts[2] || '') + '/' + (parts[3] || '');
    if (base === 'v' && lastBase === 'v') {
      var sn = $('.stage-nav'); if (sn) { var y = sn.getBoundingClientRect().top + scrollY - 2; if (scrollY > y) scrollTo({ top: y, behavior: 'smooth' }); }
    } else scrollTo(0, 0);
    lastBase = base;
    afterBlock(main);
    if (base === 'v' && parts[2] === 'intabeh') initPad();
    if (base === 'v') { var at = $('.stage-tab[aria-current="true"]'); if (at && at.scrollIntoView && innerWidth < 860) at.scrollIntoView({ inline: 'center', block: 'nearest' }); }
    void key;
  }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' }) : null;
  function afterBlock(root) { $$('.reveal:not(.in)', root).forEach(function (el) { if (io) io.observe(el); else el.classList.add('in'); }); }

  /* ---------------- drawing pad ---------------- */
  function initPad() {
    var cv = $('#pad'); if (!cv) return;
    var ctx = cv.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2), drawing = false, last = null;
    function size() {
      var r = cv.getBoundingClientRect(), img = null;
      if (cv.width) { try { img = cv.toDataURL(); } catch (e) {} }
      cv.width = r.width * dpr; cv.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, r.width, r.height);
      var src = img || S.r.drawing; if (src) { var im = new Image(); im.onload = function () { ctx.drawImage(im, 0, 0, r.width, r.height); }; im.src = src; }
    }
    size(); addEventListener('resize', function rs() { if (!document.body.contains(cv)) { removeEventListener('resize', rs); return; } size(); });
    function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.addEventListener('pointerdown', function (e) { drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId); var ph = $('#pad-ph'); if (ph) ph.remove(); dot(last); });
    cv.addEventListener('pointermove', function (e) { if (!drawing) return; var p = pos(e); ctx.strokeStyle = pen.erase ? '#fff' : pen.c; ctx.lineWidth = pen.erase ? 26 : pen.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; });
    function end() { if (!drawing) return; drawing = false; try { S.r.drawing = cv.toDataURL('image/jpeg', .7); save(); done('draw'); } catch (e) {} }
    function dot(p) { ctx.fillStyle = pen.erase ? '#fff' : pen.c; ctx.beginPath(); ctx.arc(p.x, p.y, (pen.erase ? 26 : pen.w) / 2, 0, 7); ctx.fill(); }
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('pointerleave', end);
    cv._clear = function () { var r = cv.getBoundingClientRect(); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, r.width, r.height); S.r.drawing = null; save(); };
  }

  /* =========================================================
     ACTIONS
     ========================================================= */
  function setPath(path, val) { var p = path.split('.'), o = S; for (var i = 0; i < p.length - 1; i++) { if (o[p[i]] == null) o[p[i]] = {}; o = o[p[i]]; } o[p[p.length - 1]] = val; }
  var A = {
    mark: function (el) { done(el.getAttribute('data-a')); },
    'charter-sign': function (el) {
      var id = el.dataset.id, v = ($('[data-k="pv-' + id + '"]') || {}).value;
      if (!v) { toast('اختر القيمة أولًا', 'info'); return; }
      S.charter[id] = { v: v, d: today() }; save(); refresh('charterSign'); confetti(40); toast('تم التوقيع على الميثاق ✍️', 'signature');
    },
    'charter-unsign': function (el) { delete S.charter[el.dataset.id]; save(); refresh('charterSign'); },
    'mp-sign': function (el) {
      var id = el.dataset.id, t = (($('[data-k="mp-' + id + '"]') || {}).value || '').trim();
      if (!t) { toast('اكتب المسؤولية التي تختار الالتزام بها', 'info'); return; }
      S.r.monthPledge[id] = { t: t, d: today() }; save(); refresh('mpledge'); done('mpledge'); confetti(40);
    },
    'mp-unsign': function (el) { delete S.r.monthPledge[el.dataset.id]; save(); refresh('mpledge'); if (!Object.keys(S.r.monthPledge).length) done('mpledge', false); },
    'fam-quick': function (el) { var r = el.dataset.role; addMember(r, r); },
    'fam-del': function (el) { var id = el.dataset.id; S.family = S.family.filter(function (m) { return m.id !== id; }); save(); refresh('famList'); refresh('famBoard'); },
    story: function () {
      storyStep++;
      storyAnim = storyStep;
      S.r.storyStep = storyStep;
      if (storyStep >= R.story.length - 1) done('story');
      else save();
      refresh('story');
      storyAnim = -1;
      requestAnimationFrame(function () { setTimeout(function () { $$('.story .line').forEach(function (l) { l.classList.add('on'); }); }, 20); });
    },
    'story-replay': function () { storyStep = -1; S.r.storyStep = -1; save(); done('story', false); refresh('story'); },
    pen: function (el) { pen.c = el.dataset.c; pen.erase = false; $$('.draw-tools .swatch').forEach(function (s) { s.setAttribute('aria-pressed', s === el); }); var e = $('[data-act="pen-erase"]'); if (e) e.setAttribute('aria-pressed', false); },
    'pen-size': function () { pen.w = pen.w >= 14 ? 3 : pen.w + 4; toast('سُمك القلم: ' + ar(pen.w), 'circle'); },
    'pen-erase': function (el) { pen.erase = !pen.erase; el.setAttribute('aria-pressed', pen.erase); },
    'pad-clear': function () { var cv = $('#pad'); if (cv && cv._clear) cv._clear(); done('draw', false); },
    'resp-color': function (el) { S.r.color = el.dataset.c; save(); refresh('colorPick'); if ((S.r.notes.colorWhy || '').trim()) done('color'); },
    flip: function (el) {
      var i = el.dataset.i; if (S.r.flipped[i]) delete S.r.flipped[i]; else S.r.flipped[i] = 1;
      el.classList.toggle('flip'); save(); refresh('ideaCount');
      if (Object.keys(S.r.flipped).length === R.ideas.length) done('ideas');
    },
    'marsh-wait': function () {
      M.phase = 'wait'; M.left = 10; refresh('marsh'); clearInterval(M.t);
      M.t = setInterval(function () {
        M.left--;
        if (M.left <= 0) {
          clearInterval(M.t);
          M.phase = 'won';
          S.r.marsh = 'won';
          save();
          done('marsh');
          confetti(60);
        }
        refresh('marsh');
      }, 1000);
    },
    'marsh-eat': function () { clearInterval(M.t); M.phase = 'ate'; S.r.marsh = 'ate'; save(); refresh('marsh'); },
    agree: function (el) { var i = el.dataset.i; S.r.agree[i] = !S.r.agree[i]; save(); var all = R.agreement.every(function (_, k) { return S.r.agree[k]; }); done('agree', all); refresh('agree'); },
    'wk-done': function (el) {
      var i = +el.dataset.i;
      var unlocked = (i === 0) || !!(S.r.weekly[i - 1] && S.r.weekly[i - 1].done);
      if (!unlocked) {
        toast('يجب إكمال ' + R.weekly[i - 1][0] + ' أولاً لفتح هذا الأسبوع 🔒', 'lock');
        return;
      }
      S.r.weekly[i] = S.r.weekly[i] || {};
      S.r.weekly[i].done = !S.r.weekly[i].done;
      save();
      done('weekly');
      refresh('weekly');
      if (S.r.weekly[i].done) {
        if (i < R.weekly.length - 1) {
          confetti(60);
          toast('أحسنتم! تم إنجاز ' + R.weekly[i][0] + ' وفُتح ' + R.weekly[i + 1][0] + ' بنجاح 🎉', 'sparkles');
        } else {
          confetti(120);
          toast('مبارك! تم إنجاز جميع أسابيع المسؤولية بنجاح 🏆', 'trophy');
        }
      }
    },
    'submit-gate': function (btn) {
      var nameInput = $('#gate-name');
      var phoneInput = $('#gate-phone');
      var nameErr = $('#gate-name-err');
      var phoneErr = $('#gate-phone-err');
      if (!nameInput || !phoneInput) return;

      var name = (nameInput.value || '').trim();
      var phone = (phoneInput.value || '').trim();
      var valid = true;

      if (!name || name.length < 2) {
        if (nameErr) nameErr.classList.add('show');
        nameInput.focus();
        valid = false;
      } else {
        if (nameErr) nameErr.classList.remove('show');
      }

      var cleanPhone = normalizeSaudiPhone(phone);
      if (!cleanPhone) {
        if (phoneErr) phoneErr.classList.add('show');
        if (valid) phoneInput.focus();
        valid = false;
      } else {
        if (phoneErr) phoneErr.classList.remove('show');
      }

      if (!valid) return;

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = ic('sparkles') + ' جاري التسجيل وبدء الرحلة...';
      }

      // إرسال البيانات إلى السيرفر لحفظها في MongoDB
      fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyName: name,
          phone: cleanPhone,
          familyData: {
            familyName: name,
            family: S.family,
            charter: S.charter,
            r: S.r
          }
        })
      })
      .then(function (res) { return res.json(); })
      .then(function (res) {
        if (res && res.data) {
          if (res.data.id) S.familyId = res.data.id;
          if (res.isExisting && res.data.familyData) {
            var fd = res.data.familyData;
            if (fd.familyName) S.familyName = fd.familyName;
            if (Array.isArray(fd.family) && fd.family.length) S.family = fd.family;
            if (fd.charter && typeof fd.charter === 'object') S.charter = fd.charter;
            if (fd.r && typeof fd.r === 'object') {
              for (var k in fd.r) S.r[k] = fd.r[k];
            }
            toast('مرحباً بعودتكم! تم استرجاع تقدم الأسرة من السحابة بنجاح ☁️✨', 'sparkles');
          }
        }
      })
      .catch(function (err) {
        console.warn('تعذر الاتصال بالخادم الآن، تم الحفظ محلياً:', err);
      })
      .finally(function () {
        S.registered = true;
        S.familyName = S.familyName || name;
        S.phone = cleanPhone;

        if (!S.family.length) {
          S.family.push({ id: uid(), name: S.familyName, role: 'قائد الرحلة', color: '#FF8A3D' });
        }

        save();
        updateNav();
        updateCloudSyncBadge('synced');
        confetti(120);
        if (!location.hash || location.hash === '#/' || location.hash === '#gate-section') {
          location.hash = '#/v/responsibility';
        } else {
          route();
        }
      });
    },
    'card-add': function () {
      var m = $('#tc-m').value, t = $('#tc-t').value.trim(), c = ($('input[name="tc-c"]:checked') || {}).value || 'self';
      if (!t) { toast('اكتب المهمة أولًا', 'info'); return; }
      S.r.cards.push({ m: m, t: t, c: c, d: today() }); save(); done('card'); refresh('cards'); confetti(30); toast('أُضيفت إلى صندوق الإنجازات 🏆', 'trophy');
    },
    lvl: function (el) { S.r.levels[el.dataset.id] = +el.dataset.n; save(); done('levels'); refresh('levels'); },
    spin: function () {
      var list = famOrMe(), box = $('#spin-box'), k = 0, steps = 14 + Math.floor(Math.random() * list.length);
      if (list.length < 2) { S.r.leader = list[0].id; save(); done('leader'); refresh('leader'); return; }
      var iv = setInterval(function () { box.textContent = list[k % list.length].name; k++; if (k > steps) { clearInterval(iv); S.r.leader = list[(k - 1) % list.length].id; save(); done('leader'); refresh('leader'); confetti(40); } }, 110);
    },
    star: function (el) {
      var id = el.dataset.id, n = +el.dataset.n, cur = S.r.stars[id] || 0;
      S.r.stars[id] = (n === cur) ? n - 1 : n; save(); done('stars'); refresh('stars');
      if (S.r.stars[id] >= 10 && cur < 10) { confetti(); var m = member(id); toast((m ? m.name : '') + ' جمع ١٠ نجوم! يختار مكافأته 🎁', 'gift'); }
    },
    'tm-toggle': function () {
      var l = $('#tm-lbl');
      if (T.run) { clearInterval(T.id); T.run = false; if (l) l.textContent = 'تابع'; return; }
      if (T.left <= 0) T.left = T.total; T.run = true; if (l) l.textContent = 'إيقاف مؤقت'; T.id = setInterval(tick, 1000);
    },
    'tm-reset': function () { clearInterval(T.id); T.run = false; T.left = T.total; refresh('timer'); var l = $('#tm-lbl'); if (l) l.textContent = 'ابدأ'; },
    'tm-set': function (el) { clearInterval(T.id); T.run = false; T.total = T.left = +el.dataset.m * 60; refresh('timer'); var l = $('#tm-lbl'); if (l) l.textContent = 'ابدأ'; },
    'al-done': function (el) { var i = +el.dataset.i; S.r.adultList[i].x = !S.r.adultList[i].x; save(); done('adultlist'); refresh('adultList'); },
    where: function (el) {
      var k = el.dataset.w, o = el.dataset.o; S.r.where[k] = S.r.where[k] || {}; S.r.where[k].ans = o; save();
      var c = $('[data-block="w-' + k + '"]'); var w = R.where.filter(function (x) { return x.k === k; })[0]; c.innerHTML = whereCard(w);
      var f = $('[data-k="wt-' + k + '"]'); if (f) f.focus({ preventScroll: true });
      toast(o === 'ok' ? 'إجابة مسؤولة 👏' : 'فكّر مرة أخرى… التصرف المسؤول ظاهر الآن', o === 'ok' ? 'check' : 'info');
      refresh('whereScore');
      if (R.where.every(function (x) { return S.r.where[x.k] && S.r.where[x.k].ans; })) done('where');
    },
    'where-today': function (el) {
      var k = el.dataset.w, s = S.r.where[k]; s.today = s.today === 1 ? 0 : (s.today === 0 ? null : 1); save();
      var c = $('[data-block="w-' + k + '"]'); c.innerHTML = whereCard(R.where.filter(function (x) { return x.k === k; })[0]); var f = $('[data-k="wt-' + k + '"]'); if (f) f.focus({ preventScroll: true }); refresh('whereScore');
    },
    'where-reset': function () { S.r.where = {}; save(); done('where', false); route(); },
    feel: function (el) { S.r.feel = +el.dataset.i; save(); done('feel'); refresh('feel'); },
    bed: function (el) { var i = el.dataset.i, b = S.r.bed[i] = S.r.bed[i] || {}; b.ok = b.ok === 1 ? 0 : (b.ok === 0 ? null : 1); save(); done('bed'); refresh('bed'); },
    mood: function (el) { var i = el.dataset.i, b = S.r.bed[i] = S.r.bed[i] || {}; b.mood = b.mood === el.dataset.m ? null : el.dataset.m; save(); done('bed'); refresh('bed'); },
    habit: function (el) { var i = +el.dataset.i; S.r.habit.days[i] = !S.r.habit.days[i]; save(); var n = S.r.habit.days.filter(Boolean).length; done('habit', n > 0); refresh('habit'); if (n === 7) confetti(); },
    'habit-ex': function (el) { S.r.habit.text = el.dataset.t; save(); refresh('habit'); },
    'thanks-add': function () {
      var f = $('#th-f').value, t = $('#th-t').value, m = $('#th-m').value.trim();
      if (!m) { toast('اكتب رسالة الشكر أولًا', 'info'); return; }
      S.r.thanks.push({ f: f, t: t, m: m, d: today() }); save(); done('thanks'); refresh('thanks'); confetti(50);
    },
    'thanks-print': function () { printHTML(certHTML(S.r.thanks[S.r.thanks.length - 1])); },
    final: function (el) { S.r.final = +el.dataset.n; save(); done('final'); refresh('final'); if (S.r.final === 4) { confetti(); toast('نُضج المسؤولية! 🌟', 'sparkles'); } },
    'medal-print': function () { done('medal'); printHTML('<div style="padding-top:2cm">' + medalHTML() + '<p style="text-align:center;margin-top:1cm;font-weight:700">رحلة القيم الأسرية · قيمة المسؤولية · ' + esc(today()) + '</p></div>'); },
    'medal-cheer': function () { done('medal'); confetti(); toast('مبارك الوسام! 🏅', 'medal'); },
    party: function () { S.r.party = true; save(); done('party'); confetti(180); setTimeout(function () { confetti(120); }, 900); toast('مبارك! أتممتم شهر المسؤولية 🎉', 'party-popper'); },
    export: function () {
      var blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'رحلة-القيم-نسخة.json'; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    },
    reset: function (el) {
      if (el.dataset.sure !== '1') { el.dataset.sure = '1'; el.lastChild.textContent = 'اضغط مرة أخرى لتأكيد المسح'; setTimeout(function () { if (el.isConnected) { el.dataset.sure = ''; el.lastChild.textContent = 'مسح كل البيانات'; } }, 4000); return; }
      S = fresh(); save(); route(); toast('تم مسح البيانات', 'trash-2');
    },
    print: function () { window.print(); }
  };
  function addMember(name, role) {
    name = (name || '').trim(); if (!name) return;
    S.family.push({ id: uid(), name: name.slice(0, 30), role: role, color: COLORS[S.family.length % COLORS.length] }); save();
    refresh('famList'); refresh('famBoard'); toast('أُضيف ' + name + ' إلى الأسرة', 'user-plus');
  }

  /* ---------------- events ---------------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var fn = A[el.getAttribute('data-act')]; if (!fn) return;
    if (el.tagName === 'A' && el.getAttribute('data-act') !== 'mark') e.preventDefault();
    fn(el, e);
  });
  document.addEventListener('submit', function (e) {
    var f = e.target; if (f.getAttribute('data-form') === 'fam-add') { e.preventDefault(); addMember(f.name.value, f.role.value); f.reset(); f.name.focus(); }
  });
  var hintT = {};
  document.addEventListener('input', function (e) {
    var el = e.target, k;
    if ((k = el.getAttribute('data-note')) || (k = el.getAttribute('data-note-input'))) {
      S.r.notes[k] = el.value; save();
      var a = el.getAttribute('data-done'); if (a) done(a, !!el.value.trim());
      if (k === 'colorWhy') done('color', !!el.value.trim() && !!S.r.color);
      if (k === 'a1task' && el.value.trim()) {}
      var h = $('[data-hint="' + k + '"]'); if (h) { h.classList.add('on'); clearTimeout(hintT[k]); hintT[k] = setTimeout(function () { h.classList.remove('on'); }, 1500); }
    }
    if ((k = el.getAttribute('data-bind'))) { setPath(k, el.value); save(); var d = el.getAttribute('data-done-any'); if (d && el.value) done(d); }
    if ((k = el.getAttribute('data-medal'))) { S.r.medal[k] = el.value; save(); var p = $('#medal-prev'); if (p) p.innerHTML = medalHTML(); if (S.r.medal.name && S.r.medal.what) done('medal'); }
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.getAttribute('data-bind')) { setPath(el.getAttribute('data-bind'), el.value); save(); var d = el.getAttribute('data-done-any'); if (d && el.value) done(d); }
    if (el.getAttribute('data-act-change') === 'import' && el.files[0]) {
      var rd = new FileReader(); rd.onload = function () { try { var s = JSON.parse(rd.result); if (!s.r) throw 0; S = s; save(); route(); toast('تم استيراد النسخة بنجاح', 'check'); } catch (x) { toast('الملف غير صالح', 'info'); } }; rd.readAsText(el.files[0]);
    }
  });

  /* ---------------- TV / keyboard spatial navigation ---------------- */
  var FOC = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';
  document.addEventListener('keydown', function (e) {
    var dir = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r' }[e.key];
    if (!dir) { if (e.key === 'Tab') document.documentElement.classList.add('tv-focus'); return; }
    var a = document.activeElement, tag = a && a.tagName;
    if (tag === 'TEXTAREA' || (tag === 'INPUT' && !/^(radio|checkbox|file)$/.test(a.type) && (dir === 'l' || dir === 'r')) || tag === 'SELECT' && (dir === 'u' || dir === 'd')) return;
    if (a.closest && a.closest('.draw-wrap canvas')) return;
    document.documentElement.classList.add('tv-focus');
    var cur = a && a !== document.body ? a.getBoundingClientRect() : { left: innerWidth / 2, right: innerWidth / 2, top: 0, bottom: 0, width: 0, height: 0 };
    var cx = cur.left + cur.width / 2, cy = cur.top + cur.height / 2, best = null, bs = Infinity;
    $$(FOC).forEach(function (el) {
      if (el === a || el.offsetParent === null || el.closest('[hidden]')) return;
      var r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
      var x = r.left + r.width / 2, y = r.top + r.height / 2, dx = x - cx, dy = y - cy, main, cross;
      if (dir === 'd') { if (r.top < cur.bottom - 4 && dy <= 4) return; main = dy; cross = Math.abs(dx); }
      if (dir === 'u') { if (r.bottom > cur.top + 4 && dy >= -4) return; main = -dy; cross = Math.abs(dx); }
      if (dir === 'r') { if (dx <= 4) return; main = dx; cross = Math.abs(dy); }
      if (dir === 'l') { if (dx >= -4) return; main = -dx; cross = Math.abs(dy); }
      var ov = (dir === 'l' || dir === 'r') ? Math.min(r.bottom, cur.bottom) - Math.max(r.top, cur.top) : Math.min(r.right, cur.right) - Math.max(r.left, cur.left);
      var lr = dir === 'l' || dir === 'r', s = ov > 0 ? main + cross * .3 : (lr ? 1500 + main + cross * 2.2 : 100 + main + cross * 1.2); if (s < bs) { bs = s; best = el; }
    });
    if (best) { e.preventDefault(); best.focus({ preventScroll: true }); best.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); var rr = best.getBoundingClientRect(); if (rr.top < 90 || rr.bottom > innerHeight - 20) best.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  });
  document.addEventListener('pointerdown', function () { document.documentElement.classList.remove('tv-focus'); });

  /* ---------------- boot ---------------- */
  function currentNav() {
    if (!S.registered) {
      return [
        ['home', '#/', 'house', 'الرئيسية'],
        ['about', '#/about', 'book-open', 'عن الرحلة']
      ];
    }
    return [
      ['home', '#/', 'house', 'الرئيسية'],
      ['about', '#/about', 'book-open', 'عن الرحلة'],
      ['v', '#/v/responsibility', 'star', 'المسؤولية'],
      ['charter', '#/charter', 'scroll-text', 'الميثاق'],
      ['family', '#/family', 'users', 'أسرتي']
    ];
  }
  function updateNav() {
    var nav = currentNav();
    var topNav = $('.top .nav');
    if (topNav) {
      topNav.innerHTML = nav.map(function (n) { return '<a href="' + n[1] + '" data-nav="' + n[0] + '">' + ic(n[2]) + n[3] + '</a>'; }).join('');
    }
    var tabbar = $('.tabbar');
    if (tabbar) {
      tabbar.innerHTML = nav.map(function (n) { return '<a href="' + n[1] + '" data-nav="' + n[0] + '">' + ic(n[2]) + '<span>' + n[3] + '</span></a>'; }).join('');
    }
    var cloudBadge = $('#cloud-sync-badge');
    if (cloudBadge) {
      cloudBadge.style.display = S.registered ? 'inline-flex' : 'none';
    }
  }
  function shell() {
    var nav = currentNav();
    var so = B.social;
    document.body.insertAdjacentHTML('afterbegin',
      '<a class="sr" href="#main">تخطَّ إلى المحتوى</a><div class="bg-deco" aria-hidden="true"><i class="b1"></i><i class="b2"></i><i class="b3"></i></div>' +
      '<header class="top"><div class="wrap"><a class="brand" href="#/" aria-label="الرئيسية"><img src="assets/img/soadaa.png" alt="" width="48" height="52"><b><span>رحلة</span> القيم الأسرية</b></a>' +
      '<nav class="nav" aria-label="القائمة الرئيسية">' + nav.map(function (n) { return '<a href="' + n[1] + '" data-nav="' + n[0] + '">' + ic(n[2]) + n[3] + '</a>'; }).join('') + '</nav>' +
      '<div class="top-actions">' +
        '<span id="cloud-sync-badge" class="cloud-sync-badge synced" style="' + (S.registered ? '' : 'display:none;') + '" title="حالة المزامنة السحابية مع قاعدة البيانات">' + ic('shield-check') + ' متزامن مع السحابة</span>' +
        (EMBED ? '' : '<a class="icon-btn" href="downloads/rehlat-alqiyam.pdf" download aria-label="تحميل الكتاب PDF" title="تحميل الكتاب PDF">' + ic('download') + '</a>') +
        '<button class="icon-btn" data-act="fullscreen" aria-label="ملء الشاشة" title="ملء الشاشة">' + ic('maximize') + '</button>' +
      '</div></div></header>' +
      '<main id="main" tabindex="-1"></main>' +
      '<footer class="foot"><div class="wrap foot-grid"><div><div class="brand" style="pointer-events:none"><b><span>رحلة</span> القيم الأسرية</b></div><p class="muted small" style="margin-top:.4rem">إعداد: ' + esc(B.author) + ' · جمعية سعداء للتنمية الأسرية</p></div>' +
      '<div class="socials">' +
        '<a class="social" href="' + so.whatsapp + '" target="_blank" rel="noopener"><i style="background:#25D366">' + brand('whatsapp') + '</i><span class="ltr">' + so.phone + '</span></a>' +
        '<a class="social" href="' + so.x + '" target="_blank" rel="noopener" aria-label="إكس"><i style="background:#111">' + brand('x') + '</i><span class="ltr">' + so.handle + '</span></a>' +
        '<a class="social" href="' + so.instagram + '" target="_blank" rel="noopener" aria-label="إنستغرام"><i style="background:linear-gradient(45deg,#F58529,#DD2A7B,#8134AF)">' + brand('instagram') + '</i><span class="ltr">' + so.handle + '</span></a>' +
        '<a class="social" href="' + so.snapchat + '" target="_blank" rel="noopener" aria-label="سناب شات"><i style="background:#FFFC00;color:#111">' + brand('snapchat') + '</i><span class="ltr">' + so.handle + '</span></a>' +
      '</div></div><div class="wrap" style="margin-top:1.5rem">' + partnersSmall() + '</div></footer>' +
      '<nav class="tabbar" aria-label="التنقل">' + nav.map(function (n) { return '<a href="' + n[1] + '" data-nav="' + n[0] + '">' + ic(n[2]) + '<span>' + n[3] + '</span></a>'; }).join('') + '</nav>' +
      '<div class="toast" id="toast" role="status" aria-live="polite"></div>');
    main = $('#main');
  }
  function partnersSmall() { return '<div class="row" style="justify-content:center;gap:2rem;opacity:.95"><img src="assets/img/soadaa.png" alt="جمعية سعداء" style="height:3rem;width:auto" loading="lazy"><img src="assets/img/fund.png" alt="صندوق دعم الجمعيات" style="height:2.6rem;width:auto" loading="lazy"><img src="assets/img/jomaih.svg" alt="الجميح الخيرية" style="height:2.8rem;width:auto" loading="lazy"></div>'; }
  A.fullscreen = function () { var d = document; if (!d.fullscreenElement) { (d.documentElement.requestFullscreen || function () {}).call(d.documentElement); } else d.exitFullscreen(); };

  shell();
  addEventListener('hashchange', route);
  route();

  // مزامنة سحابية هادئة عند بدء تشغيل التطبيق لاسترجاع أحدث تقدم للعائلة من MongoDB
  if (S.registered && S.phone) {
    fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: S.phone, familyName: S.familyName })
    })
    .then(function (res) { return res.json(); })
    .then(function (res) {
      if (res && res.data && res.data.familyData) {
        var fd = res.data.familyData;
        if (fd.familyName) S.familyName = fd.familyName;
        if (Array.isArray(fd.family) && fd.family.length) S.family = fd.family;
        if (fd.charter && typeof fd.charter === 'object') S.charter = fd.charter;
        if (fd.r && typeof fd.r === 'object') {
          for (var k in fd.r) S.r[k] = fd.r[k];
        }
        try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
        updateCloudSyncBadge('synced');
        route();
      }
    })
    .catch(function () {});
  }

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
