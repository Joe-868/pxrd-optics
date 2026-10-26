(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const radians = degrees => degrees * Math.PI / 180;

  // Same geometric model as the divergence slit page (point source at R, flat sample, ω = 2θ/2).
  function lengthFor(alphaDeg, omegaDeg, R) {
    const omega = radians(omegaDeg);
    const cotHalf = 1 / Math.tan(radians(alphaDeg / 2));
    return R / (Math.sin(omega) * cotHalf + Math.cos(omega)) + R / (Math.sin(omega) * cotHalf - Math.cos(omega));
  }

  // L grows monotonically with α for 0 < α < 2ω, so bisection finds the opening for a target L.
  function requiredOpening(targetL, omegaDeg, R) {
    let lo = 0, hi = 2 * omegaDeg;
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      const L = lengthFor(mid, omegaDeg, R);
      if (!Number.isFinite(L) || L <= 0 || L > targetL) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  }

  const target = $('ds-target'), radius = $('ds-auto-radius'), angle = $('ds-auto-two-theta');

  function render() {
    const L = Number(target.value), R = Number(radius.value), twoTheta = Number(angle.value);
    $('ds-auto-two-theta-readout').textContent = `${twoTheta}°`;
    if (!(L > 0) || !(R > 0)) {
      $('ds-auto-angle').textContent = '—';
      $('ds-auto-context').textContent = 'Enter a positive target length and radius';
      $('ds-auto-range').textContent = '';
      return;
    }
    const alpha = requiredOpening(L, twoTheta / 2, R);
    $('ds-auto-angle').textContent = `${alpha.toFixed(4)}°`;
    $('ds-auto-context').textContent = `for L = ${L} mm at 2θ = ${twoTheta}°, R = ${R} mm`;
    const low = requiredOpening(L, 1, R), high = requiredOpening(L, 75, R);
    $('ds-auto-range').textContent = `For this target, the opening rises from ${low.toFixed(3)}° at 2θ = 2° to ${high.toFixed(3)}° at 2θ = 150°. Compare the highest value with your slit's largest opening.`;
  }

  for (const el of [target, radius, angle]) { el.addEventListener('input', render); el.addEventListener('change', render); }
  render();
})();
