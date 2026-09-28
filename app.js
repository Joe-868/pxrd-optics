// Inputs, lookup values and formulas follow MultiCore Optics Optimization Guide.xlsx.
const PRIMARY_MASKS = [0.2, 0.3, 2, 14];
const SECONDARY_MASKS = [0.1, 0.3, 0.5, 2, 6, 14];
const FIXED_SLITS = [0.02, 0.03125, 0.0625, 0.125, 0.25, 0.5, 0.61];
const MAX_DIVERGENCE = 0.61;
const FIXED_SLIT_FRACTIONS = new Map([
  [0.02, '1/50'], [0.03125, '1/32'], [0.0625, '1/16'],
  [0.125, '1/8'], [0.25, '1/4'], [0.5, '1/2'], [0.61, '61/100']
]);
const FWHM_WIDTHS = [
  [0.4, 0.9, 1.4, 2.5, 2.5, 2.5],
  [0.6, 0.9, 1.4, 2.6, 2.6, 2.6],
  [1.8, 2, 2.2, 3.7, 4.3, 4.3],
  [1.8, 2, 2.2, 3.7, 7.7, 15.7]
];
// Full axial beam footprint values from the iCore parameters table (mm).
// Rows and columns use the same primary and secondary mask order as FWHM_WIDTHS.
const AXIAL_FOOTPRINTS = [
  [0.7, 1.2, 1.8, 4.9, 4.9, 4.9],
  [0.8, 1.4, 2.0, 5.0, 5.0, 5.0],
  [3.5, 3.7, 3.9, 5.4, 6.7, 6.7],
  [3.5, 3.7, 3.9, 5.4, 9.4, 17.4]
];

const radians = value => value * Math.PI / 180;
const degrees = value => value * 180 / Math.PI;
const widthForMasks = (mask1, mask2) =>
  FWHM_WIDTHS[PRIMARY_MASKS.indexOf(mask1)]?.[SECONDARY_MASKS.indexOf(mask2)];
const footprintForMasks = (mask1, mask2) =>
  AXIAL_FOOTPRINTS[PRIMARY_MASKS.indexOf(mask1)]?.[SECONDARY_MASKS.indexOf(mask2)];

// PDSCalc!C2:C152.
function irradiatedLength(slit, omega) {
  const beamTerm = Math.sin(radians(omega)) / Math.tan(radians(slit) / 2);
  const cosine = Math.cos(radians(omega));
  return 240 / (beamTerm + cosine) + 240 / (beamTerm - cosine);
}

// PDSCalc!D2:D152.
function automaticSlitAngle(length, omega) {
  return 1.75 * degrees(Math.atan(Math.sin(radians(omega)) /
    (480 / length + Math.cos(radians(omega)))));
}

// Algebraic inverse of PDSCalc!D at the iCore's Max opening.
// This is a workbook-model estimate, not a measured instrument footprint.
function automaticLengthAtMax(omega) {
  const tangent = Math.tan(radians(MAX_DIVERGENCE / 1.75));
  return 480 / (Math.sin(radians(omega)) / tangent - Math.cos(radians(omega)));
}

function calculateSetup(input) {
  const { mode, diameter, startAngle, stopAngle, omegaOffset, fixedDS, targetLength, mask1, mask2 } = input;
  if (!Number.isFinite(diameter) || diameter <= 0) return { error: 'Enter a usable sample diameter greater than zero.' };
  if (!Number.isFinite(startAngle) || startAngle <= 0 || startAngle >= 180 ||
      !Number.isFinite(stopAngle) || stopAngle < startAngle || stopAngle >= 180)
    return { error: 'Enter scan angles with 0° < start ≤ stop < 180°.' };
  if (!Number.isFinite(omegaOffset)) return { error: 'Enter a valid ω offset.' };
  const omegaStart = startAngle / 2 + omegaOffset;
  const omegaStop = stopAngle / 2 + omegaOffset;
  if (omegaStart <= 0 || omegaStop >= 90) return { error: 'ω must remain between 0° and 90° across the scan.' };
  const width = widthForMasks(mask1, mask2);
  if (!Number.isFinite(width)) return { error: 'Choose listed values for both masks.' };
  const footprint = footprintForMasks(mask1, mask2);
  let length, dsStart, dsStop, nominalDsStart, nominalDsStop, estimatedLengthStop;
  if (mode === 'fixed') {
    if (!FIXED_SLITS.includes(fixedDS)) return { error: 'Choose a fixed DS from the workbook list.' };
    length = irradiatedLength(fixedDS, omegaStart);
    if (!Number.isFinite(length) || length <= 0)
      return { error: 'The fixed DS formula has no positive finite length at this scan start.' };
  } else if (mode === 'automatic') {
    if (!Number.isFinite(targetLength) || targetLength < 0.5 || targetLength > 20 ||
        Math.abs(targetLength * 2 - Math.round(targetLength * 2)) > 1e-9)
      return { error: 'Choose an automatic irradiated length from 0.5 to 20 mm in 0.5 mm steps.' };
    nominalDsStart = automaticSlitAngle(targetLength, omegaStart);
    nominalDsStop = automaticSlitAngle(targetLength, omegaStop);
    dsStart = Math.min(nominalDsStart, MAX_DIVERGENCE);
    dsStop = Math.min(nominalDsStop, MAX_DIVERGENCE);
    length = nominalDsStart > MAX_DIVERGENCE
      ? automaticLengthAtMax(omegaStart) : targetLength;
    estimatedLengthStop = nominalDsStop > MAX_DIVERGENCE
      ? automaticLengthAtMax(omegaStop) : targetLength;
  } else return { error: 'Choose fixed or automatic DS.' };

  const maxLength = width > diameter ? null : Math.sqrt(diameter ** 2 - width ** 2);
  const maskWarning = width > diameter;
  const lengthWarning = maxLength !== null && length > maxLength;
  const capWarning = mode === 'automatic' && nominalDsStop > MAX_DIVERGENCE;
  return { width, footprint, length, maxLength, dsStart, dsStop, nominalDsStart, nominalDsStop,
    estimatedLengthStop, maskWarning, lengthWarning, capWarning,
    pass: mode === 'fixed' ? `Fixed at ${FIXED_SLIT_FRACTIONS.get(fixedDS)}°` : `Automatic at ${targetLength} mm` };
}

if (typeof document !== 'undefined') {
  const $ = id => document.getElementById(id);
  const number = id => $(id).value.trim() === '' ? NaN : Number($(id).value);
  const format = (value, digits = 2) => Number(value.toFixed(digits)).toString();
  const masksByMode = { fixed: [14, 6], automatic: [14, 2] };
  let previousMode = 'fixed';

  function setInlineWarning(controlId, warningId, message) {
    const warning = $(warningId);
    warning.hidden = !message;
    warning.textContent = message || '';
    $(controlId).toggleAttribute('aria-invalid', Boolean(message));
    $(controlId).classList.toggle('input-warning', Boolean(message));
  }

  function renderCandidates(input, result) {
    const list = $('candidate-list');
    list.replaceChildren();
    if (result.error) {
      $('candidate-count').textContent = '';
      list.textContent = 'Enter valid sample and scan settings to see candidates.';
      return;
    }
    const pairs = [];
    for (const mask1 of PRIMARY_MASKS) for (const mask2 of SECONDARY_MASKS) {
      const width = widthForMasks(mask1, mask2);
      if (Math.hypot(width, result.length) <= input.diameter + 1e-9)
        pairs.push({ mask1, mask2, width });
    }
    $('candidate-count').textContent = `(${pairs.length})`;
    if (!pairs.length) {
      list.textContent = 'No listed mask pair passes at these settings. Try a smaller fixed DS or target length, a higher start angle for fixed DS, or a larger sample.';
      return;
    }
    for (const pair of pairs) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'candidate';
      button.textContent = `Mask 1 ${pair.mask1} mm · Mask 2 ${pair.mask2} mm · W ${format(pair.width)} mm`;
      button.addEventListener('click', () => {
        $('mask1').value = String(pair.mask1);
        $('mask2').value = String(pair.mask2);
        render();
      });
      list.append(button);
    }
  }

  function render() {
    const mode = $('mode-automatic').checked ? 'automatic' : 'fixed';
    if (mode !== previousMode) {
      masksByMode[previousMode] = [number('mask1'), number('mask2')];
      $('mask1').value = String(masksByMode[mode][0]);
      $('mask2').value = String(masksByMode[mode][1]);
      previousMode = mode;
    }
    masksByMode[mode] = [number('mask1'), number('mask2')];
    $('fixed-ds-field').hidden = mode !== 'fixed';
    $('automatic-length-field').hidden = mode !== 'automatic';
    $('automatic-results').hidden = mode !== 'automatic';

    const input = {
      mode, diameter: number('diameter'), startAngle: number('start-angle'),
      stopAngle: number('stop-angle'), omegaOffset: number('omega-offset'),
      fixedDS: number('fixed-ds'), targetLength: number('target-length'),
      mask1: number('mask1'), mask2: number('mask2')
    };
    const result = calculateSetup(input);
    renderCandidates(input, result);
    setInlineWarning('fixed-ds', 'fixed-ds-warning', '');
    setInlineWarning('target-length', 'target-length-warning', '');
    setInlineWarning('mask1', 'mask1-warning', '');
    setInlineWarning('mask2', 'mask2-warning', '');
    $('pass-setting').textContent = mode === 'fixed'
      ? `Fixed at ${FIXED_SLIT_FRACTIONS.get(number('fixed-ds')) || '—'}°`
      : `Automatic at ${$('target-length').value || '—'} mm`;
    const badge = $('status');
    badge.className = 'badge';
    $('message').className = 'message';
    if (result.error) {
      badge.textContent = 'Check input';
      badge.classList.add('error');
      $('message').textContent = result.error;
      for (const id of ['width', 'footprint', 'length', 'max-length', 'ds-start', 'ds-stop', 'actual-length-stop']) $(id).textContent = '—';
    } else {
      $('width').textContent = `${format(result.width)} mm`;
      $('footprint').textContent = `${format(result.footprint)} mm`;
      $('length').textContent = `${format(result.length)} mm`;
      $('max-length').textContent = result.maxLength === null ? 'N/A' : `${format(result.maxLength)} mm`;
      if (mode === 'automatic') {
        $('ds-start').textContent = `${format(result.dsStart, 5)}°`;
        $('ds-stop').textContent = `${format(result.dsStop, 5)}°`;
        $('actual-length-stop').textContent = `${format(result.estimatedLengthStop)} mm`;
      }
      if (result.maskWarning) {
        const warning = `Reduce Mask(s): W ${format(result.width)} mm > D ${format(input.diameter)} mm.`;
        setInlineWarning('mask1', 'mask1-warning', warning);
        setInlineWarning('mask2', 'mask2-warning', warning);
      }
      if (result.lengthWarning) {
        const warning = `Reduce: L ${format(result.length)} mm > maximum ${format(result.maxLength)} mm.`;
        if (mode === 'fixed') setInlineWarning('fixed-ds', 'fixed-ds-warning', warning);
        else setInlineWarning('target-length', 'target-length-warning', warning);
      }
      if (result.capWarning) {
        const capMessage = `DS demand at stop ${format(result.nominalDsStop, 5)}° exceeds Max 0.61°; the estimated workbook-model L at stop falls to ${format(result.estimatedLengthStop)} mm.`;
        const existing = $('target-length-warning').textContent;
        setInlineWarning('target-length', 'target-length-warning', existing ? `${existing} ${capMessage}` : capMessage);
      }
      const warnings = [];
      if (result.capWarning) warnings.push(`Automatic DS reaches Max 0.61° by the scan stop. Estimated workbook-model L at stop: ${format(result.estimatedLengthStop)} mm, below the ${format(input.targetLength)} mm target.`);
      if (result.maskWarning) warnings.push('Reduce Mask(s): W exceeds the usable sample diameter.');
      else if (result.lengthWarning) warnings.push('Reduce: irradiated length exceeds the maximum for this diameter and W.');
      if (warnings.length) {
        badge.textContent = result.capWarning ? 'DS at Max' : result.maskWarning ? 'Reduce Mask(s)' : 'Reduce';
        badge.classList.add('warning');
        $('message').classList.add('warning');
        $('message').textContent = warnings.join(' ');
      } else {
        badge.textContent = 'Checks pass';
        $('message').textContent = 'The selected workbook settings pass its W and L checks for a centered, spinning round sample.';
      }
    }
  }
  for (const id of ['diameter', 'start-angle', 'stop-angle', 'omega-offset', 'target-length'])
    $(id).addEventListener('input', render);
  for (const id of ['mode-fixed', 'mode-automatic', 'fixed-ds', 'mask1', 'mask2', 'soller'])
    $(id).addEventListener('change', render);
  render();
}

if (typeof module !== 'undefined') module.exports = {
  PRIMARY_MASKS, SECONDARY_MASKS, FIXED_SLITS, FWHM_WIDTHS, AXIAL_FOOTPRINTS,
  FIXED_SLIT_FRACTIONS,
  irradiatedLength, automaticSlitAngle, automaticLengthAtMax, calculateSetup
};
