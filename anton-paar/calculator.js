(function (root) {
  var CONST = 242.4, MASK_MAX = 13;

  function calc(R, alpha, m) {
    var L = R - CONST;
    var x = L * Math.tan(alpha / 2);
    return { L: L, x: x, W: m + 2 * x, Wmin: 2 * x };
  }

  function reverse(R, alpha, T) {
    var c = calc(R, alpha, 0);
    var raw = T - 2 * c.x;
    var status = raw <= 0 ? 'impossible' : raw > MASK_MAX ? 'capped' : 'ok';
    var m = status === 'impossible' ? 0 : Math.min(raw, MASK_MAX);
    return { mMax: m, raw: raw, status: status, Wmin: c.Wmin };
  }

  root.MaskCalc = { calc: calc, reverse: reverse, MASK_MAX: MASK_MAX };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.MaskCalc;
  if (typeof document === 'undefined') return;

  var $ = function (id) { return document.getElementById(id); };
  var f2 = function (v) { return v.toFixed(2); };

  function update() {
    var R = parseFloat($('radius').value), a = parseFloat($('alpha').value);
    var mRaw = $('mask').value, m = parseFloat(mRaw);
    var warn = $('mask-warning');
    if (isNaN(m)) {
      $('mask').classList.add('input-warning');
      warn.hidden = false;
      warn.textContent = 'Enter a mask opening between 0 and ' + MASK_MAX + ' mm.';
      ['out-w', 'out-x', 'out-l'].forEach(function (id) { $(id).textContent = '—'; });
      $('formula').textContent = '—';
    } else {
      var bad = m < 0 || m > MASK_MAX;
      $('mask').classList.toggle('input-warning', bad);
      warn.hidden = !bad;
      if (bad) warn.textContent = 'Mask opening ' + m + ' mm is outside the instrument range of 0 to ' + MASK_MAX + ' mm; the calculation is only valid below 14 mm.';
      var c = calc(R, a, m);
      $('out-w').textContent = f2(c.W) + ' mm';
      $('out-x').textContent = f2(c.x) + ' mm';
      $('out-l').textContent = f2(c.L) + ' mm';
      $('formula').textContent = 'W = ' + f2(m) + ' + 2 × ' + f2(c.L) + ' × tan(' + a + '/2) = ' + f2(m) + ' + 2 × ' + f2(c.x) + ' = ' + f2(c.W) + ' mm';
    }

    var T = parseFloat($('target').value), aRev = parseFloat($('alpha-rev').value), Rrev = parseFloat($('radius-rev').value);
    var msg = $('rev-message'), note = $('out-mmax-note');
    var base = calc(Rrev, aRev, 0);
    $('out-wmin').textContent = f2(base.Wmin) + ' mm';
    if (isNaN(T)) {
      $('out-mmax').textContent = '—'; note.textContent = 'mm'; msg.textContent = 'Enter a target width.';
      return;
    }
    var r = reverse(Rrev, aRev, T);
    if (r.status === 'impossible') {
      $('out-mmax').textContent = '—';
      note.textContent = 'mm';
      msg.textContent = 'The Soller divergence alone already exceeds ' + f2(T) + ' mm at this radius (minimum width ' + f2(r.Wmin) + ' mm).';
    } else if (r.status === 'capped') {
      $('out-mmax').textContent = f2(r.mMax) + ' mm';
      note.textContent = 'mm · capped at mask range';
      msg.textContent = 'T − 2x = ' + f2(r.raw) + ' mm exceeds the mask range, so the suggestion is capped at ' + MASK_MAX + ' mm; the mask range limits it.';
    } else {
      $('out-mmax').textContent = f2(r.mMax) + ' mm';
      note.textContent = 'mm';
      msg.textContent = 'Use a mask opening of up to ' + f2(r.mMax) + ' mm to keep W at or below ' + f2(T) + ' mm.';
    }
  }

  ['radius', 'alpha', 'mask', 'target', 'alpha-rev', 'radius-rev'].forEach(function (id) {
    $(id).addEventListener('input', update);
    $(id).addEventListener('change', update);
  });
  update();
})(typeof window !== 'undefined' ? window : globalThis);
