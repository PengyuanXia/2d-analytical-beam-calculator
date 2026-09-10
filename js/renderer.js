/**
 * 2D Analytical Beam Calculator - Interactive Canvas Renderer
 * Notation: T(x) for shear force (drawn with positive T > 0 below x-axis), EJ for bending stiffness.
 * Smart number formatting (no redundant trailing zeros on canvas, tooltips, and labels).
 */

import { TRANSLATIONS } from './i18n.js?v=1.3.0';

function formatNum(val, maxDec = 2) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  const num = Number(val);
  if (Math.abs(num) < 1e-9) return '0';
  const factor = Math.pow(10, maxDec);
  const rounded = Math.round(num * factor) / factor;
  return rounded.toString();
}

export class BeamRenderer {
  constructor(canvasElement, tooltipElement, onCursorMove, onCanvasOperation) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.tooltip = tooltipElement;
    this.onCursorMove = onCursorMove;
    this.onCanvasOperation = onCanvasOperation;

    this.beamData = null;
    this.solution = null;
    this.viewMode = 'reactions';
    this.cursorX = null;
    this.lang = 'en';
    this.isExporting = false;

    this.padding = { left: 95, right: 85, top: 40, bottom: 50 };

    // Pan & Zoom state for Touch & Mouse navigation
    this.panX = 0;
    this.panY = 0;
    this.zoomFactor = 1.0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.initialPanX = 0;
    this.initialPanY = 0;

    this.setupListeners();
  }

  setLanguage(lang) {
    this.lang = lang;
    this.draw();
  }

  get t() {
    return TRANSLATIONS[this.lang] || TRANSLATIONS.en;
  }

  resetView() {
    this.panX = 0;
    this.panY = 0;
    this.zoomFactor = 1.0;
    this.draw();
  }

  zoomIn() {
    this.zoomFactor = Math.min(3.5, this.zoomFactor * 1.25);
    this.draw();
  }

  zoomOut() {
    this.zoomFactor = Math.max(0.3, this.zoomFactor / 1.25);
    this.draw();
  }

  setupListeners() {
    // 1. Mouse Drag Pan & Hover
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.beamData && this.beamData.isBlank) {
        this.beamData.isBlank = false;
        if (this.onCanvasOperation) this.onCanvasOperation();
        this.draw();
      }
      if (e.button === 0 || e.button === 1) {
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.initialPanX = this.panX;
        this.initialPanY = this.panY;
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.canvas.style.cursor = 'crosshair';
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const pixelX = e.clientX - rect.left;
      const pixelY = e.clientY - rect.top;

      if (this.isDragging) {
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        if (Math.hypot(dx, dy) > 3) {
          this.panX = this.initialPanX + dx;
          this.panY = this.initialPanY + dy;
          this.canvas.style.cursor = 'grabbing';
          this.hideTooltip();
          this.cursorX = null;
          this.draw();
          return;
        }
      }

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
      if (!this.isDragging) {
        this.cursorX = null;
        this.hideTooltip();
        this.draw();
        if (this.onCursorMove) {
          this.onCursorMove(null);
        }
      }
    });

    // Double-click to reset view
    this.canvas.addEventListener('dblclick', () => {
      this.resetView();
    });

    // Mouse wheel zoom centered on cursor
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomSpeed = 0.0012;
      const delta = -e.deltaY * zoomSpeed;
      const oldZoom = this.zoomFactor;
      const newZoom = Math.max(0.3, Math.min(3.5, oldZoom * (1 + delta)));

      const factor = newZoom / oldZoom;
      this.panX = mouseX - factor * (mouseX - this.panX);
      this.panY = mouseY - factor * (mouseY - this.panY);
      this.zoomFactor = newZoom;
      this.draw();
    }, { passive: false });

    // 2. Touch Navigation for Tablet Users (1-finger Pan & 2-finger Pinch Zoom)
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartPanX = 0;
    let touchStartPanY = 0;
    let initialPinchDist = 0;
    let touchStartZoom = 1.0;
    let isPinching = false;
    let isTouchPanning = false;
    let lastTapTime = 0;

    this.canvas.addEventListener('touchstart', (e) => {
      if (this.beamData && this.beamData.isBlank) {
        this.beamData.isBlank = false;
        if (this.onCanvasOperation) this.onCanvasOperation();
        this.draw();
      }
      if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTapTime < 350) {
          // Double-tap: Reset View (Fit)
          this.resetView();
          lastTapTime = 0;
          return;
        }
        lastTapTime = now;

        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartPanX = this.panX;
        touchStartPanY = this.panY;
        isTouchPanning = true;
        isPinching = false;
      } else if (e.touches.length === 2) {
        isPinching = true;
        isTouchPanning = false;
        initialPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        touchStartZoom = this.zoomFactor;
        touchStartPanX = this.panX;
        touchStartPanY = this.panY;
        touchStartX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        touchStartY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();

      if (isPinching && e.touches.length === 2) {
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (initialPinchDist > 0) {
          const factor = currentDist / initialPinchDist;
          this.zoomFactor = Math.max(0.3, Math.min(3.5, touchStartZoom * factor));
          const currentMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const currentMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          this.panX = touchStartPanX + (currentMidX - touchStartX);
          this.panY = touchStartPanY + (currentMidY - touchStartY);
          this.hideTooltip();
          this.cursorX = null;
          this.draw();
        }
      } else if (isTouchPanning && e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;

        // Move the canvas directly with finger!
        this.panX = touchStartPanX + dx;
        this.panY = touchStartPanY + dy;
        this.hideTooltip();
        this.cursorX = null;
        this.draw();
      }
    }, { passive: false });

    const endTouch = () => {
      isTouchPanning = false;
      isPinching = false;
    };
    this.canvas.addEventListener('touchend', endTouch);
    this.canvas.addEventListener('touchcancel', endTouch);

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
    return this.padding.left + this.panX + (x / L) * availableWidth * this.zoomFactor;
  }

  pixelToBeamX(pixelX) {
    const availableWidth = this.width - this.padding.left - this.padding.right;
    const L = this.beamData ? this.beamData.length : 1;
    const totalW = availableWidth * this.zoomFactor;
    return ((pixelX - this.padding.left - this.panX) / totalW) * L;
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

    if (!this.beamData) {
      return;
    }

    if (this.beamData.isBlank) {
      this.drawEmptyState();
      return;
    }

    if (!this.solution) {
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
    ctx.save();

    const isPl = this.lang === 'pl';
    const title = isPl ? 'Własny projekt — Gotowy do projektowania' : 'Custom Design — Ready for Design';
    const step1 = isPl 
      ? '1. Kliknij „+ Dodaj podporę” i wprowadź obciążenia w lewym panelu' 
      : '1. Click "+ Add Support" and define loads in the left panel';
    const step2 = isPl 
      ? '2. Lub wybierz gotowy schemat z „Przykłady”' 
      : '2. Or select a benchmark preset from "Presets"';

    const cx = this.width / 2;
    const cy = this.height / 2;

    ctx.textAlign = 'center';

    // Title line with ruler/square icon
    ctx.font = 'bold 16px Inter, -apple-system, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('📐  ' + title, cx, cy - 20);

    // Step 1
    ctx.font = '500 13.5px Inter, -apple-system, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(step1, cx, cy + 10);

    // Step 2
    ctx.font = '500 13.5px Inter, -apple-system, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(step2, cx, cy + 34);

    ctx.restore();
  }

  drawSingleDiagramView() {
    const isReactionsView = this.viewMode === 'reactions';
    const beamY = (isReactionsView ? this.height * 0.30 : this.height * 0.32) + this.panY;
    const diagramY = this.height * 0.72 + this.panY;
    const diagramHeight = this.height * 0.44 * this.zoomFactor;
    const structScale = Math.max(0.6, Math.min(2.2, this.zoomFactor));

    // 1. Draw Structure & Loads
    this.drawBeamStructure(beamY, structScale);

    if (!this.solution.isStable) {
      this.drawUnstableWarningBanner(diagramY, diagramHeight);
      return;
    }

    // 2. Draw Active View
    if (isReactionsView) {
      this.drawReactionArrowsLower(beamY, structScale);
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
        true, // Invert: T > 0 drawn downwards below the x-axis
        1.0
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
        true, // Invert: M > 0 drawn downwards
        1.0
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
        true, // Invert: w > 0 downwards
        1.0
      );
    }
  }

  drawMultiDiagramView() {
    const totalAvailH = this.height - this.padding.top - this.padding.bottom;
    
    const beamY = this.padding.top + totalAvailH * 0.08 + this.panY;
    const shearY = this.padding.top + totalAvailH * 0.38 + this.panY;
    const momentY = this.padding.top + totalAvailH * 0.65 + this.panY;
    const deflY = this.padding.top + totalAvailH * 0.90 + this.panY;
    const plotHeight = totalAvailH * 0.18 * this.zoomFactor;
    const structScale = 0.72 * Math.max(0.6, Math.min(2.0, this.zoomFactor));

    // 1. Structure
    this.drawBeamStructure(beamY, structScale);

    if (!this.solution.isStable) {
      this.drawUnstableWarningBanner(this.height * 0.60 + this.panY, this.height * 0.45 * this.zoomFactor);
      return;
    }

    this.drawReactionArrowsLower(beamY, structScale);

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
      null, null, true,
      0.85
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
      null, null, true,
      0.85
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
      null, null, true,
      0.85
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
    const dimY = beamY + (this.isExporting ? 50 * scale : 48 * scale);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = this.isExporting ? 1.6 * scale : 1.5;
    ctx.setLineDash([5 * scale, 4 * scale]);
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

    // Beam Length Dimension Number (larger for report export, compact for canvas)
    ctx.fillStyle = this.isExporting ? '#0f172a' : '#1e293b';
    const dimFontSz = this.isExporting ? 18.5 * scale : 15 * scale;
    ctx.font = `bold ${dimFontSz}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    const dimOffset = this.isExporting ? 22 * scale : 18 * scale;
    ctx.fillText(`L = ${formatNum(this.beamData.length)} m`, (x0 + xL) / 2, dimY + dimOffset);

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
      const coordFontSz = this.isExporting ? 16 * scale : 13.5 * scale;
      ctx.font = `bold ${coordFontSz}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      const coordOffset = this.isExporting ? 36 * scale : 34 * scale;
      ctx.fillText(`${formatNum(s.x)}m`, px, beamY + coordOffset);

      if (Math.abs(s.movement) > 1e-4) {
        const isDownward = s.movement > 0;
        const arrowTopY = beamY + (this.isExporting ? 46 * scale : 44 * scale);
        const arrowBottomY = beamY + (this.isExporting ? 68 * scale : 66 * scale);
        const fromY = isDownward ? arrowTopY : arrowBottomY;
        const toY = isDownward ? arrowBottomY : arrowTopY;

        this.drawArrow(ctx, px, fromY, px, toY, '#7c3aed', (this.isExporting ? 7 : 6.5) * scale, (this.isExporting ? 2.4 : 2.2) * scale);

        const movFontSz = this.isExporting ? 15 * scale : 12 * scale;
        ctx.fillStyle = '#6d28d9';
        ctx.font = `bold ${movFontSz}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        const movOffset = this.isExporting ? 16 * scale : 14 * scale;
        ctx.fillText(`${formatNum(Math.abs(s.movement))} m`, px, arrowBottomY + movOffset);
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

      const qFontSz = this.isExporting ? 17 * scale : 14 * scale;
      ctx.fillStyle = '#b91c1c';
      ctx.font = `bold ${qFontSz}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      const qOffset = this.isExporting ? 9 * scale : 8 * scale;
      if (Math.abs(q1 - q2) < 1e-4) {
        ctx.fillText(`q = ${formatNum(q1)} kN/m`, (px1 + px2) / 2, beamY - h1 - qOffset);
      } else {
        ctx.fillText(`q1 = ${formatNum(q1)}`, px1, beamY - h1 - qOffset);
        ctx.fillText(`q2 = ${formatNum(q2)}`, px2, beamY - h2 - qOffset);
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
        const arrowLength = (this.isExporting ? 46 : 44) * scale;
        const isDownward = fz > 0;
        const fromY = isDownward ? beamY - arrowLength : beamY + arrowLength;
        const toY = isDownward ? beamY - 4 : beamY + 4;

        this.drawArrow(ctx, px, fromY, px, toY, '#dc2626', (this.isExporting ? 8.5 : 8) * scale, 3 * scale);

        const pFontSz = this.isExporting ? 17.5 * scale : 14.5 * scale;
        ctx.fillStyle = '#dc2626';
        ctx.font = `bold ${pFontSz}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        const pOffset = isDownward 
          ? (this.isExporting ? fromY - 8 * scale : fromY - 6) 
          : (this.isExporting ? fromY + 18 * scale : fromY + 16 * scale);
        ctx.fillText(`P = ${formatNum(Math.abs(fz))} kN`, px, pOffset);
      }

      if (Math.abs(my) > 1e-4) {
        const radius = (this.isExporting ? 20 : 18) * scale;
        const isClockwise = my < 0;
        this.drawMomentArc(ctx, px, beamY, radius, isClockwise, '#d97706', scale);

        const mFontSz = this.isExporting ? 17 * scale : 14 * scale;
        ctx.fillStyle = '#d97706';
        ctx.font = `bold ${mFontSz}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        const mOffset = this.isExporting ? 9 * scale : 8 * scale;
        ctx.fillText(`M = ${formatNum(Math.abs(my))} kNm`, px, beamY - radius - mOffset);
      }

      ctx.restore();
    });
  }

  drawReactionArrowsLower(beamY, scale = 1.0) {
    const ctx = this.ctx;
    if (!this.solution || !this.solution.isStable || !this.solution.reactions) return;

    const rFz = this.solution.reactions.fz || {};
    const rMy = this.solution.reactions.my || {};

    const dimY = beamY + (this.isExporting ? 50 * scale : 48 * scale);
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

        this.drawArrow(ctx, px, fromY, px, toY, '#16a34a', (this.isExporting ? 8.5 : 8) * scale, 3.2 * scale);

        const rzFontSz = this.isExporting ? 17 * scale : 14 * scale;
        ctx.fillStyle = '#15803d';
        ctx.font = `bold ${rzFontSz}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        const labelY = arrowBottomY + (this.isExporting ? 18 * scale : 16 * scale);
        ctx.fillText(`Rz = ${formatNum(val)} kN`, px, labelY);
      }
    }

    for (const [xStr, val] of Object.entries(rMy)) {
      const x = Number(xStr);
      const px = this.beamToPixelX(x);
      if (Math.abs(val) > 1e-3) {
        const radius = (this.isExporting ? 22 : 20) * scale;
        const isClockwise = val < 0;
        this.drawMomentArc(ctx, px, beamY, radius, isClockwise, '#047857', scale);

        const mrFontSz = this.isExporting ? 16.5 * scale : 13.5 * scale;
        ctx.fillStyle = '#047857';
        ctx.font = `bold ${mrFontSz}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        const mrOffset = this.isExporting ? 10 * scale : 9 * scale;
        ctx.fillText(`MR = ${formatNum(val)} kNm`, px, beamY - radius - mrOffset);
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
  drawDiagramCurve(baseY, maxH, evalFn, label, vertAxisLabel, strokeColor, fillColorPos, fillColorNeg, maxPt, minPt, invert = false, scale = 1.0) {
    const ctx = this.ctx;
    const x0 = this.beamToPixelX(0);
    const xL = this.beamToPixelX(this.beamData.length);
    const axisExtend = this.isExporting ? 36 * scale : 32;

    ctx.save();

    // 1. Horizontal X-Axis with Arrow
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = this.isExporting ? 1.8 * scale : 1.6;
    ctx.beginPath();
    ctx.moveTo(x0 - 15, baseY);
    ctx.lineTo(xL + axisExtend, baseY);
    ctx.stroke();

    // X-Axis Arrow Tip
    this.drawArrow(ctx, xL + axisExtend - (this.isExporting ? 10 * scale : 10), baseY, xL + axisExtend, baseY, '#64748b', this.isExporting ? 8 * scale : 7, 2);

    // X-Axis Label: "x [m]"
    ctx.fillStyle = '#475569';
    ctx.font = this.isExporting ? `bold ${16 * scale}px "JetBrains Mono", monospace` : 'bold 12.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('x [m]', xL + axisExtend + (this.isExporting ? 8 * scale : 6), baseY + 4);

    // Origin Tick & End Tick
    ctx.font = this.isExporting ? `bold ${15 * scale}px "JetBrains Mono", monospace` : '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('0', x0, baseY + (this.isExporting ? 18 * scale : 14));
    ctx.fillText(`${formatNum(this.beamData.length)}m`, xL, baseY + (this.isExporting ? 18 * scale : 14));

    // 2. Vertical Coordinate Axis at x = 0
    const vAxisLen = maxH * 0.52 + (this.isExporting ? 12 * scale : 10);
    const vArrowToY = invert ? baseY + vAxisLen : baseY - vAxisLen;

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = this.isExporting ? 1.8 * scale : 1.5;
    ctx.beginPath();
    ctx.moveTo(x0, baseY - (invert ? 10 : 0));
    ctx.lineTo(x0, vArrowToY);
    ctx.stroke();

    // Vertical Axis Arrow Tip
    this.drawArrow(ctx, x0, vArrowToY + (invert ? -8 : 8), x0, vArrowToY, '#64748b', this.isExporting ? 8 * scale : 7, 2);

    // Vertical Axis Label (e.g. T [kN], M [kNm], w [mm]) - no '+' prefix
    ctx.fillStyle = strokeColor;
    ctx.font = this.isExporting ? `bold ${16 * scale}px "JetBrains Mono", monospace` : 'bold 12.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(vertAxisLabel, x0 - (this.isExporting ? 10 * scale : 10), vArrowToY + (invert ? 4 : -4));

    // 3. Diagram Title Header
    ctx.fillStyle = '#0f172a';
    ctx.font = this.isExporting ? `bold ${18 * scale}px Inter, sans-serif` : 'bold 14.5px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, this.padding.left + 8 + this.panX, baseY - maxH / 2 - (this.isExporting ? 16 * scale : 14));

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

    ctx.lineWidth = this.isExporting ? 2.6 * scale : 2.4;
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
      this.drawPeakMarker(ctx, pxMax, pyMax, baseY, tag, '#15803d', !invert, scale);
    }
    if (minPt && Math.abs(minPt.val) > 1e-4 && Math.abs(minPt.val - (maxPt ? maxPt.val : 0)) > 1e-2) {
      const pxMin = this.beamToPixelX(minPt.x);
      const pyMin = baseY - dir * minPt.val * valueScale;
      const tag = minPt.val > 0 ? `+${formatNum(minPt.val)}` : `${formatNum(minPt.val)}`;
      this.drawPeakMarker(ctx, pxMin, pyMin, baseY, tag, '#b91c1c', invert, scale);
    }

    // 6. Zero Crossings
    if (this.solution.criticalPoints && this.solution.criticalPoints.shearZeros && (label.includes('Shear') || label.includes('tnąc') || label.includes('T(x)'))) {
      this.solution.criticalPoints.shearZeros.forEach(z => {
        if (z.x > 0.05 && z.x < this.beamData.length - 0.05) {
          const pz = this.beamToPixelX(z.x);
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(pz, baseY, this.isExporting ? 4.5 * scale : 4, 0, Math.PI * 2);
          ctx.fill();

          if (this.isExporting) {
            const zText = `x=${formatNum(z.x)}`;
            const zFontSize = Math.round(15 * scale);
            ctx.font = `bold ${zFontSize}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const m = ctx.measureText(zText);
            const bW = m.width + 10 * scale;
            const bH = zFontSize + 6 * scale;
            const bY = baseY + 16 * scale + bH / 2;

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(pz - bW / 2, bY - bH / 2, bW, bH);
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.3 * scale;
            ctx.strokeRect(pz - bW / 2, bY - bH / 2, bW, bH);

            ctx.fillStyle = '#0f172a';
            ctx.fillText(zText, pz, bY);
          } else {
            ctx.font = 'bold 12px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`x=${formatNum(z.x)}`, pz, baseY + 16);
          }
        }
      });
    }

    ctx.restore();
  }

  drawPeakMarker(ctx, px, py, baseY, labelText, color, isTop, scale = 1.0) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = this.isExporting ? 1.6 * scale : 1.4;
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

    if (this.isExporting) {
      const fontSize = Math.round(16 * scale);
      ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const metrics = ctx.measureText(labelText);
      const boxW = Math.max(metrics.width + 12 * scale, 32 * scale);
      const boxH = fontSize + 8 * scale;
      const tagY = py + (isTop ? -(boxH / 2 + 5 * scale) : (boxH / 2 + 5 * scale));

      // Crisp white badge background with colored border
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - boxW / 2, tagY - boxH / 2, boxW, boxH);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4 * scale;
      ctx.strokeRect(px - boxW / 2, tagY - boxH / 2, boxW, boxH);

      ctx.fillStyle = color;
      ctx.fillText(labelText, px, tagY);
    } else {
      ctx.font = 'bold 13.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      const tagY = py + (isTop ? -8 : 18);
      ctx.fillText(labelText, px, tagY);
    }

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

    const beamY = (this.viewMode === 'reactions' ? this.height * 0.30 : this.height * 0.32) + this.panY;
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

  cropCanvas(sourceCanvas, padding = 20) {
    const dpr = sourceCanvas._dpr || window.devicePixelRatio || 1;
    const pad = Math.round(padding * dpr);
    const ctx = sourceCanvas.getContext('2d');
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    let minX = w, minY = h, maxX = 0, maxY = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = d[(y * w + x) * 4 + 3];
        if (alpha > 15) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (minX > maxX || minY > maxY) return sourceCanvas.toDataURL('image/png');

    const leftPad = Math.min(minX, pad);
    const topPad = Math.min(minY, pad);
    const rightPad = Math.min(w - 1 - maxX, pad);
    const bottomPad = Math.min(h - 1 - maxY, pad);

    const cropX = minX - leftPad;
    const cropY = minY - topPad;
    const cropW = (maxX - minX + 1) + leftPad + rightPad;
    const cropH = (maxY - minY + 1) + topPad + bottomPad;

    const off = document.createElement('canvas');
    off.width = cropW;
    off.height = cropH;
    const oCtx = off.getContext('2d');
    oCtx.fillStyle = '#ffffff';
    oCtx.fillRect(0, 0, cropW, cropH);
    oCtx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    return off.toDataURL('image/png');
  }

  exportPNG(type = 'current') {
    const canvas = this.canvas;
    const specialTypes = ['unsolved', 'reactions', 'shear', 'moment', 'displacement'];
    if (specialTypes.includes(type)) {
      if (!this.beamData) return canvas.toDataURL('image/png');

      const expWidth = 900;
      const expHeight = 420;
      const dpr = 2.0; // 2x sharp Retina / Print export resolution

      const exportCanvas = document.createElement('canvas');
      exportCanvas._dpr = dpr;
      exportCanvas.width = Math.round(expWidth * dpr);
      exportCanvas.height = Math.round(expHeight * dpr);
      const expCtx = exportCanvas.getContext('2d');
      expCtx.scale(dpr, dpr);

      // Save current renderer state
      const origCtx = this.ctx;
      const origWidth = this.width;
      const origHeight = this.height;
      const origPad = { ...this.padding };
      const origPanX = this.panX;
      const origPanY = this.panY;
      const origZoom = this.zoomFactor;
      const origExporting = this.isExporting;

      try {
        this.isExporting = true;
        // Set temporary state for isolated clean export
        this.ctx = expCtx;
        this.width = expWidth;
        this.height = expHeight;
        this.padding = { left: 155, right: 135, top: 48, bottom: 52 };
        this.panX = 0;
        this.panY = 0;
        this.zoomFactor = 1.0;

        const exportScale = 1.45;

        if (type === 'unsolved') {
          const beamY = expHeight * 0.48;
          this.drawBeamStructure(beamY, exportScale);
        } else if (type === 'reactions') {
          const beamY = expHeight * 0.35;
          this.drawBeamStructure(beamY, exportScale);
          this.drawReactionArrowsLower(beamY, exportScale);
        } else if (type === 'shear') {
          const diagramY = expHeight * 0.50;
          const diagramHeight = expHeight * 0.56;
          this.drawDiagramCurve(
            diagramY,
            diagramHeight,
            (vals) => vals.T,
            this.t.shearDiagramTitle || 'T(x) [kN]',
            'T [kN]',
            '#2563eb',
            'rgba(37, 99, 235, 0.22)',
            'rgba(239, 68, 68, 0.22)',
            this.solution && this.solution.criticalPoints ? this.solution.criticalPoints.maxV : null,
            this.solution && this.solution.criticalPoints ? this.solution.criticalPoints.minV : null,
            true,
            exportScale
          );
        } else if (type === 'moment') {
          const diagramY = expHeight * 0.50;
          const diagramHeight = expHeight * 0.56;
          this.drawDiagramCurve(
            diagramY,
            diagramHeight,
            (vals) => vals.M,
            this.t.momentDiagramTitle || 'M(x) [kNm]',
            'M [kNm]',
            '#059669',
            'rgba(16, 185, 129, 0.25)',
            'rgba(245, 158, 11, 0.25)',
            this.solution && this.solution.criticalPoints ? this.solution.criticalPoints.maxM : null,
            this.solution && this.solution.criticalPoints ? this.solution.criticalPoints.minM : null,
            true,
            exportScale
          );
        } else if (type === 'displacement') {
          const diagramY = expHeight * 0.50;
          const diagramHeight = expHeight * 0.56;
          this.drawDiagramCurve(
            diagramY,
            diagramHeight,
            (vals) => vals.w * 1000,
            this.t.deflectionDiagramTitle || 'w(x) [mm]',
            'w [mm]',
            '#0891b2',
            'rgba(6, 182, 212, 0.22)',
            'rgba(14, 165, 233, 0.22)',
            this.solution && this.solution.criticalPoints ? { val: this.solution.criticalPoints.maxW.val * 1000, x: this.solution.criticalPoints.maxW.x } : null,
            this.solution && this.solution.criticalPoints ? { val: this.solution.criticalPoints.minW.val * 1000, x: this.solution.criticalPoints.minW.x } : null,
            true,
            exportScale
          );
        }

        const dataUrl = this.cropCanvas(exportCanvas, 28);
        return dataUrl;
      } finally {
        // Restore renderer state
        this.ctx = origCtx;
        this.width = origWidth;
        this.height = origHeight;
        this.padding = origPad;
        this.panX = origPanX;
        this.panY = origPanY;
        this.zoomFactor = origZoom;
        this.isExporting = origExporting;
      }
    } else {
      this.draw();
      const off = document.createElement('canvas');
      off.width = canvas.width;
      off.height = canvas.height;
      const oCtx = off.getContext('2d');
      oCtx.fillStyle = '#ffffff';
      oCtx.fillRect(0, 0, off.width, off.height);
      oCtx.drawImage(canvas, 0, 0);
      return off.toDataURL('image/png');
    }
  }
}
