/**
 * 2D Analytical Beam Calculator - UI Controller & Event Binder
 * Default Language: English (with instant English/Polish language switcher).
 * Notation: T(x) for shear force, EJ for bending stiffness.
 * Initial Canvas Presets Showcase overlay on launch.
 * Full Undo (Ctrl+Z) & Redo (Ctrl+Y / Ctrl+Shift+Z) history support.
 * Popup window dialogs for adding supports, hinges, point loads, and distributed loads.
 */

import { DEFAULT_BEAM } from './constants.js';
import { AnalyticalBeamSolver } from './analyticalSolver.js';
import { BeamRenderer } from './renderer.js';
import { generateStepByStepReport } from './stepByStep.js';
import { PRESETS } from './presets.js';
import { TRANSLATIONS, getSavedLanguage, setSavedLanguage } from './i18n.js';

function formatNum(val, maxDec = 2) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  const num = Number(val);
  if (Math.abs(num) < 1e-9) return '0';
  const factor = Math.pow(10, maxDec);
  const rounded = Math.round(num * factor) / factor;
  return rounded.toString();
}

export class BeamCalculatorApp {
  constructor() {
    this.lang = getSavedLanguage(); // Defaults to 'en'
    this.beamData = JSON.parse(JSON.stringify(DEFAULT_BEAM));
    this.solution = null;
    this.renderer = null;
    this.currentAddConfirmHandler = null;

    // Undo / Redo History Stacks
    this.undoStack = [];
    this.redoStack = [];

    this.initDOM();
    this.initRenderer();
    this.bindEvents();
    this.applyLanguage();
    
    // Check if a model is encoded in URL hash (#model=...)
    const loadedFromHash = this.checkUrlHashModel();
    if (!loadedFromHash) {
      // Save initial state to undo stack
      this.saveHistoryState();
      this.recalculate(false);
    }
  }

  get t() {
    return TRANSLATIONS[this.lang] || TRANSLATIONS.en;
  }

  initDOM() {
    // Inputs
    this.inputLength = document.getElementById('beamLength');
    this.inputEI = document.getElementById('beamEI');

    // Tables
    this.tableSupports = document.getElementById('tableSupportsBody');
    this.tableHinges = document.getElementById('tableHingesBody');
    this.tablePointLoads = document.getElementById('tablePointLoadsBody');
    this.tableDistLoads = document.getElementById('tableDistLoadsBody');

    // Modals
    this.modalCalcDetails = document.getElementById('modalCalcDetails');
    this.modalCalcBody = document.getElementById('modalCalcBody');
    this.modalTemplates = document.getElementById('modalTemplates');
    this.templatesList = document.getElementById('templatesList');

    // Canvas Presets Overlay
    this.canvasPresetsOverlay = document.getElementById('canvasPresetsOverlay');
    this.heroPresetsGrid = document.getElementById('heroPresetsGrid');
    this.heroWelcomeTitle = document.getElementById('heroWelcomeTitle');
    this.heroWelcomeSubtitle = document.getElementById('heroWelcomeSubtitle');

    // Add Element Modal
    this.modalAddElement = document.getElementById('modalAddElement');
    this.modalAddElementTitle = document.getElementById('lblAddElementModalTitle');
    this.modalAddElementBody = document.getElementById('modalAddElementBody');
    this.btnCancelAddElement = document.getElementById('btnCancelAddElement');
    this.btnConfirmAddElement = document.getElementById('btnConfirmAddElement');
    this.btnCloseAddElementModal = document.getElementById('btnCloseAddElementModal');

    // Navigation Buttons
    this.btnUndo = document.getElementById('btnUndo');
    this.btnRedo = document.getElementById('btnRedo');
    this.btnSaveModel = document.getElementById('btnSaveModel');
    this.btnLoadModel = document.getElementById('btnLoadModel');
    this.inpModelFile = document.getElementById('inpModelFile');
    this.btnShareLink = document.getElementById('btnShareLink');
    this.btnToggleLang = document.getElementById('btnToggleLang');
    this.toastNotification = document.getElementById('toastNotification');

    // Status bar items
    this.statusX = document.getElementById('statusX');
    this.statusV = document.getElementById('statusV');
    this.statusM = document.getElementById('statusM');
    this.statusU = document.getElementById('statusU');
    this.statusEquilibrium = document.getElementById('statusEquilibrium');
  }

  initRenderer() {
    const canvas = document.getElementById('beamCanvas');
    const tooltip = document.getElementById('cursorTooltip');

    this.renderer = new BeamRenderer(canvas, tooltip, (cursorValues) => {
      this.updateStatusBarCursor(cursorValues);
    });
    this.renderer.setLanguage(this.lang);
  }

  saveHistoryState() {
    const snap = JSON.stringify(this.beamData);
    if (this.undoStack.length === 0 || this.undoStack[this.undoStack.length - 1] !== snap) {
      this.undoStack.push(snap);
      if (this.undoStack.length > 50) this.undoStack.shift();
      this.redoStack = [];
      this.updateUndoRedoButtons();
    }
  }

  undo() {
    if (this.undoStack.length <= 1) return;
    const currentState = this.undoStack.pop();
    this.redoStack.push(currentState);
    const prevState = this.undoStack[this.undoStack.length - 1];
    this.beamData = JSON.parse(prevState);
    this.inputLength.value = this.beamData.length;
    this.inputEI.value = this.beamData.EI;
    this.recalculate(false);
    this.hideHeroOverlay();
    this.updateUndoRedoButtons();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const nextState = this.redoStack.pop();
    this.undoStack.push(nextState);
    this.beamData = JSON.parse(nextState);
    this.inputLength.value = this.beamData.length;
    this.inputEI.value = this.beamData.EI;
    this.recalculate(false);
    this.hideHeroOverlay();
    this.updateUndoRedoButtons();
  }

  updateUndoRedoButtons() {
    if (this.btnUndo) {
      const canUndo = this.undoStack.length > 1;
      this.btnUndo.classList.toggle('opacity-50', !canUndo);
      this.btnUndo.style.pointerEvents = canUndo ? 'auto' : 'none';
    }
    if (this.btnRedo) {
      const canRedo = this.redoStack.length > 0;
      this.btnRedo.classList.toggle('opacity-50', !canRedo);
      this.btnRedo.style.pointerEvents = canRedo ? 'auto' : 'none';
    }
  }

  bindEvents() {
    // Undo & Redo button clicks
    if (this.btnUndo) {
      this.btnUndo.addEventListener('click', () => this.undo());
    }
    if (this.btnRedo) {
      this.btnRedo.addEventListener('click', () => this.redo());
    }

    // Save & Load & Share Model
    if (this.btnSaveModel) {
      this.btnSaveModel.addEventListener('click', () => this.saveModelJSON());
    }
    if (this.btnLoadModel) {
      this.btnLoadModel.addEventListener('click', () => this.inpModelFile && this.inpModelFile.click());
    }
    if (this.inpModelFile) {
      this.inpModelFile.addEventListener('change', (e) => this.loadModelJSON(e));
    }
    if (this.btnShareLink) {
      this.btnShareLink.addEventListener('click', () => this.copyShareLink());
    }

    // Language Switcher
    if (this.btnToggleLang) {
      this.btnToggleLang.addEventListener('click', () => {
        this.toggleLanguage();
      });
    }

    // Top Ribbon View Mode Radios
    document.querySelectorAll('.radio-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.view;
        this.setViewMode(mode);
      });
    });

    // Beam Properties inputs
    [this.inputLength, this.inputEI].forEach(input => {
      input.addEventListener('change', () => {
        this.beamData.length = Math.max(0.1, parseFloat(this.inputLength.value) || 6.0);
        this.beamData.EI = Math.max(0.0001, parseFloat(this.inputEI.value) || 1.0);
        this.beamData.isBlank = false;
        this.recalculate(true);
        this.hideHeroOverlay();
      });
    });

    // Add buttons - Open popup parameter dialogs
    document.getElementById('btnAddSupport').addEventListener('click', () => {
      this.hideHeroOverlay();
      this.openAddSupportModal();
    });
    document.getElementById('btnAddHinge').addEventListener('click', () => {
      this.hideHeroOverlay();
      this.openAddHingeModal();
    });
    document.getElementById('btnAddPointLoad').addEventListener('click', () => {
      this.hideHeroOverlay();
      this.openAddPointLoadModal();
    });
    document.getElementById('btnAddDistLoad').addEventListener('click', () => {
      this.hideHeroOverlay();
      this.openAddDistLoadModal();
    });

    // Add Element Modal buttons
    if (this.btnCancelAddElement) {
      this.btnCancelAddElement.addEventListener('click', () => this.closeAddElementModal());
    }
    if (this.btnCloseAddElementModal) {
      this.btnCloseAddElementModal.addEventListener('click', () => this.closeAddElementModal());
    }
    if (this.btnConfirmAddElement) {
      this.btnConfirmAddElement.addEventListener('click', () => {
        if (this.currentAddConfirmHandler) {
          this.currentAddConfirmHandler();
        }
      });
    }

    // Modals buttons
    document.getElementById('btnCalcDetails').addEventListener('click', () => this.openCalcDetailsModal());
    document.getElementById('btnCloseCalcModal').addEventListener('click', () => this.closeCalcDetailsModal());
    document.getElementById('btnCloseCalcModalFooter').addEventListener('click', () => this.closeCalcDetailsModal());

    document.getElementById('btnOpenTemplates').addEventListener('click', () => this.showHeroOverlay());
    document.getElementById('btnCloseTemplatesModal').addEventListener('click', () => this.closeTemplatesModal());

    // Export PNG
    document.getElementById('btnExportPNG').addEventListener('click', () => this.exportPNG());

    // Keyboard shortcuts: Ctrl+Z (Undo), Ctrl+Y / Ctrl+Shift+Z (Redo), ESC (Close modals/overlay), Enter (Confirm modal)
    window.addEventListener('keydown', (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      
      if (isCtrlOrCmd && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        this.undo();
      } else if (isCtrlOrCmd && (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) {
        e.preventDefault();
        this.redo();
      } else if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
        this.closeAddElementModal();
        this.closeCalcDetailsModal();
        this.closeTemplatesModal();
        this.hideHeroOverlay();
      } else if (e.key === 'Enter') {
        if (this.modalAddElement && this.modalAddElement.classList.contains('open')) {
          if (this.currentAddConfirmHandler) {
            this.currentAddConfirmHandler();
          }
        }
      }
    });

    // Accordion toggling
    document.querySelectorAll('.poly-card-header').forEach(header => {
      header.addEventListener('click', () => {
        const body = header.nextElementSibling;
        const icon = header.querySelector('.accordion-chevron');
        if (body.style.display === 'none') {
          body.style.display = 'block';
          if (icon) icon.style.transform = 'rotate(0deg)';
        } else {
          body.style.display = 'none';
          if (icon) icon.style.transform = 'rotate(-90deg)';
        }
      });
    });
  }

  showHeroOverlay() {
    this.renderHeroPresets();
    if (this.canvasPresetsOverlay) {
      this.canvasPresetsOverlay.classList.remove('hidden');
    }
  }

  hideHeroOverlay() {
    if (this.canvasPresetsOverlay) {
      this.canvasPresetsOverlay.classList.add('hidden');
    }
  }

  renderHeroPresets() {
    if (!this.heroPresetsGrid) return;
    this.heroPresetsGrid.innerHTML = '';
    const t = this.t;

    if (this.heroWelcomeTitle) this.heroWelcomeTitle.textContent = t.heroWelcomeTitle;
    if (this.heroWelcomeSubtitle) this.heroWelcomeSubtitle.textContent = t.heroWelcomeSubtitle;

    PRESETS.forEach(preset => {
      const title = typeof preset.name === 'object' ? (preset.name[this.lang] || preset.name.en) : preset.name;
      const desc = typeof preset.description === 'object' ? (preset.description[this.lang] || preset.description.en) : preset.description;

      const card = document.createElement('div');
      card.className = 'preset-hero-card';
      card.innerHTML = `
        <div>
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
            <span class="hero-card-title">${title}</span>
            <span style="font-size: 11px; font-family: monospace; font-weight: bold; color: #1d4ed8; background: #dbeafe; padding: 2px 6px; border-radius: 4px; white-space: nowrap; flex-shrink: 0;">L = ${preset.data.length}m</span>
          </div>
          <div class="hero-card-desc">${desc}</div>
        </div>
        <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 600; color: #2563eb;">
          <span>⚡ Load Configuration</span>
          <span>→</span>
        </div>
      `;

      card.addEventListener('click', () => {
        this.loadPreset(preset);
        this.hideHeroOverlay();
      });

      this.heroPresetsGrid.appendChild(card);
    });

    // Add Blank Beam Card
    const blankCard = document.createElement('div');
    blankCard.className = 'preset-hero-card';
    blankCard.style.backgroundColor = '#f8fafc';
    blankCard.style.borderStyle = 'dashed';
    blankCard.style.borderColor = '#cbd5e1';
    blankCard.innerHTML = `
      <div>
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
          <span class="hero-card-title" style="color: #1e293b;">✨ ${t.blankBeamTitle}</span>
          <span style="font-size: 11px; font-family: monospace; font-weight: bold; color: #475569; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; white-space: nowrap; flex-shrink: 0;">L = 6.0m</span>
        </div>
        <div class="hero-card-desc">${t.blankBeamDesc}</div>
      </div>
      <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 600; color: #475569;">
        <span>Create from Scratch</span>
        <span>+</span>
      </div>
    `;

    blankCard.addEventListener('click', () => {
      this.beamData = {
        length: 6.0,
        EI: 1.0,
        supports: [],
        hinges: [],
        pointLoads: [],
        distLoads: [],
        isBlank: true,
        currentLoadCase: 'All',
        currentView: 'reactions'
      };
      this.inputLength.value = 6.0;
      this.inputEI.value = 1.0;
      this.setViewMode('reactions');
      this.recalculate(true);
      this.hideHeroOverlay();
    });

    this.heroPresetsGrid.appendChild(blankCard);
  }

  checkAndElongateBeam(newX) {
    if (newX > this.beamData.length) {
      this.beamData.length = +(newX).toFixed(2);
      this.inputLength.value = this.beamData.length;
    }
  }

  toggleLanguage() {
    this.lang = this.lang === 'en' ? 'pl' : 'en';
    setSavedLanguage(this.lang);
    this.renderer.setLanguage(this.lang);
    this.applyLanguage();
    this.recalculate(false);
  }

  applyLanguage() {
    const t = this.t;

    // Header & Ribbon
    if (this.btnToggleLang) {
      this.btnToggleLang.innerHTML = this.lang === 'en' 
        ? `<span class="text-sm">🌐</span> <strong>EN</strong> / PL` 
        : `<span class="text-sm">🌐</span> <strong>PL</strong> / EN`;
    }

    const btnKofi = document.getElementById('btnKofi');
    const lblKofiText = document.getElementById('lblKofiText');
    if (lblKofiText && t.kofiBtn) lblKofiText.textContent = t.kofiBtn;
    if (btnKofi && t.kofiTitle) btnKofi.title = t.kofiTitle;

    document.getElementById('appMainTitle').textContent = t.appTitle;
    document.getElementById('appGreeting').textContent = t.greeting;
    document.getElementById('btnOpenTemplates').textContent = t.presetsBtn;
    if (this.btnUndo) this.btnUndo.textContent = t.undoBtn;
    if (this.btnRedo) this.btnRedo.textContent = t.redoBtn;
    if (this.btnSaveModel) this.btnSaveModel.textContent = t.saveModelBtn;
    if (this.btnLoadModel) this.btnLoadModel.textContent = t.loadModelBtn;
    if (this.btnShareLink) this.btnShareLink.textContent = t.shareBtn;
    document.getElementById('btnExportPNG').textContent = t.exportPngBtn;
    document.getElementById('btnCalcDetailsText').textContent = t.calcReportBtn;

    // View buttons
    document.querySelector('[data-view="reactions"]').innerHTML = `<span class="radio-dot"></span> ${t.reactionsView}`;
    document.querySelector('[data-view="shear"]').innerHTML = `<span class="radio-dot"></span> ${t.shearView}`;
    document.querySelector('[data-view="moment"]').innerHTML = `<span class="radio-dot"></span> ${t.momentView}`;
    document.querySelector('[data-view="displacement"]').innerHTML = `<span class="radio-dot"></span> ${t.deflectionView}`;
    document.querySelector('[data-view="all"]').innerHTML = `<span class="radio-dot"></span> ${t.allView}`;

    // Sidebar titles & labels
    document.getElementById('lblBeamParamsTitle').textContent = t.beamParamsTitle;
    document.getElementById('lblLength').textContent = t.lengthLabel;
    document.getElementById('lblRigidity').textContent = t.rigidityLabel;
    document.getElementById('lblSupportsTitle').textContent = t.supportsTitle;
    const colMov = document.getElementById('lblSupportMovementCol');
    if (colMov) colMov.textContent = t.supportMovementCol;
    document.getElementById('btnAddSupport').textContent = t.addSupportBtn;
    document.getElementById('lblHingesTitle').textContent = t.hingesTitle;
    document.getElementById('btnAddHinge').textContent = t.addHingeBtn;
    document.getElementById('lblPointLoadsTitle').textContent = t.pointLoadsTitle;
    document.getElementById('btnAddPointLoad').textContent = t.addPointLoadBtn;
    document.getElementById('lblDistLoadsTitle').textContent = t.distLoadsTitle;
    document.getElementById('btnAddDistLoad').textContent = t.addDistLoadBtn;
    document.getElementById('lblSidebarBadge').textContent = t.sidebarBadge;
    document.getElementById('lblSidebarSubBadge').textContent = t.sidebarSubBadge;

    // Modal buttons
    document.getElementById('lblCalcReportModalTitle').textContent = t.reportTitle;
    document.getElementById('lblPresetsModalTitle').textContent = t.presetsModalTitle;
    document.getElementById('btnCloseCalcModalFooter').textContent = t.closeBtn;
    document.getElementById('btnPrintCalcModalFooter').textContent = t.printBtn;

    if (this.btnCancelAddElement) this.btnCancelAddElement.textContent = t.cancelBtn;
    if (this.btnConfirmAddElement) this.btnConfirmAddElement.textContent = t.confirmAddBtn;

    this.renderHeroPresets();
    this.renderTables();
    this.updateUndoRedoButtons();
  }

  setViewMode(mode) {
    this.beamData.currentView = mode;
    document.querySelectorAll('.radio-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === mode);
    });
    this.renderer.setData(this.beamData, this.solution, mode);
  }

  recalculate(saveHistory = true) {
    if (saveHistory) {
      this.saveHistoryState();
    }

    try {
      const solver = new AnalyticalBeamSolver(this.beamData);
      this.solution = solver.solve();
      this.renderer.setData(this.beamData, this.solution, this.beamData.currentView);
      this.updateStatusEquilibrium();
      this.renderTables();

      // Auto-save model
      try {
        localStorage.setItem('polybeam_autosave_model', JSON.stringify(this.beamData));
      } catch (e) {}
    } catch (err) {
      console.error("Calculation error:", err);
    }
  }

  updateStatusEquilibrium() {
    if (this.beamData && this.beamData.isBlank) {
      this.statusEquilibrium.innerHTML = `
        <span class="status-badge-ok" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1;">✨ Blank Canvas</span>
      `;
      return;
    }

    if (!this.solution || !this.solution.isStable) {
      this.statusEquilibrium.innerHTML = `
        <span class="bg-red-100 text-red-800 px-2.5 py-0.5 rounded font-bold text-[11.5px]">${this.t.statusUnstable}</span>
      `;
      return;
    }

    const det = this.solution.determinacy;
    const n = det ? (det.degree || 0) : 0;

    if (n === 0) {
      this.statusEquilibrium.innerHTML = `
        <span class="status-badge-ok">${this.t.statusDeterminate}</span>
        <span class="text-slate-500 text-[11.5px]">ΣFz = 0, ΣM = 0</span>
      `;
    } else if (n > 0) {
      const text = this.t.statusIndeterminate.replace('{n}', n);
      this.statusEquilibrium.innerHTML = `
        <span class="status-badge-indeterminate">${text}</span>
        <span class="text-slate-500 text-[11.5px]">ΣFz = 0, ΣM = 0</span>
      `;
    } else {
      this.statusEquilibrium.innerHTML = `
        <span class="bg-red-100 text-red-800 px-2.5 py-0.5 rounded font-bold text-[11.5px]">${this.t.statusUnstable}</span>
      `;
    }
  }

  updateStatusBarCursor(values) {
    if (this.beamData && this.beamData.isBlank) {
      this.statusX.textContent = 'x = -';
      this.statusV.textContent = 'T = -';
      this.statusM.textContent = 'M = -';
      this.statusU.textContent = 'w = -';
      return;
    }

    if (!values || !this.solution || !this.solution.isStable) {
      this.statusX.textContent = values ? `x = ${formatNum(values.x)} m` : 'x = 0 m';
      this.statusV.textContent = 'T = -';
      this.statusM.textContent = 'M = -';
      this.statusU.textContent = 'w = -';
      return;
    }

    this.statusX.textContent = `x = ${formatNum(values.x)} m`;
    this.statusV.textContent = `T = ${values.T !== null && values.T !== undefined ? formatNum(values.T) + ' kN' : '-'}`;
    this.statusM.textContent = `M = ${values.M !== null && values.M !== undefined ? formatNum(values.M) + ' kNm' : '-'}`;
    this.statusU.textContent = `w = ${values.w !== null && values.w !== undefined ? formatNum(values.w * 1000) + ' mm' : '-'}`;
  }

  renderTables() {
    this.renderSupportsTable();
    this.renderHingesTable();
    this.renderPointLoadsTable();
    this.renderDistLoadsTable();
  }

  renderSupportsTable() {
    this.tableSupports.innerHTML = '';
    const t = this.t;

    this.beamData.supports.forEach((s, idx) => {
      const tr = document.createElement('tr');
      const movVal = s.movement !== undefined ? s.movement : 0;
      tr.innerHTML = `
        <td><input type="number" step="0.1" min="0" class="poly-input text-center font-bold" value="${s.x}" data-idx="${idx}" data-field="x"></td>
        <td>
          <select class="poly-input text-[11.5px] font-medium" data-idx="${idx}" data-field="type">
            <option value="pin" ${s.fz && !s.my ? 'selected' : ''}>${t.supportTypePin}</option>
            <option value="fixed" ${s.fz && s.my ? 'selected' : ''}>${t.supportTypeFixed}</option>
          </select>
        </td>
        <td>
          <input type="number" step="0.001" class="poly-input text-center font-mono font-medium text-[12px] ${movVal !== 0 ? 'text-indigo-700 font-bold bg-indigo-50/50' : 'text-slate-600'}" value="${movVal}" data-idx="${idx}" data-field="movement" placeholder="0">
        </td>
        <td><button class="btn-icon-del" data-idx="${idx}">✕</button></td>
      `;

      tr.querySelector('input[data-field="x"]').addEventListener('change', (e) => {
        const val = Math.max(0, parseFloat(e.target.value) || 0);
        this.checkAndElongateBeam(val);
        this.beamData.supports[idx].x = val;
        this.recalculate(true);
      });

      tr.querySelector('select[data-field="type"]').addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'fixed') {
          this.beamData.supports[idx].fz = true;
          this.beamData.supports[idx].my = true;
        } else {
          this.beamData.supports[idx].fz = true;
          this.beamData.supports[idx].my = false;
        }
        this.recalculate(true);
      });

      tr.querySelector('input[data-field="movement"]').addEventListener('change', (e) => {
        const val = parseFloat(e.target.value) || 0;
        this.beamData.supports[idx].movement = val;
        this.recalculate(true);
      });

      tr.querySelector('.btn-icon-del').addEventListener('click', () => {
        this.beamData.supports.splice(idx, 1);
        this.recalculate(true);
      });

      this.tableSupports.appendChild(tr);
    });
  }

  renderHingesTable() {
    this.tableHinges.innerHTML = '';
    const t = this.t;

    this.beamData.hinges.forEach((h, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="number" step="0.1" min="0" class="poly-input text-center font-bold" value="${h.x}" data-idx="${idx}"></td>
        <td class="text-[12px] text-slate-700 font-semibold">${t.hingeCondition}</td>
        <td><button class="btn-icon-del" data-idx="${idx}">✕</button></td>
      `;

      tr.querySelector('input').addEventListener('change', (e) => {
        const val = Math.max(0, parseFloat(e.target.value) || 0);
        this.checkAndElongateBeam(val);
        this.beamData.hinges[idx].x = val;
        this.recalculate(true);
      });

      tr.querySelector('.btn-icon-del').addEventListener('click', () => {
        this.beamData.hinges.splice(idx, 1);
        this.recalculate(true);
      });

      this.tableHinges.appendChild(tr);
    });
  }

  renderPointLoadsTable() {
    this.tablePointLoads.innerHTML = '';
    this.beamData.pointLoads.forEach((p, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="number" step="0.1" min="0" class="poly-input text-center font-bold" value="${p.x}" data-field="x"></td>
        <td><input type="number" step="1" class="poly-input text-center font-bold text-red-600" value="${p.fz}" data-field="fz"></td>
        <td><input type="number" step="1" class="poly-input text-center font-bold text-amber-600" value="${p.my || 0}" data-field="my"></td>
        <td><button class="btn-icon-del">✕</button></td>
      `;

      tr.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('change', (e) => {
          const field = e.target.dataset.field;
          const val = parseFloat(e.target.value) || 0;
          if (field === 'x') {
            const posX = Math.max(0, val);
            this.checkAndElongateBeam(posX);
            this.beamData.pointLoads[idx].x = posX;
          } else {
            this.beamData.pointLoads[idx][field] = val;
          }
          this.recalculate(true);
        });
      });

      tr.querySelector('.btn-icon-del').addEventListener('click', () => {
        this.beamData.pointLoads.splice(idx, 1);
        this.recalculate(true);
      });

      this.tablePointLoads.appendChild(tr);
    });
  }

  renderDistLoadsTable() {
    this.tableDistLoads.innerHTML = '';
    this.beamData.distLoads.forEach((d, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="number" step="0.1" min="0" class="poly-input text-center font-bold" value="${d.x1}" data-field="x1"></td>
        <td><input type="number" step="0.1" min="0" class="poly-input text-center font-bold" value="${d.x2}" data-field="x2"></td>
        <td><input type="number" step="1" class="poly-input text-center font-bold text-red-600" value="${d.q1}" data-field="q1"></td>
        <td><input type="number" step="1" class="poly-input text-center font-bold text-red-600" value="${d.q2}" data-field="q2"></td>
        <td><button class="btn-icon-del">✕</button></td>
      `;

      tr.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('change', (e) => {
          const field = e.target.dataset.field;
          const val = parseFloat(e.target.value) || 0;
          if (field === 'x1' || field === 'x2') {
            const posX = Math.max(0, val);
            this.checkAndElongateBeam(posX);
            this.beamData.distLoads[idx][field] = posX;
          } else {
            this.beamData.distLoads[idx][field] = val;
          }
          this.recalculate(true);
        });
      });

      tr.querySelector('.btn-icon-del').addEventListener('click', () => {
        this.beamData.distLoads.splice(idx, 1);
        this.recalculate(true);
      });

      this.tableDistLoads.appendChild(tr);
    });
  }

  /* ---------------- Modal Popup Parameter Dialogs ---------------- */

  openAddSupportModal() {
    const t = this.t;
    this.modalAddElementTitle.textContent = t.modalAddSupportTitle;
    this.modalAddElementBody.innerHTML = `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">${t.positionLabel}</label>
            <input type="number" id="inpAddSupportX" step="0.1" min="0" class="poly-input text-left font-mono font-bold text-sm px-3 py-2" value="0" placeholder="0">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">${t.supportTypeLabel}</label>
            <select id="inpAddSupportType" class="poly-input text-left font-medium text-xs px-3 py-2">
              <option value="pin">${t.supportTypePin}</option>
              <option value="fixed">${t.supportTypeFixed}</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">${t.modalAddSupportMovementLabel}</label>
          <input type="number" id="inpAddSupportMovement" step="0.001" class="poly-input text-left font-mono font-bold text-sm px-3 py-2 text-indigo-700" value="0" placeholder="0">
        </div>
      </div>
    `;

    this.currentAddConfirmHandler = () => {
      const posX = Math.max(0, parseFloat(document.getElementById('inpAddSupportX').value) || 0);
      const sType = document.getElementById('inpAddSupportType').value;
      const movement = parseFloat(document.getElementById('inpAddSupportMovement').value) || 0;
      this.beamData.isBlank = false;
      this.checkAndElongateBeam(posX);
      this.beamData.supports.push({
        id: `s_${Date.now()}`,
        x: posX,
        fz: true,
        my: sType === 'fixed',
        movement: movement
      });
      this.closeAddElementModal();
      this.recalculate(true);
    };

    this.modalAddElement.classList.add('open');
    setTimeout(() => {
      const inp = document.getElementById('inpAddSupportX');
      if (inp) {
        inp.focus();
        inp.select();
      }
    }, 100);
  }

  openAddHingeModal() {
    const t = this.t;
    this.modalAddElementTitle.textContent = t.modalAddHingeTitle;
    this.modalAddElementBody.innerHTML = `
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">${t.positionLabel}</label>
          <input type="number" id="inpAddHingeX" step="0.1" min="0" class="poly-input text-left font-mono font-bold text-sm px-3 py-2" value="0" placeholder="0">
        </div>
        <div class="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200 font-medium">
          ${t.hingeCondition}
        </div>
      </div>
    `;

    this.currentAddConfirmHandler = () => {
      const posX = Math.max(0, parseFloat(document.getElementById('inpAddHingeX').value) || 0);
      this.beamData.isBlank = false;
      this.checkAndElongateBeam(posX);
      this.beamData.hinges.push({
        id: `h_${Date.now()}`,
        x: posX,
        type: 'moment'
      });
      this.closeAddElementModal();
      this.recalculate(true);
    };

    this.modalAddElement.classList.add('open');
    setTimeout(() => {
      const inp = document.getElementById('inpAddHingeX');
      if (inp) {
        inp.focus();
        inp.select();
      }
    }, 100);
  }

  openAddPointLoadModal() {
    const t = this.t;
    this.modalAddElementTitle.textContent = t.modalAddPointLoadTitle;
    this.modalAddElementBody.innerHTML = `
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">${t.positionLabel}</label>
          <input type="number" id="inpAddPointX" step="0.1" min="0" class="poly-input text-left font-mono font-bold text-sm px-3 py-2" value="0" placeholder="0">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">${t.pointForceLabel}</label>
            <input type="number" id="inpAddPointFz" step="1" class="poly-input text-left font-mono font-bold text-sm px-3 py-2 text-red-600" value="0" placeholder="0">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">${t.pointMomentLabel}</label>
            <input type="number" id="inpAddPointMy" step="1" class="poly-input text-left font-mono font-bold text-sm px-3 py-2 text-amber-600" value="0" placeholder="0">
          </div>
        </div>
      </div>
    `;

    this.currentAddConfirmHandler = () => {
      const posX = Math.max(0, parseFloat(document.getElementById('inpAddPointX').value) || 0);
      const fz = parseFloat(document.getElementById('inpAddPointFz').value) || 0;
      const my = parseFloat(document.getElementById('inpAddPointMy').value) || 0;
      this.beamData.isBlank = false;
      this.checkAndElongateBeam(posX);
      this.beamData.pointLoads.push({
        id: `p_${Date.now()}`,
        x: posX,
        fz,
        my,
        loadCase: 'LC1'
      });
      this.closeAddElementModal();
      this.recalculate(true);
    };

    this.modalAddElement.classList.add('open');
    setTimeout(() => {
      const inp = document.getElementById('inpAddPointX');
      if (inp) {
        inp.focus();
        inp.select();
      }
    }, 100);
  }

  openAddDistLoadModal() {
    const t = this.t;
    this.modalAddElementTitle.textContent = t.modalAddDistLoadTitle;
    this.modalAddElementBody.innerHTML = `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">${t.startPosLabel}</label>
            <input type="number" id="inpAddDistX1" step="0.1" min="0" class="poly-input text-left font-mono font-bold text-sm px-3 py-2" value="0" placeholder="0">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">${t.endPosLabel}</label>
            <input type="number" id="inpAddDistX2" step="0.1" min="0" class="poly-input text-left font-mono font-bold text-sm px-3 py-2" value="0" placeholder="0">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">${t.startIntensityLabel}</label>
            <input type="number" id="inpAddDistQ1" step="1" class="poly-input text-left font-mono font-bold text-sm px-3 py-2 text-red-600" value="0" placeholder="0">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">${t.endIntensityLabel}</label>
            <input type="number" id="inpAddDistQ2" step="1" class="poly-input text-left font-mono font-bold text-sm px-3 py-2 text-red-600" value="0" placeholder="0">
          </div>
        </div>
      </div>
    `;

    this.currentAddConfirmHandler = () => {
      const x1 = Math.max(0, parseFloat(document.getElementById('inpAddDistX1').value) || 0);
      const x2 = Math.max(0, parseFloat(document.getElementById('inpAddDistX2').value) || 0);
      const q1 = parseFloat(document.getElementById('inpAddDistQ1').value) || 0;
      const q2 = parseFloat(document.getElementById('inpAddDistQ2').value) || 0;
      this.beamData.isBlank = false;
      this.checkAndElongateBeam(Math.max(x1, x2));
      this.beamData.distLoads.push({
        id: `d_${Date.now()}`,
        x1,
        x2,
        q1,
        q2,
        loadCase: 'LC1'
      });
      this.closeAddElementModal();
      this.recalculate(true);
    };

    this.modalAddElement.classList.add('open');
    setTimeout(() => {
      const inp = document.getElementById('inpAddDistX1');
      if (inp) {
        inp.focus();
        inp.select();
      }
    }, 100);
  }

  closeAddElementModal() {
    this.modalAddElement.classList.remove('open');
    this.currentAddConfirmHandler = null;
  }

  /* ---------------- Other Modals ---------------- */

  openCalcDetailsModal() {
    const reportHtml = generateStepByStepReport(this.beamData, this.solution, this.lang);
    this.modalCalcBody.innerHTML = reportHtml;
    this.modalCalcDetails.classList.add('open');

    if (window.renderMathInElement) {
      window.renderMathInElement(this.modalCalcBody, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ]
      });
    }
  }

  closeCalcDetailsModal() {
    this.modalCalcDetails.classList.remove('open');
  }

  openTemplatesModal() {
    this.showHeroOverlay();
  }

  closeTemplatesModal() {
    this.modalTemplates.classList.remove('open');
  }

  loadPreset(preset) {
    this.beamData = JSON.parse(JSON.stringify(preset.data));
    this.beamData.isBlank = false;
    if (!this.beamData.temperatureLoads) this.beamData.temperatureLoads = [];
    if (!this.beamData.stiffnessSegments) this.beamData.stiffnessSegments = [];
    this.inputLength.value = this.beamData.length;
    this.inputEI.value = this.beamData.EI;
    this.setViewMode(this.beamData.currentView || 'reactions');
    this.recalculate(true);
  }

  showToast(message, duration = 3000) {
    if (!this.toastNotification) this.toastNotification = document.getElementById('toastNotification');
    if (!this.toastNotification) return;
    this.toastNotification.textContent = message;
    this.toastNotification.classList.add('show');
    if (this._toastTimeout) clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      this.toastNotification.classList.remove('show');
    }, duration);
  }

  saveModelJSON() {
    try {
      const exportData = {
        version: "1.0",
        appName: "2D Analytical Beam Calculator",
        timestamp: new Date().toISOString(),
        data: this.beamData
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `beam_model_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showToast(this.t.toastSaveSuccess || '💾 Beam model saved as JSON file.');
    } catch (err) {
      console.error('Save model error:', err);
    }
  }

  loadModelJSON(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        const data = json.data || json;
        if (!data || typeof data !== 'object' || typeof data.length !== 'number' || !Array.isArray(data.supports)) {
          throw new Error('Invalid beam structure in JSON');
        }
        this.loadPreset({ data });
        this.hideHeroOverlay();
        this.showToast(this.t.toastLoadSuccess || '📂 Beam model loaded successfully!');
      } catch (err) {
        console.error('Error loading model JSON:', err);
        this.showToast(this.t.toastLoadError || '❌ Invalid JSON file format.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  copyShareLink() {
    try {
      const cleanData = {
        length: this.beamData.length,
        EI: this.beamData.EI,
        supports: this.beamData.supports,
        hinges: this.beamData.hinges,
        pointLoads: this.beamData.pointLoads,
        distLoads: this.beamData.distLoads,
        currentView: this.beamData.currentView
      };
      const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(cleanData)))));
      const shareUrl = `${window.location.origin}${window.location.pathname}#model=${encoded}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          this.showToast(this.t.toastShareSuccess || '🔗 Link copied to clipboard!');
        }).catch(() => {
          this.fallbackCopyLink(shareUrl);
        });
      } else {
        this.fallbackCopyLink(shareUrl);
      }
    } catch (err) {
      console.error('Error creating share link:', err);
      this.showToast(this.t.toastShareError || '❌ Failed to copy link.');
    }
  }

  fallbackCopyLink(text) {
    try {
      const temp = document.createElement('input');
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
      this.showToast(this.t.toastShareSuccess || '🔗 Link copied to clipboard!');
    } catch (err) {
      console.error('Fallback copy error:', err);
    }
  }

  checkUrlHashModel() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#model=')) {
      try {
        const encoded = hash.substring(7);
        const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
        const data = JSON.parse(jsonStr);
        if (data && typeof data.length === 'number' && Array.isArray(data.supports)) {
          this.loadPreset({ data });
          this.hideHeroOverlay();
          return true;
        }
      } catch (err) {
        console.warn('Could not decode URL model hash:', err);
      }
    }
    return false;
  }

  exportPNG() {
    const canvas = document.getElementById('beamCanvas');
    const link = document.createElement('a');
    link.download = `2D_Beam_${this.beamData.currentView}_diagram.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
}

function initApp() {
  try {
    if (!window.app) {
      window.app = new BeamCalculatorApp();
      console.log('✅ BeamCalculatorApp successfully initialized.');
    }
  } catch (err) {
    console.error('❌ Error initializing BeamCalculatorApp:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
