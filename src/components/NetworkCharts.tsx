/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { CPMResult, Activity, Project, ProjectSummary } from '../types';
import { AONNode } from './AONNode';
import { CrashPoint, calculateCPM } from '../utils/cpm';

interface NetworkChartsProps {
  project: Project;
  cpmResults: Map<string, CPMResult>;
  criticalPath: string[];
  totalDuration: number;
  crashPoints: CrashPoint[];
  currentCrashedDuration: number;
  onActivitySelect?: (id: string) => void;
  selectedActivityId?: string;
  activeTab: 'aon' | 'aoa' | 'gantt' | 'cost';
  scale?: number;
  sandboxActive?: boolean;
  originalActivities?: Activity[];
}

export const NetworkCharts: React.FC<NetworkChartsProps> = ({
  project,
  cpmResults,
  criticalPath,
  totalDuration,
  crashPoints,
  currentCrashedDuration,
  onActivitySelect,
  selectedActivityId,
  activeTab,
  scale = 1.0,
  sandboxActive = false,
  originalActivities = []
}) => {
  // --- STATE FOR ADVANCED VISUAL FEATURES ---
  const [elasticEnabled, setElasticEnabled] = React.useState(true);
  const [highlightChainEnabled, setHighlightChainEnabled] = React.useState(true);
  const [hoveredConnIdx, setHoveredConnIdx] = React.useState<number | null>(null);

  // --- LOGICAL CHAIN COMPUTATION ---
  const logicalChain = useMemo(() => {
    if (!selectedActivityId || !highlightChainEnabled) return null;
    
    const ancestors = new Set<string>();
    const descendants = new Set<string>();

    const findAncestors = (id: string) => {
      const act = project.activities.find(a => a.id === id);
      if (!act) return;
      act.predecessors.forEach(predId => {
        if (!ancestors.has(predId)) {
          ancestors.add(predId);
          findAncestors(predId);
        }
      });
    };

    const findDescendants = (id: string) => {
      project.activities.forEach(act => {
        if (act.predecessors.includes(id)) {
          if (!descendants.has(act.id)) {
            descendants.add(act.id);
            findDescendants(act.id);
          }
        }
      });
    };

    findAncestors(selectedActivityId);
    findDescendants(selectedActivityId);

    return { ancestors, descendants, activeId: selectedActivityId };
  }, [selectedActivityId, project.activities, highlightChainEnabled]);

  // --- 1. AON NETWORK LAYOUT COMPUTATION ---
  const aonLayout = useMemo(() => {
    const resultsArray = Array.from(cpmResults.values()) as CPMResult[];
    if (resultsArray.length === 0) return { columns: [], connections: [], positions: {} };

    // Group activities by ES (Earliest Start) to define columns
    const esGroups: { [key: number]: CPMResult[] } = {};
    resultsArray.forEach(res => {
      const es = res.es;
      if (!esGroups[es]) {
        esGroups[es] = [];
      }
      esGroups[es].push(res);
    });

    // Sort ES levels
    const sortedES = Object.keys(esGroups)
      .map(Number)
      .sort((a, b) => a - b);

    // Map each ES to a column index
    const esToColIdx: { [key: number]: number } = {};
    sortedES.forEach((es, idx) => {
      esToColIdx[es] = idx;
    });

    // Calculate absolute X, Y for each node
    // Node card width: 256px, height: 120px
    const cardWidth = 256;
    const cardHeight = 120;
    const colGap = 120; // horizontal separation
    const rowGap = 50;  // vertical separation

    const nodePositions: { [id: string]: { x: number; y: number } } = {};
    const columns: { es: number; tasks: CPMResult[] }[] = [];

    sortedES.forEach((es, colIdx) => {
      const tasks = esGroups[es];
      columns.push({ es, tasks });

      // Sort tasks in column to maintain stable vertical positioning
      tasks.sort((a, b) => a.id.localeCompare(b.id));

      tasks.forEach((task, rowIdx) => {
        const x = colIdx * (cardWidth + colGap) + 40;
        const y = rowIdx * (cardHeight + rowGap) + 60;
        nodePositions[task.id] = { x, y };
      });
    });

    // Generate connections between nodes
    const connections: {
      fromId: string;
      toId: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      isCritical: boolean;
      isAncestorFlow: boolean;
      isDescendantFlow: boolean;
    }[] = [];

    project.activities.forEach(act => {
      const toPos = nodePositions[act.id];
      if (!toPos) return;

      act.predecessors.forEach(predId => {
        const fromPos = nodePositions[predId];
        if (!fromPos) return;

        // Curve start: center-right of predecessor card
        const x1 = fromPos.x + cardWidth;
        const y1 = fromPos.y + 60; // 120/2

        // Curve end: center-left of successor card
        const x2 = toPos.x;
        const y2 = toPos.y + 60;

        const fromCpm = cpmResults.get(predId);
        const toCpm = cpmResults.get(act.id);
        const isCritical = (fromCpm?.isCritical && toCpm?.isCritical) || false;

        // Trace active relationships for Highlight Chain
        let isAncestorFlow = false;
        let isDescendantFlow = false;
        if (logicalChain) {
          const { ancestors, descendants, activeId } = logicalChain;
          if (
            (ancestors.has(predId) && ancestors.has(act.id)) ||
            (ancestors.has(predId) && act.id === activeId)
          ) {
            isAncestorFlow = true;
          }
          if (
            (descendants.has(act.id) && descendants.has(predId)) ||
            (predId === activeId && descendants.has(act.id))
          ) {
            isDescendantFlow = true;
          }
        }

        connections.push({
          fromId: predId,
          toId: act.id,
          x1,
          y1,
          x2,
          y2,
          isCritical,
          isAncestorFlow,
          isDescendantFlow
        });
      });
    });

    return { columns, connections, positions: nodePositions };
  }, [cpmResults, project.activities, logicalChain]);

  // --- 2. AOA TIME-SCALED DIAGRAM COMPUTATION ---
  const aoaData = useMemo(() => {
    // AOA represents events as circles, and activities as arrows along a timeline
    // Horizontal scale: 1 day = 30px
    const dayScale = 30;
    const resultsArray = Array.from(cpmResults.values()) as CPMResult[];
    if (resultsArray.length === 0) return { activities: [], timelineWidth: 600, height: 400 };

    // Arrange activities vertically to avoid overlaps
    const rows: string[][] = [];
    resultsArray.forEach(res => {
      // Find the first row where this task doesn't overlap existing ones
      let rowIndex = 0;
      while (true) {
        if (!rows[rowIndex]) {
          rows[rowIndex] = [];
        }
        // Check overlap: does any task in this row overlap with current [es, lf]?
        const overlaps = rows[rowIndex].some(id => {
          const r = cpmResults.get(id)!;
          // overlaps if [r.es, r.lf] intersects with [res.es, res.lf]
          return !(res.lf <= r.es || res.es >= r.lf);
        });

        if (!overlaps) {
          rows[rowIndex].push(res.id);
          break;
        }
        rowIndex++;
      }
    });

    const timelineWidth = Math.max((totalDuration + 2) * dayScale, 800);
    const rowHeight = 70;
    const height = Math.max((rows.length + 1) * rowHeight + 100, 300);

    // Compute lines and node coordinates
    const aoaActivities = resultsArray.map(res => {
      // Find row index
      const rowIdx = rows.findIndex(r => r.includes(res.id));
      const y = (rowIdx + 1) * rowHeight + 20;

      const xStart = res.es * dayScale + 60;
      const xEnd = res.ef * dayScale + 60;
      const xFloatEnd = res.lf * dayScale + 60;

      return {
        id: res.id,
        name: res.name,
        duration: res.duration,
        es: res.es,
        ef: res.ef,
        ls: res.ls,
        lf: res.lf,
        tf: res.tf,
        ff: res.ff,
        isCritical: res.isCritical,
        xStart,
        xEnd,
        xFloatEnd,
        y,
        hasFloat: res.tf > 0
      };
    });

    return {
      activities: aoaActivities,
      timelineWidth,
      height
    };
  }, [cpmResults, totalDuration]);

  // Original CPM results (for What-If simulation comparisons)
  const originalCpmResults = useMemo(() => {
    if (sandboxActive && originalActivities && originalActivities.length > 0) {
      try {
        const { results } = calculateCPM(originalActivities);
        return results;
      } catch (err) {
        console.error('Failed to calculate original CPM in Gantt:', err);
      }
    }
    return null;
  }, [sandboxActive, originalActivities]);

  // Click handler to select and scroll smoothly to detailed parameters
  const handleSelectAndScroll = (id: string) => {
    onActivitySelect?.(id);
    setTimeout(() => {
      const el = document.getElementById('selected-activity-detail');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
  };

  // --- 3. GANTT CHART COMPUTATION ---
  const ganttData = useMemo(() => {
    const dayScale = 25; // 25px per day
    const rowHeight = 45;
    const resultsArray = Array.from(cpmResults.values()) as CPMResult[];

    // Sort to keep consistent order (critical path on top is nice, or alphabet)
    const sorted = [...resultsArray].sort((a, b) => {
      if (a.isCritical && !b.isCritical) return -1;
      if (!a.isCritical && b.isCritical) return 1;
      return a.id.localeCompare(b.id);
    });

    const height = sorted.length * rowHeight + 80;
    const width = Math.max((totalDuration + 2) * dayScale + 180, 800);

    return {
      tasks: sorted,
      height,
      width,
      dayScale
    };
  }, [cpmResults, totalDuration]);

  // --- 4. COST-BENEFIT V-CURVE COMPUTATION ---
  const costCurveData = useMemo(() => {
    if (crashPoints.length === 0) return null;

    // Dimensions
    const width = 800;
    const height = 300;
    const padding = 50;

    const durations = crashPoints.map(p => p.duration);
    const minDur = Math.min(...durations);
    const maxDur = Math.max(...durations);

    const allCosts = crashPoints.flatMap(p => [p.directCost, p.indirectCost, p.totalCost]);
    const minCost = Math.min(...allCosts) * 0.9; // add some padding below
    const maxCost = Math.max(...allCosts) * 1.05;

    const xScale = (dur: number) => {
      if (maxDur === minDur) return padding + (width - padding * 2) / 2;
      // We want shorter duration on left, longer on right
      return padding + ((dur - minDur) / (maxDur - minDur)) * (width - padding * 2);
    };

    const yScale = (cost: number) => {
      if (maxCost === minCost) return height / 2;
      return height - padding - ((cost - minCost) / (maxCost - minCost)) * (height - padding * 2);
    };

    // Find closest point to current crashed duration
    let activePoint = crashPoints.find(p => p.duration === currentCrashedDuration);
    if (!activePoint && crashPoints.length > 0) {
      // fallback to closest
      activePoint = crashPoints.reduce((prev, curr) => 
        Math.abs(curr.duration - currentCrashedDuration) < Math.abs(prev.duration - currentCrashedDuration) ? curr : prev
      );
    }

    // Generate path points
    const directPath = crashPoints.map(p => `${xScale(p.duration)},${yScale(p.directCost)}`).join(' L ');
    const indirectPath = crashPoints.map(p => `${xScale(p.duration)},${yScale(p.indirectCost)}`).join(' L ');
    const totalPath = crashPoints.map(p => `${xScale(p.duration)},${yScale(p.totalCost)}`).join(' L ');

    return {
      width,
      height,
      padding,
      minDur,
      maxDur,
      minCost,
      maxCost,
      xScale,
      yScale,
      directPath: directPath ? 'M ' + directPath : '',
      indirectPath: indirectPath ? 'M ' + indirectPath : '',
      totalPath: totalPath ? 'M ' + totalPath : '',
      activePoint,
      points: crashPoints
    };
  }, [crashPoints, currentCrashedDuration]);

  return (
    <div className="w-full bg-slate-50/50 p-1 rounded-xl border border-slate-100">
      {/* 1. SINGLE-NODE NETWORK DIAGRAM (AON) */}
      {activeTab === 'aon' && (
        <div className="relative w-full overflow-auto max-h-[580px] border border-slate-200 bg-white rounded-xl shadow-sm p-5 min-h-[450px] dot-grid">
          {/* Controls Toolbar for Elastic connections & Logical chain highlighting */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 px-2">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800">单代号网络图 (AON) 智能可视化引擎</span>
              <span className="text-[10px] text-slate-500 mt-0.5">点击任意工序卡片，即可高亮展示其完整的上下游逻辑链关系</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Elastic Connection Toggle */}
              <button
                type="button"
                onClick={() => setElasticEnabled(!elasticEnabled)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer select-none ${
                  elasticEnabled
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${elasticEnabled ? 'bg-indigo-600 animate-pulse' : 'bg-slate-400'}`} />
                <span>智能弹性连线</span>
              </button>

              {/* Logical Chain Highlight Toggle */}
              <button
                type="button"
                onClick={() => setHighlightChainEnabled(!highlightChainEnabled)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer select-none ${
                  highlightChainEnabled
                    ? 'bg-cyan-50 border-cyan-200 text-cyan-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${highlightChainEnabled ? 'bg-cyan-600 animate-pulse' : 'bg-slate-400'}`} />
                <span>逻辑链高亮聚焦</span>
              </button>

              {/* Status Indicator Legend */}
              {selectedActivityId && highlightChainEnabled && (
                <button
                  type="button"
                  onClick={() => onActivitySelect?.('')}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-[10px] font-bold rounded-lg cursor-pointer select-none"
                >
                  清除聚焦
                </button>
              )}
            </div>
          </div>

          {/* Relationship Legend in Highlighting Mode */}
          {selectedActivityId && highlightChainEnabled && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2 mb-4 text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-150 rounded-xl">
              <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                <span className="h-1.5 w-1.5 bg-indigo-600 rounded-full" /> 当前选择: <strong className="font-bold">{selectedActivityId}</strong>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-5 bg-cyan-500 block rounded" /> Cyan 亮蓝流动: 紧前工序关系链 (Upstream Ancestors)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-5 bg-fuchsia-500 block rounded" /> Fuchsia 霓虹流动: 紧后工序关系链 (Downstream Descendants)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-5 border-b border-dashed border-slate-300 block opacity-55" /> 灰虚线: 无关联工序 (已淡化)
              </span>
            </div>
          )}

          <div
            style={{
              width: `${Math.max(aonLayout.columns.length * 370 + 200, 1000) * scale}px`,
              height: `${650 * scale}px`,
              overflow: 'visible'
            }}
            className="relative"
          >
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                width: `${Math.max(aonLayout.columns.length * 370 + 200, 1000)}px`,
                height: '650px',
              }}
              className="relative transition-transform duration-150 ease-out"
            >
              {/* SVG Connection Lines */}
              <svg
                className="absolute top-0 left-0"
                width={Math.max(aonLayout.columns.length * 370 + 200, 1000)}
                height={650}
                style={{ overflow: 'visible' }}
              >
                <style>{`
                  @keyframes flow-cyan {
                    to {
                      stroke-dashoffset: -12;
                    }
                  }
                  @keyframes flow-fuchsia {
                    to {
                      stroke-dashoffset: -12;
                    }
                  }
                  @keyframes pulse-glow {
                    0%, 100% { filter: drop-shadow(0 0 1px rgba(6, 182, 212, 0.4)); }
                    50% { filter: drop-shadow(0 0 4px rgba(6, 182, 212, 0.8)); }
                  }
                  @keyframes pulse-glow-fuchsia {
                    0%, 100% { filter: drop-shadow(0 0 1px rgba(217, 70, 239, 0.4)); }
                    50% { filter: drop-shadow(0 0 4px rgba(217, 70, 239, 0.8)); }
                  }
                  .flow-active-cyan {
                    stroke-dasharray: 6, 6;
                    animation: flow-cyan 0.8s linear infinite, pulse-glow 2s ease-in-out infinite;
                  }
                  .flow-active-fuchsia {
                    stroke-dasharray: 6, 6;
                    animation: flow-fuchsia 0.8s linear infinite, pulse-glow-fuchsia 2s ease-in-out infinite;
                  }
                  .elastic-spring-path {
                    transition: d 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275), stroke-width 0.2s ease, stroke 0.2s ease, stroke-opacity 0.2s ease;
                  }
                `}</style>
                <defs>
                  <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
                  </marker>
                  <marker
                    id="arrow-critical"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#dc2626" />
                  </marker>
                  <marker
                    id="arrow-cyan"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#06b6d4" />
                  </marker>
                  <marker
                    id="arrow-fuchsia"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#d946ef" />
                  </marker>
                  <marker
                    id="arrow-dimmed"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#cbd5e1" />
                  </marker>
                </defs>

                {/* Draw connection lines */}
                {aonLayout.connections
                  .sort((a, b) => (a.isCritical ? 1 : -1))
                  .map((conn, idx) => {
                    const hasSelection = !!selectedActivityId && highlightChainEnabled;
                    const isActiveChain = conn.isAncestorFlow || conn.isDescendantFlow;
                    
                    // Determine stroke details
                    let strokeColor = '#94a3b8';
                    let markerEnd = 'url(#arrow)';
                    let strokeWidth = 1.5;
                    let strokeDasharray = '4,4';
                    let strokeOpacity = 1.0;
                    let animationClass = '';
                    
                    if (conn.isCritical) {
                      strokeColor = '#dc2626';
                      markerEnd = 'url(#arrow-critical)';
                      strokeWidth = 3;
                      strokeDasharray = 'none';
                    }
                    
                    if (hasSelection) {
                      if (conn.isAncestorFlow) {
                        strokeColor = '#06b6d4'; // Cyan for ancestors
                        markerEnd = 'url(#arrow-cyan)';
                        strokeWidth = 3.5;
                        strokeDasharray = 'none';
                        animationClass = 'flow-active-cyan';
                      } else if (conn.isDescendantFlow) {
                        strokeColor = '#d946ef'; // Fuchsia for descendants
                        markerEnd = 'url(#arrow-fuchsia)';
                        strokeWidth = 3.5;
                        strokeDasharray = 'none';
                        animationClass = 'flow-active-fuchsia';
                      } else {
                        // Dimmed lines
                        strokeColor = '#cbd5e1';
                        markerEnd = 'url(#arrow-dimmed)';
                        strokeWidth = 1.0;
                        strokeDasharray = '3,3';
                        strokeOpacity = 0.25;
                      }
                    } else if (conn.isCritical) {
                      animationClass = 'animate-dash';
                    }

                    // Compute path coordinates dynamically
                    const isHovered = hoveredConnIdx === idx;
                    let pathD;
                    if (isHovered && elasticEnabled) {
                      // Generate dynamic elastic bulge on mouse hover!
                      const midX = (conn.x1 + conn.x2) / 2;
                      const midY = (conn.y1 + conn.y2) / 2;
                      const dx = conn.x2 - conn.x1;
                      const dy = conn.y2 - conn.y1;
                      const len = Math.sqrt(dx * dx + dy * dy) || 1;
                      const nx = -dy / len;
                      const ny = dx / len;
                      
                      const bulgeSize = 25; // 25px elastic stretch bulge
                      const bx = midX + nx * bulgeSize;
                      const by = midY + ny * bulgeSize;
                      
                      pathD = `M ${conn.x1} ${conn.y1} Q ${bx} ${by}, ${conn.x2} ${conn.y2}`;
                    } else {
                      const controlX = (conn.x1 + conn.x2) / 2;
                      pathD = `M ${conn.x1} ${conn.y1} C ${controlX} ${conn.y1}, ${controlX} ${conn.y2}, ${conn.x2} ${conn.y2}`;
                    }

                    return (
                      <g 
                        key={`aon-conn-${idx}`}
                        className="pointer-events-auto"
                        onMouseEnter={() => setHoveredConnIdx(idx)}
                        onMouseLeave={() => setHoveredConnIdx(null)}
                      >
                        {/* Glow halo path under highlighted relationship line */}
                        {isActiveChain && (
                          <path
                            d={pathD}
                            fill="none"
                            stroke={conn.isAncestorFlow ? '#22d3ee' : '#f472b6'}
                            strokeWidth={strokeWidth + 5}
                            strokeOpacity={0.25}
                            className="pointer-events-none elastic-spring-path"
                          />
                        )}

                        {/* Standard critical glow halo */}
                        {!hasSelection && conn.isCritical && (
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#f87171"
                            strokeWidth={7}
                            strokeOpacity={0.2}
                            className="pointer-events-none elastic-spring-path"
                          />
                        )}

                        {/* Main Visible connection curve */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          strokeDasharray={strokeDasharray}
                          strokeOpacity={strokeOpacity}
                          markerEnd={markerEnd}
                          className={`elastic-spring-path ${animationClass}`}
                        />

                        {/* Thick transparent hit-box trigger path for easier hover/click interactions */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke="transparent"
                          strokeWidth={16}
                          className="cursor-help"
                          title={`逻辑关系: ${conn.fromId} ➔ ${conn.toId}`}
                          onClick={() => onActivitySelect?.(conn.toId)}
                        />
                      </g>
                    );
                  })}
              </svg>

              {/* HTML AON Cards Layer */}
              <div
                className="relative"
                style={{
                  width: Math.max(aonLayout.columns.length * 370 + 100, 1000),
                  height: 520,
                }}
              >
                {aonLayout.columns.flatMap(col =>
                  col.tasks.map(task => {
                    const pos = aonLayout.positions[task.id];
                    if (!pos) return null;
                    
                    // Trace active relationship states
                    const isSelected = selectedActivityId === task.id;
                    const isAncestor = logicalChain ? logicalChain.ancestors.has(task.id) : false;
                    const isDescendant = logicalChain ? logicalChain.descendants.has(task.id) : false;
                    
                    const isDimmed = highlightChainEnabled && selectedActivityId && !isSelected && !isAncestor && !isDescendant;

                    return (
                      <div
                        key={`aon-card-${task.id}`}
                        className="absolute"
                        style={{ left: pos.x, top: pos.y }}
                      >
                        <AONNode
                          task={task}
                          onClick={() => onActivitySelect?.(task.id)}
                          isSelected={isSelected}
                          isDimmed={isDimmed}
                          isAncestor={isAncestor}
                          isDescendant={isDescendant}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TIME-SCALED NETWORK DIAGRAM (AOA) */}
      {activeTab === 'aoa' && (
        <div className="relative w-full overflow-auto max-h-[580px] border border-slate-200 bg-white rounded-xl shadow-sm p-5 min-h-[450px] dot-grid">
          <div className="font-semibold text-xs text-slate-500 mb-2 px-2 flex justify-between items-center">
            <span>水平轴代表工期天数（时标网络图）</span>
            <span className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-6 bg-red-600 block"></span> 实线：工序工期 (关键路径猩红)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-6 border-b border-dashed border-slate-400 block"></span> 虚线波浪：总时差/自由时差
              </span>
            </span>
          </div>

          <div
            style={{
              width: `${aoaData.timelineWidth * scale}px`,
              height: `${aoaData.height * scale}px`,
              overflow: 'visible'
            }}
            className="relative"
          >
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                width: `${aoaData.timelineWidth}px`,
                height: `${aoaData.height}px`,
              }}
              className="relative transition-transform duration-150 ease-out"
            >
              <svg
                width={aoaData.timelineWidth}
                height={aoaData.height}
                className="bg-slate-50/10"
              >
                <defs>
                  <marker
                    id="aoa-arrow"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b" />
                  </marker>
                  <marker
                    id="aoa-arrow-critical"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#dc2626" />
                  </marker>
                  <marker
                    id="aoa-arrow-indigo"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#6366f1" />
                  </marker>
                  <marker
                    id="aoa-arrow-cyan"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#06b6d4" />
                  </marker>
                  <marker
                    id="aoa-arrow-fuchsia"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#d946ef" />
                  </marker>
                  {/* Pattern for wave float */}
                  <pattern
                    id="wavy"
                    width="10"
                    height="10"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 0,5 Q 2.5,2 5,5 T 10,5"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                    />
                  </pattern>
                </defs>

                {/* Timeline Background Grid */}
                {Array.from({ length: totalDuration + 2 }).map((_, i) => {
                  const x = i * 30 + 60;
                  return (
                    <g key={`grid-${i}`}>
                      <line
                        x1={x}
                        y1={40}
                        x2={x}
                        y2={aoaData.height - 40}
                        stroke="#f1f5f9"
                        strokeWidth={1}
                      />
                      {/* Timeline numeric markers */}
                      <text
                        x={x}
                        y={30}
                        textAnchor="middle"
                        className="text-[10px] font-mono font-bold fill-slate-400"
                      >
                        第{i}天
                      </text>
                    </g>
                  );
                })}

                {/* Draw activities arrows */}
                {aoaData.activities.map((act) => {
                  const isSelected = selectedActivityId === act.id;
                  const isAncestor = logicalChain ? logicalChain.ancestors.has(act.id) : false;
                  const isDescendant = logicalChain ? logicalChain.descendants.has(act.id) : false;
                  
                  const isDimmed = highlightChainEnabled && selectedActivityId && !isSelected && !isAncestor && !isDescendant;

                  // Determine colors & markers
                  let strokeColor = act.isCritical ? '#dc2626' : '#64748b';
                  let strokeWidth = act.isCritical ? 3.5 : 2;
                  let arrowMarker = act.isCritical ? 'url(#aoa-arrow-critical)' : 'url(#aoa-arrow)';
                  let animationClass = act.isCritical ? 'animate-pulse-crimson' : '';

                  if (highlightChainEnabled && selectedActivityId) {
                    if (isSelected) {
                      strokeColor = '#6366f1'; // Indigo for selection
                      arrowMarker = 'url(#aoa-arrow-indigo)';
                      strokeWidth = 4;
                    } else if (isAncestor) {
                      strokeColor = '#06b6d4'; // Cyan for ancestor
                      arrowMarker = 'url(#aoa-arrow-cyan)';
                      strokeWidth = 3.5;
                    } else if (isDescendant) {
                      strokeColor = '#d946ef'; // Fuchsia for descendant
                      arrowMarker = 'url(#aoa-arrow-fuchsia)';
                      strokeWidth = 3.5;
                    }
                  }

                  return (
                    <g
                      key={`aoa-act-${act.id}`}
                      className={`cursor-pointer transition-all duration-300 ${isDimmed ? 'opacity-20 hover:opacity-100' : 'opacity-100'}`}
                      onClick={() => onActivitySelect?.(act.id)}
                    >
                      {/* Highlighted halo on selected node / relatives */}
                      {(isSelected || isAncestor || isDescendant) && (
                        <line
                          x1={act.xStart}
                          y1={act.y}
                          x2={act.xEnd}
                          y2={act.y}
                          stroke={isSelected ? '#c7d2fe' : isAncestor ? '#a5f3fc' : '#fbcfe8'}
                          strokeWidth={strokeWidth + 6}
                          strokeOpacity={0.4}
                          className="pointer-events-none"
                        />
                      )}

                      {/* Arrow shaft */}
                      <line
                        x1={act.xStart}
                        y1={act.y}
                        x2={act.xEnd}
                        y2={act.y}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        markerEnd={arrowMarker}
                        className={animationClass}
                      />

                      {/* Activity text labels */}
                      <rect
                        x={(act.xStart + act.xEnd) / 2 - 25}
                        y={act.y - 18}
                        width={50}
                        height={14}
                        rx={3}
                        fill={isSelected ? '#eef2ff' : isAncestor ? '#ecfeff' : isDescendant ? '#fdf4ff' : act.isCritical ? '#fef2f2' : '#f8fafc'}
                        stroke={isSelected ? '#c7d2fe' : isAncestor ? '#a5f3fc' : isDescendant ? '#f5d0fe' : act.isCritical ? '#fee2e2' : '#e2e8f0'}
                        strokeWidth={1}
                      />
                      <text
                        x={(act.xStart + act.xEnd) / 2}
                        y={act.y - 8}
                        textAnchor="middle"
                        className={`text-[9px] font-bold ${
                          isSelected ? 'fill-indigo-700' : isAncestor ? 'fill-cyan-700' : isDescendant ? 'fill-fuchsia-700' : act.isCritical ? 'fill-red-700' : 'fill-slate-600'
                        }`}
                      >
                        {act.id} ({act.duration}d)
                      </text>

                      {/* Task name under line */}
                      <text
                        x={(act.xStart + act.xEnd) / 2}
                        y={act.y + 14}
                        textAnchor="middle"
                        className={`text-[10px] ${
                          isSelected ? 'font-black fill-indigo-700' : isAncestor ? 'font-bold fill-cyan-600' : isDescendant ? 'font-bold fill-fuchsia-600' : 'fill-slate-400'
                        }`}
                      >
                        {act.name}
                      </text>

                      {/* Total float wave/dashed line */}
                      {act.hasFloat && (
                        <g className={isDimmed ? 'opacity-30' : 'opacity-100'}>
                          <line
                            x1={act.xEnd}
                            y1={act.y}
                            x2={act.xFloatEnd}
                            y2={act.y}
                            stroke="#94a3b8"
                            strokeWidth={1.5}
                            strokeDasharray="3,3"
                          />
                          {/* Wave icon above float */}
                          <path
                            d={`M ${act.xEnd} ${act.y - 4} Q ${(act.xEnd + act.xFloatEnd) / 2} ${act.y - 12} ${act.xFloatEnd} ${act.y - 4}`}
                            fill="none"
                            stroke="#a5b4fc"
                            strokeWidth={1.5}
                            strokeDasharray="2,2"
                          />
                          <text
                            x={(act.xEnd + act.xFloatEnd) / 2}
                            y={act.y - 13}
                            textAnchor="middle"
                            className="text-[9px] fill-indigo-500 font-bold"
                          >
                            时差: {act.tf}天
                          </text>
                        </g>
                      )}

                      {/* Event Nodes (Circle milestones at the endpoints) */}
                      <circle
                        cx={act.xStart}
                        cy={act.y}
                        r={6}
                        fill={isSelected ? '#6366f1' : isAncestor ? '#06b6d4' : isDescendant ? '#d946ef' : act.isCritical ? '#dc2626' : '#cbd5e1'}
                        className={act.isCritical ? 'animate-pulse' : ''}
                      />
                      <circle
                        cx={act.xEnd}
                        cy={act.y}
                        r={6}
                        fill={isSelected ? '#6366f1' : isAncestor ? '#06b6d4' : isDescendant ? '#d946ef' : act.isCritical ? '#dc2626' : '#cbd5e1'}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* 3. GANTT CHART */}
      {activeTab === 'gantt' && (
        <div className="relative w-full overflow-auto max-h-[580px] border border-slate-200 bg-white rounded-xl shadow-sm p-5 min-h-[450px] dot-grid">
          <div className="font-semibold text-xs text-slate-500 mb-4 px-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <span>甘特图：直观展示并行工序、时差缓冲、关键里程碑及沙盘模拟</span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-medium text-slate-500">
              {sandboxActive && (
                <>
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3 bg-slate-200 border border-dashed border-slate-300 rounded"></span> 原计划工期
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3 bg-orange-500 rounded"></span> 突发直接延迟
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3 bg-amber-500 rounded"></span> 连锁影响偏移
                  </span>
                </>
              )}
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 bg-red-600 rounded"></span> 关键工序
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 bg-slate-400 rounded"></span> 普通工序
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1 w-5 border-b-2 border-dashed border-indigo-400"></span> 时差自由空间
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 bg-rose-600 rotate-45 border border-white relative top-[-1px]"><span className="absolute w-1 h-1 bg-amber-300 rounded-full top-[3px] left-[3px]" /></span> 关键里程碑 (◆)
              </span>
            </div>
          </div>

          <div
            style={{
              width: `${ganttData.width * scale}px`,
              height: `${ganttData.height * scale}px`,
              overflow: 'visible'
            }}
            className="relative"
          >
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                width: `${ganttData.width}px`,
                height: `${ganttData.height}px`,
              }}
              className="relative transition-transform duration-150 ease-out"
            >
              <div className="min-w-[800px]">
                {/* Timeline header */}
                <div className="flex border-b border-slate-100 pb-2 mb-2">
                  <div className="w-44 font-bold text-xs text-slate-500 uppercase">工序名称</div>
                  <div className="flex-1 flex relative h-6">
                    {Array.from({ length: totalDuration + 2 }).map((_, i) => (
                      <div
                        key={`gantt-day-${i}`}
                        className="absolute text-[10px] font-mono text-slate-400 text-center font-bold"
                        style={{
                          left: `${i * ganttData.dayScale}px`,
                          width: `${ganttData.dayScale}px`,
                        }}
                      >
                        {i}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gantt rows */}
                <div className="space-y-2.5">
                  {ganttData.tasks.map((task) => {
                    const isSelected = selectedActivityId === task.id;
                    const leftPos = task.es * ganttData.dayScale;
                    const widthPos = task.duration * ganttData.dayScale;
                    const floatWidth = task.tf * ganttData.dayScale;

                    const origTask = originalCpmResults?.get(task.id);
                    const origLeftPos = origTask ? origTask.es * ganttData.dayScale : leftPos;
                    const origWidthPos = origTask ? origTask.duration * ganttData.dayScale : widthPos;

                    return (
                      <div
                        key={`gantt-row-${task.id}`}
                        className={`flex items-center group py-1.5 rounded-lg transition-colors cursor-pointer ${
                          isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                        }`}
                        onClick={() => handleSelectAndScroll(task.id)}
                      >
                        {/* Task Title label */}
                        <div className="w-44 pr-3 flex items-center justify-between text-xs">
                          <span className={`font-semibold truncate ${
                            task.isCritical ? 'text-red-700' : 'text-slate-700'
                          }`}>
                            [{task.id}] {task.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {task.duration}天
                          </span>
                        </div>

                        {/* Timeline visualization */}
                        <div className="flex-1 relative h-6">
                          {/* Grid helper lines (subtle background ticks) */}
                          {Array.from({ length: totalDuration + 2 }).map((_, i) => (
                            <div
                              key={`row-grid-${task.id}-${i}`}
                              className="absolute top-0 bottom-0 border-l border-slate-100/60"
                              style={{ left: `${i * ganttData.dayScale}px` }}
                            ></div>
                          ))}

                          {/* Original baseline bar in sandbox mode */}
                          {sandboxActive && origTask && (
                            <div
                              style={{ left: `${origLeftPos}px`, width: `${origWidthPos}px` }}
                              className="absolute top-1 h-4 rounded bg-slate-100 border border-dashed border-slate-300 flex items-center px-1.5 text-[9px] text-slate-400 font-normal select-none pointer-events-none opacity-85 z-0"
                              title={`原计划工期: ${origTask.duration}天 (第${origTask.es}天 至 第${origTask.ef}天)`}
                            >
                              <span className="truncate opacity-50">[原] {task.name} ({origTask.duration}天)</span>
                            </div>
                          )}

                          {/* Floating bar (foreground) */}
                          <div
                            style={{ left: `${leftPos}px`, width: `${widthPos}px` }}
                            className={`absolute rounded shadow-sm flex items-center px-2 text-[9px] font-bold text-white transition-all duration-300 ${
                              sandboxActive && origTask
                                ? /* What-If Simulation Coloring */
                                  task.isCritical
                                  ? 'bg-rose-600 animate-pulse border-r-2 border-rose-700 h-3.5 top-1.5 z-10'
                                  : task.duration > origTask.duration
                                  ? 'bg-orange-500 hover:bg-orange-600 animate-pulse border-r-2 border-orange-600 h-3.5 top-1.5 z-10'
                                  : task.es > origTask.es
                                  ? 'bg-amber-500 hover:bg-amber-600 border-r-2 border-amber-650 h-3.5 top-1.5 z-10'
                                  : 'bg-indigo-500 hover:bg-indigo-600 h-3.5 top-1.5 z-10'
                                : /* Normal (No-Sandbox) Coloring */
                                  task.isCritical
                                  ? 'bg-red-600 animate-pulse-crimson border-r-2 border-red-700 h-5 top-0.5 z-10'
                                  : 'bg-slate-400 hover:bg-slate-500 h-5 top-0.5 z-10'
                            }`}
                          >
                            <span className="truncate">
                              {sandboxActive && origTask && task.duration > origTask.duration
                                ? `⚠️ 延迟 [${task.id}] (+${task.duration - origTask.duration}天)`
                                : sandboxActive && origTask && task.es > origTask.es
                                ? `↪️ 偏移 [${task.id}] (+${task.es - origTask.es}天)`
                                : task.name}
                            </span>
                          </div>

                          {/* Float/Wavy segment */}
                          {task.tf > 0 && (
                            <div
                              style={{
                                left: `${leftPos + widthPos}px`,
                                width: `${floatWidth}px`,
                              }}
                              className="absolute top-2.5 h-1 border-b-2 border-dashed border-indigo-400 flex items-center justify-center"
                            >
                              {/* Small label above float */}
                              <span className="absolute -top-4 text-[9px] text-indigo-500 font-bold bg-white px-1 border border-indigo-100 rounded">
                                +{task.tf}d 时差
                              </span>
                            </div>
                          )}

                          {/* Milestone Marker for Critical Tasks (Total Float = 0) */}
                          {task.isCritical && (
                            <div
                              className="absolute z-20 cursor-pointer group/milestone flex items-center justify-center transition-all hover:scale-125"
                              style={{
                                left: `${(task.es + task.duration) * ganttData.dayScale - 10}px`,
                                top: sandboxActive ? '4px' : '0px',
                              }}
                              onClick={(e) => {
                                e.stopPropagation(); // prevent duplicate triggering
                                handleSelectAndScroll(task.id);
                              }}
                              title={`点击跳转至关键工序 [${task.id}] 详细参数面板`}
                            >
                              {/* Ripple effect */}
                              <div className="absolute w-5 h-5 rounded-full bg-rose-500/30 animate-ping pointer-events-none" />
                              
                              {/* Diamond Milestone icon */}
                              <div className="w-5 h-5 bg-rose-600 hover:bg-rose-700 border-2 border-white rotate-45 flex items-center justify-center shadow-md transform">
                                {/* Yellow center */}
                                <div className="w-2 h-2 bg-amber-300 rounded-full" />
                              </div>
                              
                              {/* Tooltip / Label */}
                              <div className="absolute left-1/2 -translate-x-1/2 -top-7 hidden group-hover/milestone:block bg-slate-900 text-white text-[10px] font-sans px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-30">
                                🚩 关键里程碑: {task.name} (第 {task.es + task.duration} 天)
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. COST-BENEFIT V-CURVE (CRASHING GRAPH) */}
      {activeTab === 'cost' && costCurveData && (
        <div className="w-full border border-slate-200 bg-white rounded-xl shadow-sm p-6 min-h-[450px] flex flex-col justify-between dot-grid">
          <div>
            <div className="flex justify-between items-center mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-800">工期-成本平衡分析 (赶工模拟 V 型曲线)</h4>
                <p className="text-xs text-slate-500">随着工期缩短，直接成本（赶工人工）上升，间接成本（管理费等）下降，总成本呈现 V 型曲线。</p>
              </div>
              <div className="text-right text-xs bg-indigo-50 border border-indigo-100 rounded-lg p-2 font-mono">
                <div>总成本最低极值: <span className="font-bold text-indigo-600">{Math.min(...costCurveData.points.map(p => p.totalCost))} 万</span></div>
                <div>当前模拟成本: <span className="font-bold text-red-600">{costCurveData.activePoint?.totalCost} 万</span></div>
              </div>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="relative w-full flex justify-center py-2">
            <svg
              width={costCurveData.width}
              height={costCurveData.height}
              className="overflow-visible"
            >
              {/* Grid Lines */}
              {Array.from({ length: 5 }).map((_, i) => {
                const yVal = costCurveData.padding + (i * (costCurveData.height - costCurveData.padding * 2)) / 4;
                const costVal = Math.round(
                  costCurveData.maxCost - (i * (costCurveData.maxCost - costCurveData.minCost)) / 4
                );
                return (
                  <g key={`cost-grid-${i}`}>
                    <line
                      x1={costCurveData.padding}
                      y1={yVal}
                      x2={costCurveData.width - costCurveData.padding}
                      y2={yVal}
                      stroke="#f1f5f9"
                      strokeWidth={1}
                    />
                    <text
                      x={costCurveData.padding - 8}
                      y={yVal + 4}
                      textAnchor="end"
                      className="text-[9px] font-mono fill-slate-400"
                    >
                      {costVal}万
                    </text>
                  </g>
                );
              })}

              {/* X Axis Durations */}
              {costCurveData.points.map((p, idx) => {
                const xVal = costCurveData.xScale(p.duration);
                return (
                  <g key={`x-axis-${idx}`}>
                    <line
                      x1={xVal}
                      y1={costCurveData.height - costCurveData.padding}
                      x2={xVal}
                      y2={costCurveData.height - costCurveData.padding + 5}
                      stroke="#cbd5e1"
                    />
                    <text
                      x={xVal}
                      y={costCurveData.height - costCurveData.padding + 16}
                      textAnchor="middle"
                      className="text-[9px] font-mono font-bold fill-slate-500"
                    >
                      {p.duration}天
                    </text>
                  </g>
                );
              })}

              {/* Curves */}
              {/* 1. Direct Cost Curve (Slate) */}
              <path
                d={costCurveData.directPath}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="4,4"
              />
              {/* 2. Indirect Cost Curve (Light Indigo) */}
              <path
                d={costCurveData.indirectPath}
                fill="none"
                stroke="#a5b4fc"
                strokeWidth={2}
                strokeDasharray="4,4"
              />
              {/* 3. Total Cost Curve (Deep Royal Blue) */}
              <path
                d={costCurveData.totalPath}
                fill="none"
                stroke="#4338ca"
                strokeWidth={3.5}
                className="drop-shadow"
              />

              {/* Interactive cursor line at current crashed duration */}
              {costCurveData.activePoint && (
                <g>
                  {/* Vertical line pointer */}
                  <line
                    x1={costCurveData.xScale(costCurveData.activePoint.duration)}
                    y1={costCurveData.padding}
                    x2={costCurveData.xScale(costCurveData.activePoint.duration)}
                    y2={costCurveData.height - costCurveData.padding}
                    stroke="#dc2626"
                    strokeWidth={1.5}
                    strokeDasharray="2,2"
                  />

                  {/* Circle on Total Cost */}
                  <circle
                    cx={costCurveData.xScale(costCurveData.activePoint.duration)}
                    cy={costCurveData.yScale(costCurveData.activePoint.totalCost)}
                    r={6}
                    fill="#dc2626"
                    stroke="#ffffff"
                    strokeWidth={2}
                    className="animate-pulse"
                  />
                  {/* Circle label */}
                  <rect
                    x={costCurveData.xScale(costCurveData.activePoint.duration) - 45}
                    y={costCurveData.yScale(costCurveData.activePoint.totalCost) - 28}
                    width={90}
                    height={20}
                    rx={4}
                    fill="#dc2626"
                    stroke="#ffffff"
                    strokeWidth={1}
                  />
                  <text
                    x={costCurveData.xScale(costCurveData.activePoint.duration)}
                    y={costCurveData.yScale(costCurveData.activePoint.totalCost) - 15}
                    textAnchor="middle"
                    className="text-[9px] font-bold fill-white"
                  >
                    总成本: {costCurveData.activePoint.totalCost}万
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Legends */}
          <div className="flex justify-center gap-6 text-[10px] text-slate-500 font-semibold border-t border-slate-100 pt-3">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-6 border-b-2 border-dashed border-slate-400 block"></span>
              直接赶工成本 (人工与设备崩溃费用)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-6 border-b-2 border-dashed border-indigo-300 block"></span>
              间接延工损失 (项目管理费及机会成本)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-6 border-b-2 border-indigo-700 block"></span>
              项目总成本 (直接成本 + 间接成本 V型曲线)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
