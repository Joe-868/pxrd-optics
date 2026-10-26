(() => {
  'use strict';

  // Common fractional DS openings (degrees). The sizes fitted to a given instrument vary.
  const openings = [
    { degrees: 0.03125, label: '1/32°' },
    { degrees: 0.0625, label: '1/16°' },
    { degrees: 0.125, label: '1/8°' },
    { degrees: 0.25, label: '1/4°' },
    { degrees: 0.5, label: '1/2°' },
    { degrees: 1, label: '1°' }
  ];
  const $ = id => document.getElementById(id);
  const radians = degrees => degrees * Math.PI / 180;
  const format = (value, places = 2) => value.toFixed(places);

  // Geometric irradiated length: point source at radius R, flat sample on the goniometer axis,
  // DS opening alpha (degrees), symmetric scan so omega = 2θ/2.
  function fixedLength(twoTheta, alpha, R) {
    const omega = radians(twoTheta / 2);
    const cotHalfOpening = 1 / Math.tan(radians(alpha / 2));
    return R / (Math.sin(omega) * cotHalfOpening + Math.cos(omega)) +
      R / (Math.sin(omega) * cotHalfOpening - Math.cos(omega));
  }

  const angleInput = $('ds-angle');
  const radiusInput = $('ds-radius');
  const fixedInput = $('ds-fixed');
  const sampleInput = $('ds-sample');

  function render() {
    const twoTheta = Number(angleInput.value);
    const R = Number(radiusInput.value);
    const selected = Number(fixedInput.value);
    const sample = Number(sampleInput.value);
    const radiusValid = Number.isFinite(R) && R > 0;
    const sampleValid = Number.isFinite(sample) && sample > 0;

    $('ds-angle-readout').textContent = `${twoTheta}°`;
    $('ds-omega').textContent = `${format(twoTheta / 2, 1)}°`;
    $('ds-table-angle').textContent = `2θ = ${twoTheta}°`;

    if (!radiusValid) {
      for (const id of ['ds-length', 'ds-fit', 'ds-length-legend']) $(id).textContent = '—';
      $('ds-rows').innerHTML = '';
      $('ds-overspill').textContent = 'Enter a positive goniometer radius.';
      return;
    }

    const values = openings.map(item => {
      const length = fixedLength(twoTheta, item.degrees, R);
      // A negative or infinite length means the limiting ray does not reach the sample (ω ≤ α/2)
      return { ...item, length: length > 0 && Number.isFinite(length) ? length : Infinity };
    });
    const current = values.find(item => item.degrees === selected);
    const finite = values.filter(item => Number.isFinite(item.length));
    const maxLength = finite.length ? finite[finite.length - 1].length : 1;
    const show = length => Number.isFinite(length) ? `${format(length)} mm` : 'beam not intercepted';

    $('ds-length').textContent = show(current.length);
    $('ds-rows').innerHTML = values.map(item => `
      <tr${item.degrees === selected ? ' class="is-selected" aria-current="true"' : ''}>
        <th scope="row">${item.label}</th>
        <td>${item.degrees}°</td>
        <td><strong>${show(item.length)}</strong></td>
        <td><span class="ds-bar" style="width:${Number.isFinite(item.length) ? Math.max(2, 100 * item.length / maxLength) : 100}%"></span></td>
      </tr>`).join('');

    const fit = $('ds-fit');
    const overspill = $('ds-overspill');
    const sampleBand = $('ds-sample-band');
    const illuminationBand = $('ds-illumination-band');
    const L = current.length;
    if (sampleValid && Number.isFinite(L)) {
      const scale = Math.max(sample, L) * 1.12;
      sampleBand.style.width = `${100 * sample / scale}%`;
      illuminationBand.style.width = `${100 * L / scale}%`;
      $('ds-sample-legend').textContent = `${format(sample, sample % 1 ? 1 : 0)} mm`;
      fit.textContent = L <= sample ? 'Within length' : 'Beyond sample';
      fit.classList.toggle('ds-alert', L > sample);
      overspill.textContent = L <= sample
        ? 'The calculated L fits within the sample length if centred. Beam tails may still extend farther.'
        : `Calculated L extends ${format((L - sample) / 2)} mm beyond each end if centred. The beam can reach the holder.`;
      overspill.classList.toggle('ds-alert', L > sample);
      illuminationBand.classList.toggle('is-over', L > sample);
      $('ds-footprint-image').setAttribute('aria-label', `Centred sample length ${sample} millimetres; calculated irradiated length ${format(L)} millimetres; ${L <= sample ? 'within' : 'beyond'} sample length.`);
    } else {
      sampleBand.style.width = sampleValid ? '100%' : '0';
      illuminationBand.style.width = Number.isFinite(L) ? '0' : '100%';
      $('ds-sample-legend').textContent = sampleValid ? `${format(sample, sample % 1 ? 1 : 0)} mm` : '—';
      fit.textContent = Number.isFinite(L) ? 'Enter length' : 'Beyond sample';
      fit.classList.toggle('ds-alert', !Number.isFinite(L));
      overspill.textContent = Number.isFinite(L)
        ? 'Enter a positive sample length to see the centred comparison.'
        : 'At this angle the lower limiting ray does not reach the sample plane: the incident angle is smaller than half the DS opening.';
      overspill.classList.toggle('ds-alert', !Number.isFinite(L));
      $('ds-footprint-image').setAttribute('aria-label', 'Irradiated length comparison unavailable for these inputs.');
    }
    $('ds-length-legend').textContent = show(L);
  }

  for (const input of [angleInput, radiusInput, fixedInput, sampleInput]) {
    input.addEventListener('input', render);
    input.addEventListener('change', render);
  }
  render();

})();
