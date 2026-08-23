/**
 * 2D Analytical Beam Calculator - Interactive Canvas Renderer
 * Notation: T(x) for shear force (drawn with positive T > 0 below x-axis), EJ for bending stiffness.
 * Smart number formatting (no redundant trailing zeros on canvas, tooltips, and labels).
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

export class BeamRenderer {
  constructor(canvasElement, tooltipElement, onCursorMove) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.tooltip = tooltipElement;
    this.onCursorMove = onCursorMove;

    this.beamData = null;
    this.solution = null;
    this.viewMode = 'reactions';
    this.cursorX = null;
    this.lang = 'en';

    this.padding = { left: 95, right: 85, top: 40, bottom: 50 };
    this.setupListeners();
  }

  setLanguage(lang) {
    this.lang = lang;
    this.draw();
  }

  get t() {
    return TRANSLATIONS[this.lang] || TRANSLATIONS.en;
  }

  setupListeners() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const pixelX = e.clientX - rect.left;
      const pixelY = e.clientY - rect.top;

      if (!this.beamData) return;

      const beamX = this.pixelToBeamX(pixelX);
      if (beamX >= 0 && beamX <= this.beamData.length) {
        this.cursorX = beamX;
        this.updateTooltip(e.clientX, e.clientY, beamX);
        if (this.onCursorMove) {
          const values = this.evaluateAt(beamX);
          this.onCursorMove(values);
        }
      } else {
        this.cursorX = null;
        this.hideTooltip();
      }
      this.draw();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.cursorX = null;
      this.hideTooltip();
      this.draw();
      if (this.onCursorMove) {
        this.onCursorMove(null);
      }
    });

    window.addEventListener('resize', () => {
      this.resize();
      this.draw();
    });
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  setData(beamData, solution, viewMode) {
    this.beamData = beamData;
    this.solution = solution;
    if (viewMode) this.viewMode = viewMode;
    this.draw();
  }

  beamToPixelX(x) {
    const availableWidth = this.width - this.padding.left - this.padding.right;
    const L = this.beamData ? this.beamData.length : 1;
    return this.padding.left + (x / L) * availableWidth;
  }

  pixelToBeamX(pixelX) {
    const availableWidth = this.width - this.padding.left - this.padding.right;
    const L = this.beamData ? this.beamData.length : 1;
    return ((pixelX - this.padding.left) / availableWidth) * L;
  }

  evaluateAt(x) {
    if (!this.solution || !this.solution.isStable || !this.solution.segments.length) return null;
    const clampedX = Math.max(0, Math.min(this.beamData.length, x));
    let segIdx = 0;
    for (let k = 0; k < this.solution.segments.length; k++) {
      if (clampedX >= this.solution.segments[k].xStart - 1e-9 && clampedX <= this.solution.segments[k].xEnd + 1e-9) {
        segIdx = k;
        break;
      }
    }
    const bSeg = this.solution.segments[segIdx];

    return {
      x: clampedX,
      T: bSeg ? bSeg.evalV(clampedX) : 0,
      M: bSeg ? bSeg.evalM(clampedX) : 0,
      theta: bSeg ? bSeg.evalTheta(clampedX) : 0,
      w: bSeg ? bSeg.evalW(clampedX) : 0
    };
  }

  updateTooltip(clientX, clientY, beamX) {
    if (!this.tooltip) return;

    const parentRect = this.canvas.getBoundingClientRect();
    const xPos = clientX - parentRect.left;
    const yPos = clientY - parentRect.top;

    if (!this.solution || !this.solution.isStable) {
      let content = `
        <div class="font-bold text-[13px] text-yellow-300 font-mono">
          x = ${formatNum(beamX)} m
        </div>
      `;
      this.tooltip.innerHTML = content;
      this.tooltip.style.display = 'block';
      this.tooltip.style.left = `${xPos}px`;
      const beamY = this.height * 0.30;
      this.tooltip.style.top = `${Math.max(40, beamY - 45)}px`;
      return;
    }

    const vals = this.evaluateAt(beamX);
    if (!vals) return;

    let content = `
      <div class="font-bold text-[13.5px] text-yellow-300 border-b border-slate-700 pb-1 mb-1.5 font-mono">
        x = ${formatNum(vals.x)} m
      </div>
      <div class="grid grid-cols-2 gap-x-5 gap-y-1 text-[13px]">
        <div><span class="text-blue-300 font-semibold">T:</span> <span class="font-mono font-bold">${formatNum(vals.T)} kN</span></div>
        <div><span class="text-emerald-300 font-semibold">M:</span> <span class="font-mono font-bold">${formatNum(vals.M)} kNm</span></div>
        <div class="col-span-2"><span class="text-cyan-300 font-semibold">w:</span> <span class="font-mono font-bold">${formatNum(vals.w * 1000)} mm</span></div>
      </div>
    `;

    this.tooltip.innerHTML = content;
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = `${xPos}px`;
    this.tooltip.style.top = `${Math.max(60, yPos - 12)}px`;
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  draw() {
    if (!this.width || !this.height) this.resize();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (!this.beamData || !this.solution) {
      this.drawEmptyState();
      return;
    }

    if (this.viewMode === 'all') {
      this.drawMultiDiagramView();
    } else {
      this.drawSingleDiagramView();
    }

    if (this.solution.isStable && this.cursorX !== null && this.cursorX >= 0 && this.cursorX <= this.beamData.length) {
      this.drawCrosshair(this.cursorX);
    }
  }

  drawEmptyState() {
    const ctx = this.ctx;
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('2D Analytical Beam Calculator - Ready', this.width / 2, this.height / 2);
  }

  drawSingleDiagramView() {
    const isReactionsView = this.viewMode === 'reactions';
    const beamY = isReactionsView ? this.height * 0.30 : this.height * 0.32;
    const diagramY = this.height * 0.72;
    const diagramHeight = this.height * 0.44;

    // 1. Draw Structure & Loads
    this.drawBeamStructure(beamY);

    if (!this.solution.isStable) {
      this.drawUnstableWarningBanner(diagramY, diagramHeight);
      return;
    }

    // 2. Draw Active View
    if (isReactionsView) {
      this.drawReactionArrowsLower(beamY);
    } else if (this.viewMode === 'shear') {
      // Positive shear T > 0 drawn below the x-axis (invert = true)
      this.drawDiagramCurve(
        diagramY,
        diagramHeight,
        (vals) => vals.T,
        this.t.shearDiagramTitle,
        'T [kN]',
        '#2563eb',
        'rgba(37, 99, 235, 0.22)',
        'rgba(239, 68, 68, 0.22)',
        this.solution.criticalPoints ? this.solution.criticalPoints.maxV : null,
        this.solution.criticalPoints ? this.solution.criticalPoints.minV : null,
        true // Invert: T > 0 drawn downwards below the x-axis
      );
    } else if (this.viewMode === 'moment') {
      this.drawDiagramCurve(
        diagramY,
        diagramHeight,
        (vals) => vals.M,
        this.t.momentDiagramTitle,
        'M [kNm]',
        '#059669',
        'rgba(16, 185, 129, 0.25)',
        'rgba(245, 158, 11, 0.25)',
        this.solution.criticalPoints ? this.solution.criticalPoints.maxM : null,
        this.solution.criticalPoints ? this.solution.criticalPoints.minM : null,
        true // Invert: M > 0 drawn downwards
      );
    } else if (this.viewMode === 'displacement') {
      this.drawDiagramCurve(
        diagramY,
        diagramHeight,
        (vals) => vals.w * 1000,
        this.t.deflectionDiagramTitle,
        'w [mm]',
        '#0891b2',
        'rgba(6, 182, 212, 0.22)',
        'rgba(14, 165, 233, 0.22)',
        this.solution.criticalPoints ? { val: this.solution.criticalPoints.maxW.val * 1000, x: this.solution.criticalPoints.maxW.x } : null,
        this.solution.criticalPoints ? { val: this.solution.criticalPoints.minW.val * 1000, x: this.solution.criticalPoints.minW.x } : null,
        true // Invert: w > 0 downwards
      );
    }
  }

  drawMultiDiagramView() {
    const totalAvailH = this.height - this.padding.top - this.padding.bottom;
    
    const beamY = this.padding.top + totalAvailH * 0.08;
    const shearY = this.padding.top + totalAvailH * 0.38;
    const momentY = this.padding.top + totalAvailH * 0.65;
    const deflY = this.padding.top + totalAvailH * 0.90;
    const plotHeight = totalAvailH * 0.18;

    // 1. Structure
    this.drawBeamStructure(beamY, 0.72);

    if (!this.solution.isStable) {
      this.drawUnstableWarningBanner(this.height * 0.60, this.height * 0.45);
      return;
    }

    this.drawReactionArrowsLower(beamY, 0.72);

    // 2. Shear Plot T(x) (drawn with T > 0 downwards)
    this.drawDiagramCurve(
      shearY,
      plotHeight,
      (vals) => vals.T,
      'T(x) [kN]',
      'T [kN]',
      '#2563eb',
      'rgba(37, 99, 235, 0.20)',
      'rgba(239, 68, 68, 0.20)',
      null, null, true
    );

    // 3. Moment Plot M(x)
    this.drawDiagramCurve(
      momentY,
      plotHeight,
      (vals) => vals.M,
      'M(x) [kNm]',
      'M [kNm]',
      '#059669',
      'rgba(16, 185, 129, 0.20)',
      'rgba(245, 158, 11, 0.20)',
      null, null, true
    );

    // 4. Displacement Plot w(x)
    this.drawDiagramCurve(
      deflY,
      plotHeight,
      (vals) => vals.w * 1000,
      'w(x) [mm]',
      'w [mm]',
      '#0891b2',
      'rgba(6, 182, 212, 0.20)',
      'rgba(14, 165, 233, 0.20)',
      null, null, true
    );
  }

  drawUnstableWarningBanner(boxCenterY, boxHeight) {
    const ctx = this.ctx;
    const boxW = Math.min(this.width - 40, 780);
    const boxH = 118;
    const boxX = (this.width - boxW) / 2;
    const boxY = boxCenterY - boxH / 2;

    ctx.save();
    ctx.fillStyle = '#fffbeb';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`⚠ ${this.t.unstableBannerTitle}`, this.width / 2, boxY + 36);

    ctx.fillStyle = '#78350f';
    ctx.font = '13.5px Inter, sans-serif';
    ctx.fillText(this.t.unstableBannerDesc1, this.width / 2, boxY + 68);
    ctx.fillText(this.t.unstableBannerDesc2, this.width / 2, boxY + 92);
    ctx.restore();
  }

  drawBeamStructure(beamY, scale = 1.0) {
    const ctx = this.ctx;
    const x0 = this.beamToPixelX(0);
    const xL = this.beamToPixelX(this.beamData.length);

    ctx.save();
    // Beam Axis Line
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 8 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, beamY);
    ctx.lineTo(xL, beamY);
    ctx.stroke();

    // Dimension Line
    const dimY = beamY + 48 * scale;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(x0, dimY);
    ctx.lineTo(xL, dimY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dimension tick marks
    [0, this.beamData.length].forEach(xVal => {
      const px = this.beamToPixelX(xVal);
      ctx.beginPath();
      ctx.moveTo(px, dimY - 7 * scale);
      ctx.lineTo(px, dimY + 7 * scale);
      ctx.stroke();
    });

    // Beam Length Dimension Number
    ctx.fillStyle = '#1e293b';
    ctx.font = `bold ${15 * scale}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`L = ${formatNum(this.beamData.length)} m`, (x0 + xL) / 2, dimY + 18 * scale);

    // Draw Loads & Supports
    this.drawDistributedLoads(beamY, scale);
    this.drawSupports(beamY, scale);
    this.drawHinges(beamY, scale);
    this.drawPointLoads(beamY, scale);

    ctx.restore();
  }

  drawSupports(beamY, scale) {
    const ctx = this.ctx;
    const supports = this.beamData.supports || [];

    supports.forEach((s) => {
      const px = this.beamToPixelX(s.x);
      const isFixed = s.fz && s.my;
      const isPinned = s.fz && !s.my;

      ctx.save();
      if (isFixed) {
        const wallW = 18 * scale;
        const wallH = 48 * scale;
        const isRight = Math.abs(s.x - this.beamData.length) < 1e-6;
        const wallX = isRight ? px : px - wallW;

        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2.2 * scale;
        ctx.fillRect(wallX, beamY - wallH / 2, wallW, wallH);
        ctx.strokeRect(wallX, beamY - wallH / 2, wallW, wallH);

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.8 * scale;
        for (let y = beamY - wallH / 2 + 5; y < beamY + wallH / 2; y += 9 * scale) {
          ctx.beginPath();
          ctx.moveTo(wallX, y);
          ctx.lineTo(wallX + wallW, y + 7 * scale);
          ctx.stroke();
        }
      } else if (isPinned) {
        const triH = 22 * scale;
        const triW = 18 * scale;

        ctx.fillStyle = '#3b82f6';
        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 1.8 * scale;
        ctx.beginPath();
        ctx.moveTo(px, beamY + 4);
        ctx.lineTo(px - triW / 2, beamY + triH);
        ctx.lineTo(px + triW / 2, beamY + triH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, beamY + 4, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.2 * scale;
        ctx.beginPath();
        ctx.moveTo(px - triW, beamY + triH);
        ctx.lineTo(px + triW, beamY + triH);
        ctx.stroke();
      } else if (s.fz) {
        const triH = 18 * scale;
        const triW = 18 * scale;

        ctx.fillStyle = '#0284c7';
        ctx.strokeStyle = '#0369a1';
        ctx.lineWidth = 1.8 * scale;
        ctx.beginPath();
        ctx.moveTo(px, beamY + 4);
        ctx.lineTo(px - triW / 2, beamY + triH);
        ctx.lineTo(px + triW / 2, beamY + triH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const rY = beamY + triH + 4 * scale;
        ctx.fillStyle = '#64748b';
        [-5 * scale, 5 * scale].forEach(dx => {
          ctx.beginPath();
          ctx.arc(px + dx, rY, 3.5 * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.8 * scale;
        ctx.beginPath();
        ctx.moveTo(px - triW, rY + 5 * scale);
        ctx.lineTo(px + triW, rY + 5 * scale);
        ctx.stroke();
      }

      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${13.5 * scale}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`${formatNum(s.x)}m`, px, beamY + 34 * scale);

      if (Math.abs(s.movement) > 1e-4) {
        const isDownward = s.movement > 0;
        const arrowTopY = beamY + 44 * scale;
        const arrowBottomY = beamY + 66 * scale;
        const fromY = isDownward ? arrowTopY : arrowBottomY;
        const toY = isDownward ? arrowBottomY : arrowTopY;

        this.drawArrow(ctx, px, fromY, px, toY, '#7c3aed', 6.5 * scale, 2.2 * scale);

        ctx.fillStyle = '#6d28d9';
        ctx.font = `bold ${12 * scale}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`${formatNum(Math.abs(s.movement))} m`, px, arrowBottomY + 14 * scale);
      }

      ctx.restore();
    });
  }

  drawHinges(beamY, scale) {
    const ctx = this.ctx;
    const hinges = this.beamData.hinges || [];

    hinges.forEach(h => {
      const px = this.beamToPixelX(h.x);
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.8 * scale;
      ctx.beginPath();
      ctx.arc(px, beamY, 7 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  }

  drawDistributedLoads(beamY, scale) {
    const ctx = this.ctx;
    const distLoads = this.beamData.distLoads || [];

    distLoads.forEach(d => {
      const px1 = this.beamToPixelX(d.x1);
      const px2 = this.beamToPixelX(d.x2);
      const q1 = Number(d.q1) || 0;
      const q2 = Number(d.q2) || 0;

      if (px2 <= px1 || (q1 === 0 && q2 === 0)) return;

      const maxQ = Math.max(Math.abs(q1), Math.abs(q2));
      const loadH = 40 * scale;

      const h1 = (q1 / (maxQ || 1)) * loadH;
      const h2 = (q2 / (maxQ || 1)) * loadH;

      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2 * scale;

      // Top connecting line without background fill
      ctx.beginPath();
      ctx.moveTo(px1, beamY - h1);
      ctx.lineTo(px2, beamY - h2);
      ctx.stroke();

      // Half the density again (spacing increased to 96)
      const numArrows = Math.max(2, Math.floor((px2 - px1) / (96 * scale)));
      for (let i = 0; i <= numArrows; i++) {
        const ratio = i / numArrows;
        const curX = px1 + ratio * (px2 - px1);
        const curH = h1 + ratio * (h2 - h1);
        if (Math.abs(curH) > 4) {
          this.drawArrow(ctx, curX, beamY - curH, curX, beamY - 4, '#ef4444', 6 * scale, 2 * scale);
        }
      }

      ctx.fillStyle = '#b91c1c';
      ctx.font = `bold ${14 * scale}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      if (Math.abs(q1 - q2) < 1e-4) {
        ctx.fillText(`q = ${formatNum(q1)} kN/m`, (px1 + px2) / 2, beamY - h1 - 8 * scale);
      } else {
        ctx.fillText(`q1 = ${formatNum(q1)}`, px1, beamY - h1 - 8 * scale);
        ctx.fillText(`q2 = ${formatNum(q2)}`, px2, beamY - h2 - 8 * scale);
      }

      ctx.restore();
    });
  }

  drawPointLoads(beamY, scale) {
    const ctx = this.ctx;
    const pointLoads = this.beamData.pointLoads || [];

    pointLoads.forEach(p => {
      const px = this.beamToPixelX(p.x);
      const fz = Number(p.fz) || 0;
      const my = Number(p.my) || 0;

      ctx.save();
      if (Math.abs(fz) > 1e-4) {
        const arrowLength = 44 * scale;
        const isDownward = fz > 0;
        const fromY = isDownward ? beamY - arrowLength : beamY + arrowLength;
        const toY = isDownward ? beamY - 4 : beamY + 4;

        this.drawArrow(ctx, px, fromY, px, toY, '#dc2626', 8 * scale, 3 * scale);

        ctx.fillStyle = '#dc2626';
        ctx.font = `bold ${14.5 * scale}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`P = ${formatNum(Math.abs(fz))} kN`, px, isDownward ? fromY - 6 : fromY + 16 * scale);
      }

      if (Math.abs(my) > 1e-4) {
        const radius = 18 * scale;
        const isClockwise = my > 0;
        this.drawMomentArc(ctx, px, beamY, radius, isClockwise, '#d97706', scale);

        ctx.fillStyle = '#d97706';
        ctx.font = `bold ${14 * scale}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`M = ${formatNum(Math.abs(my))} kNm`, px, beamY - radius - 8 * scale);
      }

      ctx.restore();
    });
  }

  drawReactionArrowsLower(beamY, scale = 1.0) {
    const ctx = this.ctx;
    if (!this.solution || !this.solution.isStable || !this.solution.reactions) return;

    const rFz = this.solution.reactions.fz || {};
    const rMy = this.solution.reactions.my || {};

    const dimY = beamY + 48 * scale;
    const arrowTopY = dimY + 30 * scale;
    const arrowBottomY = dimY + 68 * scale;

    ctx.save();
    for (const [xStr, val] of Object.entries(rFz)) {
      const x = Number(xStr);
      const px = this.beamToPixelX(x);
      if (Math.abs(val) > 1e-3) {
        const isUpward = val > 0;
        const fromY = isUpward ? arrowBottomY : arrowTopY;
        const toY = isUpward ? arrowTopY : arrowBottomY;

        this.drawArrow(ctx, px, fromY, px, toY, '#16a34a', 8 * scale, 3.2 * scale);

        ctx.fillStyle = '#15803d';
        ctx.font = `bold ${14 * scale}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        const labelY = arrowBottomY + 16 * scale;
        ctx.fillText(`Rz = ${formatNum(val)} kN`, px, labelY);
      }
    }

    for (const [xStr, val] of Object.entries(rMy)) {
      const x = Number(xStr);
      const px = this.beamToPixelX(x);
      if (Math.abs(val) > 1e-3) {
        const radius = 20 * scale;
        const isClockwise = val > 0;
        this.drawMomentArc(ctx, px, beamY, radius, isClockwise, '#047857', scale);

        ctx.fillStyle = '#047857';
        ctx.font = `bold ${13.5 * scale}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`MR = ${formatNum(val)} kNm`, px, beamY - radius - 9 * scale);
      }
    }

    ctx.restore();
  }

  drawMomentArc(ctx, cx, cy, radius, isClockwise, color, scale = 1.0) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.4 * scale;

    const startAngle = isClockwise ? -Math.PI * 0.75 : Math.PI * 0.75;
    const endAngle = isClockwise ? Math.PI * 0.65 : -Math.PI * 0.65;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle, !isClockwise);
    ctx.stroke();

    const tipX = cx + radius * Math.cos(endAngle);
    const tipY = cy + radius * Math.sin(endAngle);
    const tangentAngle = isClockwise ? (endAngle + Math.PI / 2) : (endAngle - Math.PI / 2);

    const headLen = 8 * scale;
    const arrowAngle1 = tangentAngle - Math.PI + Math.PI / 6;
    const arrowAngle2 = tangentAngle - Math.PI - Math.PI / 6;

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX + headLen * Math.cos(arrowAngle1), tipY + headLen * Math.sin(arrowAngle1));
    ctx.lineTo(tipX + headLen * Math.cos(arrowAngle2), tipY + headLen * Math.sin(arrowAngle2));
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draws diagram curve with coordinate system axes (x-axis and vertical quantity axis).
   */
  drawDiagramCurve(baseY, maxH, evalFn, label, vertAxisLabel, strokeColor, fillColorPos, fillColorNeg, maxPt, minPt, invert = false) {
    const ctx = this.ctx;
    const x0 = this.beamToPixelX(0);
    const xL = this.beamToPixelX(this.beamData.length);
    const axisExtend = 32;

    ctx.save();

    // 1. Horizontal X-Axis with Arrow
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x0 - 15, baseY);
    ctx.lineTo(xL + axisExtend, baseY);
    ctx.stroke();

    // X-Axis Arrow Tip
    this.drawArrow(ctx, xL + axisExtend - 10, baseY, xL + axisExtend, baseY, '#64748b', 7, 2);

    // X-Axis Label: "x [m]"
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 12.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('x [m]', xL + axisExtend + 6, baseY + 4);

    // Origin Tick & End Tick
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('0', x0, baseY + 14);
    ctx.fillText(`${formatNum(this.beamData.length)}m`, xL, baseY + 14);

    // 2. Vertical Coordinate Axis at x = 0
    const vAxisLen = maxH * 0.52 + 10;
    const vArrowToY = invert ? baseY + vAxisLen : baseY - vAxisLen;

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x0, baseY - (invert ? 10 : 0));
    ctx.lineTo(x0, vArrowToY);
    ctx.stroke();

    // Vertical Axis Arrow Tip
    this.drawArrow(ctx, x0, vArrowToY + (invert ? -8 : 8), x0, vArrowToY, '#64748b', 7, 2);

    // Vertical Axis Label (e.g. T [kN], M [kNm], w [mm]) - no '+' prefix
    ctx.fillStyle = strokeColor;
    ctx.font = 'bold 12.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(vertAxisLabel, x0 - 10, vArrowToY + (invert ? 4 : -4));

    // 3. Diagram Title Header
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14.5px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, this.padding.left + 8, baseY - maxH / 2 - 14);

    // 4. Sample and Draw Curve & Shaded Region
    const numSamples = Math.max(120, Math.floor(this.width * 0.6));
    const points = [];
    let absMaxVal = 1e-6;

    for (let i = 0; i <= numSamples; i++) {
      const x = (i / numSamples) * this.beamData.length;
      const vals = this.evaluateAt(x);
      const val = vals ? evalFn(vals) : 0;
      points.push({ x, px: this.beamToPixelX(x), val });
      if (Math.abs(val) > absMaxVal) {
        absMaxVal = Math.abs(val);
      }
    }

    const valueScale = (maxH * 0.44) / (absMaxVal || 1);
    const dir = invert ? -1 : 1;

    ctx.lineWidth = 2.4;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColorPos;

    ctx.beginPath();
    ctx.moveTo(x0, baseY);
    points.forEach(p => {
      const py = baseY - dir * p.val * valueScale;
      ctx.lineTo(p.px, py);
    });
    ctx.lineTo(xL, baseY);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(points[0].px, baseY - dir * points[0].val * valueScale);
    points.forEach(p => {
      ctx.lineTo(p.px, baseY - dir * p.val * valueScale);
    });
    ctx.stroke();

    // 5. Peak Markers
    if (maxPt && Math.abs(maxPt.val) > 1e-4) {
      const pxMax = this.beamToPixelX(maxPt.x);
      const pyMax = baseY - dir * maxPt.val * valueScale;
      const tag = maxPt.val > 0 ? `+${formatNum(maxPt.val)}` : `${formatNum(maxPt.val)}`;
      this.drawPeakMarker(ctx, pxMax, pyMax, baseY, tag, '#15803d', !invert);
    }
    if (minPt && Math.abs(minPt.val) > 1e-4 && Math.abs(minPt.val - (maxPt ? maxPt.val : 0)) > 1e-2) {
      const pxMin = this.beamToPixelX(minPt.x);
      const pyMin = baseY - dir * minPt.val * valueScale;
      const tag = minPt.val > 0 ? `+${formatNum(minPt.val)}` : `${formatNum(minPt.val)}`;
      this.drawPeakMarker(ctx, pxMin, pyMin, baseY, tag, '#b91c1c', invert);
    }

    // 6. Zero Crossings
    if (this.solution.criticalPoints && this.solution.criticalPoints.shearZeros && (label.includes('Shear') || label.includes('tnąc') || label.includes('T(x)'))) {
      this.solution.criticalPoints.shearZeros.forEach(z => {
        if (z.x > 0.05 && z.x < this.beamData.length - 0.05) {
          const pz = this.beamToPixelX(z.x);
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(pz, baseY, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = 'bold 12px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`x=${formatNum(z.x)}`, pz, baseY + 16);
        }
      });
    }

    ctx.restore();
  }

  drawPeakMarker(ctx, px, py, baseY, labelText, color, isTop) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(px, baseY);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 13.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const tagY = py + (isTop ? -8 : 18);
    ctx.fillText(labelText, px, tagY);
    ctx.restore();
  }

  drawCrosshair(beamX) {
    const ctx = this.ctx;
    const px = this.beamToPixelX(beamX);

    ctx.save();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);

    ctx.beginPath();
    ctx.moveTo(px, this.padding.top);
    ctx.lineTo(px, this.height - this.padding.bottom);
    ctx.stroke();

    const beamY = this.viewMode === 'reactions' ? this.height * 0.30 : this.height * 0.32;
    ctx.setLineDash([]);
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.arc(px, beamY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  drawArrow(ctx, fromX, fromY, toX, toY, color, headLen = 8, lineWidth = 2.5) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
