/**
 * 2D Analytical Beam Calculator - Internationalization (i18n)
 * Notation: T(x) for shear force, EJ for bending stiffness.
 * Default language: English (en).
 */

export const TRANSLATIONS = {
  en: {
    appTitle: '2D Analytical Beam Calculator',
    greeting: 'Analytical Euler-Bernoulli Engine',
    presetsBtn: '📚 Presets',
    undoBtn: '↶ Undo (Ctrl+Z)',
    redoBtn: '↷ Redo (Ctrl+Y)',
    exportPngBtn: 'Export PNG',
    reactionsView: 'Reactions',
    shearView: 'Shear Force T(x)',
    momentView: 'Bending Moment M(x)',
    deflectionView: 'Deflection w(x) [mm]',
    allView: 'All Stacked',
    calcReportBtn: 'Calculation Report',
    langBtn: '🌐 EN / PL',
    kofiBtn: 'Buy me a coffee',
    kofiTitle: 'Buy me a coffee on Ko-fi',

    // Hero Welcome Overlay on Canvas
    heroWelcomeTitle: 'Select a Beam Configuration to Start',
    heroWelcomeSubtitle: 'Choose a benchmark template to instantly view reactions, shear force T(x), bending moment M(x), and deflection w(x).',
    blankBeamTitle: 'Blank Beam (Custom Design)',
    blankBeamDesc: 'Start with a blank beam (L = 6.0m) to add your own custom supports and loads from scratch.',
    
    // Sidebar
    beamParamsTitle: 'Beam Parameters',
    lengthLabel: 'Length L [m]',
    rigidityLabel: 'EJ [kN·m²]',
    supportsTitle: 'Supports',
    supportTypePin: 'Pin',
    supportTypeFixed: 'Fixed',
    supportMovementCol: 'Movement [m]',
    addSupportBtn: '+ Add Support',
    hingesTitle: 'Internal Hinges (M = 0)',
    hingeCondition: 'Moment Hinge (M = 0)',
    addHingeBtn: '+ Add Hinge',
    pointLoadsTitle: 'Point Loads & Moments',
    pointForceHeader: 'Fz [kN] (P)',
    pointMomentHeader: 'M [kNm]',
    addPointLoadBtn: '+ Add Point Load / Moment',
    distLoadsTitle: 'Distributed Loads',
    addDistLoadBtn: '+ Add Distributed Load (q)',
    sidebarBadge: '2D Analytical Beam Calculator',
    sidebarSubBadge: 'Exact Analytical Method',

    // Modal Add Element Dialogs
    modalAddSupportTitle: 'Add New Support',
    modalAddHingeTitle: 'Add Internal Moment Hinge',
    modalAddPointLoadTitle: 'Add Point Force / Moment',
    modalAddDistLoadTitle: 'Add Distributed Load',
    positionLabel: 'Position x [m]',
    startPosLabel: 'Start Position x1 [m]',
    endPosLabel: 'End Position x2 [m]',
    startIntensityLabel: 'Start Intensity q1 [kN/m]',
    endIntensityLabel: 'End Intensity q2 [kN/m]',
    pointForceLabel: 'Vertical Force Fz [kN] (P > 0 downward)',
    pointMomentLabel: 'Point Moment M [kNm]',
    supportTypeLabel: 'Support Type',
    modalAddSupportMovementLabel: 'Support Movement [m] (0 = rigid)',
    cancelBtn: 'Cancel',
    confirmAddBtn: 'Add to Beam',

    // Canvas
    dimLabel: 'L = {val} m',
    shearDiagramTitle: 'Shear Force Diagram T(x) [kN]',
    momentDiagramTitle: 'Bending Moment Diagram M(x) [kNm]',
    deflectionDiagramTitle: 'Deflection Diagram w(x) [mm]',
    watermark: '2D BEAM CALCULATOR',

    // Status bar & Warnings
    statusDeterminate: '✓ Statically Determinate (n = 0)',
    statusIndeterminate: '✓ Statically Indeterminate (n = {n})',
    statusUnstable: '⚠ Unstable Structure / Mechanism (No Results)',
    unstableBannerTitle: 'Structure is Geometrically Unstable (Mechanism)',
    unstableBannerDesc1: 'The beam lacks adequate support restraints or contains excessive hinges.',
    unstableBannerDesc2: 'Static equilibrium cannot be established (results are suppressed).',

    // Modal Calculation Report
    reportTitle: 'Analytical Calculation Report',
    section1Title: '1. Structural System & Static Determinacy',
    section2Title: '2. Global Equilibrium & Reactions',
    section3Title: '3. Characteristic Segments & Internal Force Equations',
    section4Title: '4. Extremum Values Summary',
    classificationLabel: 'Structural Classification',
    supportsCountLabel: 'Supports Count:',
    hingesCountLabel: 'Hinges Count:',
    statusLabel: 'Status:',
    nodeLabel: 'Node',
    govDiffRelations: 'Governing differential relations: $T(x) = -\\int q(x)dx$, $M(x) = \\int T(x)dx$.',
    vertEq: 'Vertical Equilibrium:',
    momentEq: 'Moment Equilibrium (origin):',
    supportNodeCol: 'Support Node',
    locCol: 'Location x [m]',
    vertReactionCol: 'Vertical Reaction Rz [kN]',
    momentReactionCol: 'Reaction Moment MR [kNm]',
    segmentLabel: 'Segment',
    shearEquationLabel: 'Shear Force T(x):',
    momentEquationLabel: 'Bending Moment M(x):',
    shearExtrema: 'Shear Force Extrema',
    momentExtrema: 'Bending Moment Extrema',
    deflectionExtrema: 'Deflection Extrema',
    deflectionRatio: 'Deflection Ratio:',
    closeBtn: 'Close',
    printBtn: 'Print / Export PDF',
    presetsModalTitle: '📚 Benchmark Presets'
  },

  pl: {
    appTitle: '2D Analityczny Kalkulator Belek',
    greeting: 'Mechanika Budowli / Wytrzymałość Materiałów',
    presetsBtn: '📚 Przykłady',
    undoBtn: '↶ Cofnij (Ctrl+Z)',
    redoBtn: '↷ Ponów (Ctrl+Y)',
    exportPngBtn: 'Eksportuj PNG',
    reactionsView: 'Reakcje',
    shearView: 'Siły tnące T(x)',
    momentView: 'Momenty zginające M(x)',
    deflectionView: 'Ugięcia w(x) [mm]',
    allView: 'Wszystkie wykresy',
    calcReportBtn: 'Raport obliczeniowy',
    langBtn: '🌐 PL / EN',
    kofiBtn: 'Postaw mi kawę',
    kofiTitle: 'Postaw mi kawę na Ko-fi',

    // Hero Welcome Overlay on Canvas
    heroWelcomeTitle: 'Wybierz schemat belki na start',
    heroWelcomeSubtitle: 'Wybierz jeden z klasycznych schematów, aby natychmiast zobaczyć reakcje, wykres sił tnących T(x), momentów M(x) i ugięć w(x).',
    blankBeamTitle: 'Czysta belka (Własny projekt)',
    blankBeamDesc: 'Rozpocznij od pustej belki (L = 6.0m), aby od podstaw dodać własne podpory i obciążenia.',
    
    // Sidebar
    beamParamsTitle: 'Parametry belki',
    lengthLabel: 'Długość L [m]',
    rigidityLabel: 'EJ [kN·m²]',
    supportsTitle: 'Podpory',
    supportTypePin: 'Przegub',
    supportTypeFixed: 'Utwierdzenie',
    supportMovementCol: 'Przemieszczenie [m]',
    addSupportBtn: '+ Dodaj podporę',
    hingesTitle: 'Przeguby wewnętrzne (M = 0)',
    hingeCondition: 'Przegub zginany (M = 0)',
    addHingeBtn: '+ Dodaj przegub',
    pointLoadsTitle: 'Siły i momenty skupione',
    pointForceHeader: 'Fz [kN] (P)',
    pointMomentHeader: 'M [kNm]',
    addPointLoadBtn: '+ Dodaj siłę / moment',
    distLoadsTitle: 'Obciążenia ciągłe',
    addDistLoadBtn: '+ Dodaj obciążenie ciągłe (q)',
    sidebarBadge: 'Kalkulator Belek 2D',
    sidebarSubBadge: 'Metoda Analityczna',

    // Modal Add Element Dialogs
    modalAddSupportTitle: 'Dodaj nową podporę',
    modalAddHingeTitle: 'Dodaj przegub wewnętrzny',
    modalAddPointLoadTitle: 'Dodaj siłę skupioną / moment',
    modalAddDistLoadTitle: 'Dodaj obciążenie ciągłe',
    positionLabel: 'Współrzędna x [m]',
    startPosLabel: 'Początek x1 [m]',
    endPosLabel: 'Koniec x2 [m]',
    startIntensityLabel: 'Wartość początkowa q1 [kN/m]',
    endIntensityLabel: 'Wartość końcowa q2 [kN/m]',
    pointForceLabel: 'Siła pionowa Fz [kN] (P > 0 w dół)',
    pointMomentLabel: 'Moment skupiony M [kNm]',
    supportTypeLabel: 'Typ podpory',
    modalAddSupportMovementLabel: 'Przemieszczenie podpory [m] (0 = sztywna)',
    cancelBtn: 'Anuluj',
    confirmAddBtn: 'Dodaj do belki',

    // Canvas
    dimLabel: 'L = {val} m',
    shearDiagramTitle: 'Wykres sił tnących T(x) [kN]',
    momentDiagramTitle: 'Wykres momentów zginających M(x) [kNm]',
    deflectionDiagramTitle: 'Wykres ugięć belki w(x) [mm]',
    watermark: 'KALKULATOR BELEK 2D',

    // Status bar & Warnings
    statusDeterminate: '✓ Układ statycznie wyznaczalny (n = 0)',
    statusIndeterminate: '✓ Układ statycznie niewyznaczalny (n = {n})',
    statusUnstable: '⚠ Układ geometrycznie zmienny / niestabilny (Brak wyników)',
    unstableBannerTitle: 'Układ jest Geometrycznie Zmienny (Mechanizm)',
    unstableBannerDesc1: 'Belka nie posiada wystarczającej liczby podpór lub zawiera zbyt wiele przegubów.',
    unstableBannerDesc2: 'Równowaga statyczna nie może być zachowana (wyniki ukryte).',

    // Modal Calculation Report
    reportTitle: 'Sprawozdanie Analityczne z Obliczeń Belki',
    section1Title: '1. Układ Konstrukcyjny i Stopień Statycznej Niewyznaczalności',
    section2Title: '2. Równania Równowagi i Reakcje Podporowe',
    section3Title: '3. Przedziały Charakterystyczne i Równania Sił Przekrojowych',
    section4Title: '4. Zestawienie Wartości Ekstremalnych',
    classificationLabel: 'Klasyfikacja statyczna',
    supportsCountLabel: 'Liczba podpór:',
    hingesCountLabel: 'Liczba przegubów:',
    statusLabel: 'Status:',
    nodeLabel: 'Węzeł',
    govDiffRelations: 'Związki różniczkowe: $T(x) = -\\int q(x)dx$, $M(x) = \\int T(x)dx$.',
    vertEq: 'Równanie rzutów sił na oś Z:',
    momentEq: 'Równanie momentów względem początku:',
    supportNodeCol: 'Węzeł podporowy',
    locCol: 'Współrzędna x [m]',
    vertReactionCol: 'Reakcja pionowa Rz [kN]',
    momentReactionCol: 'Moment w utwierdzeniu MR [kNm]',
    segmentLabel: 'Przedział',
    shearEquationLabel: 'Siła tnąca T(x):',
    momentEquationLabel: 'Moment zginający M(x):',
    shearExtrema: 'Wartości ekstremalne sił tnących',
    momentExtrema: 'Wartości ekstremalne momentów zginających',
    deflectionExtrema: 'Maksymalne ugięcie belki',
    deflectionRatio: 'Stosunek ugięcia:',
    closeBtn: 'Zamknij',
    printBtn: 'Drukuj / Eksportuj PDF',
    presetsModalTitle: '📚 Przykłady Zadań z Mechaniki'
  }
};

export function getSavedLanguage() {
  return localStorage.getItem('polybeam_lang') || 'en';
}

export function setSavedLanguage(lang) {
  localStorage.setItem('polybeam_lang', lang);
}
