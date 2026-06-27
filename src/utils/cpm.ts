/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Activity, CPMResult, PERTResult, Project } from '../types';

/**
 * Normal Distribution CDF Approximation
 * Standard normal cumulative distribution function
 */
export function normalCDF(z: number): number {
  if (z < 0) {
    return 1 - normalCDF(-z);
  }
  // Highly accurate approximation of standard normal CDF
  const a1 = 0.196854;
  const a2 = 0.115194;
  const a3 = 0.000344;
  const a4 = 0.019527;
  const term = 1 + a1 * z + a2 * Math.pow(z, 2) + a3 * Math.pow(z, 3) + a4 * Math.pow(z, 4);
  const p = 1 - 0.5 * Math.pow(term, -4);
  return Math.min(Math.max(p, 0), 1);
}

/**
 * Run Critical Path Method (CPM) on the activities
 */
export function calculateCPM(activities: Activity[]): {
  results: Map<string, CPMResult>;
  criticalPath: string[];
  totalDuration: number;
  hasCycle: boolean;
} {
  const results = new Map<string, CPMResult>();
  
  // Initialize map
  activities.forEach(act => {
    results.set(act.id, {
      id: act.id,
      name: act.name,
      duration: act.duration,
      es: 0,
      ef: 0,
      ls: 0,
      lf: 0,
      tf: 0,
      ff: 0,
      isCritical: false
    });
  });

  // Build adjacency list for successors and predecessors count
  const adj: { [key: string]: string[] } = {};
  const predCount: { [key: string]: number } = {};
  const successorsMap: { [key: string]: string[] } = {};

  activities.forEach(act => {
    adj[act.id] = [];
    predCount[act.id] = act.predecessors.filter(p => results.has(p)).length;
    successorsMap[act.id] = [];
  });

  activities.forEach(act => {
    act.predecessors.forEach(predId => {
      if (adj[predId]) {
        adj[predId].push(act.id);
        successorsMap[predId].push(act.id);
      }
    });
  });

  // Topological Sort (Kahn's algorithm)
  const q: string[] = [];
  const inDegree = { ...predCount };
  
  activities.forEach(act => {
    if (inDegree[act.id] === 0) {
      q.push(act.id);
    }
  });

  const topoOrder: string[] = [];
  while (q.length > 0) {
    const u = q.shift()!;
    topoOrder.push(u);
    
    adj[u].forEach(v => {
      inDegree[v]--;
      if (inDegree[v] === 0) {
        q.push(v);
      }
    });
  }

  // If we couldn't order all nodes, there is a cycle
  const hasCycle = topoOrder.length < activities.length;
  if (hasCycle) {
    // Return mock results to prevent crashing
    return {
      results,
      criticalPath: [],
      totalDuration: 0,
      hasCycle: true
    };
  }

  // Forward Pass: Calculate ES and EF
  topoOrder.forEach(id => {
    const act = activities.find(a => a.id === id)!;
    const res = results.get(id)!;
    
    let maxEF = 0;
    act.predecessors.forEach(predId => {
      const predRes = results.get(predId);
      if (predRes && predRes.ef > maxEF) {
        maxEF = predRes.ef;
      }
    });

    res.es = maxEF;
    res.ef = maxEF + res.duration;
  });

  // Project completion time is the maximum of all EFs
  let projectDuration = 0;
  activities.forEach(act => {
    const res = results.get(act.id)!;
    if (res.ef > projectDuration) {
      projectDuration = res.ef;
    }
  });

  // Backward Pass: Calculate LS and LF
  // Initialize LF for nodes with no successors to projectDuration
  const reverseTopo = [...topoOrder].reverse();
  
  reverseTopo.forEach(id => {
    const res = results.get(id)!;
    const successors = successorsMap[id];

    if (successors.length === 0) {
      res.lf = projectDuration;
    } else {
      let minLS = Infinity;
      successors.forEach(succId => {
        const succRes = results.get(succId);
        if (succRes && succRes.ls < minLS) {
          minLS = succRes.ls;
        }
      });
      res.lf = minLS;
    }
    res.ls = res.lf - res.duration;
  });

  // Calculate floats (TF and FF) and critical status
  const criticalPath: string[] = [];
  
  topoOrder.forEach(id => {
    const res = results.get(id)!;
    res.tf = Math.max(0, res.ls - res.es);

    // Free Float: min(ES of successors) - EF of current
    const successors = successorsMap[id];
    if (successors.length === 0) {
      res.ff = Math.max(0, projectDuration - res.ef);
    } else {
      let minSuccES = Infinity;
      successors.forEach(succId => {
        const succRes = results.get(succId);
        if (succRes && succRes.es < minSuccES) {
          minSuccES = succRes.es;
        }
      });
      res.ff = Math.max(0, minSuccES - res.ef);
    }

    // A task is critical if its total float is 0 (or within round-off errors)
    res.isCritical = res.tf < 0.001;
    if (res.isCritical) {
      criticalPath.push(id);
    }
  });

  return {
    results,
    criticalPath,
    totalDuration: projectDuration,
    hasCycle: false
  };
}

/**
 * Calculate PERT 3-time estimates statistics for activities on the critical path
 */
export function calculatePERT(
  activities: Activity[],
  criticalPath: string[],
  targetDuration: number
): {
  expectedDuration: number;
  variance: number;
  stdDev: number;
  probability: number; // probability of meeting targetDuration
} {
  if (criticalPath.length === 0) {
    return { expectedDuration: 0, variance: 0, stdDev: 0, probability: 0.5 };
  }

  let sumExpected = 0;
  let sumVariance = 0;

  // We sum expected values and variances for activities along the critical path
  criticalPath.forEach(id => {
    const act = activities.find(a => a.id === id);
    if (!act) return;

    const a = act.optimisticDays !== undefined ? act.optimisticDays : act.normalDuration;
    const m = act.mostLikelyDays !== undefined ? act.mostLikelyDays : act.normalDuration;
    const b = act.pessimisticDays !== undefined ? act.pessimisticDays : act.normalDuration;

    const expected = (a + 4 * m + b) / 6;
    const variance = Math.pow((b - a) / 6, 2);

    sumExpected += expected;
    sumVariance += variance;
  });

  const stdDev = Math.sqrt(sumVariance);
  
  let probability = 0.5;
  if (stdDev > 0) {
    const z = (targetDuration - sumExpected) / stdDev;
    probability = normalCDF(z);
  } else {
    // No variance
    probability = targetDuration >= sumExpected ? 1 : 0;
  }

  return {
    expectedDuration: Math.round(sumExpected * 10) / 10,
    variance: Math.round(sumVariance * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    probability: Math.round(probability * 1000) / 1000
  };
}

/**
 * Crashing Optimizer Curve generator
 * Generates data points representing project duration, direct cost, indirect cost, total cost
 * by crashing critical activities with the lowest cost slope step-by-step.
 */
export interface CrashPoint {
  duration: number;
  directCost: number;
  indirectCost: number;
  totalCost: number;
  crashedActivities: { [key: string]: number }; // activity ID -> current crashed duration
}

export function generateCrashOptimizationCurve(
  project: Project
): CrashPoint[] {
  const points: CrashPoint[] = [];
  const activities = project.activities.map(a => ({ ...a }));
  const indirectCostPerDay = project.indirectCostPerDay;

  // Let's compute cost slope for each activity
  const slopes: { [key: string]: number } = {};
  activities.forEach(act => {
    const timeDiff = act.normalDuration - act.crashDuration;
    if (timeDiff > 0) {
      slopes[act.id] = (act.crashCost - act.normalCost) / timeDiff;
    } else {
      slopes[act.id] = Infinity; // Cannot be crashed
    }
  });

  // Initialize activity durations to normal duration
  activities.forEach(act => {
    act.duration = act.normalDuration;
  });

  // Calculate base direct cost
  const getDirectCost = (acts: Activity[]) => {
    return acts.reduce((sum, act) => {
      const crashedDays = act.normalDuration - act.duration;
      const slope = slopes[act.id];
      const additionalCost = slope !== Infinity && crashedDays > 0 ? slope * crashedDays : 0;
      return sum + act.normalCost + additionalCost;
    }, 0);
  };

  // Step-by-step crash simulator
  let iteration = 0;
  const maxIterations = 100; // safety brake

  while (iteration < maxIterations) {
    const { results, criticalPath, totalDuration, hasCycle } = calculateCPM(activities);
    if (hasCycle || criticalPath.length === 0) break;

    const directCost = getDirectCost(activities);
    const indirectCost = totalDuration * indirectCostPerDay;
    const totalCost = directCost + indirectCost;

    // Record this point
    const crashedActivities: { [key: string]: number } = {};
    activities.forEach(act => {
      crashedActivities[act.id] = act.duration;
    });

    // Check if we already have this duration recorded, keep the one with lower cost
    const existingIndex = points.findIndex(p => p.duration === totalDuration);
    if (existingIndex !== -1) {
      if (points[existingIndex].totalCost > totalCost) {
        points[existingIndex] = { duration: totalDuration, directCost, indirectCost, totalCost, crashedActivities };
      }
    } else {
      points.push({ duration: totalDuration, directCost, indirectCost, totalCost, crashedActivities });
    }

    // Find critical activities that can still be crashed
    const crashableCriticalActivities = activities.filter(act => {
      const cpmInfo = results.get(act.id);
      const isCritical = cpmInfo?.isCritical || false;
      const canCrash = act.duration > act.crashDuration;
      return isCritical && canCrash;
    });

    if (crashableCriticalActivities.length === 0) {
      // No more crashing possible
      break;
    }

    // Find the one with the lowest slope
    let cheapestActivity = crashableCriticalActivities[0];
    let minSlope = slopes[cheapestActivity.id];

    crashableCriticalActivities.forEach(act => {
      const slope = slopes[act.id];
      if (slope < minSlope) {
        minSlope = slope;
        cheapestActivity = act;
      }
    });

    if (minSlope === Infinity) {
      break;
    }

    // Crash it by 1 day
    cheapestActivity.duration -= 1;
    iteration++;
  }

  // Sort points by duration ascending (i.e. left to right on chart)
  points.sort((a, b) => a.duration - b.duration);

  return points;
}
