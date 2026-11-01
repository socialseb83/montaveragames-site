/* Reference renderer for the Breath Reading. Pure integer arithmetic; no hashing
   libraries, no randomness. Tomek's renderer must produce identical output. */
(function (root) {
  var M = 2147483647, A = 48271;               // MINSTD modulus and multiplier
  var ORDER = ['hendiber','sunmanber','zipsdier','mourndier','gloomber','teadber',
               'quillder','frostder','shroudber','chandber','feastber','oldber'];
  var STREAM = { trance: 1, interpretation: 2, moon: 3 };
  var SHARED = 12;                              // breath slot used for texts everyone shares

  function mix(s) {                             // two MINSTD steps
    var x = (s % (M - 1)) + 1;
    x = (A * x) % M;                            // A*x < 2^53: exact in doubles
    x = (A * x) % M;
    return x;
  }
  function seed(year, doy, slot, stream) {      // ((Y*1000 + D)*100 + slot)*100 + stream
    return ((year * 1000 + doy) * 100 + slot) * 100 + stream;
  }
  function pick(arr, year, doy, slot, stream) {
    var s = seed(year, doy, slot, stream), h = mix(s), i = h % arr.length;
    return { seed: s, hash: h, index: i, text: arr[i] };
  }
  function sunCount(S, doy) { return S.sunCount[(doy - 1) % 56]; }
  function band(phaseDay) {
    return phaseDay <= 7 ? 'new' : phaseDay <= 14 ? 'waxing' : phaseDay <= 21 ? 'full' : 'waning';
  }
  function standing(S, breath, voice) {
    var b = S.breaths[breath];
    return voice === b.home ? 'home' : voice === b.pull ? 'pull' : 'neither';
  }
  // Inputs: S = window.MONTAVERA_SKY; year (integer, today's); doy (1-392);
  // phaseDay (1-28); breath (month key); filingDoy (1-392, optional); answers [a1, a2] (optional)
  function read(S, year, doy, phaseDay, breath, filingDoy, answers) {
    var slot = ORDER.indexOf(breath), c = String(sunCount(S, doy)), out = { sunCount: +c };
    out.trance = pick(S.tranceBank[c][breath] || S.tranceBank[c].generic, year, doy, slot, STREAM.trance);
    out.interpretation = pick(S.interpretationBank[c][breath] || S.interpretationBank[c].generic, year, doy, slot, STREAM.interpretation);
    var mood = S.moodByDay[(doy + 390) % 392];  // night D-1: index D-2, day 1 wraps to 391
    out.mood = mood; out.band = band(phaseDay);
    out.moon = pick(S.moonBank.byMood[mood][out.band], year, doy, SHARED, STREAM.moon);
    out.prep = (S.prep[mood] && S.prep[mood][breath]) || null;   // null: show mood text alone
    if (filingDoy) {
      var bend = S.wrinkleBend[String(sunCount(S, filingDoy))], fmood = S.moodByDay[filingDoy - 1];
      out.wrinkle = { bend: bend, mood: fmood, text: S.wrinkles[fmood][bend] };
    }
    var v1 = S.moods[mood].voice, b = S.breaths[breath];
    var v2 = (b.pull === v1) ? b.home : b.pull;  // fallback: home Voice second
    out.listening = { q1: v1, q2: v2, questions: [S.listening.questions[v1], S.listening.questions[v2]] };
    if (answers) {
      var k1 = v1 + '|' + answers[0] + '|' + standing(S, breath, v1);
      var k2 = v2 + '|' + answers[1] + '|' + standing(S, breath, v2);
      out.listening.keys = [k1, k2];
      out.listening.line = S.listening.lines[k1] + ' ' + S.listening.lines[k2];
    }
    return out;
  }
  root.MONTAVERA_SKY_REFERENCE = { mix: mix, seed: seed, read: read, ORDER: ORDER };
})(typeof window !== 'undefined' ? window : globalThis);
