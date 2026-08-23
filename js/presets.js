/**
 * 2D Analytical Beam Calculator - Homework Benchmark Presets
 * Fully separated English and Polish titles & descriptions with structured parameters.
 * Notation: EJ for bending stiffness, T(x) for shear force.
 */

export const PRESETS = [
  {
    id: 'simply_supported_udl',
    name: {
      en: '1. Simply Supported Beam with Uniform Load (q = 10 kN/m)',
      pl: '1. Belka wolnopodparta z obciążeniem ciągłym (q = 10 kN/m)'
    },
    description: {
      en: 'Standard pinned-roller beam (L = 6m, q = 10 kN/m, EJ = 10000 kN·m²). Maximum midspan bending moment M = qL²/8 = +45.00 kNm.',
      pl: 'Standardowa belka na dwóch podporach (L = 6m, q = 10 kN/m, EJ = 10000 kN·m²). Maksymalny moment w przęsle M = qL²/8 = +45.00 kNm.'
    },
    data: {
      length: 6.0,
      EI: 1.0,
      supports: [
        { id: 's1', x: 0.0, fz: true, my: false },
        { id: 's2', x: 6.0, fz: true, my: false }
      ],
      hinges: [],
      pointLoads: [],
      distLoads: [
        { id: 'd1', x1: 0.0, x2: 6.0, q1: 10.0, q2: 10.0 }
      ],
      currentView: 'moment'
    }
  },
  {
    id: 'cantilever_point_load',
    name: {
      en: '2. Cantilever Beam with Tip Point Force (P = 20 kN)',
      pl: '2. Wspornik z siłą skupioną na końcu (P = 20 kN)'
    },
    description: {
      en: 'Cantilever fixed at x = 0 with tip force P = 20 kN at x = 4m. Fixed support moment M = -80.00 kNm.',
      pl: 'Wspornik utwierdzony w x = 0 z siłą skupioną P = 20 kN w x = 4m. Moment w utwierdzeniu M = -80.00 kNm.'
    },
    data: {
      length: 4.0,
      EI: 1.0,
      supports: [
        { id: 's1', x: 0.0, fz: true, my: true }
      ],
      hinges: [],
      pointLoads: [
        { id: 'p1', x: 4.0, fz: 20.0, my: 0.0, loadCase: 'LC1' }
      ],
      distLoads: [],
      currentLoadCase: 'All',
      currentView: 'moment'
    }
  },
  {
    id: 'propped_cantilever',
    name: {
      en: '3. Propped Cantilever (Statically Indeterminate n = 1)',
      pl: '3. Belka jednostronnie utwierdzona z podporą przesuwną (n = 1)'
    },
    description: {
      en: 'Fixed at x = 0, roller support at x = 5m with uniform load q = 12 kN/m. Clamped moment M = -37.50 kNm, field moment M_max = +21.09 kNm.',
      pl: 'Utwierdzenie w x = 0, podpora przesuwna w x = 5m z obciążeniem q = 12 kN/m. Moment w utwierdzeniu M = -37.50 kNm, moment przęsłowy M = +21.09 kNm.'
    },
    data: {
      length: 5.0,
      EI: 1.0,
      supports: [
        { id: 's1', x: 0.0, fz: true, my: true },
        { id: 's2', x: 5.0, fz: true, my: false }
      ],
      hinges: [],
      pointLoads: [],
      distLoads: [
        { id: 'd1', x1: 0.0, x2: 5.0, q1: 12.0, q2: 12.0, loadCase: 'LC1' }
      ],
      currentLoadCase: 'All',
      currentView: 'moment'
    }
  },
  {
    id: 'gerber_hinged_beam',
    name: {
      en: '4. Gerber Beam with Internal Moment Hinge (M = 0)',
      pl: '4. Belka Gerbera z przegubem wewnętrznym (M = 0)'
    },
    description: {
      en: 'Fixed at x = 0, moment hinge at x = 4m, roller at x = 8m under q = 10 kN/m. Moment at hinge is exactly M(4) = 0.00 kNm.',
      pl: 'Utwierdzenie w x = 0, przegub zginany w x = 4m, podpora w x = 8m pod obciążeniem q = 10 kN/m. Moment w przegubie wynosi dokładnie M(4) = 0.00 kNm.'
    },
    data: {
      length: 8.0,
      EI: 1.0,
      supports: [
        { id: 's1', x: 0.0, fz: true, my: true },
        { id: 's2', x: 8.0, fz: true, my: false }
      ],
      hinges: [
        { id: 'h1', x: 4.0, type: 'moment' }
      ],
      pointLoads: [],
      distLoads: [
        { id: 'd1', x1: 0.0, x2: 8.0, q1: 10.0, q2: 10.0, loadCase: 'LC1' }
      ],
      currentLoadCase: 'All',
      currentView: 'moment'
    }
  },
  {
    id: 'two_span_continuous',
    name: {
      en: '5. Two-Span Continuous Beam (Supports at x = 0, 6m, 12m)',
      pl: '5. Belka ciągła dwuprzęsłowa (Podpory w x = 0, 6m, 12m)'
    },
    description: {
      en: 'Continuous beam across two 6m spans with point load P = 15 kN in span 1 and uniform load q = 8 kN/m across both spans.',
      pl: 'Belka ciągła przez dwa przęsła 6m z siłą skupioną P = 15 kN w 1. przęśle i obciążeniem ciągłym q = 8 kN/m na całej długości.'
    },
    data: {
      length: 12.0,
      EI: 1.0,
      supports: [
        { id: 's1', x: 0.0, fz: true, my: false },
        { id: 's2', x: 6.0, fz: true, my: false },
        { id: 's3', x: 12.0, fz: true, my: false }
      ],
      hinges: [],
      pointLoads: [
        { id: 'p1', x: 3.0, fz: 15.0, my: 0.0, loadCase: 'LC1' }
      ],
      distLoads: [
        { id: 'd1', x1: 0.0, x2: 12.0, q1: 8.0, q2: 8.0, loadCase: 'LC1' }
      ],
      currentLoadCase: 'All',
      currentView: 'moment'
    }
  },
  {
    id: 'overhanging_beam_trapezoid',
    name: {
      en: '6. Overhanging Beam with Triangular Load & Point Forces',
      pl: '6. Belka z wysięgnikami, obciążeniem trójkątnym i siłami'
    },
    description: {
      en: 'Supports at x = 2m and x = 8m (2m overhangs on each end), tip point loads P1 = 10 kN, P2 = 12 kN, and triangular load (0 to 18 kN/m).',
      pl: 'Podpory w x = 2m i x = 8m (wysięgniki 2m po obu stronach), siły skupione na końcach P1 = 10 kN, P2 = 12 kN oraz obciążenie trójkątne (0 do 18 kN/m).'
    },
    data: {
      length: 10.0,
      EI: 1.0,
      supports: [
        { id: 's1', x: 2.0, fz: true, my: false },
        { id: 's2', x: 8.0, fz: true, my: false }
      ],
      hinges: [],
      pointLoads: [
        { id: 'p1', x: 0.0, fz: 10.0, my: 0.0, loadCase: 'LC1' },
        { id: 'p2', x: 10.0, fz: 12.0, my: 0.0, loadCase: 'LC1' }
      ],
      distLoads: [
        { id: 'd1', x1: 2.0, x2: 8.0, q1: 0.0, q2: 18.0, loadCase: 'LC1' }
      ],
      currentLoadCase: 'All',
      currentView: 'moment'
    }
  },
  {
    id: 'midspan_concentrated_moment',
    name: {
      en: '7. Beam with Concentrated Midspan Moment (M = 30 kNm)',
      pl: '7. Belka z momentem skupionym w środku przęsła (M = 30 kNm)'
    },
    description: {
      en: 'Simply supported beam with concentrated moment M = 30 kNm at x = 3m, demonstrating the characteristic step jump in the moment diagram.',
      pl: 'Belka wolnopodparta z momentem skupionym M = 30 kNm w x = 3m, pokazująca charakterystyczny skok na wykresie momentów zginających.'
    },
    data: {
      length: 6.0,
      EI: 1.0,
      supports: [
        { id: 's1', x: 0.0, fz: true, my: false },
        { id: 's2', x: 6.0, fz: true, my: false }
      ],
      hinges: [],
      pointLoads: [
        { id: 'p1', x: 3.0, fz: 0.0, my: 30.0, loadCase: 'LC1' }
      ],
      distLoads: [],
      currentLoadCase: 'All',
      currentView: 'moment'
    }
  },
  {
    id: 'support_settlement_indeterminate',
    name: {
      en: '8. Support Settlement (Movement = 0.02 m)',
      pl: '8. Osiadanie podpory (Przemieszczenie = 0.02 m)'
    },
    description: {
      en: 'Two-span beam with prescribed support settlement of 0.02 m at central support x = 4m, producing internal reactions, bending moments, and deflection.',
      pl: 'Belka dwuprzęsłowa ze zadanym osiadaniem podpory środkowej o 0.02 m w x = 4m, wywołującym reakcje, momenty zginające i ugięcia.'
    },
    data: {
      length: 8.0,
      EI: 1.0,
      supports: [
        { id: 's1', x: 0.0, fz: true, my: false, movement: 0.0 },
        { id: 's2', x: 4.0, fz: true, my: false, movement: -0.02 },
        { id: 's3', x: 8.0, fz: true, my: false, movement: 0.0 }
      ],
      hinges: [],
      pointLoads: [],
      distLoads: [],
      currentLoadCase: 'All',
      currentView: 'moment'
    }
  }
];
