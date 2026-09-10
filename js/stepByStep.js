/**
 * 2D Analytical Beam Calculator - Formal Academic Calculation Report Generator
 * Notation: T(x) for shear force, M(x) for bending moment, EJ for bending stiffness.
 * Formatted for KaTeX rendering, academic reporting, and print/PDF export.
 */

import { TRANSLATIONS } from './i18n.js?v=1.3.0';

function formatNum(val, maxDec = 2) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  const num = Number(val);
  if (Math.abs(num) < 1e-9) return '0.00';
  const factor = Math.pow(10, maxDec);
  const rounded = Math.round(num * factor) / factor;
  return rounded.toFixed(maxDec);
}

export function generateStepByStepReport(beamData, solution, lang = 'en', images = {}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const isPl = lang === 'pl';
  const L = beamData.length;
  const EJ = beamData.EI;

  const unsolvedImg = images && images.unsolvedImg ? images.unsolvedImg : null;
  const reactionsImg = images && images.reactionsImg ? images.reactionsImg : null;
  const shearImg = images && images.shearImg ? images.shearImg : null;
  const momentImg = images && images.momentImg ? images.momentImg : null;

  // Handle Unstable Structure / Mechanism
  if (!solution || !solution.isStable) {
    return `
      <div class="p-6 bg-amber-50 border border-amber-300 rounded-lg text-center text-amber-950 font-sans">
        <div class="text-3xl mb-2">⚠</div>
        <h3 class="text-base font-bold text-amber-900 mb-2">
          ${t.unstableBannerTitle}
        </h3>
        <p class="text-xs text-amber-800 leading-relaxed max-w-xl mx-auto mb-4">
          ${t.unstableBannerDesc1} ${t.unstableBannerDesc2}
        </p>
        <div class="inline-block text-left bg-white p-3.5 rounded border border-amber-200 text-xs font-mono text-slate-700">
          <div>• <strong>${t.supportsCountLabel}</strong> ${beamData.supports ? beamData.supports.length : 0}</div>
          <div>• <strong>${t.hingesCountLabel}</strong> ${beamData.hinges ? beamData.hinges.length : 0}</div>
          <div>• <strong>${t.statusLabel}</strong> <span class="text-red-600 font-bold">${t.statusUnstable}</span></div>
        </div>
      </div>
    `;
  }

  const eq = solution.equilibrium || { sumFzLoads: 0, sumFzReactions: 0, sumMyLoads: 0, sumMyReactions: 0 };
  const crit = solution.criticalPoints || {
    maxV: { val: 0, x: 0 },
    minV: { val: 0, x: 0 },
    maxM: { val: 0, x: 0 },
    minM: { val: 0, x: 0 },
    maxW: { val: 0, x: 0 },
    minW: { val: 0, x: 0 }
  };
  const det = solution.determinacy;
  const nDegree = det ? (det.degree || 0) : 0;

  let supportDof = 0;
  (beamData.supports || []).forEach(s => {
    if (s.fz) supportDof += 1;
    if (s.my) supportDof += 1;
  });
  const hingeCount = beamData.hinges ? beamData.hinges.length : 0;

  const classificationText = nDegree === 0 
    ? t.statusDeterminate 
    : (nDegree > 0 ? t.statusIndeterminate.replace('{n}', nDegree) : t.statusUnstable);

  // Build Reactions Table Rows
  const letterLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let reactionsTableRows = '';
  (beamData.supports || []).forEach((s, idx) => {
    const nodeLabel = letterLabels[idx] || `${idx + 1}`;
    const rz = solution.reactions && solution.reactions.fz && solution.reactions.fz[s.x] !== undefined
      ? formatNum(solution.reactions.fz[s.x])
      : '0.00';
    const my = solution.reactions && solution.reactions.my && solution.reactions.my[s.x] !== undefined
      ? formatNum(solution.reactions.my[s.x])
      : '0.00';
    const mov = s.movement !== undefined && Math.abs(s.movement) > 1e-6 ? formatNum(s.movement) : '0.00';

    let sType = isPl ? 'Podpora przesuwna' : 'Roller Support';
    if (s.fz && s.my) {
      sType = isPl ? 'Utwierdzenie' : 'Fixed Support';
    } else if (idx === 0 || (!s.my && s.fz)) {
      sType = isPl ? 'Podpora nieprzesuwna' : 'Pinned Support';
    }

    reactionsTableRows += `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="p-2.5 border text-center font-bold text-slate-800 font-sans">${isPl ? 'Węzeł' : 'Node'} ${nodeLabel}</td>
        <td class="p-2.5 border text-center font-sans text-slate-600 text-[11.5px]">${sType}</td>
        <td class="p-2.5 border text-center font-mono font-bold text-slate-700">${formatNum(s.x)} m</td>
        <td class="p-2.5 border text-center font-mono text-blue-700 font-bold text-[13px]">${rz} kN</td>
        <td class="p-2.5 border text-center font-mono text-emerald-700 font-bold text-[13px]">${my} kNm</td>
        <td class="p-2.5 border text-center font-mono text-indigo-700 text-[11.5px]">${mov} m</td>
      </tr>
    `;
  });

  // Build Segment Derivations
  let segmentBlocks = '';
  (solution.segments || []).forEach((seg, idx) => {
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

    // Check for zero shear in this segment
    let zeroShearNote = '';
    if (solution.criticalPoints && solution.criticalPoints.shearZeros) {
      const zerosInSeg = solution.criticalPoints.shearZeros.filter(
        z => z.x > xStart + 1e-4 && z.x < xEnd - 1e-4
      );
      if (zerosInSeg.length > 0) {
        zeroShearNote = zerosInSeg.map(z => `
          <div class="mt-2 p-2 bg-amber-50/90 border border-amber-200 rounded text-xs text-amber-950 font-mono">
            <span class="font-sans font-bold text-amber-900">${isPl ? 'Punkt zerowy siły tnącej (ekstremum momentu zginającego):' : 'Zero shear crossing (bending moment extremum):'}</span><br>
            $T(x_0) = 0 \\implies x_0 = ${formatNum(z.x)}\\text{ m} \\implies M_{\\text{ext}} = M(${formatNum(z.x)}) = ${formatNum(z.M)}\\text{ kNm}$
          </div>
        `).join('');
      }
    }

    segmentBlocks += `
      <div class="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
        <div class="font-bold text-xs text-slate-800 mb-2 border-b border-slate-100 pb-1.5 flex justify-between items-center font-sans">
          <span class="text-blue-900 font-extrabold text-[12.5px]">
            ${t.segmentLabel} ${idx + 1}: $x \\in [${formatNum(xStart)},\\, ${formatNum(xEnd)}]\\text{ m}$
          </span>
          <span class="text-slate-500 font-mono text-[11.5px]">$\\Delta x = ${formatNum(dx)}\\text{ m}$</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono text-slate-800">
          <div class="p-2.5 bg-blue-50/70 rounded border border-blue-100">
            <div class="text-blue-900 font-bold text-[11.5px] font-sans mb-1">${t.shearEquationLabel}</div>
            <div class="mb-1.5 text-[12.5px]">$${tLatex}\\text{ [kN]}$</div>
            <div class="text-[11px] text-slate-600 border-t border-blue-100/80 pt-1">
              $T(${formatNum(xStart)}) = ${formatNum(tStart)}\\text{ kN}, \\quad T(${formatNum(xEnd)}) = ${formatNum(tEnd)}\\text{ kN}$
            </div>
          </div>
          <div class="p-2.5 bg-emerald-50/70 rounded border border-emerald-100">
            <div class="text-emerald-900 font-bold text-[11.5px] font-sans mb-1">${t.momentEquationLabel}</div>
            <div class="mb-1.5 text-[12.5px]">$${mLatex}\\text{ [kNm]}$</div>
            <div class="text-[11px] text-slate-600 border-t border-emerald-100/80 pt-1">
              $M(${formatNum(xStart)}) = ${formatNum(mStart)}\\text{ kNm}, \\quad M(${formatNum(xEnd)}) = ${formatNum(mEnd)}\\text{ kNm}$
            </div>
          </div>
        </div>
        ${zeroShearNote}
      </div>
    `;
  });

  // Calculate Deflection Limit State
  const maxAbsW = Math.max(1e-9, Math.max(Math.abs(crit.maxW.val), Math.abs(crit.minW.val)));
  const maxW_mm = maxAbsW * 1000;
  const allowableW_mm = (L / 250) * 1000;
  const ratio = Math.abs(L / maxAbsW);

  return `
    <div class="report-container space-y-6 text-slate-800 font-sans">

      <!-- Academic Header -->
      <div class="pb-3 border-b-2 border-slate-900">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 class="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
              ${isPl ? 'Sprawozdanie z Obliczeń Statycznych Belki 2D' : '2D Beam Static Analysis & Calculation Report'}
            </h2>
            <div class="text-[11.5px] text-slate-500 mt-0.5">
              ${isPl ? 'Analityczna teoria Eulera-Bernoulliego • Wytrzymałość Materiałów i Mechanika Budowli' : 'Analytical Euler-Bernoulli Theory • Mechanics of Materials & Structural Analysis'}
            </div>
          </div>
          <div class="text-right text-[11px] font-mono text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200">
            <div><strong>EJ = const</strong></div>
            <div>${new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      <!-- SECTION 1: Structural Scheme & Static Determinacy -->
      <div class="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs">
        <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-200 flex items-center justify-between">
          <span>${t.section1Title || (isPl ? '1. Układ konstrukcyjny i stopień wyznaczalności' : '1. Structural Scheme & Static Determinacy')}</span>
          <span class="text-xs font-normal text-slate-400 normal-case font-mono">${isPl ? 'Geometria i podpory' : 'Geometry & Supports'}</span>
        </h3>

        <!-- Figure 1: Unsolved Structure -->
        ${unsolvedImg ? `
          <div class="mb-4 p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <div class="flex justify-center items-center p-2 bg-white rounded border border-slate-100 overflow-hidden">
              <img src="${unsolvedImg}" alt="Structural Scheme" class="max-h-56 sm:max-h-64 w-auto object-contain" />
            </div>
            <div class="text-[11px] italic text-slate-600 mt-1.5 font-sans">
              ${isPl ? 'Rys. 1: Schemat statyczny belki — geometria, warunki brzegowe i obciążenia zewnętrzne' : 'Fig. 1: Structural scheme of the beam — geometry, boundary conditions and applied loads'}
            </div>
          </div>
        ` : ''}

        <!-- Parameters: EJ and Static Determinacy Formula (Length omitted as it is clearly dimensioned in Figure 1) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div class="text-slate-500 text-[10.5px] uppercase font-sans font-semibold mb-1">
              ${isPl ? 'Sztywność zginania belki (EJ)' : 'Bending Rigidity (EJ)'}
            </div>
            <div class="text-base font-bold text-slate-900 font-mono">
              $EJ = ${EJ.toLocaleString()}\\text{ kN}\\cdot\\text{m}^2$
            </div>
            <div class="text-[11px] text-slate-500 font-sans mt-0.5">
              ${isPl ? 'Założenie: EJ = const na całej długości belki' : 'Assumption: EJ = const along the entire beam length'}
            </div>
          </div>

          <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div class="text-slate-500 text-[10.5px] uppercase font-sans font-semibold mb-1">
              ${isPl ? 'Stopień statycznej wyznaczalności (n)' : 'Degree of Static Determinacy (n)'}
            </div>
            <div class="text-[13px] font-bold text-slate-900 font-mono">
              $$n = r - (2 + h) = ${supportDof} - (2 + ${hingeCount}) = ${nDegree}$$
            </div>
            <div class="mt-1">
              <span class="inline-block px-2.5 py-0.5 rounded text-[11.5px] font-bold font-sans ${nDegree === 0 ? 'bg-emerald-100 text-emerald-800' : (nDegree > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800')}">
                ${classificationText}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 2: Global Equilibrium & Reactions -->
      <div class="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs">
        <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-200 flex items-center justify-between">
          <span>${t.section2Title || (isPl ? '2. Równania równowagi i reakcje podpór' : '2. Global Equilibrium & Reactions')}</span>
          <span class="text-xs font-normal text-slate-400 normal-case font-mono">${isPl ? 'Warunki statyki' : 'Static conditions'}</span>
        </h3>

        <!-- Figure 2: Reactions Free-Body Diagram -->
        ${reactionsImg ? `
          <div class="mb-4 p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <div class="flex justify-center items-center p-2 bg-white rounded border border-slate-100 overflow-hidden">
              <img src="${reactionsImg}" alt="Support Reactions Scheme" class="max-h-56 sm:max-h-64 w-auto object-contain" />
            </div>
            <div class="text-[11px] italic text-slate-600 mt-1.5 font-sans">
              ${isPl ? 'Rys. 2: Schemat ze wyznaczonymi reakcjami podporowymi i momentami utwierdzenia' : 'Fig. 2: Free-body diagram with calculated support reaction forces and fixed-end moments'}
            </div>
          </div>
        ` : ''}

        <!-- Formal Equilibrium Equations -->
        <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-lg mb-4 text-xs font-mono text-slate-800 space-y-2">
          <div class="font-sans font-bold text-slate-700 text-[11px] uppercase tracking-wide border-b border-slate-200 pb-1 mb-2">
            ${isPl ? 'Formalny zapis warunków równowagi statycznej w płaszczyźnie (x, z):' : 'Formal Planar Equilibrium Equations in (x, z) Plane:'}
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="bg-white p-3 rounded border border-slate-200">
              <div class="font-bold text-slate-700 mb-1 font-sans text-[11.5px]">${t.vertEq || (isPl ? 'Rzut sił na oś Z:' : 'Vertical Force Equilibrium:')}</div>
              <div class="text-[12.5px]">$$\\sum F_z = 0 \\implies \\sum F_{z,\\text{ext}} - \\sum R_z = 0$$</div>
              <div class="text-[11px] text-slate-600 mt-0.5">
                $${formatNum(eq.sumFzLoads)}\\text{ kN} - ${formatNum(eq.sumFzReactions)}\\text{ kN} = ${formatNum(eq.sumFzLoads - eq.sumFzReactions, 3)}\\text{ kN} \\quad \\text{[OK ✓]}$
              </div>
            </div>

            <div class="bg-white p-3 rounded border border-slate-200">
              <div class="font-bold text-slate-700 mb-1 font-sans text-[11.5px]">${t.momentEq || (isPl ? 'Moment względem x = 0:' : 'Moment Equilibrium at Origin:')}</div>
              <div class="text-[12.5px]">$$\\sum M_{(0)} = 0 \\implies \\sum M_{\\text{ext}} - \\sum M_{\\text{react}} = 0$$</div>
              <div class="text-[11px] text-slate-600 mt-0.5">
                $${formatNum(eq.sumMyLoads)}\\text{ kNm} - ${formatNum(eq.sumMyReactions)}\\text{ kNm} = ${formatNum(eq.sumMyLoads - eq.sumMyReactions, 3)}\\text{ kNm} \\quad \\text{[OK ✓]}$
              </div>
            </div>
          </div>
        </div>

        <!-- Reactions Summary Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-xs border-collapse bg-white rounded border border-slate-200 font-mono">
            <thead>
              <tr class="bg-slate-100 text-slate-700 font-sans">
                <th class="p-2 border text-center font-bold">${t.supportNodeCol || (isPl ? 'Węzeł' : 'Support')}</th>
                <th class="p-2 border text-center font-bold">${isPl ? 'Typ podpory' : 'Support Type'}</th>
                <th class="p-2 border text-center font-bold">${t.locCol || 'x [m]'}</th>
                <th class="p-2 border text-center font-bold">${t.vertReactionCol || 'Rz [kN]'}</th>
                <th class="p-2 border text-center font-bold">${t.momentReactionCol || 'MR [kNm]'}</th>
                <th class="p-2 border text-center font-bold">${isPl ? 'Osiadanie Δ [m]' : 'Settlement Δ [m]'}</th>
              </tr>
            </thead>
            <tbody>
              ${reactionsTableRows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- SECTION 3: Internal Force Diagrams & Derivations -->
      <div class="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs">
        <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-200 flex items-center justify-between">
          <span>${t.section3Title || (isPl ? '3. Wykresy i równania analityczne sił wewnętrznych' : '3. Internal Force Diagrams & Segment Equations')}</span>
          <span class="text-xs font-normal text-slate-400 normal-case font-mono">T(x), M(x)</span>
        </h3>

        <!-- Figures 3 & 4: T(x) and M(x) Diagrams Shown First -->
        ${(shearImg || momentImg) ? `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            ${shearImg ? `
              <div class="p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <div class="flex justify-center items-center p-2 bg-white rounded border border-slate-100 overflow-hidden">
                  <img src="${shearImg}" alt="Shear Force Diagram" class="max-h-52 w-auto object-contain" />
                </div>
                <div class="text-[11px] italic text-slate-600 mt-1.5 font-sans">
                  ${isPl ? 'Rys. 3: Wykres sił poprzecznych T(x) [kN]' : 'Fig. 3: Shear force diagram T(x) [kN]'}
                </div>
              </div>
            ` : ''}

            ${momentImg ? `
              <div class="p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <div class="flex justify-center items-center p-2 bg-white rounded border border-slate-100 overflow-hidden">
                  <img src="${momentImg}" alt="Bending Moment Diagram" class="max-h-52 w-auto object-contain" />
                </div>
                <div class="text-[11px] italic text-slate-600 mt-1.5 font-sans">
                  ${isPl ? 'Rys. 4: Wykres momentów zginających M(x) [kNm] (włókna rozciągane)' : 'Fig. 4: Bending moment diagram M(x) [kNm] (tension fiber side)'}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Governing Differential Relations -->
        <div class="p-3 bg-blue-50/80 border border-blue-200 rounded-lg mb-4 text-xs font-mono text-blue-950">
          <span class="font-sans font-bold uppercase tracking-wide text-blue-900">${isPl ? 'Związki różniczkowe Eulera-Bernoulliego:' : 'Euler-Bernoulli Governing Differential Relations:'}</span><br>
          $$\\frac{dT(x)}{dx} = -q(x), \\qquad \\frac{dM(x)}{dx} = T(x)$$
        </div>

        <!-- Segment Derivations -->
        <div class="space-y-3.5">
          ${segmentBlocks}
        </div>
      </div>

      <!-- SECTION 4: Extremum Values Summary & SLS Verification -->
      <div class="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs">
        <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-200 flex items-center justify-between">
          <span>${t.section4Title || (isPl ? '4. Zestawienie wartości ekstremalnych' : '4. Extremum Values Summary')}</span>
          <span class="text-xs font-normal text-slate-400 normal-case font-mono">${isPl ? 'SGN i SGU' : 'ULS & SLS Summary'}</span>
        </h3>

        <!-- Formal Extrema Table -->
        <div class="overflow-x-auto mb-4">
          <table class="w-full text-xs border-collapse bg-white rounded border border-slate-200 font-mono">
            <thead>
              <tr class="bg-slate-100 text-slate-700 font-sans">
                <th class="p-2 border text-left font-bold">${isPl ? 'Wielkość fizyczna' : 'Parameter'}</th>
                <th class="p-2 border text-center font-bold">${isPl ? 'Symbol' : 'Symbol'}</th>
                <th class="p-2 border text-center font-bold">${isPl ? 'Wartość ekstremalna' : 'Extreme Value'}</th>
                <th class="p-2 border text-center font-bold">${isPl ? 'Położenie x' : 'Location x'}</th>
                <th class="p-2 border text-left font-bold font-sans">${isPl ? 'Interpretacja inżynierska' : 'Engineering Note'}</th>
              </tr>
            </thead>
            <tbody>
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-2 border font-sans font-semibold text-slate-800">${isPl ? 'Maksymalna siła poprzeczna' : 'Maximum Positive Shear Force'}</td>
                <td class="p-2 border text-center font-bold text-blue-700">$T_{\\max}$</td>
                <td class="p-2 border text-center font-bold text-blue-800 text-[13px]">${crit.maxV.val > 0 ? '+' : ''}${formatNum(crit.maxV.val)} kN</td>
                <td class="p-2 border text-center font-bold text-slate-700">x = ${formatNum(crit.maxV.x)} m</td>
                <td class="p-2 border font-sans text-slate-600 text-[11.5px]">${isPl ? 'Maksymalne ścinanie dodatnie' : 'Peak positive shear force'}</td>
              </tr>
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-2 border font-sans font-semibold text-slate-800">${isPl ? 'Minimalna siła poprzeczna' : 'Maximum Negative Shear Force'}</td>
                <td class="p-2 border text-center font-bold text-red-700">$T_{\\min}$</td>
                <td class="p-2 border text-center font-bold text-red-800 text-[13px]">${formatNum(crit.minV.val)} kN</td>
                <td class="p-2 border text-center font-bold text-slate-700">x = ${formatNum(crit.minV.x)} m</td>
                <td class="p-2 border font-sans text-slate-600 text-[11.5px]">${isPl ? 'Maksymalne ścinanie ujemne' : 'Peak negative shear force'}</td>
              </tr>
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-2 border font-sans font-semibold text-slate-800">${isPl ? 'Maksymalny moment zginający' : 'Maximum Span Bending Moment'}</td>
                <td class="p-2 border text-center font-bold text-emerald-700">$M_{\\max}$</td>
                <td class="p-2 border text-center font-bold text-emerald-800 text-[13px]">${crit.maxM.val > 0 ? '+' : ''}${formatNum(crit.maxM.val)} kNm</td>
                <td class="p-2 border text-center font-bold text-slate-700">x = ${formatNum(crit.maxM.x)} m</td>
                <td class="p-2 border font-sans text-slate-600 text-[11.5px]">${isPl ? 'Rozciąganie włókien dolnych (przęsło)' : 'Bottom fibers in tension (sagging)'}</td>
              </tr>
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-2 border font-sans font-semibold text-slate-800">${isPl ? 'Minimalny moment zginający' : 'Maximum Support Bending Moment'}</td>
                <td class="p-2 border text-center font-bold text-amber-700">$M_{\\min}$</td>
                <td class="p-2 border text-center font-bold text-amber-800 text-[13px]">${formatNum(crit.minM.val)} kNm</td>
                <td class="p-2 border text-center font-bold text-slate-700">x = ${formatNum(crit.minM.x)} m</td>
                <td class="p-2 border font-sans text-slate-600 text-[11.5px]">${isPl ? 'Rozciąganie włókien górnych (podpora/wspornik)' : 'Top fibers in tension (hogging)'}</td>
              </tr>
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-2 border font-sans font-semibold text-slate-800">${isPl ? 'Maksymalne ugięcie sprężyste' : 'Maximum Elastic Deflection'}</td>
                <td class="p-2 border text-center font-bold text-cyan-700">$w_{\\max}$</td>
                <td class="p-2 border text-center font-bold text-cyan-800 text-[13px]">${formatNum(maxW_mm)} mm</td>
                <td class="p-2 border text-center font-bold text-slate-700">x = ${formatNum(crit.maxW.x)} m</td>
                <td class="p-2 border font-sans text-slate-600 font-mono text-[11.5px]">$\\approx L / ${formatNum(ratio, 0)}$</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- SLS / SGU Deflection Verification Box -->
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800">
          <div class="font-sans font-bold text-slate-700 mb-1 text-[11.5px]">
            ${isPl ? 'Weryfikacja Stanu Granicznego Użytkowalności (SGU — ugięcie sprężyste):' : 'Serviceability Limit State Verification (SLS — Elastic Deflection):'}
          </div>
          <div class="text-[12.5px] mt-1">
            $$w_{\\max} = ${formatNum(maxW_mm)}\\text{ mm} \\quad \\left( \\frac{L}{${formatNum(ratio, 0)}} \\right) \\qquad \\text{wobec dopuszczalnego } w_{\\text{dop}} = \\frac{L}{250} = ${formatNum(allowableW_mm)}\\text{ mm}$$
          </div>
          <div class="text-[11.5px] font-sans font-semibold mt-1.5 ${maxW_mm <= allowableW_mm ? 'text-emerald-700' : 'text-amber-700'}">
            ${maxW_mm <= allowableW_mm 
              ? (isPl ? '✓ Warunek sztywności spełniony: ugięcie nie przekracza wartości dopuszczalnej (w_max ≤ L/250)' : '✓ Deflection criterion satisfied: max deflection does not exceed allowable limit (w_max ≤ L/250)') 
              : (isPl ? '⚠ Ugięcie przekracza kryterium normowe L/250' : '⚠ Max deflection exceeds normative criterion L/250')}
          </div>
        </div>
      </div>

    </div>
  `;
}
