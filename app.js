// Malvern Panalytical Empyrean iCore/MultiCore calculator.
// Reference values (mask tables, DS settings, automatic-mode relation) are from the manufacturer's
// instrument/software Help; irradiated length uses elementary diffraction geometry (R = 240 mm).
// They apply only to the documented iCore dual-mask configuration.
const PRIMARY_MASKS = [0.2, 0.3, 2, 14];
const SECONDARY_MASKS = [0.1, 0.3, 0.5, 2, 6, 14];
const FIXED_SLITS = [0.02, 0.03125, 0.0625, 0.125, 0.25, 0.5, 0.61];
const MAX_DIVERGENCE = 0.61;
const FIXED_SLIT_FRACTIONS = new Map([
  [0.02, '1/50'], [0.03125, '1/32'], [0.0625, '1/16'],
  [0.125, '1/8'], [0.25, '1/4'], [0.5, '1/2'], [0.61, '61/100']
]);
// Beam FWHM width W (mm) for each Mask 1 (rows) × Mask 2 (columns) pair.
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

// Irradiated length (mm) for a fixed DS opening (degrees) at incident angle omega (degrees),
// point source at the 240 mm goniometer radius, flat sample on the axis.
function irradiatedLength(slit, omega) {
  const beamTerm = Math.sin(radians(omega)) / Math.tan(radians(slit) / 2);
  const cosine = Math.cos(radians(omega));
  return 240 / (beamTerm + cosine) + 240 / (beamTerm - cosine);
}

// Manufacturer's automatic-mode relation: DS opening (degrees) for a target length (mm).
function automaticSlitAngle(length, omega) {
  return 1.75 * degrees(Math.atan(Math.sin(radians(omega)) /
    (480 / length + Math.cos(radians(omega)))));
}

// Algebraic inverse of the automatic-mode relation at the largest opening (0.61°).
// This is a model estimate, not a measured instrument footprint.
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
    if (!FIXED_SLITS.includes(fixedDS)) return { error: 'Choose a listed fixed DS.' };
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

  // Sample-fit check uses the full axial footprint F (the whole beam on the sample); W (FWHM) is for reference
  const maxLength = footprint > diameter ? null : Math.sqrt(diameter ** 2 - footprint ** 2);
  const maxLengthFwhm = width > diameter ? null : Math.sqrt(diameter ** 2 - width ** 2);
  const maskWarning = footprint > diameter;
  const lengthWarning = maxLength !== null && length > maxLength;
  const capWarning = mode === 'automatic' && nominalDsStop > MAX_DIVERGENCE;
  return { width, footprint, length, maxLength, maxLengthFwhm, dsStart, dsStop, nominalDsStart, nominalDsStop,
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
      const footprint = footprintForMasks(mask1, mask2);
      if (Math.hypot(footprint, result.length) <= input.diameter + 1e-9)
        pairs.push({ mask1, mask2, footprint, width: widthForMasks(mask1, mask2) });
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
      button.textContent = `Mask 1 ${pair.mask1} mm · Mask 2 ${pair.mask2} mm · F ${format(pair.footprint)} mm (W ${format(pair.width)} mm)`;
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
    drawFit(input, result);
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
      for (const id of ['width', 'footprint', 'length', 'max-length', 'max-length-fwhm', 'ds-start', 'ds-stop', 'actual-length-stop']) $(id).textContent = '—';
    } else {
      $('width').textContent = `${format(result.width)} mm`;
      $('footprint').textContent = `${format(result.footprint)} mm`;
      $('length').textContent = `${format(result.length)} mm`;
      $('max-length').textContent = result.maxLength === null ? 'N/A' : `${format(result.maxLength)} mm`;
      $('max-length-fwhm').textContent = result.maxLengthFwhm === null ? 'N/A' : `${format(result.maxLengthFwhm)} mm`;
      if (mode === 'automatic') {
        $('ds-start').textContent = `${format(result.dsStart, 5)}°`;
        $('ds-stop').textContent = `${format(result.dsStop, 5)}°`;
        $('actual-length-stop').textContent = `${format(result.estimatedLengthStop)} mm`;
      }
      if (result.maskWarning) {
        const warning = `Reduce Mask(s): footprint F ${format(result.footprint)} mm > D ${format(input.diameter)} mm.`;
        setInlineWarning('mask1', 'mask1-warning', warning);
        setInlineWarning('mask2', 'mask2-warning', warning);
      }
      if (result.lengthWarning) {
        const warning = `Reduce: L ${format(result.length)} mm > maximum ${format(result.maxLength)} mm.`;
        if (mode === 'fixed') setInlineWarning('fixed-ds', 'fixed-ds-warning', warning);
        else setInlineWarning('target-length', 'target-length-warning', warning);
      }
      if (result.capWarning) {
        const capMessage = `DS demand at stop ${format(result.nominalDsStop, 5)}° exceeds Max 0.61°; the estimated L at stop falls to ${format(result.estimatedLengthStop)} mm.`;
        const existing = $('target-length-warning').textContent;
        setInlineWarning('target-length', 'target-length-warning', existing ? `${existing} ${capMessage}` : capMessage);
      }
      const warnings = [];
      if (result.capWarning) warnings.push(`Automatic DS reaches Max 0.61° by the scan stop. Estimated L at stop: ${format(result.estimatedLengthStop)} mm, below the ${format(input.targetLength)} mm target.`);
      if (result.maskWarning) warnings.push('Reduce Mask(s): the full axial footprint F exceeds the usable sample diameter.');
      else if (result.lengthWarning) warnings.push('Reduce: irradiated length exceeds the maximum for this diameter and footprint F.');
      if (warnings.length) {
        badge.textContent = result.capWarning ? 'DS at Max' : result.maskWarning ? 'Reduce Mask(s)' : 'Reduce';
        badge.classList.add('warning');
        $('message').classList.add('warning');
        $('message').textContent = warnings.join(' ');
      } else {
        badge.textContent = 'Footprint fits';
        $('message').textContent = 'The full axial footprint F and the irradiated length L fit inside a centred round sample of this diameter. Weak tails beyond the footprint are not included.';
      }
    }
  }

  // Live top view, to scale: sample circle D, patch F × L (beam along L), FWHM band W. Display only.
  function drawFit(input, result) {
    const svg = $('fit-svg');
    svg.querySelectorAll(':scope > :not(title)').forEach(node => node.remove());
    if (result.error) return;
    const D = input.diameter, F = result.footprint, W = result.width, L = result.length;
    const s = 220 / Math.max(D, Math.hypot(L, F));
    const cx = 180, cy = 146, r = D * s / 2, hl = L * s / 2, hf = F * s / 2, hw = W * s / 2;
    const fits = !result.maskWarning && !result.lengthWarning;
    const f = v => Number(v.toFixed(2));
    const below = cy + Math.max(r, hf);
    const left = cx - Math.max(r, hl);
    svg.insertAdjacentHTML('beforeend', `
      <defs><clipPath id="fit-clip"><circle cx="${cx}" cy="${cy}" r="${f(r)}"/></clipPath></defs>
      <circle cx="${cx}" cy="${cy}" r="${f(r)}" class="fit-sample"/>
      <rect x="${f(cx - hl)}" y="${f(cy - hf)}" width="${f(2 * hl)}" height="${f(2 * hf)}" class="fit-out"/>
      <rect x="${f(cx - hl)}" y="${f(cy - hf)}" width="${f(2 * hl)}" height="${f(2 * hf)}" class="fit-in" clip-path="url(#fit-clip)"/>
      <rect x="${f(cx - hl)}" y="${f(cy - hw)}" width="${f(2 * hl)}" height="${f(2 * hw)}" class="fit-fwhm"/>
      <rect x="${f(cx - hl)}" y="${f(cy - hf)}" width="${f(2 * hl)}" height="${f(2 * hf)}" class="fit-edge ${fits ? '' : 'bad'}"/>
      <path d="M${f(cx - hl)} ${f(cy + hf)}L${f(cx + hl)} ${f(cy - hf)}" class="fit-diag"/>
      <text x="${cx}" y="${f(cy - r - 9)}" text-anchor="middle" class="fit-label">D ${format(D)} mm</text>
      <text x="${cx}" y="${f(below + 20)}" text-anchor="middle" class="fit-label">L ${format(L)} mm</text>
      <text x="${f(left - 10)}" y="${cy + 4}" text-anchor="end" class="fit-label">F ${format(F)}</text>
      <text x="${cx}" y="${f(below + 36)}" text-anchor="middle" class="fit-note">diagonal √(L² + F²) = ${format(Math.hypot(L, F))} mm ${fits ? "≤" : ">"} D</text>`);
  }

  function renderReferenceTables() {
    const build = (id, caption, data) => {
      const head = '<tr><th scope="col">Mask 1 ↓ · Mask 2 →</th>' + SECONDARY_MASKS.map(m => `<th scope="col">${m}</th>`).join('') + '</tr>';
      const rows = PRIMARY_MASKS.map((m, i) => `<tr><th scope="row">${m}</th>` + data[i].map(v => `<td>${v}</td>`).join('') + '</tr>').join('');
      $(id).innerHTML = `<caption>${caption}</caption><thead>${head}</thead><tbody>${rows}</tbody>`;
    };
    build('ref-fwhm', 'Beam FWHM width W (mm)', FWHM_WIDTHS);
    build('ref-footprint', 'Full axial footprint (mm)', AXIAL_FOOTPRINTS);
  }
  renderReferenceTables();

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
