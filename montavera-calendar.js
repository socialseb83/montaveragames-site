/* montavera-calendar.js — the live Montaveran calendar engine for montaveragames.com.
   Dependency-free vanilla JS. No fetch: it works from file:// and from Pages alike.

   THE FILED SYSTEM (from the printed book, The Fifty-Six, Form CAL-1):
   - Anchor: Gregorian Monday, October 26, 2026 = Moonsday, Zipsdier 81, Year 4 of the 56th Age.
     The printed book is the Year 5 copy, prepared during Year 4 ("The year has not happened");
     every outside date the book prints is computed from this Year 4 anchor. The 56th Age opened
     on Friday, March 24, 2023 (Hendiber 1, Year 1). For dates before the Age opened, the book's
     method (p.19, "On the Year") gives the day and the month only — "of an earlier volume; the
     Index declines" — so this engine returns year: null with eraNote set for those dates.
     (Ruled by Sebastian, 2026-10-31: Year 4 — stand by the book.)
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

  /* Anchor: the Chicago calendar date 2026-10-26 is day-of-year 137 of Year 4. */
  var ANCHOR_CIVIL = Date.UTC(2026, 9, 26) / MS_PER_DAY;
  var ANCHOR_ABS = (4 - 1) * YEAR_DAYS + (137 - 1); /* absolute day index of the anchor */

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
    var inAge = abs >= 0; /* before the Age opened, the method declines a year (book, p.19) */
    var year = inAge ? Math.floor(abs / YEAR_DAYS) + 1 : null;
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
      eraNote: inAge ? null : 'of an earlier volume',
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

  /* ---- Shared mounts: the marquee strip and the homepage calendar panel ---- */

var WIRE = [
      "A clerk has stamped the same form every morning for nineteen years. The form has not yet been submitted.",
      "Traffic: the square is backed up to the fountain behind a funeral that has not decided where it is going.",
      "A lamp on the east steps lights itself at the same hour each night. No one has filed for it.",
      "Weather desk: one sun this morning, two by lunch. Umbrellas are advised against both.",
      "A ghoul buys yesterday's bread every morning. The baker has begun baking it a day early.",
      "The bonesetter under the clock tower is open late this week. Bring the bone if it has come loose.",
      "The Moon was jealous last night. Every mirror in the lower city has been turned to face the wall.",
      "Conspiracy corner: there is a second Bureau beneath the first. Filed in triplicate, returned in quadruplicate.",
      "A nawn has returned his hat to the hatter, citing the hat's attitude. The hatter has filed a counterclaim.",
      "A cart of ledgers overturned on the hill road. The figures are being gathered by hand. Delays expected.",
      "An oath sworn on the old bridge has been renewed for its hundredth year. The bridge was not consulted.",
      "Theft at the bell foundry: one bell, never rung. Anyone who hears it is asked to come forward.",
      "The queue at the records hall holds one more citizen than the clerks can count in it.",
      "The Moon is glad tonight. Expect warm doorsteps in the lower city and a light fall of song.",
      "The raven over the courthouse has disguised itself as a raven. Its gears are filed as plumage.",
      "The chandler by the north gate sells candles by the hours of dark they outlast. Winter stock is in.",
      "A tortoise elder has signed a petition her grandmother began. It is nearly long enough.",
      "The dead have right of way on the bridge until dawn. The living are asked to wait respectfully.",
      "A permit to whistle after dark was granted. Something in the street has begun whistling back.",
      "A clerk reports that the stamp on the front desk weighs more on Mondays. It has been weighed.",
      "Three suns rose this morning. The sundial in the square has filed for overtime.",
      "Conspiracy corner: a man outside the mint insists the ravens are machines. The ravens deny it, audibly.",
      "A citizen has been seen copying the names off a door with no house behind it.",
      "The crossing at the square is closed while a parade rehearses its silence. Use the long way round.",
      "Lost Property has received a hat, a glove, and a quiet afternoon. The afternoon remains unclaimed.",
      "The fishmonger at the harbor steps guarantees every fish was alive this morning, and most are again.",
      "The wooden parrot in the tax office was carved with its beak closed. It is now slightly open.",
      "Weather desk: fog in the old quarter, thick enough to sign. Several have.",
      "The night clerk has begun answering petitions before they are written. The accuracy is under review.",
      "A pickpocket was caught returning wallets heavier than he found them. Charges are under discussion.",
      "A debt signed in a language no clerk can read has come due. It is being paid in the same language.",
      "A gurunkin has been elected to the bridge committee unopposed for the fortieth time. No one recalls voting.",
      "A tentacled citizen has run the lending hall for forty years. She has never once charged a late fee.",
      "The undertaker beside the east yard offers fittings for the living. Appointments kept in either direction.",
      "The bells of the old quarter rang thirteen at noon. The extra hour has been entered into the record.",
      "Traffic: the ghoul queue at the records hall now reaches the bakery. Bread is being passed back by hand.",
      "A man has asked to be buried in the queue, so as not to lose his place. The request is pending.",
      "Some citizens maintain that Window 4 has a back door. They are asked to stop knocking on it.",
      "Someone leaves seed for the ravens each morning. The ravens cannot eat it, and keep it anyway.",
      "A translucent citizen reports a stolen shape. It was last seen at the market, wearing someone else.",
      "Window 4 is closed. A citizen has left it a letter, unsealed, as a courtesy.",
      "Weather: the negative sun is expected by afternoon. Extra shade will be issued at the square.",
      "A translucent citizen wore a judge's shape to lunch. Two cases were settled before the soup.",
      "The mapmaker under the tower redraws the city on request. Changes are not guaranteed to hold.",
      "Every night at the third hour, a door on the canal side is unlocked from within. The house is empty.",
      "A tentacled citizen has taken the night watch on the harbor wall. The harbor has never been so well lit.",
      "A gurunkin has paid in advance for the view from his window, for the next ninety years.",
      "A wedding has stalled the hill road. The groom waits on the bride's shadow, which is fashionably late.",
      "The negative sun has risen. Citizens with two shadows are asked to declare the second.",
      "Overheard in the queue: the Bureau's founding papers were signed after the Bureau. Unsourced.",
      "A clerk notes that one name appears in the witness column of every birth record this month.",
      "The locksmith by the courthouse opens any door that agrees to be opened. Arguments extra.",
      "A nawn has filed a complaint against the rain. The rain has been asked to respond in writing.",
      "A coat was stolen from the lending hall cloakroom. It was returned the next day, warmer.",
      "The Moon was hopeful last night. Twelve proposals were filed before dawn, and eleven were accepted.",
      "Weather desk: light rain, falling in the order it was filed.",
      "A caller brings two teapots to the Under-Market. Only one ever comes back.",
      "Traffic advisory: the bridge is one-way today. Which way has not been announced.",
      "A citizen has been fined for the volume of his thoughts. He is appealing in silence.",
      "A citizen insists the city's clocks are wound by someone who lives inside them. The clocks decline comment.",
      "A ghoul has taught the same schoolroom for three generations. Attendance has been perfect.",
      "The bakery behind the Bureau bakes a loaf for every petition denied. It is rarely short of flour.",
      "An inspector found the old tower taller on the inside. The finding was rounded down.",
      "The tortoise elder has stopped at the center of the square to think. Carts are rerouting in her honor.",
      "Someone has filed a change of address for the river. No forwarding address was given.",
      "A forger was arrested for perfect signatures. Real ones, the court explained, are never that confident.",
      "An oath of silence kept for sixty years was broken today with a single word. The word is sealed.",
      "Notice from the harbor: the tide is in, and has asked to stay through Thursday.",
      "The Bureau reminds citizens that dreams may not be sublet.",
      "Conspiracy corner: some hold that the wooden parrots were never carved. They are asked not to say so indoors.",
      "A raven has guarded the mint all week, believing itself invisible. The guards have agreed not to say.",
      "The tinker under the market arches mends kettles, clocks, and anything that ticks when it should not.",
      "Footsteps were heard in the archive after closing. They were filed in the correct order.",
      "A man has reported the theft of an hour. A suspect hour has been detained.",
      "A citizen has asked the Bureau to forget her. The request has been noted, and filed permanently.",
      "Weather: three suns and a breeze. The city recommends one hat per sun.",
      "At the end of a street that ends, a lantern is kept lit by no one.",
      "Traffic: a driverless cart is crossing the market at walking pace. It holds the correct permit.",
      "The tortoise elder in the square has spoken her first word of the decade. Scribes are deciding what it meant.",
      "A clerk misfiled a citizen under weather. He is expected by the afternoon.",
      "A tailor reports a customer measured every year, who is always an inch further away.",
      "The dressmaker by the clock tower takes measurements in silence. She says the body speaks plainly enough.",
      "Overdue books have begun returning themselves. The fines are being charged to the shelves.",
      "A burglar left a note apologizing for the mess. The house was otherwise untouched, and cleaner.",
      "A clerk was seen at Window 4 after hours. The clerk insists the window was closed.",
      "Overheard at the bridge: the old wall was built to keep something in, not out. Unsourced.",
      "The same procession has crossed the oldest bridge once every hundred years. It is due next spring.",
      "The Moon was jealous at dusk and glad by midnight. Citizens are asked to keep up.",
      "A gurunkin has opened a shop that sells nothing. Business is steady.",
      "Delays at the north gate. A caravan of clerks is being checked for paperwork by other clerks.",
      "The Moon is sad tonight. Lamplighters are asked to keep the flames low and the windows warm.",
      "The hatter beside the bridge steps fits hats to the head you intend to have.",
      "A sealed petition has sat on one desk for a century. Each clerk who sits there signs that it stayed shut.",
      "A citizen has been accused of feeding the stray shadows. He has not denied it.",
      "The parade permit lists one more float than took part. Witnesses agree it was lovely.",
      "Conspiracy corner: the Bureau files the weather a week ahead, and the sky merely complies.",
      "A ghoul has submitted his own obituary for correction. Two dates were wrong, and one adjective.",
      "The lantern-seller at the night market has extended his hours, at the request of the dark.",
      "Someone buys every candle in the chandlery on the last night of the month. None is ever seen lit.",
      "Weather desk: rain over the east yard only. The dead are reported to be enjoying it.",
      "Rain fell upward over the counting house for six minutes. Nothing was counted during that time.",
      "Two carts met head-on in the narrow lane and have been negotiating since morning. Neither has filed.",
      "A nawn has bowed to the statue outside the Bureau every morning for thirty years. Today it was elsewhere.",
      "A teapot was left unattended outside the Under-Market. Its owner should collect it before it collects someone.",
      "A request to be in two places at once was denied for lack of a second signature.",
      "The apothecary behind the courthouse sells remedies for most ailments and an apology for the rest.",
      "An old soldier still stands his post at a gate the city removed. The Bureau has not told him.",
      "Burglary on the hill: nothing taken, everything moved two inches to the left.",
      "A tentacled citizen has knitted a scarf long enough to cross the square. She has begun the second.",
      "A clerk swears the archive is longer every year. The archivists say it is filed that way.",
      "Gravekeepers report that the dead in the east yard have begun to queue. No counter opens there.",
      "Traffic: the gurunkin umbrella-makers' procession is passing through the square. Very orderly, very wet.",
      "A citizen who sneezed during the annual map-matching has been asked to sign for any changes.",
      "The wooden parrot in the barbershop has been asked not to repeat anything. It is carved. It complies.",
      "A key was found that fits every lock in the records hall but one. That lock has been moved somewhere quieter.",
      "Weather: the first sun is out alone this morning, small and red. Speak softly near it.",
      "The Moon was loyal last night. Every lost dog in the city was home before the bells.",
      "The cooper at the harbor end builds barrels that keep anything, secrets included, for a modest surcharge.",
      "The wooden parrot in a tavern has stopped listening. The tavern is closed pending inquiry.",
      "A citizen saw a raven take off its feathers to rest. No one else saw it. The raven agrees.",
      "A man applied for permission to grieve. The form was approved before he finished writing it.",
      "Theft reported: one doorway, from a house on the hill. The house is managing.",
      "A raven has filed a complaint that it is being watched.",
      "The bridge toll is waived for the dead this week. The living are asked to cover their share.",
      "Midnight arrived late. The Bureau has issued a warning.",
      "Conspiracy corner: the map is matched every year, so where is the original kept? The question is filed.",
      "A caller has come back from the Under-Market, teapot still warm, holding a receipt in a stranger's hand.",
      "A citizen has been fined for queuing too well. Others were made to look careless.",
      "A wedding was postponed when both families arrived with the same grandmother. Records are reconciling.",
      "The glassblower under the bell tower makes lanterns that keep the shape of their first flame.",
      "A lamplighter has relit the same lamp every night for a century. He is not the first lamplighter.",
      "Weather desk: wind from the north, smelling of old paper. Windows are best kept closed.",
      "The night clerk has requested a second night. Under consideration.",
      "A volunteer directed traffic at the square during the procession. No one was lost, and two were found.",
      "A blind cartographer has drawn the city perfectly from the sound of its bells.",
      "A nawn reports his reflection stolen. Mirrors along the avenue are being questioned.",
      "A translucent citizen returned a borrowed shape with a small dent. The owner says it suits him better now.",
      "Some insist the Moon reads the city's filings before choosing a mood. The Bureau has begun writing kindly.",
      "A staircase in the old quarter has one more step going down than going up. Do not linger on it.",
      "The cobbler by the records hall resoles shoes in a day. Souls take longer and are referred elsewhere.",
      "Someone has been amending the census in a careful hand, one name at a time. Every name is real.",
      "Heavy foot traffic at the cemetery gate this evening. It is the anniversary of nothing in particular.",
      "A gurunkin has finished a clock that keeps the time of some other city.",
      "A clerk was arrested for stamping too slowly. He was released, eventually.",
      "A permit to rest in the square was granted to the fog. It has overstayed.",
      "Weather: snow tonight in the old quarter and nowhere else. The old quarter did not ask.",
      "The well behind the courthouse has begun answering questions, but only those submitted in writing.",
      "The pawnshop under the arches accepts any object of value, and some objects that are merely confident.",
      "A ghoul has proposed to a living citizen. The Bureau has no objection, and one form.",
      "A citizen reports that his house now faces the other way. The street insists it always has.",
      "The third sun has not set. The other two are said to be waiting for it.",
      "Traffic: the queue to the Bureau's front counter is flowing well. It ends at a wall, as before.",
      "A clerk has been filing anonymous complaints about the clerk for years. Each has been upheld.",
      "The ferryman at the canal has raised his fare by one coin. The other coin is for the way back.",
      "Something taps on the inside of the city wall at the same hour every night.",
      "Conspiracy corner: a man claims every clerk is the same clerk. He has filed this with six of them.",
      "A nawn in an immaculate suit sweeps the poorhouse floor before dawn. He has asked that this not be filed.",
      "Thieves are stealing umbrellas, but only on clear days. Motive unknown. The forecast is a suspect.",
      "An heir has inherited a key, a debt, and the duty to open a door every seventh year. The door is overdue.",
      "Weather desk: the Moon is mad. Hail is expected on anyone who says otherwise.",
      "A citizen requested a refund for a bad dream. It was issued in the form of a worse one.",
      "The bookbinder by the lending hall repairs broken spines, the reader's included, on request.",
      "The raven atop the bell tower counts the citizens who look up. Its gears were heard.",
      "A queue has formed outside a door painted on a wall. It is moving.",
      "A street sweeper found a letter addressed to the city. It was postmarked next year.",
      "Fire at the candle works, quickly put out. The flames have been fined for leaving the premises.",
      "A tortoise elder keeps a grudge between two families. She alone still knows why.",
      "A sailor came home after forty years at sea to find his chair still warm.",
      "A citizen was found standing in the wrong century. He has been asked to queue like anyone else.",
      "Traffic: the hill road is closed to carts while the hill is resurveyed. The hill has been patient.",
      "Every bell in the city rang once at the same moment. No ringer was on shift.",
      "Some say the Under-Market predates the city. Others say the reverse. Both theories are sold there.",
      "A pastry shop has been licensed to sell sweetness. Bitterness remains under review.",
      "The barber under the clock tower shaves the living on weekdays and the dead by appointment.",
      "A woman has opened her window every night for fifty years for a bird that never came. Tonight it came.",
      "A gurunkin smuggled sunlight under the negative sun. Charges were dropped; he had shared it.",
      "An auditor found a coin in the treasury that appears in no ledger. It is kept alone in a locked room.",
      "Weather: a warm wind is passing through the lower city, apologizing for the cold one.",
      "The Moon was mad last night. All appeals filed after dark were denied, including those filed before.",
      "A citizen was fined for returning a book unread. The book has been reshelved, offended.",
      "The old wall at the city's edge has been patched with stones nobody brought.",
      "A carriage was seen driving itself through the old quarter. It was later found parked, ashamed.",
      "A citizen was declared missing in error. He cannot find the office that would know.",
      "The tea house beside the bridge pours one cup more than ordered. It is for whoever arrives next.",
      "A ghoul grows roses that bloom only for funerals. They are always ready in time.",
      "Conspiracy corner: the ravens' disguise fools no one, which is exactly what they want you to think.",
      "A sealed vault was opened for its centennial inspection. It held a smaller vault, and a note: not yet.",
      "A citizen says he was followed home by a staircase. The staircase has an alibi.",
      "A clerk has refused to stamp a form on the grounds that it was too honest.",
      "Weather desk: clear skies, with a chance of being watched.",
      "Street musicians have been permitted to play at funerals. Several of the dead have tipped.",
      "Traffic: delays on the long road behind a ceremonial march that set out a century ago. It is nearly here.",
      "A ship arrived in the harbor with no crew and every cabin made up. The harbor master has signed for it.",
      "The scribe under the arches writes letters for those who cannot, and for those who should not.",
      "A citizen slept through the last three suns. He reports feeling rested and slightly older than allowed.",
      "A clerk has been commended for misplacing nothing in thirty years. The desk is being checked for drawers.",
      "Someone has been paying the lamp tax for a street that went dark a century ago. The lamps are still paid.",
      "Crime is down this month in the lower city. A constable suspects it is merely hiding.",
      "The great clock in the square stopped at noon. The city has agreed to continue anyway.",
      "The Moon is loyal tonight. Doors left unlocked will stay that way, and come to no harm."
    ];

  /* The wire rides in short sections on a conveyor (a single ribbon holding
     all 200 lines is far too wide for phone browsers to move). Each section
     stays under ~320 characters; the track carries section N beside N+1.
     The scroll is driven by requestAnimationFrame, NOT a CSS animation:
     the CSS-animated builds scrolled in desktop test browsers yet sat
     frozen on Sebastian's iPhone (2026-11-05), so the transform is now
     written by script every frame, measured off the live track so the
     pace (~5.75 characters per second) holds at any font size. At each
     seam the frame is identical, so the strip reads as one endless
     scroll. News only — no date, moon, suns, or horoscope header
     (Sebastian, 2026-11-05). */
  function renderWire(marquee) {
    var MAXLEN = 320;
    var sections = [];
    var cur = '';
    for (var i = 0; i < WIRE.length; i++) {
      var piece = WIRE[i] + ' \u2726 ';
      if (cur && cur.length + piece.length > MAXLEN) {
        sections.push(cur);
        cur = piece;
      } else {
        cur += piece;
      }
    }
    if (cur) sections.push(cur);
    if (!sections.length) return;
    var track = document.createElement('span');
    track.className = 'mg-track';
    track.style.animation = 'none'; /* the scroller below owns the transform */
    var secA = document.createElement('span');
    var secB = document.createElement('span');
    track.appendChild(secA);
    track.appendChild(secB);
    marquee.innerHTML = '';
    marquee.appendChild(track);
    var idx = 0;
    function load() {
      secA.textContent = sections[idx % sections.length];
      secB.textContent = sections[(idx + 1) % sections.length];
    }
    load();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return; /* the reader's device asked for stillness; the wire stands still */
    }
    var pos = 0;
    var last = null;
    function frame(ts) {
      if (last === null) last = ts;
      var dt = Math.min((ts - last) / 1000, 0.05);
      last = ts;
      var seam = secA.offsetWidth;
      if (seam > 0) {
        var speed = seam / (sections[idx % sections.length].length / 5.75);
        pos += speed * dt;
        if (pos >= seam) {
          pos -= seam;
          idx++;
          load();
        }
        track.style.transform = 'translateX(' + (-pos) + 'px)';
      }
      window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  var stylesInjected = false;
  function injectStyles() {
    if (stylesInjected || document.getElementById('mg-cal-styles')) { stylesInjected = true; return; }
    stylesInjected = true;
    var css =
      '#mg-marquee{overflow:hidden;white-space:nowrap;background:#161009;color:#e9dec5;' +
      'font-family:"Cormorant Garamond",Cormorant,Georgia,serif;font-size:15px;letter-spacing:.14em;' +
      'padding:7px 0;border-bottom:1px solid #2e7d4f;line-height:1.3;}' +
      '#mg-marquee .mg-track{display:inline-block;white-space:nowrap;will-change:transform;}' +
      '#mg-calstrip{width:calc(100% - 2.5rem);max-width:1140px;margin:36px auto 44px;' +
      'padding:22px 26px;background:#161009;border:1px solid #2e7d4f;color:#e9dec5;' +
      'text-align:center;font-family:"Cormorant Garamond",Cormorant,Georgia,serif;}' +
      '#mg-calstrip .mg-strip-date{display:block;font-size:clamp(21px,3.4vw,30px);' +
      'font-weight:600;letter-spacing:.05em;line-height:1.25;}' +
      '#mg-calstrip .mg-strip-link{display:inline-block;margin-top:10px;font-size:18px;' +
      'letter-spacing:.06em;color:#9ad1b1;text-decoration:none;' +
      'border-bottom:1px solid #2e7d4f;padding-bottom:2px;}' +
      '#mg-calstrip .mg-strip-link:hover{color:#f6ecd4;}' +
      '#mg-calstrip .mg-strip-link:focus-visible{outline:2px solid #4fae74;outline-offset:3px;}';
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
      renderWire(marquee);
    }
    var strip = document.getElementById('mg-calstrip');
    if (strip) {
      injectStyles();
      var t = montaveranDate(now);
      strip.innerHTML = '';
      var dateEl = document.createElement('span');
      dateEl.className = 'mg-strip-date';
      dateEl.textContent = '✶ Today in Montavera — ' + t.weekday + ', ' + t.month + ' ' +
        t.day + ', Year ' + t.year + ' of the 56th Age ✶';
      var stripLink = document.createElement('a');
      stripLink.className = 'mg-strip-link';
      stripLink.href = 'calendar.html';
      stripLink.textContent = 'See the calendar & today’s horoscopes →';
      strip.appendChild(dateEl);
      strip.appendChild(stripLink);
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
