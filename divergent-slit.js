(() => {
  'use strict';

  const openings = [
    { degrees: 0.02, label: '1/50°' },
    { degrees: 0.03125, label: '1/32°' },
    { degrees: 0.0625, label: '1/16°' },
    { degrees: 0.125, label: '1/8°' },
    { degrees: 0.25, label: '1/4°' },
    { degrees: 0.5, label: '1/2°' },
    { degrees: 0.61, label: '61/100°' }
  ];
  const $ = id => document.getElementById(id);
  const radians = degrees => degrees * Math.PI / 180;
  const degrees = radiansValue => radiansValue * 180 / Math.PI;
  const format = (value, places = 2) => value.toFixed(places);

  // PDSCalc!C: the workbook fixed-slit geometric length (R = 240 mm).
  function fixedLength(twoTheta, phi) {
    const omega = radians(twoTheta / 2);
    const cotHalfOpening = 1 / Math.tan(radians(phi / 2));
    return 240 / (Math.sin(omega) * cotHalfOpening + Math.cos(omega)) +
      240 / (Math.sin(omega) * cotHalfOpening - Math.cos(omega));
  }

  // PDSCalc!D: a separate workbook schedule for its target-length input.
  function automaticOpening(twoTheta, targetLength) {
    const omega = radians(twoTheta / 2);
    return 1.75 * degrees(Math.atan(Math.sin(omega) / (480 / targetLength + Math.cos(omega))));
  }

  const angleInput = $('ds-angle');
  const fixedInput = $('ds-fixed');
  const sampleInput = $('ds-sample');
  const autoAngleInput = $('ds-auto-two-theta');
  const targetInput = $('ds-target');

  function render() {
    const twoTheta = Number(angleInput.value);
    const autoTwoTheta = Number(autoAngleInput.value);
    const selected = Number(fixedInput.value);
    const sample = Number(sampleInput.value);
    const target = Number(targetInput.value);
    const sampleValid = Number.isFinite(sample) && sample > 0;
    const targetValid = Number.isFinite(target) && target > 0;
    const values = openings.map(item => ({ ...item, length: fixedLength(twoTheta, item.degrees) }));
    const current = values.find(item => item.degrees === selected);
    const maxLength = values[values.length - 1].length;

    $('ds-angle-readout').textContent = `${twoTheta}°`;
    $('ds-auto-two-theta-readout').textContent = autoTwoTheta + '°';
    $('ds-omega').textContent = `${format(twoTheta / 2, 1)}°`;
    $('ds-length').textContent = `${format(current.length)} mm`;
    $('ds-table-angle').textContent = `2θ = ${twoTheta}°`;
    $('ds-rows').innerHTML = values.map(item => `
      <tr${item.degrees === selected ? ' class="is-selected" aria-current="true"' : ''}>
        <th scope="row">${item.label}</th>
        <td>${item.degrees}°</td>
        <td><strong>${format(item.length)} mm</strong></td>
        <td><span class="ds-bar" style="width:${Math.max(2, 100 * item.length / maxLength)}%"></span></td>
      </tr>`).join('');

    const fit = $('ds-fit');
    const overspill = $('ds-overspill');
    const sampleBand = $('ds-sample-band');
    const illuminationBand = $('ds-illumination-band');
    if (sampleValid) {
      const scale = Math.max(sample, current.length) * 1.12;
      sampleBand.style.width = `${100 * sample / scale}%`;
      illuminationBand.style.width = `${100 * current.length / scale}%`;
      $('ds-sample-legend').textContent = `${format(sample, sample % 1 ? 1 : 0)} mm`;
      fit.textContent = current.length <= sample ? 'Within length' : 'Beyond sample';
      fit.classList.toggle('ds-alert', current.length > sample);
      overspill.textContent = current.length <= sample
        ? 'The calculated L fits inside this available length if centered. Beam tails may still extend farther.'
        : `Calculated L extends ${format((current.length - sample) / 2)} mm beyond each end if centered. The beam can reach the holder.`;
      overspill.classList.toggle('ds-alert', current.length > sample);
      $('ds-footprint-image').setAttribute('aria-label', `Centered sample length ${sample} millimetres; calculated illuminated length ${format(current.length)} millimetres; ${current.length <= sample ? 'within' : 'beyond'} sample length.`);
    } else {
      sampleBand.style.width = '0';
      illuminationBand.style.width = '0';
      $('ds-sample-legend').textContent = '—';
      fit.textContent = 'Enter length';
      fit.classList.remove('ds-alert');
      overspill.textContent = 'Enter a positive sample length to see the centered comparison.';
      overspill.classList.remove('ds-alert');
      $('ds-footprint-image').setAttribute('aria-label', 'Enter a positive sample length for a centered comparison.');
    }
    $('ds-length-legend').textContent = `${format(current.length)} mm`;

    if (targetValid) {
      const opening = automaticOpening(autoTwoTheta, target);
      $('ds-auto-angle').textContent = `${format(opening, 4)}°`;
      $('ds-auto-context').textContent = `workbook target ${format(target, target % 1 ? 1 : 0)} mm at 2θ = ${autoTwoTheta}°`;
      const range = $('ds-auto-range');
      range.textContent = opening > 0.61
        ? 'This calculated opening exceeds 0.61°, the largest fixed opening listed in the workbook. Check the instrument setting and scan range.'
        : 'The workbook schedule increases the DS opening as 2θ rises for a fixed target L. Check its calculated angle at your scan stop.';
      range.classList.toggle('ds-alert', opening > 0.61);
    } else {
      $('ds-auto-angle').textContent = '—';
      $('ds-auto-context').textContent = 'Enter a positive workbook target L';
      $('ds-auto-range').textContent = '';
      $('ds-auto-range').classList.remove('ds-alert');
    }
  }

  for (const input of [angleInput, fixedInput, sampleInput, autoAngleInput, targetInput]) {
    input.addEventListener('input', render);
    input.addEventListener('change', render);
  }
  render();
})();
