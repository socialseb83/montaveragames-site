/* montavera-calendar.js — the live Montaveran calendar engine for montaveragames.com.
   Dependency-free vanilla JS. No fetch: it works from file:// and from Pages alike.

   THE FILED SYSTEM (from the printed book, The Fifty-Six, Form CAL-1):
   - Anchor: Gregorian Monday, October 26, 2026 = Moonsday, Zipsdier 81, Year 5 of the 56th Age.
   - Months in order, with lengths: Hendiber 28, Sunmanber 28, Zipsdier 84, Mourndier 28,
     Gloomber 28, Teadber 28, Quillder 28, Frostder 28, Shroudber 28, Chandber 28,
     Feastber 28, Oldber 28. (The printed book files the eighth month as "Frostder".)
     The year is 392 days. Every month opens on Feastday.
   - Week, in order: Feastday, Shroudsday, Sunsday, Moonsday, Twinsday, Whispersday, Ghoulday.
     Day-of-year 1 is a Feastday; Zipsdier 81 is day-of-year 137 and falls on Moonsday.
   - The white moon: new on the 4th, first quarter on the 11th, full on the 18th,
     last quarter on the 25th — always on Moonsdays. In the 84-day Zipsdier the
     28-day phase cycle repeats within the month.
   - The 392-day cycle repeats with only the year number advancing.
   - "Today" is read on America/Chicago.
*/
(function (global) {
  'use strict';

  var MONTHS = [
    { name: 'Hendiber', days: 28 },
    { name: 'Sunmanber', days: 28 },
    { name: 'Zipsdier', days: 84 },
    { name: 'Mourndier', days: 28 },
    { name: 'Gloomber', days: 28 },
    { name: 'Teadber', days: 28 },
    { name: 'Quillder', days: 28 },
    { name: 'Frostder', days: 28 },
    { name: 'Shroudber', days: 28 },
    { name: 'Chandber', days: 28 },
    { name: 'Feastber', days: 28 },
    { name: 'Oldber', days: 28 }
  ];
  var WEEKDAYS = ['Feastday', 'Shroudsday', 'Sunsday', 'Moonsday', 'Twinsday', 'Whispersday', 'Ghoulday'];
  var YEAR_DAYS = 392;
  var MS_PER_DAY = 86400000;

  /* Anchor: the Chicago calendar date 2026-10-26 is day-of-year 137 of Year 5. */
  var ANCHOR_CIVIL = Date.UTC(2026, 9, 26) / MS_PER_DAY;
  var ANCHOR_ABS = (5 - 1) * YEAR_DAYS + (137 - 1); /* absolute day index of the anchor */

  var MONTH_STARTS = [];
  (function () {
    var acc = 0;
    for (var i = 0; i < MONTHS.length; i++) { MONTH_STARTS.push(acc); acc += MONTHS[i].days; }
  })();

  function mod(n, m) { return ((n % m) + m) % m; }

  /* The Chicago calendar date (and clock) for a Date, via Intl — UTC-safe. */
  function chicagoParts(date) {
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23'
    });
    var parts = fmt.formatToParts(date), out = {};
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type !== 'literal') out[parts[i].type] = parseInt(parts[i].value, 10);
    }
    return out;
  }

  /* Resolve any accepted input to a civil (Chicago) calendar day number.
     Accepts: a Date, a 'YYYY-MM-DD' string, or {year, month, day}. */
  function civilDayOf(input) {
    if (typeof input === 'string') {
      var m = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]) / MS_PER_DAY;
      input = new Date(input);
    }
    if (input && typeof input === 'object' && !(input instanceof Date) &&
        typeof input.year === 'number' && typeof input.month === 'number') {
      return Date.UTC(input.year, input.month - 1, input.day || 1) / MS_PER_DAY;
    }
    var d = (input instanceof Date) ? input : new Date();
    var p = chicagoParts(d);
    return Date.UTC(p.year, p.month - 1, p.day) / MS_PER_DAY;
  }

  /* Phase name for a phase day (1–28). The four filed points are named as the
     book names them (new 4th, first quarter 11th, full 18th, last quarter 25th).
     Other days are described plainly from their position in the cycle — computed
     text, not a quotation. The book uses "waxing"/"waning" and (for the last
     days) "crescent"; it never uses "gibbous", so neither does this engine. */
  function phaseNameFor(phaseDay) {
    if (phaseDay === 4) return 'new moon';
    if (phaseDay === 11) return 'first quarter moon';
    if (phaseDay === 18) return 'full moon';
    if (phaseDay === 25) return 'last quarter moon';
    if (phaseDay < 4) return 'the waning crescent moon, toward new';
    if (phaseDay < 11) return 'the waxing moon, toward the first quarter';
    if (phaseDay < 18) return 'the waxing moon, toward full';
    if (phaseDay < 25) return 'the waning moon, toward the last quarter';
    return 'the waning crescent moon, toward new';
  }

  /* montaveranDate(date) → the Montaveran date for a Gregorian date.
     Purely computed from the anchor; works backwards before Year 5's start
     and forwards past its end, the year number alone advancing. */
  function montaveranDate(input) {
    var diff = civilDayOf(input === undefined ? new Date() : input) - ANCHOR_CIVIL;
    var abs = ANCHOR_ABS + diff;
    var year = Math.floor(abs / YEAR_DAYS) + 1;
    var dayOfYear = mod(abs, YEAR_DAYS) + 1;

    var monthIndex = 0;
    for (var i = 0; i < MONTHS.length; i++) {
      if (dayOfYear > MONTH_STARTS[i] + MONTHS[i].days) monthIndex = i + 1;
    }
    var day = dayOfYear - MONTH_STARTS[monthIndex];
    var phaseDay = mod(day - 1, 28) + 1;

    return {
      weekday: WEEKDAYS[mod(dayOfYear - 1, 7)],
      day: day,
      month: MONTHS[monthIndex].name,
      monthIndex: monthIndex,
      dayOfYear: dayOfYear,
      year: year,
      age: 56,
      phaseDay: phaseDay,
      phaseName: phaseNameFor(phaseDay),
      isNew: phaseDay === 4,
      isFirstQuarter: phaseDay === 11,
      isFull: phaseDay === 18,
      isLastQuarter: phaseDay === 25,
      daysToFull: mod(18 - phaseDay, 28),
      daysToNew: mod(4 - phaseDay, 28),
      /* Illumination of the white moon, 0 at new and 1 at full (for drawing). */
      moonIllumination: (1 - Math.cos(2 * Math.PI * mod(phaseDay - 4, 28) / 28)) / 2
    };
  }

  /* The Montaveran date for a day-of-year within a given year (for browsing). */
  function montaveranFromDayOfYear(year, dayOfYear) {
    var abs = (year - 1) * YEAR_DAYS + (dayOfYear - 1);
    var civil = ANCHOR_CIVIL + (abs - ANCHOR_ABS);
    var dt = new Date(civil * MS_PER_DAY);
    return montaveranDate({ year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() });
  }

  /* Fraction of the Chicago day elapsed (0–1), and as a whole percentage. */
  function dayProgress(date) {
    var p = chicagoParts(date instanceof Date ? date : new Date());
    return ((p.hour * 3600) + (p.minute * 60) + (p.second || 0)) / 86400;
  }
  function dayProgressPercent(date) { return Math.floor(dayProgress(date) * 100); }

  /* ---- Shared mounts: the marquee strip and the pinned calendar button ---- */

  function marqueeSegment(now) {
    var t = montaveranDate(now);
    return '✶ Today in Montavera — ' + t.weekday + ', ' + t.month + ' ' + t.day +
      ', Year ' + t.year + ' of the 56th Age · the moon: ' + t.phaseName +
      ' · ' + dayProgressPercent(now) + '% of the day gone ✶ ';
  }

  var stylesInjected = false;
  function injectStyles() {
    if (stylesInjected || document.getElementById('mg-cal-styles')) { stylesInjected = true; return; }
    stylesInjected = true;
    var css =
      '#mg-marquee{overflow:hidden;white-space:nowrap;background:#161009;color:#e9dec5;' +
      'font-family:"Cormorant Garamond",Cormorant,Georgia,serif;font-size:15px;letter-spacing:.14em;' +
      'padding:7px 0;border-bottom:1px solid #2e7d4f;line-height:1.3;}' +
      '#mg-marquee .mg-track{display:inline-block;white-space:nowrap;animation:mg-scroll 120s linear infinite;}' +
      '@keyframes mg-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}' +
      '@media (prefers-reduced-motion: reduce){#mg-marquee .mg-track{animation:none}}' +
      '#mg-calbtn{position:fixed;right:18px;top:48px;z-index:9999;background:#2e7d4f;color:#f6ecd4;' +
      'font-family:"Cormorant Garamond",Cormorant,Georgia,serif;font-size:17px;letter-spacing:.06em;' +
      'text-decoration:none;padding:11px 18px;border-radius:999px;border:1px solid #f6ecd4;' +
      'box-shadow:0 6px 22px rgba(0,0,0,.55);}' +
      '#mg-calbtn:hover{background:#35965e;}';
    var style = document.createElement('style');
    style.id = 'mg-cal-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function renderMounts() {
    var now = new Date();
    var marquee = document.getElementById('mg-marquee');
    if (marquee) {
      injectStyles();
      var segment = marqueeSegment(now);
      var half = '';
      for (var i = 0; i < 6; i++) half += segment;
      marquee.innerHTML = '';
      var track = document.createElement('span');
      track.className = 'mg-track';
      track.textContent = half + half; /* two identical halves = a seamless loop */
      marquee.appendChild(track);
    }
    var btn = document.getElementById('mg-calbtn');
    if (btn) {
      injectStyles();
      var t = montaveranDate(now);
      btn.textContent = 'Click Here · The Fifty-Six · ' + t.month + ' ' + t.day;
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderMounts);
    } else {
      renderMounts();
    }
  }

  var api = {
    montaveranDate: montaveranDate,
    montaveranFromDayOfYear: montaveranFromDayOfYear,
    dayProgress: dayProgress,
    dayProgressPercent: dayProgressPercent,
    MONTHS: MONTHS,
    WEEKDAYS: WEEKDAYS,
    YEAR_DAYS: YEAR_DAYS
  };
  global.MontaveraCalendar = api;
  global.montaveranDate = montaveranDate;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
