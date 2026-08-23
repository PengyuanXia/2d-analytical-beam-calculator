/**
 * 2D Analytical Beam Calculator - Constants & Type Definitions
 * Tailored for Civil Engineering undergraduate students (Mechanika Budowli / Wytrzymałość Materiałów).
 */

export const DEFAULT_BEAM = {
  length: 6.0,          // meters
  EI: 1.0,              // kN*m^2 (flexural rigidity, default = 1)
  supports: [
    { id: 's1', x: 0.0, fz: true, my: false, movement: 0.0 }, // Pinned support at x=0
    { id: 's2', x: 6.0, fz: true, my: false, movement: 0.0 }  // Roller support at x=6
  ],
  hinges: [],
  pointLoads: [],
  distLoads: [
    { id: 'd1', x1: 0.0, x2: 6.0, q1: 10.0, q2: 10.0, loadCase: 'LC1' }
  ],
  loadCases: ['LC1', 'LC2'],
  currentLoadCase: 'All',
  // In Poland / European civil engineering, bending moment diagrams are drawn on the tension side:
  // M > 0 (sagging / dolne włókna rozciągane) is drawn downwards below the beam axis.
  // M < 0 (hogging / górne włókna rozciągane) is drawn upwards above the beam axis.
  signConvention: 'civil', // 'civil' (tension side) or 'standard' (mechanics)
  currentView: 'reactions' // 'reactions', 'shear', 'moment', 'displacement', 'all'
};

export const VIEW_MODES = {
  REACTIONS: 'reactions',
  SHEAR: 'shear',
  MOMENT: 'moment',
  DISPLACEMENT: 'displacement',
  ALL: 'all'
};
