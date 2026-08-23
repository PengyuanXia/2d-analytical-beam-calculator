/**
 * 2D Analytical Beam Calculator - Analytical Euler-Bernoulli Solver
 * Exact closed-form piecewise boundary value problem (BVP) for 2D beams.
 * Detects kinematic/geometric instability (mechanisms) and suppresses results if unstable.
 */

export class AnalyticalBeamSolver {
  constructor(beamData) {
    this.L = Math.max(0.1, Number(beamData.length) || 6.0);
    this.EI = Math.max(0.0001, Number(beamData.EI) || 1.0);
    this.supports = (beamData.supports || [])
      .filter(s => s.x >= 0 && s.x <= this.L)
      .map(s => ({
        ...s,
        x: Number(s.x) || 0,
        movement: Number(s.movement) || 0
      }));
    this.hinges = (beamData.hinges || []).filter(h => h.x > 0 && h.x < this.L);

    const targetLC = beamData.currentLoadCase || 'All';
    this.pointLoads = (beamData.pointLoads || [])
      .filter(p => p.x >= 0 && p.x <= this.L)
      .filter(p => targetLC === 'All' || !p.loadCase || p.loadCase === targetLC)
      .map(p => ({
        ...p,
        x: Math.max(0, Math.min(this.L, Number(p.x) || 0)),
        fz: Number(p.fz) || 0,
        my: Number(p.my) || 0
      }));

    this.distLoads = (beamData.distLoads || [])
      .filter(d => d.x2 > d.x1 && d.x1 < this.L && d.x2 > 0)
      .filter(d => targetLC === 'All' || !d.loadCase || d.loadCase === targetLC)
      .map(d => ({
        ...d,
        x1: Math.max(0, Math.min(this.L, Number(d.x1))),
        x2: Math.max(0, Math.min(this.L, Number(d.x2))),
        q1: Number(d.q1) || 0,
        q2: Number(d.q2) || 0
      }));
  }

  solve() {
    // 1. Initial Kinematic Stability Check
    let supportDof = 0;
    this.supports.forEach(s => {
      if (s.fz) supportDof += 1;
      if (s.my) supportDof += 1;
    });

    const hingeReleases = this.hinges.length;
    const degreeOfIndeterminacy = supportDof - 2 - hingeReleases;

    // Minimum required support constraints for a 2D beam is 2 (e.g. pinned + roller, or fixed clamp).
    // With hinges, each hinge requires +1 support restraint.
    if (supportDof < 2 || degreeOfIndeterminacy < 0) {
      return this.createUnstableResult(degreeOfIndeterminacy);
    }

    // 2. Partition domain [0, L]
    const ptsSet = new Set([0.0, this.L]);
    this.supports.forEach(s => ptsSet.add(Number(s.x)));
    this.hinges.forEach(h => ptsSet.add(Number(h.x)));
    this.pointLoads.forEach(p => ptsSet.add(Number(p.x)));
    this.distLoads.forEach(d => {
      ptsSet.add(Number(d.x1));
      ptsSet.add(Number(d.x2));
    });

    const X = Array.from(ptsSet).sort((a, b) => a - b);
    const N = X.length - 1;

    if (N <= 0) {
      return this.createUnstableResult(degreeOfIndeterminacy);
    }

    const fzSupports = this.supports.filter(s => s.fz);
    const mySupports = this.supports.filter(s => s.my);

    const numBendingConsts = 4 * N;
    const numFz = fzSupports.length;
    const numMy = mySupports.length;
    const numVars = numBendingConsts + numFz + numMy;

    const A = Array.from({ length: numVars }, () => new Float64Array(numVars));
    const B = new Float64Array(numVars);
    let eqIdx = 0;

    const cIdx = (k, deg) => 4 * k + deg;
    const rzIdx = (i) => 4 * N + i;
    const mrIdx = (i) => 4 * N + numFz + i;

    const getDistOnSeg = (k) => {
      const xStart = X[k];
      const xEnd = X[k + 1];
      let qa = 0.0;
      let qb = 0.0;
      for (const d of this.distLoads) {
        if (d.x1 <= xStart + 1e-9 && d.x2 >= xEnd - 1e-9) {
          const span = d.x2 - d.x1;
          if (span > 1e-9) {
            qa += d.q1 + (d.q2 - d.q1) * (xStart - d.x1) / span;
            qb += d.q1 + (d.q2 - d.q1) * (xEnd - d.x1) / span;
          } else {
            qa += d.q1;
            qb += d.q2;
          }
        }
      }
      return { qa, qb };
    };

    // Internal node continuity & equilibrium
    for (let k = 1; k < N; k++) {
      const xNode = X[k];
      const dxPrev = X[k] - X[k - 1];
      const { qa: qaPrev, qb: qbPrev } = getDistOnSeg(k - 1);
      const deltaQPrev = dxPrev > 1e-9 ? (qbPrev - qaPrev) / dxPrev : 0.0;

      // Deflection continuity
      A[eqIdx][cIdx(k, 0)] = 1.0;
      A[eqIdx][cIdx(k - 1, 0)] = -1.0;
      A[eqIdx][cIdx(k - 1, 1)] = -dxPrev;
      A[eqIdx][cIdx(k - 1, 2)] = -0.5 * dxPrev * dxPrev;
      A[eqIdx][cIdx(k - 1, 3)] = -(1.0 / 6.0) * Math.pow(dxPrev, 3);
      const wpPrev = -(1.0 / (24.0 * this.EI)) * qaPrev * Math.pow(dxPrev, 4) - (1.0 / (120.0 * this.EI)) * deltaQPrev * Math.pow(dxPrev, 5);
      B[eqIdx] = wpPrev;
      eqIdx++;

      // Slope continuity or Moment Hinge release
      const isMomentHinge = this.hinges.some(h => Math.abs(h.x - xNode) < 1e-9);
      if (!isMomentHinge) {
        A[eqIdx][cIdx(k, 1)] = 1.0;
        A[eqIdx][cIdx(k - 1, 1)] = -1.0;
        A[eqIdx][cIdx(k - 1, 2)] = -dxPrev;
        A[eqIdx][cIdx(k - 1, 3)] = -0.5 * dxPrev * dxPrev;
        const thpPrev = -(1.0 / (6.0 * this.EI)) * qaPrev * Math.pow(dxPrev, 3) - (1.0 / (24.0 * this.EI)) * deltaQPrev * Math.pow(dxPrev, 4);
        B[eqIdx] = thpPrev;
        eqIdx++;
      } else {
        A[eqIdx][cIdx(k - 1, 2)] = this.EI;
        A[eqIdx][cIdx(k - 1, 3)] = this.EI * dxPrev;
        const mpPrev = -0.5 * qaPrev * dxPrev * dxPrev - (1.0 / 6.0) * deltaQPrev * Math.pow(dxPrev, 3);
        B[eqIdx] = -mpPrev;
        eqIdx++;
      }

      // Moment equilibrium
      A[eqIdx][cIdx(k, 2)] = this.EI;
      A[eqIdx][cIdx(k - 1, 2)] = -this.EI;
      A[eqIdx][cIdx(k - 1, 3)] = -this.EI * dxPrev;
      for (let i = 0; i < mySupports.length; i++) {
        if (Math.abs(mySupports[i].x - xNode) < 1e-9) {
          A[eqIdx][mrIdx(i)] = 1.0;
        }
      }
      const mpPrevEq = -0.5 * qaPrev * dxPrev * dxPrev - (1.0 / 6.0) * deltaQPrev * Math.pow(dxPrev, 3);
      const pointM = this.pointLoads
        .filter(p => Math.abs(p.x - xNode) < 1e-9)
        .reduce((sum, p) => sum + (Number(p.my) || 0), 0);
      B[eqIdx] = mpPrevEq - pointM;
      eqIdx++;

      // Shear equilibrium
      A[eqIdx][cIdx(k, 3)] = this.EI;
      A[eqIdx][cIdx(k - 1, 3)] = -this.EI;
      for (let i = 0; i < fzSupports.length; i++) {
        if (Math.abs(fzSupports[i].x - xNode) < 1e-9) {
          A[eqIdx][rzIdx(i)] = 1.0;
        }
      }
      const vpPrev = -qaPrev * dxPrev - 0.5 * deltaQPrev * dxPrev * dxPrev;
      const pointFz = this.pointLoads
        .filter(p => Math.abs(p.x - xNode) < 1e-9)
        .reduce((sum, p) => sum + (Number(p.fz) || 0), 0);
      B[eqIdx] = vpPrev - pointFz;
      eqIdx++;
    }

    // Boundary conditions at x = 0 (Left End)
    A[eqIdx][cIdx(0, 3)] = this.EI;
    for (let i = 0; i < fzSupports.length; i++) {
      if (Math.abs(fzSupports[i].x - 0.0) < 1e-9) {
        A[eqIdx][rzIdx(i)] = 1.0;
      }
    }
    const pointFz0 = this.pointLoads
      .filter(p => Math.abs(p.x - 0.0) < 1e-9)
      .reduce((sum, p) => sum + (Number(p.fz) || 0), 0);
    B[eqIdx] = -pointFz0;
    eqIdx++;

    A[eqIdx][cIdx(0, 2)] = this.EI;
    for (let i = 0; i < mySupports.length; i++) {
      if (Math.abs(mySupports[i].x - 0.0) < 1e-9) {
        A[eqIdx][mrIdx(i)] = 1.0;
      }
    }
    const pointM0 = this.pointLoads
      .filter(p => Math.abs(p.x - 0.0) < 1e-9)
      .reduce((sum, p) => sum + (Number(p.my) || 0), 0);
    B[eqIdx] = -pointM0;
    eqIdx++;

    // Boundary conditions at x = L (Right End)
    const dxLast = X[N] - X[N - 1];
    const { qa: qaLast, qb: qbLast } = getDistOnSeg(N - 1);
    const deltaQLast = dxLast > 1e-9 ? (qbLast - qaLast) / dxLast : 0.0;

    A[eqIdx][cIdx(N - 1, 3)] = -this.EI;
    for (let i = 0; i < fzSupports.length; i++) {
      if (Math.abs(fzSupports[i].x - this.L) < 1e-9) {
        A[eqIdx][rzIdx(i)] = 1.0;
      }
    }
    const vpLast = -qaLast * dxLast - 0.5 * deltaQLast * dxLast * dxLast;
    const pointFzL = this.pointLoads
      .filter(p => Math.abs(p.x - this.L) < 1e-9)
      .reduce((sum, p) => sum + (Number(p.fz) || 0), 0);
    B[eqIdx] = vpLast - pointFzL;
    eqIdx++;

    A[eqIdx][cIdx(N - 1, 2)] = -this.EI;
    A[eqIdx][cIdx(N - 1, 3)] = -this.EI * dxLast;
    for (let i = 0; i < mySupports.length; i++) {
      if (Math.abs(mySupports[i].x - this.L) < 1e-9) {
        A[eqIdx][mrIdx(i)] = 1.0;
      }
    }
    const mpLast = -0.5 * qaLast * dxLast * dxLast - (1.0 / 6.0) * deltaQLast * Math.pow(dxLast, 3);
    const pointML = this.pointLoads
      .filter(p => Math.abs(p.x - this.L) < 1e-9)
      .reduce((sum, p) => sum + (Number(p.my) || 0), 0);
    B[eqIdx] = mpLast - pointML;
    eqIdx++;

    // Support Restraints
    for (let i = 0; i < fzSupports.length; i++) {
      const xs = fzSupports[i].x;
      let ks = 0;
      for (let k = 0; k < N; k++) {
        if (X[k] <= xs + 1e-9 && xs <= X[k + 1] + 1e-9) {
          ks = k;
          break;
        }
      }
      const dxS = xs - X[ks];
      const { qa: qaS, qb: qbS } = getDistOnSeg(ks);
      const spanS = X[ks + 1] - X[ks];
      const deltaQS = spanS > 1e-9 ? (qbS - qaS) / spanS : 0.0;

      A[eqIdx][cIdx(ks, 0)] = 1.0;
      A[eqIdx][cIdx(ks, 1)] = dxS;
      A[eqIdx][cIdx(ks, 2)] = 0.5 * dxS * dxS;
      A[eqIdx][cIdx(ks, 3)] = (1.0 / 6.0) * Math.pow(dxS, 3);
      const wpS = -(1.0 / (24.0 * this.EI)) * qaS * Math.pow(dxS, 4) - (1.0 / (120.0 * this.EI)) * deltaQS * Math.pow(dxS, 5);
      const settlement = Number(fzSupports[i].movement) || 0;
      B[eqIdx] = settlement - wpS;
      eqIdx++;
    }

    for (let i = 0; i < mySupports.length; i++) {
      const xs = mySupports[i].x;
      let ks = 0;
      for (let k = 0; k < N; k++) {
        if (X[k] <= xs + 1e-9 && xs <= X[k + 1] + 1e-9) {
          ks = k;
          break;
        }
      }
      const dxS = xs - X[ks];
      const { qa: qaS, qb: qbS } = getDistOnSeg(ks);
      const spanS = X[ks + 1] - X[ks];
      const deltaQS = spanS > 1e-9 ? (qbS - qaS) / spanS : 0.0;

      A[eqIdx][cIdx(ks, 1)] = 1.0;
      A[eqIdx][cIdx(ks, 2)] = dxS;
      A[eqIdx][cIdx(ks, 3)] = 0.5 * dxS * dxS;
      const thpS = -(1.0 / (6.0 * this.EI)) * qaS * Math.pow(dxS, 3) - (1.0 / (24.0 * this.EI)) * deltaQS * Math.pow(dxS, 4);
      B[eqIdx] = -thpS;
      eqIdx++;
    }

    // Solve Linear System
    const { x: sol, isSingular } = this.solveLinearSystem(A, B);

    // If mathematically singular (unstable mechanism), do NOT return results!
    if (isSingular) {
      return this.createUnstableResult(degreeOfIndeterminacy);
    }

    // Assemble segments
    const segments = [];
    for (let k = 0; k < N; k++) {
      const xStart = X[k];
      const xEnd = X[k + 1];
      const dx = xEnd - xStart;
      const { qa, qb } = getDistOnSeg(k);
      const deltaQ = dx > 1e-9 ? (qb - qa) / dx : 0.0;

      const c0 = sol[cIdx(k, 0)];
      const c1 = sol[cIdx(k, 1)];
      const c2 = sol[cIdx(k, 2)];
      const c3 = sol[cIdx(k, 3)];

      segments.push({
        xStart,
        xEnd,
        dx,
        qa,
        qb,
        deltaQ,
        c0,
        c1,
        c2,
        c3,
        evalV: (x) => {
          const xi = Math.max(0, Math.min(dx, x - xStart));
          return this.EI * c3 - (qa * xi + 0.5 * deltaQ * xi * xi);
        },
        evalM: (x) => {
          const xi = Math.max(0, Math.min(dx, x - xStart));
          return this.EI * (c2 + c3 * xi) - (0.5 * qa * xi * xi + (1.0 / 6.0) * deltaQ * Math.pow(xi, 3));
        },
        evalTheta: (x) => {
          const xi = Math.max(0, Math.min(dx, x - xStart));
          const particular = -(1.0 / (6.0 * this.EI)) * qa * Math.pow(xi, 3) - (1.0 / (24.0 * this.EI)) * deltaQ * Math.pow(xi, 4);
          return c1 + c2 * xi + 0.5 * c3 * xi * xi + particular;
        },
        evalW: (x) => {
          const xi = Math.max(0, Math.min(dx, x - xStart));
          const particular = -(1.0 / (24.0 * this.EI)) * qa * Math.pow(xi, 4) - (1.0 / (120.0 * this.EI)) * deltaQ * Math.pow(xi, 5);
          return c0 + c1 * xi + 0.5 * c2 * xi * xi + (1.0 / 6.0) * c3 * Math.pow(xi, 3) + particular;
        }
      });
    }

    const reactionsFz = {};
    for (let i = 0; i < fzSupports.length; i++) {
      reactionsFz[fzSupports[i].x] = -sol[rzIdx(i)];
    }

    const reactionsMy = {};
    for (let i = 0; i < mySupports.length; i++) {
      reactionsMy[mySupports[i].x] = -sol[mrIdx(i)];
    }

    const criticalPoints = this.findCriticalPoints(X, segments);
    const equilibrium = this.checkEquilibrium(reactionsFz, reactionsMy);

    const determinacy = degreeOfIndeterminacy === 0 
      ? { type: 'Determinate', isStable: true, degree: 0, label: 'Statically Determinate' }
      : { type: 'Indeterminate', isStable: true, degree: degreeOfIndeterminacy, label: `Statically Indeterminate (n = ${degreeOfIndeterminacy})` };

    return {
      isStable: true,
      X,
      segments,
      reactions: {
        fz: reactionsFz,
        my: reactionsMy
      },
      criticalPoints,
      equilibrium,
      determinacy
    };
  }

  createUnstableResult(degree) {
    return {
      isStable: false,
      X: [0.0, this.L],
      segments: [],
      reactions: { fz: {}, my: {} },
      criticalPoints: null,
      equilibrium: { sumFzLoads: 0, sumFzReactions: 0, netFz: 0, sumMyLoads: 0, sumMyReactions: 0, netMy: 0, isBalanced: false },
      determinacy: {
        type: 'Mechanism',
        isStable: false,
        degree: degree || -1,
        label: 'Unstable Mechanism'
      }
    };
  }

  solveLinearSystem(A, B) {
    const n = B.length;
    const M = A.map(row => Array.from(row));
    const x = new Float64Array(n);
    const b = Array.from(B);
    let isSingular = false;

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      let maxVal = Math.abs(M[i][i]);
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > maxVal) {
          maxVal = Math.abs(M[k][i]);
          maxRow = k;
        }
      }

      if (maxVal < 1e-9) {
        isSingular = true;
        M[i][i] = 1.0;
      }

      if (maxRow !== i) {
        const tempRow = M[i];
        M[i] = M[maxRow];
        M[maxRow] = tempRow;
        const tempB = b[i];
        b[i] = b[maxRow];
        b[maxRow] = tempB;
      }

      for (let k = i + 1; k < n; k++) {
        const factor = M[k][i] / M[i][i];
        b[k] -= factor * b[i];
        for (let j = i; j < n; j++) {
          M[k][j] -= factor * M[i][j];
        }
      }
    }

    for (let i = n - 1; i >= 0; i--) {
      let sum = b[i];
      for (let j = i + 1; j < n; j++) {
        sum -= M[i][j] * x[j];
      }
      x[i] = Math.abs(M[i][i]) > 1e-9 ? sum / M[i][i] : 0.0;
    }

    return { x, isSingular };
  }

  findCriticalPoints(X, segments) {
    const shearZeros = [];

    segments.forEach((seg) => {
      const { xStart, dx, c3, qa, deltaQ, evalV, evalM } = seg;
      const a = 0.5 * deltaQ;
      const b = qa;
      const c = -this.EI * c3;

      const testRoots = [0, dx];

      if (Math.abs(a) < 1e-9) {
        if (Math.abs(b) > 1e-9) {
          const xi = -c / b;
          if (xi > 1e-6 && xi < dx - 1e-6) testRoots.push(xi);
        }
      } else {
        const disc = b * b - 4 * a * c;
        if (disc >= 0) {
          const sqrtD = Math.sqrt(disc);
          const r1 = (-b + sqrtD) / (2 * a);
          const r2 = (-b - sqrtD) / (2 * a);
          if (r1 > 1e-6 && r1 < dx - 1e-6) testRoots.push(r1);
          if (r2 > 1e-6 && r2 < dx - 1e-6) testRoots.push(r2);
        }
      }

      testRoots.forEach(xi => {
        const xVal = xStart + xi;
        const vVal = evalV(xVal);
        const mVal = evalM(xVal);
        if (Math.abs(vVal) < 1e-4) {
          shearZeros.push({ x: xVal, V: 0.0, M: mVal });
        }
      });
    });

    let maxV = -Infinity, minV = Infinity, xMaxV = 0, xMinV = 0;
    let maxM = -Infinity, minM = Infinity, xMaxM = 0, xMinM = 0;
    let maxW = -Infinity, minW = Infinity, xMaxW = 0, xMinW = 0;

    const sampleStep = 0.02;
    const numGlobalSteps = Math.ceil(this.L / sampleStep);

    for (let i = 0; i <= numGlobalSteps; i++) {
      const x = Math.min(this.L, i * sampleStep);
      let k = 0;
      for (let segIdx = 0; segIdx < segments.length; segIdx++) {
        if (x >= segments[segIdx].xStart - 1e-9 && x <= segments[segIdx].xEnd + 1e-9) {
          k = segIdx;
          break;
        }
      }
      const v = segments[k].evalV(x);
      const m = segments[k].evalM(x);
      const w = segments[k].evalW(x);

      if (v > maxV) { maxV = v; xMaxV = x; }
      if (v < minV) { minV = v; xMinV = x; }

      if (m > maxM) { maxM = m; xMaxM = x; }
      if (m < minM) { minM = m; xMinM = x; }

      if (w > maxW) { maxW = w; xMaxW = x; }
      if (w < minW) { minW = w; xMinW = x; }
    }

    return {
      maxV: { val: maxV, x: xMaxV },
      minV: { val: minV, x: xMinV },
      maxM: { val: maxM, x: xMaxM },
      minM: { val: minM, x: xMinM },
      maxW: { val: maxW, x: xMaxW },
      minW: { val: minW, x: xMinW },
      shearZeros
    };
  }

  checkEquilibrium(reactionsFz, reactionsMy) {
    let sumFzLoads = 0.0;
    let sumMyLoads = 0.0;

    this.pointLoads.forEach(p => {
      sumFzLoads += p.fz;
      sumMyLoads += p.my + p.fz * p.x;
    });

    this.distLoads.forEach(d => {
      const span = d.x2 - d.x1;
      const fzTotal = 0.5 * (d.q1 + d.q2) * span;
      const centroid = (d.q1 + 2 * d.q2) / (3 * (d.q1 + d.q2 || 1)) * span;
      const xCentroid = d.x1 + centroid;
      sumFzLoads += fzTotal;
      sumMyLoads += fzTotal * xCentroid;
    });

    let sumFzReactions = 0.0;
    let sumMyReactions = 0.0;
    for (const [xStr, val] of Object.entries(reactionsFz)) {
      const x = Number(xStr);
      sumFzReactions += val;
      sumMyReactions += val * x;
    }

    for (const [xStr, val] of Object.entries(reactionsMy)) {
      sumMyReactions += val;
    }

    const netFz = sumFzLoads - sumFzReactions;
    const netMy = sumMyLoads - sumMyReactions;

    return {
      sumFzLoads,
      sumFzReactions,
      netFz,
      sumMyLoads,
      sumMyReactions,
      netMy,
      isBalanced: Math.abs(netFz) < 1e-2 && Math.abs(netMy) < 1e-2
    };
  }
}
