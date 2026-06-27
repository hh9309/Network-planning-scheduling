/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Activity {
  id: string; // E.g., "A", "B", "C"
  name: string; // E.g., "地基施工"
  
  // Duration properties
  duration: number; // Current active duration (can change based on crash or mode)
  normalDuration: number; // Normal duration in days
  
  // PERT 3-time estimate
  optimisticDays?: number; // a
  mostLikelyDays?: number; // m
  pessimisticDays?: number; // b
  
  // Costs for crashing
  normalCost: number; // In thousands of CNY
  crashCost: number; // In thousands of CNY
  crashDuration: number; // Min duration
  
  // Dependency relationships
  predecessors: string[]; // List of predecessor IDs
  
  // Resource requirements
  resourceType: string; // E.g., "电工", "泥瓦工", "机械师", "通用"
  resourceCount: number; // Number of workers needed per day
  
  // AI Risk annotations
  riskScore: 'low' | 'medium' | 'high';
  riskAnalysis: string;
  progress?: number; // Progress of the activity (0 to 100)
}

export interface CPMResult {
  id: string;
  name: string;
  duration: number;
  es: number; // Earliest Start
  ef: number; // Earliest Finish
  ls: number; // Latest Start
  lf: number; // Latest Finish
  tf: number; // Total Float (总时差)
  ff: number; // Free Float (自由时差)
  isCritical: boolean;
}

export interface PERTResult {
  expectedDuration: number; // Expected mean duration
  variance: number; // Variance (b-a)^2 / 36
  stdDev: number; // Standard deviation (b-a) / 6
}

export interface ProjectSummary {
  totalDuration: number;
  criticalPath: string[];
  normalCost: number;
  crashCost: number;
  currentCost: number; // sum of activity costs (with crash adjustment)
  optimalDuration: number;
  optimalCost: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sandboxMode?: boolean;
}

// A full project object
export interface Project {
  id: string;
  name: string;
  description: string;
  targetDuration: number; // User defined target, e.g. 24 days
  indirectCostPerDay: number; // In thousands of CNY per day (e.g. 2k/day)
  activities: Activity[];
}
