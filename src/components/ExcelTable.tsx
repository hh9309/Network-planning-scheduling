/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Activity } from '../types';
import { Plus, Trash2, FileSpreadsheet, PlusCircle, Check, HelpCircle, Loader2 } from 'lucide-react';

interface ExcelTableProps {
  activities: Activity[];
  onChange: (updated: Activity[]) => void;
  onSelectActivity?: (id: string) => void;
  selectedId?: string;
}

export const ExcelTable: React.FC<ExcelTableProps> = ({
  activities,
  onChange,
  onSelectActivity,
  selectedId
}) => {
  const [activeInputMode, setActiveInputMode] = useState<'sheet' | 'form'>('sheet');
  const [isPastingGuideOpen, setIsPastingGuideOpen] = useState(false);
  const [suggestionFieldId, setSuggestionFieldId] = useState<string | null>(null);

  // Form input state for single-activity adder
  const [formState, setFormState] = useState({
    id: '',
    name: '',
    duration: 5,
    optimisticDays: 3,
    mostLikelyDays: 5,
    pessimisticDays: 8,
    normalCost: 10,
    crashCost: 18,
    crashDuration: 3,
    predecessors: '',
    resourceType: '通用',
    resourceCount: 2
  });

  // Bulk paste handler
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    if (!text) return;

    // Parse Excel data (Rows separated by newlines, Columns by tabs)
    const rows = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    const newActivities: Activity[] = [];

    rows.forEach(row => {
      const cols = row.split('\t').map(c => c.trim());
      if (cols.length < 3) return; // Must have at least ID, Name, Duration

      const id = cols[0] || `T${Math.floor(Math.random() * 1000)}`;
      const name = cols[1] || '新贴入任务';
      const duration = parseInt(cols[2], 10) || 5;
      
      const a = cols[3] ? parseInt(cols[3], 10) : duration - 2;
      const m = cols[4] ? parseInt(cols[4], 10) : duration;
      const b = cols[5] ? parseInt(cols[5], 10) : duration + 3;

      const preds = cols[6] ? cols[6].split(',').map(s => s.trim()).filter(Boolean) : [];
      
      const normalCost = cols[7] ? parseFloat(cols[7]) : 15;
      const crashCost = cols[8] ? parseFloat(cols[8]) : 25;
      const crashDuration = cols[9] ? parseInt(cols[9], 10) : Math.max(1, duration - 2);

      const resType = cols[10] || '通用';
      const resCount = cols[11] ? parseInt(cols[11], 10) : 1;

      newActivities.push({
        id,
        name,
        duration,
        normalDuration: duration,
        optimisticDays: isNaN(a) ? undefined : a,
        mostLikelyDays: isNaN(m) ? undefined : m,
        pessimisticDays: isNaN(b) ? undefined : b,
        predecessors: preds,
        normalCost: isNaN(normalCost) ? 10 : normalCost,
        crashCost: isNaN(crashCost) ? 20 : crashCost,
        crashDuration: isNaN(crashDuration) ? 3 : crashDuration,
        resourceType: resType,
        resourceCount: isNaN(resCount) ? 2 : resCount,
        riskScore: 'low',
        riskAnalysis: '正在进行AI评估分析...'
      });
    });

    if (newActivities.length > 0) {
      // Merge pasted items with existing
      // Remove duplicates by ID, giving preference to the newly pasted items
      const merged = [...newActivities];
      activities.forEach(act => {
        if (!merged.some(m => m.id === act.id)) {
          merged.push(act);
        }
      });
      onChange(merged);
    }
  };

  // Change individual cells in the worksheet
  const handleCellChange = (id: string, field: keyof Activity, value: any) => {
    const updated = activities.map(act => {
      if (act.id === id) {
        const item = { ...act, [field]: value };
        // Sync normalDuration if duration is edited
        if (field === 'duration') {
          item.normalDuration = parseInt(value, 10) || 0;
        }
        return item;
      }
      return act;
    });
    onChange(updated);
  };

  // Quick deletion
  const handleDeleteRow = (id: string) => {
    const filtered = activities.filter(act => act.id !== id);
    // Also remove this task from any predecessor lists of other tasks
    const cleansed = filtered.map(act => ({
      ...act,
      predecessors: act.predecessors.filter(p => p !== id)
    }));
    onChange(cleansed);
  };

  // Quick adding from worksheet bottom
  const handleAddNewRow = () => {
    const newId = String.fromCharCode(65 + activities.length) || `T${activities.length + 1}`;
    // prevent duplicates
    let finalId = newId;
    let i = 1;
    while (activities.some(a => a.id === finalId)) {
      finalId = `${newId}${i}`;
      i++;
    }

    const newAct: Activity = {
      id: finalId,
      name: `新工序 ${finalId}`,
      duration: 5,
      normalDuration: 5,
      optimisticDays: 3,
      mostLikelyDays: 5,
      pessimisticDays: 8,
      normalCost: 15,
      crashCost: 25,
      crashDuration: 3,
      predecessors: [],
      resourceType: '通用',
      resourceCount: 2,
      riskScore: 'low',
      riskAnalysis: '尚未进行风险分析'
    };
    onChange([...activities, newAct]);
    onSelectActivity?.(finalId);
  };

  // Submit single card form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.id) return;
    if (activities.some(a => a.id === formState.id)) {
      alert('工序 ID 已存在，请使用唯一的 ID。');
      return;
    }

    const preds = formState.predecessors
      ? formState.predecessors.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const newAct: Activity = {
      id: formState.id.toUpperCase(),
      name: formState.name || `工序 ${formState.id}`,
      duration: Number(formState.duration),
      normalDuration: Number(formState.duration),
      optimisticDays: Number(formState.optimisticDays),
      mostLikelyDays: Number(formState.mostLikelyDays),
      pessimisticDays: Number(formState.pessimisticDays),
      normalCost: Number(formState.normalCost),
      crashCost: Number(formState.crashCost),
      crashDuration: Number(formState.crashDuration),
      predecessors: preds,
      resourceType: formState.resourceType,
      resourceCount: Number(formState.resourceCount),
      riskScore: 'low',
      riskAnalysis: '已经加入计划，正在等待AI同步。'
    };

    onChange([...activities, newAct]);
    onSelectActivity?.(newAct.id);

    // Reset Form ID
    setFormState({
      id: '',
      name: '',
      duration: 5,
      optimisticDays: 3,
      mostLikelyDays: 5,
      pessimisticDays: 8,
      normalCost: 10,
      crashCost: 18,
      crashDuration: 3,
      predecessors: '',
      resourceType: '通用',
      resourceCount: 2
    });
  };

  // Direct association of predecessors (smart associate)
  const togglePredecessorInCell = (actId: string, predId: string) => {
    const act = activities.find(a => a.id === actId);
    if (!act) return;

    let newPreds = [...act.predecessors];
    if (newPreds.includes(predId)) {
      newPreds = newPreds.filter(p => p !== predId);
    } else {
      newPreds.push(predId);
    }

    handleCellChange(actId, 'predecessors', newPreds);
  };

  return (
    <div className="w-full bg-white border border-slate-150 rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* Tab Control */}
      <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-150">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveInputMode('sheet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeInputMode === 'sheet'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            高效工作表
          </button>
          <button
            onClick={() => setActiveInputMode('form')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeInputMode === 'form'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            工序表单录入
          </button>
        </div>

        <button
          onClick={() => setIsPastingGuideOpen(!isPastingGuideOpen)}
          className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          查看复制粘贴指南
        </button>
      </div>

      {/* Excel copy-paste tips */}
      {isPastingGuideOpen && (
        <div className="p-4 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-900 leading-relaxed">
          <div className="font-bold mb-1">📋 智能剪贴板指南 (直接支持 Excel 粘贴)</div>
          <p className="mb-2">
            您可以在 Excel 中选择活动区域并复制（Ctrl+C），然后在工作表中直接
            <span className="font-bold"> 鼠标右击或聚焦下方任意输入区 </span>粘贴（Ctrl+V），即可完成批量数据导入。
          </p>
          <div className="font-semibold text-indigo-700 font-mono mb-1">
            数据列顺序必须是：ID | 任务名称 | 工期 | 乐观时间 | 可能时间 | 悲观时间 | 紧前工序(半角逗号分隔) | 正常成本 | 赶工成本 | 赶工极限 | 资源工种 | 资源用量
          </div>
          <div className="text-[10px] text-indigo-600">
            示例行：D {"\t"} 核心系统研发 {"\t"} 10 {"\t"} 7 {"\t"} 10 {"\t"} 15 {"\t"} A {"\t"} 50 {"\t"} 80 {"\t"} 7 {"\t"} 软件工程师 {"\t"} 3
          </div>
        </div>
      )}

      {/* Mode 1: Excel Work Sheet */}
      {activeInputMode === 'sheet' && (
        <div
          className="overflow-auto max-h-[380px] p-2"
          onPaste={handlePaste}
        >
          <table className="w-full text-xs text-left border-collapse border border-slate-200 select-text">
            <thead className="bg-slate-100/80 text-slate-600 sticky top-0 uppercase text-[10px] tracking-wider font-bold">
              <tr className="divide-x divide-slate-200 border-b border-slate-200">
                <th className="px-2 py-2 text-center w-12">操作</th>
                <th className="px-2 py-2 text-center w-16">工序ID</th>
                <th className="px-3 py-2 min-w-[150px]">工序名称</th>
                <th className="px-2 py-2 text-center w-16">工期 (d)</th>
                <th className="px-2 py-2 text-center w-24">完成进度</th>
                <th className="px-2 py-2 text-center w-14">最乐观</th>
                <th className="px-2 py-2 text-center w-14">最可能</th>
                <th className="px-2 py-2 text-center w-14">最悲观</th>
                <th className="px-2 py-2 text-center min-w-[120px]">紧前工序</th>
                <th className="px-2 py-2 text-center w-20">正常成本(万)</th>
                <th className="px-2 py-2 text-center w-20">赶工成本(万)</th>
                <th className="px-2 py-2 text-center w-16">赶工极限</th>
                <th className="px-3 py-2 text-center w-24">工种资源</th>
                <th className="px-2 py-2 text-center w-14">人数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {activities.map((act) => {
                const isSelected = selectedId === act.id;
                return (
                  <tr
                    key={`row-${act.id}`}
                    onClick={() => onSelectActivity?.(act.id)}
                    className={`divide-x divide-slate-100 group transition-colors ${
                      isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/50'
                    }`}
                  >
                    {/* Delete button */}
                    <td className="p-1 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRow(act.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        title="删除此工序"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>

                    {/* ID */}
                    <td className="p-1">
                      <input
                        type="text"
                        value={act.id}
                        onChange={(e) => handleCellChange(act.id, 'id', e.target.value.toUpperCase())}
                        className="w-full text-center py-1 font-mono font-bold text-slate-800 bg-transparent border-0 ring-0 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded"
                      />
                    </td>

                    {/* Name */}
                    <td className="p-1">
                      <input
                        type="text"
                        value={act.name}
                        onChange={(e) => handleCellChange(act.id, 'name', e.target.value)}
                        className="w-full px-2 py-1 font-semibold text-slate-700 bg-transparent border-0 ring-0 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded"
                      />
                    </td>

                    {/* Duration */}
                    <td className="p-1">
                      <input
                        type="number"
                        min={1}
                        value={act.duration}
                        onChange={(e) => handleCellChange(act.id, 'duration', parseInt(e.target.value, 10) || 1)}
                        className="w-full text-center py-1 font-mono font-bold text-slate-800 bg-transparent border-0 ring-0 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded"
                      />
                    </td>

                    {/* Progress (%) */}
                    <td className="p-1">
                      <div className="flex flex-col gap-1 px-1.5 max-w-[84px] mx-auto">
                        <div className="flex items-center justify-center gap-0.5 bg-slate-50 border border-slate-200 rounded px-1 w-full">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={act.progress ?? 0}
                            onChange={(e) => {
                              let val = parseInt(e.target.value, 10);
                              if (isNaN(val)) val = 0;
                              val = Math.max(0, Math.min(100, val));
                              handleCellChange(act.id, 'progress', val);
                            }}
                            className="w-8 text-center py-0.5 font-mono text-xs font-bold text-slate-850 bg-transparent border-0 ring-0 focus:bg-white rounded"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">%</span>
                        </div>
                        {/* Elegant gradient progress bar */}
                        <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-600 transition-all duration-300"
                            style={{ width: `${act.progress ?? 0}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Optimistic (a) */}
                    <td className="p-1">
                      <input
                        type="number"
                        min={1}
                        value={act.optimisticDays ?? ''}
                        placeholder={`${act.duration - 2 > 0 ? act.duration - 2 : 1}`}
                        onChange={(e) => handleCellChange(act.id, 'optimisticDays', parseInt(e.target.value, 10) || undefined)}
                        className="w-full text-center py-1 font-mono text-slate-500 bg-transparent border-0 ring-0 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded"
                      />
                    </td>

                    {/* Most likely (m) */}
                    <td className="p-1">
                      <input
                        type="number"
                        min={1}
                        value={act.mostLikelyDays ?? ''}
                        placeholder={`${act.duration}`}
                        onChange={(e) => handleCellChange(act.id, 'mostLikelyDays', parseInt(e.target.value, 10) || undefined)}
                        className="w-full text-center py-1 font-mono text-slate-500 bg-transparent border-0 ring-0 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded"
                      />
                    </td>

                    {/* Pessimistic (b) */}
                    <td className="p-1">
                      <input
                        type="number"
                        min={1}
                        value={act.pessimisticDays ?? ''}
                        placeholder={`${act.duration + 3}`}
                        onChange={(e) => handleCellChange(act.id, 'pessimisticDays', parseInt(e.target.value, 10) || undefined)}
                        className="w-full text-center py-1 font-mono text-slate-500 bg-transparent border-0 ring-0 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded"
                      />
                    </td>

                    {/* Predecessors (Interactive list suggest) */}
                    <td className="p-1 relative">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          readOnly
                          onClick={() => setSuggestionFieldId(suggestionFieldId === act.id ? null : act.id)}
                          value={act.predecessors.join(', ')}
                          placeholder="选择紧前..."
                          className="w-full text-center py-1 font-mono font-semibold text-indigo-600 bg-indigo-50/45 cursor-pointer rounded border border-indigo-100 hover:bg-indigo-50 transition-colors"
                        />
                      </div>

                      {/* Dropdown list for quick suggest */}
                      {suggestionFieldId === act.id && (
                        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 shadow-lg rounded-md max-h-48 overflow-y-auto p-1.5 divide-y divide-slate-100">
                          <div className="text-[9px] text-slate-400 font-bold px-1.5 py-1 flex justify-between items-center">
                            <span>点击切换紧前关联:</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSuggestionFieldId(null);
                              }}
                              className="text-indigo-600 font-bold hover:underline"
                            >
                              关闭
                            </button>
                          </div>
                          {activities
                            .filter(other => other.id !== act.id)
                            .map(other => {
                              const isLinked = act.predecessors.includes(other.id);
                              return (
                                <div
                                  key={`pred-opt-${other.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePredecessorInCell(act.id, other.id);
                                  }}
                                  className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer transition-colors"
                                >
                                  <span className="font-bold font-mono text-slate-700">
                                    [{other.id}] <span className="font-normal font-sans text-slate-500">{other.name}</span>
                                  </span>
                                  {isLinked && <Check className="h-3 w-3 text-emerald-600 font-bold" />}
                                </div>
                              );
                            })}
                          {activities.length <= 1 && (
                            <div className="text-[10px] text-slate-400 p-2 text-center">
                              暂无其他工序
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Normal Cost */}
                    <td className="p-1">
                      <input
                        type="number"
                        min={0}
                        value={act.normalCost}
                        onChange={(e) => handleCellChange(act.id, 'normalCost', parseFloat(e.target.value) || 0)}
                        className="w-full text-center py-1 font-mono text-slate-700 bg-transparent border-0 ring-0 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded"
                      />
                    </td>

                    {/* Crash Cost */}
                    <td className="p-1">
                      <input
                        type="number"
                        min={0}
                        value={act.crashCost}
                        onChange={(e) => handleCellChange(act.id, 'crashCost', parseFloat(e.target.value) || 0)}
                        className="w-full text-center py-1 font-mono text-slate-700 bg-transparent border-0 ring-0 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded"
                      />
                    </td>

                    {/* Crash Duration */}
                    <td className="p-1">
                      <input
                        type="number"
                        min={1}
                        value={act.crashDuration}
                        onChange={(e) => handleCellChange(act.id, 'crashDuration', parseInt(e.target.value, 10) || 1)}
                        className="w-full text-center py-1 font-mono text-slate-700 bg-transparent border-0 ring-0 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded"
                      />
                    </td>

                    {/* Resource Type */}
                    <td className="p-1">
                      <input
                        type="text"
                        value={act.resourceType}
                        onChange={(e) => handleCellChange(act.id, 'resourceType', e.target.value)}
                        className="w-full text-center py-1 text-slate-600 bg-transparent border-0 ring-0 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded"
                      />
                    </td>

                    {/* Resource Count */}
                    <td className="p-1">
                      <input
                        type="number"
                        min={0}
                        value={act.resourceCount}
                        onChange={(e) => handleCellChange(act.id, 'resourceCount', parseInt(e.target.value, 10) || 0)}
                        className="w-full text-center py-1 font-mono text-slate-700 bg-transparent border-0 ring-0 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Table footer quick append row */}
          <div className="mt-3 flex justify-start">
            <button
              onClick={handleAddNewRow}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-indigo-600 hover:bg-slate-50 flex items-center gap-1 shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              追加空工序行 (快捷增行)
            </button>
          </div>
        </div>
      )}

      {/* Mode 2: Traditional Card Form Adder */}
      {activeInputMode === 'form' && (
        <form onSubmit={handleFormSubmit} className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">工序唯一 ID * (建议单字母 A, B, C)</label>
            <input
              type="text"
              required
              value={formState.id}
              onChange={(e) => setFormState({ ...formState, id: e.target.value.toUpperCase() })}
              placeholder="例如: A"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">工序名称 *</label>
            <input
              type="text"
              required
              value={formState.name}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
              placeholder="例如: 地基浇筑"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">常用工期 (天) *</label>
            <input
              type="number"
              required
              min={1}
              value={formState.duration}
              onChange={(e) => setFormState({ ...formState, duration: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="md:col-span-3 border-t border-slate-100 pt-3">
            <h5 className="text-xs font-bold text-indigo-600 mb-2">PERT 三时估算法参数 (可选)</h5>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">最乐观工期 (d)</label>
                <input
                  type="number"
                  value={formState.optimisticDays}
                  onChange={(e) => setFormState({ ...formState, optimisticDays: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">最可能工期 (d)</label>
                <input
                  type="number"
                  value={formState.mostLikelyDays}
                  onChange={(e) => setFormState({ ...formState, mostLikelyDays: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">最悲观工期 (d)</label>
                <input
                  type="number"
                  value={formState.pessimisticDays}
                  onChange={(e) => setFormState({ ...formState, pessimisticDays: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none"
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-3 border-t border-slate-100 pt-3">
            <h5 className="text-xs font-bold text-indigo-600 mb-2">赶工与资源参数</h5>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">正常成本 (万)</label>
                <input
                  type="number"
                  value={formState.normalCost}
                  onChange={(e) => setFormState({ ...formState, normalCost: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">赶工成本 (万)</label>
                <input
                  type="number"
                  value={formState.crashCost}
                  onChange={(e) => setFormState({ ...formState, crashCost: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">赶工极限 (d)</label>
                <input
                  type="number"
                  value={formState.crashDuration}
                  onChange={(e) => setFormState({ ...formState, crashDuration: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">所需工种</label>
                <input
                  type="text"
                  value={formState.resourceType}
                  onChange={(e) => setFormState({ ...formState, resourceType: e.target.value })}
                  placeholder="如: 电工"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">所需人数</label>
                <input
                  type="number"
                  value={formState.resourceCount}
                  onChange={(e) => setFormState({ ...formState, resourceCount: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none"
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-600 mb-1">
              紧前工序 ID (用逗号分隔，例如 A,B )
            </label>
            <input
              type="text"
              value={formState.predecessors}
              onChange={(e) => setFormState({ ...formState, predecessors: e.target.value })}
              placeholder="无紧前可留空"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none"
            />
          </div>

          <div className="md:col-span-3 flex justify-end border-t border-slate-100 pt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md hover:shadow-indigo-500/10 transition-all"
            >
              <Plus className="h-4 w-4" />
              添加到工作计划
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
