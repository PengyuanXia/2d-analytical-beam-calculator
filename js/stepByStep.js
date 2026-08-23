/**
 * 2D Analytical Beam Calculator - Bilingual Calculation Report Generator
 * Notation: T(x) for shear force, EJ for bending stiffness.
 * Smart number formatting (no redundant trailing zeros, preserves actual decimal places).
 */

import { TRANSLATIONS } from './i18n.js';

function formatNum(val, maxDec = 2) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  const num = Number(val);
  if (Math.abs(num) < 1e-9) return '0';
  const factor = Math.pow(10, maxDec);
  const rounded = Math.round(num * factor) / factor;
  return rounded.toString();
}

export function generateStepByStepReport(beamData, solution, lang = 'en') {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const L = beamData.length;
  const EJ = beamData.EI;

  // Handle Unstable Structure / Mechanism
  if (!solution || !solution.isStable) {
    return `
      <div class="p-6 bg-amber-50 border border-amber-200 rounded-lg text-center">
        <div class="text-3xl mb-2">⚠</div>
        <h3 class="text-base font-bold text-amber-900 mb-2">
          ${t.unstableBannerTitle}
        </h3>
        <p class="text-xs text-amber-800 leading-relaxed max-w-xl mx-auto mb-4">
          ${t.unstableBannerDesc1} ${t.unstableBannerDesc2}
        </p>
        <div class="inline-block text-left bg-white p-3.5 rounded border border-amber-200 text-xs font-mono text-slate-700">
          <div>• <strong>${t.supportsCountLabel}</strong> ${beamData.supports.length}</div>
          <div>• <strong>${t.hingesCountLabel}</strong> ${beamData.hinges.length}</div>
          <div>• <strong>${t.statusLabel}</strong> <span class="text-red-600 font-bold">${t.statusUnstable}</span></div>
        </div>
      </div>
    `;
  }

  const eq = solution.equilibrium;
  const crit = solution.criticalPoints;
  const det = solution.determinacy;
  const nDegree = det ? (det.degree || 0) : 0;

  const classificationText = nDegree === 0 
    ? t.statusDeterminate 
    : (nDegree > 0 ? t.statusIndeterminate.replace('{n}', nDegree) : t.statusUnstable);

  let html = '';

  // 1. Static Classification
  html += `
    <div class="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-lg">
      <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-blue-600"></span>
        ${t.section1Title}
      </h3>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
        <div class="bg-white p-3 rounded border border-slate-200">
          <div class="text-slate-500">${t.lengthLabel}</div>
          <div class="font-bold text-slate-800 text-sm mt-0.5">${formatNum(L)} m</div>
        </div>
        <div class="bg-white p-3 rounded border border-slate-200">
          <div class="text-slate-500">${t.rigidityLabel}</div>
          <div class="font-bold text-slate-800 text-sm mt-0.5">${EJ.toLocaleString()} kN·m²</div>
        </div>
        <div class="bg-white p-3 rounded border border-slate-200">
          <div class="text-slate-500">${t.classificationLabel}</div>
          <div class="font-bold ${nDegree > 0 ? 'text-indigo-700' : 'text-emerald-700'} text-sm mt-0.5">${classificationText}</div>
        </div>
      </div>
    </div>
  `;

  // 2. Global Equilibrium & Reactions
  html += `
    <div class="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-lg">
      <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-emerald-600"></span>
        ${t.section2Title}
      </h3>
      
      <div class="space-y-2 text-xs text-slate-800 font-mono bg-white p-3 rounded border border-slate-200 mb-3">
        <div><strong>${t.vertEq}</strong> $\\sum F_z = 0 \\implies \\sum R_z = ${formatNum(eq.sumFzReactions)}\\text{ kN} \\quad (\\sum F_{z,\\text{ext}} = ${formatNum(eq.sumFzLoads)}\\text{ kN})$</div>
        <div><strong>${t.momentEq}</strong> $\\sum M_{(0)} = 0 \\implies \\sum M_{R} = ${formatNum(eq.sumMyReactions)}\\text{ kNm} \\quad (\\sum M_{\\text{ext}} = ${formatNum(eq.sumMyLoads)}\\text{ kNm})$</div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-xs border-collapse bg-white rounded border border-slate-200">
          <thead>
            <tr class="bg-slate-100 text-slate-700">
              <th class="p-2.5 border text-center">${t.supportNodeCol}</th>
              <th class="p-2.5 border text-center">${t.locCol}</th>
              <th class="p-2.5 border text-center">${t.supportMovementCol}</th>
              <th class="p-2.5 border text-center">${t.vertReactionCol}</th>
              <th class="p-2.5 border text-center">${t.momentReactionCol}</th>
            </tr>
          </thead>
          <tbody>
  `;

  beamData.supports.forEach((s, idx) => {
    const rz = solution.reactions.fz[s.x] !== undefined ? formatNum(solution.reactions.fz[s.x]) : '-';
    const my = solution.reactions.my[s.x] !== undefined ? formatNum(solution.reactions.my[s.x]) : '-';
    const mov = s.movement !== undefined && Math.abs(s.movement) > 1e-6 ? formatNum(s.movement) : '0';

    html += `
      <tr class="hover:bg-slate-50">
        <td class="p-3 border text-center font-bold text-sm text-slate-800">${t.nodeLabel} ${idx + 1}</td>
        <td class="p-3 border text-center font-mono font-bold text-sm text-slate-700">${formatNum(s.x)}</td>
        <td class="p-3 border text-center font-mono font-bold text-sm text-indigo-700">${mov}</td>
        <td class="p-3 border text-center font-mono text-blue-700 font-bold text-[15px]">${rz}</td>
        <td class="p-3 border text-center font-mono text-emerald-700 font-bold text-[15px]">${my}</td>
      </tr>
    `;
  });

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  // 3. Characteristic Segments
  html += `
    <div class="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-lg">
      <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-amber-600"></span>
        ${t.section3Title}
      </h3>
      <p class="text-xs text-slate-600 mb-3">
        ${t.govDiffRelations}
      </p>
      
      <div class="space-y-3">
  `;

  solution.segments.forEach((seg, idx) => {
    const { xStart, xEnd, dx, c2, c3, qa, deltaQ } = seg;

    const xiStr = xStart === 0 ? 'x' : `(x - ${formatNum(xStart)})`;
    const tConst = formatNum(EJ * c3);
    const mConst = formatNum(EJ * c2);
    const mLinear = formatNum(EJ * c3);

    let tLatex = `T(x) = ${tConst}`;
    if (Math.abs(qa) > 1e-4) tLatex += ` - ${formatNum(qa)}\\cdot ${xiStr}`;
    if (Math.abs(deltaQ) > 1e-4) tLatex += ` - ${formatNum(0.5 * deltaQ)}\\cdot ${xiStr}^2`;

    let mLatex = `M(x) = ${mConst}`;
    if (Math.abs(EJ * c3) > 1e-4) mLatex += ` + ${mLinear}\\cdot ${xiStr}`;
    if (Math.abs(qa) > 1e-4) mLatex += ` - ${formatNum(0.5 * qa)}\\cdot ${xiStr}^2`;
    if (Math.abs(deltaQ) > 1e-4) mLatex += ` - ${formatNum(deltaQ / 6.0, 2)}\\cdot ${xiStr}^3`;

    const tStart = seg.evalV(xStart);
    const tEnd = seg.evalV(xEnd);
    const mStart = seg.evalM(xStart);
    const mEnd = seg.evalM(xEnd);

    html += `
      <div class="bg-white p-3.5 rounded-lg border border-slate-200">
        <div class="font-semibold text-xs text-slate-800 mb-2 border-b border-slate-100 pb-1.5 flex justify-between items-center">
          <span class="text-blue-950 font-bold">${t.segmentLabel} ${idx + 1}: $x \\in [${formatNum(xStart)},\\, ${formatNum(xEnd)}]\\text{ m}$</span>
          <span class="text-slate-500 font-mono text-[11.5px]">$\\Delta x = ${formatNum(dx)}\\text{ m}$</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono text-slate-700">
          <div class="p-2.5 bg-blue-50/70 rounded border border-blue-100">
            <div class="text-blue-900 font-bold text-[11.5px] mb-1">${t.shearEquationLabel}</div>
            <div class="mb-1">$${tLatex}\\text{ [kN]}$</div>
            <div class="text-[11px] text-slate-500">
              $T(${formatNum(xStart)}) = ${formatNum(tStart)}\\text{ kN}, \\quad T(${formatNum(xEnd)}) = ${formatNum(tEnd)}\\text{ kN}$
            </div>
          </div>
          <div class="p-2.5 bg-emerald-50/70 rounded border border-emerald-100">
            <div class="text-emerald-900 font-bold text-[11.5px] mb-1">${t.momentEquationLabel}</div>
            <div class="mb-1">$${mLatex}\\text{ [kNm]}$</div>
            <div class="text-[11px] text-slate-500">
              $M(${formatNum(xStart)}) = ${formatNum(mStart)}\\text{ kNm}, \\quad M(${formatNum(xEnd)}) = ${formatNum(mEnd)}\\text{ kNm}$
            </div>
          </div>
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  // 4. Extremum Summary
  html += `
    <div class="p-4 bg-slate-50 border border-slate-200 rounded-lg">
      <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-purple-600"></span>
        ${t.section4Title}
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
        <div class="bg-white p-3 rounded border border-slate-200">
          <div class="text-slate-600 font-bold mb-1">${t.shearExtrema}</div>
          <div class="text-blue-700 font-bold text-sm">$T_{\\max} = ${formatNum(crit.maxV.val)}\\text{ kN}$ @ $x = ${formatNum(crit.maxV.x)}\\text{m}$</div>
          <div class="text-red-600 font-bold mt-1 text-sm">$T_{\\min} = ${formatNum(crit.minV.val)}\\text{ kN}$ @ $x = ${formatNum(crit.minV.x)}\\text{m}$</div>
        </div>
        <div class="bg-white p-3 rounded border border-slate-200">
          <div class="text-slate-600 font-bold mb-1">${t.momentExtrema}</div>
          <div class="text-emerald-700 font-bold text-sm">$M_{\\max} = ${crit.maxM.val > 0 ? '+' : ''}${formatNum(crit.maxM.val)}\\text{ kNm}$ @ $x = ${formatNum(crit.maxM.x)}\\text{m}$</div>
          <div class="text-amber-600 font-bold mt-1 text-sm">$M_{\\min} = ${formatNum(crit.minM.val)}\\text{ kNm}$ @ $x = ${formatNum(crit.minM.x)}\\text{m}$</div>
        </div>
        <div class="bg-white p-3 rounded border border-slate-200">
          <div class="text-slate-600 font-bold mb-1">${t.deflectionExtrema}</div>
          <div class="text-cyan-700 font-bold text-sm">$w_{\\max} = ${formatNum(Math.max(Math.abs(crit.maxW.val), Math.abs(crit.minW.val)) * 1000)}\\text{ mm}$</div>
          <div class="text-slate-500 text-xs mt-1">${t.deflectionRatio} $L / ${formatNum(Math.abs(L / Math.max(1e-6, Math.max(Math.abs(crit.maxW.val), Math.abs(crit.minW.val)))), 0)}$</div>
        </div>
      </div>
    </div>
  `;

  return html;
}
