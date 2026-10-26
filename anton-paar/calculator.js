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

  // One set of instrument inputs; the mode decides whether m comes from the target width T or is entered directly.
  function update() {
    var R = parseFloat($('radius').value), a = parseFloat($('alpha').value);
    var base = calc(R, a, 0);
    $('dist').textContent = f2(base.L) + ' mm';
    var targetMode = $('mode-target').checked;
    $('target-field').hidden = !targetMode;
    $('mask-field').hidden = targetMode;
    $('answer-label').textContent = targetMode ? 'Largest mask opening m' : 'Illuminated width W';
    $('out-x').textContent = f2(base.x) + ' mm';
    var msg = $('message'), formula = $('formula'), note = $('out-m-note');
    msg.className = 'message';
    note.textContent = 'mm';
    var m = NaN, W = NaN, answer = NaN;

    if (targetMode) {
      var T = parseFloat($('target').value);
      if (isNaN(T)) {
        msg.textContent = 'Enter a target width.';
        formula.textContent = '';
      } else {
        var r = reverse(R, a, T);
        if (r.status === 'impossible') {
          msg.classList.add('warning');
          msg.textContent = 'The Soller divergence alone already exceeds ' + f2(T) + ' mm at this radius (minimum width ' + f2(r.Wmin) + ' mm).';
          formula.textContent = 'T − 2x = ' + f2(T) + ' − 2 × ' + f2(base.x) + ' = ' + f2(r.raw) + ' mm: no positive mask opening reaches this width.';
          m = 0; W = r.Wmin;
        } else if (r.status === 'capped') {
          m = answer = r.mMax; W = m + 2 * base.x;
          note.textContent = 'mm · capped at mask range';
          msg.textContent = 'T − 2x = ' + f2(r.raw) + ' mm exceeds the mask range, so the suggestion is capped at ' + MASK_MAX + ' mm; the mask range limits it.';
          formula.textContent = 'm_max = ' + f2(T) + ' − 2 × ' + f2(base.x) + ' = ' + f2(r.raw) + ' mm → capped at ' + MASK_MAX + ' mm, giving W = ' + f2(W) + ' mm.';
        } else {
          m = answer = r.mMax; W = m + 2 * base.x;
          msg.textContent = 'Use a mask opening of up to ' + f2(m) + ' mm to keep W at or below ' + f2(T) + ' mm.';
          formula.textContent = 'm_max = ' + f2(T) + ' − 2 × ' + f2(base.x) + ' = ' + f2(m) + ' mm';
        }
      }
    } else {
      var mv = parseFloat($('mask').value), warn = $('mask-warning');
      if (isNaN(mv)) {
        $('mask').classList.add('input-warning');
        warn.hidden = false;
        warn.textContent = 'Enter a mask opening between 0 and ' + MASK_MAX + ' mm.';
        msg.textContent = '';
        formula.textContent = '';
      } else {
        var bad = mv < 0 || mv > MASK_MAX;
        $('mask').classList.toggle('input-warning', bad);
        warn.hidden = !bad;
        if (bad) warn.textContent = 'Mask opening ' + mv + ' mm is outside the instrument range of 0 to ' + MASK_MAX + ' mm; the calculation is only valid below 14 mm.';
        var c = calc(R, a, mv);
        m = mv; W = answer = c.W;
        msg.textContent = 'A ' + f2(mv) + ' mm mask gives a full illuminated width of ' + f2(c.W) + ' mm on the sample.';
        formula.textContent = 'W = ' + f2(mv) + ' + 2 × ' + f2(c.L) + ' × tan(' + a + '/2) = ' + f2(mv) + ' + 2 × ' + f2(c.x) + ' = ' + f2(c.W) + ' mm';
      }
    }
    $('answer').textContent = isNaN(answer) ? '—' : f2(answer) + ' mm';
    $('out-m').textContent = isNaN(m) ? '—' : f2(m) + ' mm';
    $('out-w').textContent = isNaN(W) ? '—' : f2(W) + ' mm';
    draw(m, W, base.L);
  }

  // Axial side view: mask opening m on the left, full width W at the sample on the right.
  // Widths share one scale; the distance L and the divergence angle are schematic.
  function draw(m, W, L) {
    var svg = $('ap-svg');
    Array.prototype.slice.call(svg.childNodes).forEach(function (node) { if (node.nodeName !== 'title') svg.removeChild(node); });
    if (isNaN(m) || isNaN(W)) return;
    var k = 150 / Math.max(W, 1), cy = 108, mx = 86, sx = 318;
    var mh = m * k / 2, wh = W * k / 2;
    var n = function (v) { return Number(v.toFixed(2)); };
    var parts = [
      '<path d="M' + mx + ' ' + n(cy - mh) + 'L' + sx + ' ' + n(cy - wh) + 'V' + n(cy + wh) + 'L' + mx + ' ' + n(cy + mh) + 'Z" class="ap-env"/>',
      '<path d="M' + mx + ' ' + n(cy - mh) + 'H' + sx + 'M' + mx + ' ' + n(cy + mh) + 'H' + sx + '" class="ap-core"/>',
      '<path d="M' + mx + ' ' + n(cy - mh) + 'L' + sx + ' ' + n(cy - wh) + 'M' + mx + ' ' + n(cy + mh) + 'L' + sx + ' ' + n(cy + wh) + '" class="ap-edge"/>',
      '<rect x="' + (mx - 6) + '" y="20" width="8" height="' + n(Math.max(cy - mh - 20, 0)) + '" class="ap-blade"/>',
      '<rect x="' + (mx - 6) + '" y="' + n(cy + mh) + '" width="8" height="' + n(Math.max(196 - cy - mh, 0)) + '" class="ap-blade"/>',
      '<path d="M' + sx + ' 18V198" class="ap-sample"/>',
      '<text x="' + (mx - 2) + '" y="13" text-anchor="middle" class="fit-note">mask</text>',
      '<text x="' + sx + '" y="13" text-anchor="middle" class="fit-note">sample</text>',
      mh > 3 ? '<path d="M' + (mx - 20) + ' ' + n(cy - mh + 1) + 'V' + n(cy + mh - 1) + '" class="ap-dim"/>' : '',
      '<text x="' + (mx - 26) + '" y="' + (cy + 4) + '" text-anchor="end" class="fit-label">m ' + f2(m) + '</text>',
      '<path d="M' + (sx + 20) + ' ' + n(cy - wh + 1) + 'V' + n(cy + wh - 1) + '" class="ap-dim"/>',
      '<text x="' + (sx + 28) + '" y="' + (cy + 4) + '" class="fit-label">W ' + f2(W) + '</text>',
      '<text x="' + (sx + 6) + '" y="' + n(cy - (mh + wh) / 2 + 4) + '" class="ap-x">x</text>',
      '<text x="' + (sx + 6) + '" y="' + n(cy + (mh + wh) / 2 + 4) + '" class="ap-x">x</text>',
      '<path d="M' + (mx + 1) + ' 214H' + (sx - 1) + '" class="ap-dim"/>',
      '<rect x="' + ((mx + sx) / 2 - 46) + '" y="206" width="92" height="16" fill="#fff"/>',
      '<text x="' + ((mx + sx) / 2) + '" y="218" text-anchor="middle" class="fit-note">L ' + f2(L) + ' mm</text>'
    ];
    svg.insertAdjacentHTML('beforeend',
      '<defs><marker id="ap-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 .8L8 4 0 7.2Z" fill="#4a5f66"/></marker></defs>' + parts.join(''));
  }

  ['radius', 'alpha', 'mask', 'target', 'mode-target', 'mode-mask'].forEach(function (id) {
    $(id).addEventListener('input', update);
    $(id).addEventListener('change', update);
  });
  update();
})(typeof window !== 'undefined' ? window : globalThis);
