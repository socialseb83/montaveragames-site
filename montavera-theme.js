/* montavera-theme.js — the Day/Night toggle for montaveragames.com.
   Dependency-free vanilla JS. Works from file:// and from Pages alike.

   Night is the site's native mode (charcoal ground, bone lettering, the
   scarf's green). Day is the same design remapped onto warm paper — a true
   palette remap, no filters: dark ink on bone, the green kept and deepened
   a touch where it carries text. Day body text measures 5.0–15.4:1 against
   its grounds (WCAG AA is 4.5:1).

   The choice persists in localStorage ('mg-theme') and follows the visitor
   across pages. A first visit defaults to Night, unless the visitor's OS
   prefers light, in which case it defaults to Day. The class is set on
   <html> as this script's first action, before the overrides are injected.
*/
(function () {
  'use strict';

  var KEY = 'mg-theme';
  var root = document.documentElement;

  function stored() {
    try { return window.localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function save(theme) {
    try { window.localStorage.setItem(KEY, theme); } catch (e) { /* private mode: session-only */ }
  }

  var theme = stored();
  if (theme !== 'day' && theme !== 'night') {
    theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches)
      ? 'day' : 'night';
  }

  /* First action: the class, so the overrides below land on a settled root. */
  function apply(t) {
    root.classList.toggle('day', t === 'day');
    root.classList.toggle('night', t !== 'day');
  }
  apply(theme);

  var css =
    /* ---- the toggle pill itself: it lives IN the header, on the
       wordmark's own row — inserted right after the brand anchor and
       carried to the row's empty right-hand space by margin-left:auto.
       (.mg-fixed is only the no-header fallback: the old pinned spot.) ---- */
    '#mg-themebtn{margin-left:auto;flex:none;align-self:center;' +
    'background:#1d1a15;color:#e9dec5;border:1px solid rgba(233,222,197,.45);' +
    'font-family:"Cormorant Garamond",Cormorant,Georgia,serif;font-size:15px;font-weight:600;' +
    'letter-spacing:.08em;padding:10px 16px;border-radius:999px;cursor:pointer;' +
    'box-shadow:0 6px 22px rgba(0,0,0,.5);line-height:1.25;text-align:center;white-space:nowrap;}' +
    '#mg-themebtn.mg-fixed{position:fixed;top:48px;left:18px;z-index:10001;margin-left:0;}' +
    '#mg-themebtn:hover{border-color:#4fae74;}' +
    '#mg-themebtn:focus-visible{outline:2px solid #4fae74;outline-offset:2px;}' +
    'html.day #mg-themebtn{background:#faf4e2;color:#261b0b;border-color:rgba(58,42,18,.55);' +
    'box-shadow:0 6px 22px rgba(80,60,20,.30);}' +
    'html.day #mg-themebtn:hover{border-color:#2e7d4f;}' +
    'html.day #mg-themebtn:focus-visible{outline-color:#1c6e3c;}' +
    /* the generator's first back-link carries its own margin-left:auto;
       following the pill it takes the ordinary gap instead, so the pill's
       auto margin — not two competing ones — sets the right-hand cluster */
    '.topbar-in #mg-themebtn + .back-link{margin-left:1.25rem;}' +
    '@media (max-width:700px){#mg-themebtn{font-size:12px;' +
    'padding:6px 10px;line-height:1.3;}' +
    '#mg-themebtn.mg-fixed{top:44px;left:10px;max-width:40vw;margin-left:0;}' +
    /* the generator's wordmark never shrinks on small screens (the home
       page's own wordmark does, at these same values); at phone width it
       would push the pill off the name's row, so it takes the home
       page's mobile sizing here */
    '.topbar-in .wordmark{font-size:.92rem;letter-spacing:.12em;}' +
    /* some literal pages' .top rows (brand + nav) never wrap; on a phone
       the pill joins the brand's line and the nav drops to a line of its
       own rather than anything squeezing off-screen */
    '.top{flex-wrap:wrap;row-gap:8px;}}' +

    /* ---- shared mounts: the marquee strip and the homepage calendar panel ---- */
    'html.day #mg-marquee{background:#efe4c6;color:#261b0b;border-bottom:1px solid #2e7d4f;}' +
    'html.day #mg-calstrip{background:#efe4c6;color:#261b0b;border-color:#2e7d4f;}' +
    'html.day #mg-calstrip .mg-strip-link{color:#1c6e3c;border-bottom-color:#2e7d4f;}' +
    'html.day #mg-calstrip .mg-strip-link:hover{color:#261b0b;}' +

    /* ---- focus stays visible in daylight ---- */
    'html.day :focus-visible{outline:2px solid #1c6e3c;outline-offset:2px;}' +

    /* ---- the variable-driven pages (home, character generator, calendar):
       one remapping of the shared tokens. html.day (0,1,1) outranks the
       pages' :root (0,1,0), including the home page's prefers-color-scheme
       block, so the visitor's toggle always wins over the OS default. ---- */
    'html.day{color-scheme:light;' +
    '--bg:#f3ead2;--bg-deep:#e9dcba;--panel:#faf4e2;--panel-2:#efe4c6;' +
    '--panel-edge:rgba(58,42,18,.16);--edge-strong:rgba(58,42,18,.45);--edge:#c9b384;' +
    '--bone:#261b0b;--head:#1d1407;--dim:#5a4a2a;--faint:#6e5c33;' +
    '--green:#256b41;--green-hot:#1c6e3c;--glow:rgba(46,125,79,.30);--shadow:rgba(80,60,20,.25);}' +

    /* ---- the literal-colour pages (song sheets, library, wheel room,
       prologue): body, headings, secondary text, hairlines ---- */
    'html.day body{background:#f3ead2;color:#261b0b;}' +
    'html.day h1,html.day h2,html.day h3{color:#1d1407;}' +
    'html.day .mainnav a,html.day .langnav a{color:#5a4a2a;}' +
    'html.day .mainnav a:hover,html.day .mainnav a[aria-current]{color:#1d1407;}' +
    'html.day .byline,html.day .intro,html.day .note{color:#5a4a2a;}' +
    'html.day footer{color:#6e5c33;border-top-color:#d8c69a;}' +
    /* the literal pages set a{color:#e9dec5} globally and library's brand is
       cream outright — in daylight those anchors must come back to ink */
    'html.day .brand,html.day .brand a{color:#1d1407;}' +
    'html.day footer a{color:#5a4a2a;}' +
    'html.day .wrap a:not([class]){color:#256b41;}' +
    'html.day p:first-of-type::first-letter{color:#1d1407;}' +

    /* song sheets */
    'html.day .rule{border-top-color:#d8c69a;}' +
    'html.day ol.howto strong{color:#1d1407;}' +
    'html.day figure.sheet img{border-color:#c9b384;}' +
    'html.day figure.sheet figcaption{color:#5a4a2a;}' +
    'html.day figure.sheet figcaption b{color:#1d1407;}' +

    /* library */
    'html.day .book img{border-color:#c9b384;}' +
    'html.day .book .kicker{color:#256b41;}' +
    'html.day .book .fmt{color:#5a4a2a;}' +
    'html.day .book .btn:hover{color:#256b41;}' +
    'html.day .printonly{border-color:#c9b384;color:#5a4a2a;}' +

    /* prologue: the one red-bordered button would strand cream text on paper */
    'html.day .ask .btn{color:#8f1d24;}' +
    'html.day .ask .btn:hover{color:#6d141b;border-color:#8f1d24;}' +

    /* calendar: literal inks the variables do not reach */
    'html.day .progress .bar{background:#e2d3ac;}' +
    'html.day table.cal td{border-color:#d8c69a;}' +
    'html.day table.cal td.today{background:#dce8cf;}' +
    'html.day .calnav button:hover{color:#f6ecd4;}' +
    'html.day .disputed{border-color:#a68d54;}' +

    /* character generator: dark washes and stamp reds on light panels */
    'html.day textarea{background:rgba(58,42,18,.05);}' +
    'html.day .subsection{background:rgba(58,42,18,.05);}' +
    'html.day .sealed{background:repeating-linear-gradient(45deg,rgba(58,42,18,.04) 0 10px,transparent 10px 20px),#efe4c6;}' +
    'html.day .window-scene{background:linear-gradient(180deg,#e9dcba 0%,#ded0a8 100%);}' +
    'html.day .err{color:#b3372a;}' +
    'html.day .sealed .seal-tag{color:#b3372a;}' +
    'html.day .stamp.red{color:#b3372a;}' +

    /* home: the generator call-to-action's bone-on-dark double frame */
    'html.day .gen-cta{border-color:rgba(58,42,18,.45);outline-color:rgba(58,42,18,.45);}' +

    /* wheel room: panels and the ghost button */
    'html.day .filedbox,html.day .panel{background:#faf4e2;border-color:#c0aa72;}' +
    'html.day .filedbox .kick,html.day .panel .kick,html.day .panel .filedline{color:#5a4a2a;}' +
    'html.day .gapnote{background:#e7ecd9;color:#5a4a2a;}' +
    'html.day .walkcount{color:#5a4a2a;}' +
    'html.day .hint{color:#6e5c33;}' +
    'html.day .btn.ghost{color:#5a4a2a;border-color:#a68d54;}' +
    'html.day .btn.ghost:hover{color:#1d1407;border-color:#256b41;}' +

    /* wheel room: the Moon-Walk Wheel — segments and labels (CSS fills) */
    'html.day .seg{fill:#eee1c0;stroke:#8a6f3c;}' +
    'html.day .seg.alt{fill:#e4d5ae;}' +
    'html.day .seg.zips{stroke:#8a2f23;}' +
    'html.day .seg.sel{fill:#2e7d4f;}' +
    'html.day .seglabel{fill:#4d3d1e;}' +
    'html.day .seglabel.sel{fill:#f6ecd4;}' +
    'html.day .moon{fill:#57482c;}' +
    'html.day .stnum{fill:#77683f;}' +
    'html.day .hub{fill:#261b0b;}' +
    'html.day #wheel circle[fill="#170e06"]{fill:#f3ead2;stroke:#8a6f3c;}' +

    /* wheel room: the Seven-Voices Rosette — petals, centre, and the
       toggleable layers (fills are presentation attributes; CSS wins) */
    'html.day #rosette ellipse[fill="#1d130a"]{fill:#f0e5c8;}' +
    'html.day #rosette circle[fill="#241708"]{fill:#e9dec5;}' +
    'html.day #rosette [stroke="#cdbb92"]{stroke:#8a6f3c;}' +
    'html.day #rosette text[fill="#f6ecd4"]{fill:#261b0b;}' +
    'html.day #rosette text[fill="#cdbb92"]{fill:#6e5c33;}' +
    'html.day #rosette text[fill="#e9dec5"]{fill:#261b0b;}' +
    'html.day #rosette text[fill="#9ad1b1"]{fill:#1c6e3c;}';

  var style = document.createElement('style');
  style.id = 'mg-theme-styles';
  style.textContent = css;
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.id = 'mg-themebtn';
  btn.type = 'button';

  function paint() {
    var day = theme === 'day';
    btn.textContent = day ? '☾ Night Mode' : '☀ Day Mode';
    btn.setAttribute('aria-pressed', day ? 'true' : 'false');
    btn.setAttribute('aria-label', day ? 'Switch to night mode' : 'Switch to day mode');
  }
  paint();

  btn.addEventListener('click', function () {
    theme = (theme === 'day') ? 'night' : 'day';
    apply(theme);
    save(theme);
    paint();
  });

  /* Mount the pill in the header, immediately after the wordmark/brand
     anchor, so it sits on the name's own row in the empty space to its
     right. Each page's header is found through a fallback chain; only
     when no header matches does the pill take the old pinned spot. */
  function mount() {
    var spots = [
      { box: '.head-in', mark: '.wordmark' },    /* home */
      { box: '.topbar-in', mark: '.wordmark' },  /* character generator */
      { box: '.top', mark: '.brand' }            /* calendar, library, song sheets, prologue, wheel room */
    ];
    for (var i = 0; i < spots.length; i++) {
      var box = document.querySelector(spots[i].box);
      if (!box) continue;
      var mark = box.querySelector(spots[i].mark);
      if (!mark) continue;
      mark.parentNode.insertBefore(btn, mark.nextSibling);
      return;
    }
    btn.classList.add('mg-fixed');
    document.body.appendChild(btn);
  }

  if (document.body) {
    mount();
  } else {
    document.addEventListener('DOMContentLoaded', mount);
  }
})();
