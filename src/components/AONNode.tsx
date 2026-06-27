/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CPMResult } from '../types';

interface AONNodeProps {
  task: CPMResult;
  onClick?: () => void;
  isSelected?: boolean;
  isDimmed?: boolean;
  isAncestor?: boolean;
  isDescendant?: boolean;
}

export const AONNode: React.FC<AONNodeProps> = ({
  task,
  onClick,
  isSelected,
  isDimmed = false,
  isAncestor = false,
  isDescendant = false
}) => {
  const { id, name, duration, es, ef, ls, lf, tf, isCritical } = task;

  let borderStyle = 'border-slate-250 hover:border-indigo-400 shadow-sm';
  if (isSelected) {
    borderStyle = 'border-indigo-600 ring-4 ring-indigo-500/20 shadow-md z-20 scale-[1.01]';
  } else if (isAncestor) {
    borderStyle = 'border-cyan-500 ring-4 ring-cyan-400/25 shadow-md z-10';
  } else if (isDescendant) {
    borderStyle = 'border-fuchsia-500 ring-4 ring-fuchsia-400/25 shadow-md z-10';
  } else if (isCritical) {
    borderStyle = 'border-red-500 ring-4 ring-red-500/10 shadow-md animate-pulse-crimson';
  }

  const opacityClass = isDimmed 
    ? 'opacity-35 hover:opacity-100 transition-opacity duration-350 filter grayscale-[20%]' 
    : 'opacity-100 transition-all duration-350';

  return (
    <div
      onClick={onClick}
      id={`aon-node-${id}`}
      className={`w-64 bg-white rounded-xl border-2 select-none cursor-pointer transform hover:-translate-y-1 hover:shadow-lg ${borderStyle} ${opacityClass}`}
    >
      {/* Node Header - ID and Critical path status */}
      <div
        className={`flex items-center justify-between px-3.5 py-2 rounded-t-xl text-[11px] font-bold border-b ${
          isSelected
            ? 'bg-indigo-50 text-indigo-800 border-indigo-100'
            : isAncestor
            ? 'bg-cyan-50 text-cyan-800 border-cyan-100'
            : isDescendant
            ? 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-100'
            : isCritical
            ? 'bg-red-50 text-red-700 border-red-100'
            : 'bg-slate-50 text-slate-600 border-slate-100'
        }`}
      >
        <span className="font-mono">工序 ID: {id} ({duration}天)</span>
        {isSelected ? (
          <span className="flex items-center gap-1 text-[9px] bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-700 font-bold">
            当前聚焦
          </span>
        ) : isAncestor ? (
          <span className="flex items-center gap-1 text-[9px] bg-cyan-100 px-1.5 py-0.5 rounded text-cyan-700 font-bold animate-pulse">
            前置关联
          </span>
        ) : isDescendant ? (
          <span className="flex items-center gap-1 text-[9px] bg-fuchsia-100 px-1.5 py-0.5 rounded text-fuchsia-700 font-bold animate-pulse">
            后置关联
          </span>
        ) : isCritical ? (
          <span className="flex items-center gap-1.5 text-[10px] bg-red-100/55 px-1.5 py-0.5 rounded text-red-600 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-ping"></span>
            CRITICAL
          </span>
        ) : null}
      </div>

      {/* Task Name Container */}
      <div className="p-3 bg-white text-center">
        <h4 className="text-[12px] font-bold text-slate-800 truncate" title={name}>
          {name}
        </h4>
      </div>

      {/* Six-Box (六格法) Visualization Grid with professional borders */}
      <div className="grid grid-cols-3 divide-x divide-slate-150 border-t border-slate-150 text-center text-[10px] font-mono text-slate-600">
        {/* Top Row: ES | DU | EF */}
        <div className="py-2 flex flex-col justify-center bg-slate-50/40">
          <span className="text-[9px] text-slate-400 font-sans font-semibold">ES</span>
          <b className="text-slate-800 text-xs mt-0.5">{es}</b>
        </div>
        <div className="py-2 flex flex-col justify-center bg-indigo-50/20 font-bold">
          <span className="text-[9px] text-indigo-400 font-sans font-semibold">DU</span>
          <b className="text-indigo-700 text-xs mt-0.5">{duration}</b>
        </div>
        <div className="py-2 flex flex-col justify-center bg-slate-50/40">
          <span className="text-[9px] text-slate-400 font-sans font-semibold">EF</span>
          <b className="text-slate-800 text-xs mt-0.5">{ef}</b>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-150 border-t border-slate-150 text-center text-[10px] font-mono text-slate-600">
        {/* Bottom Row: LS | TF | LF */}
        <div className="py-2 flex flex-col justify-center">
          <span className="text-[9px] text-slate-400 font-sans font-semibold">LS</span>
          <b className="text-slate-800 text-xs mt-0.5">{ls}</b>
        </div>
        <div className="py-2 flex flex-col justify-center bg-slate-50/20">
          <span className="text-[9px] text-slate-400 font-sans font-semibold">TF</span>
          <b className={`text-xs mt-0.5 font-bold ${tf === 0 ? 'text-red-600 italic' : 'text-slate-500'}`}>
            {tf}
          </b>
        </div>
        <div className="py-2 flex flex-col justify-center">
          <span className="text-[9px] text-slate-400 font-sans font-semibold">LF</span>
          <b className="text-slate-800 text-xs mt-0.5">{lf}</b>
        </div>
      </div>
    </div>
  );
};

