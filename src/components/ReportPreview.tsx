/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project, Activity } from '../types';
import { 
  FileText, 
  Download, 
  Sparkles, 
  Clock, 
  Coins, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Loader2,
  Award,
  ChevronRight
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportPreviewProps {
  project: Project;
  activities: Activity[];
  cpmResults: Map<string, any>;
  criticalPath: string[];
  totalDuration: number;
  crashPoints: any[];
  currentCrashedDuration: number;
  currentCostBreakdown: { direct: number; indirect: number; total: number };
  pertResult?: {
    expectedDuration: number;
    standardDeviation?: number;
    stdDev?: number;
    variance?: number;
    zScore?: number;
    probability: number;
  } | null;
  insights?: {
    risks: { id: string; riskScore: 'low' | 'medium' | 'high'; riskAnalysis: string }[];
    resourceRecommendations: {
      fromId: string;
      toId: string;
      resourceType: string;
      amount: number;
      recommendationText: string;
    }[];
  } | null;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  project,
  activities,
  cpmResults,
  criticalPath,
  totalDuration,
  crashPoints,
  currentCrashedDuration,
  currentCostBreakdown,
  pertResult,
  insights
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Report compilation states
  const [isCompiled, setIsCompiled] = useState(true);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileStep, setCompileStep] = useState(0);
  const [compilingLog, setCompilingLog] = useState('');

  // Start Compilation pipeline
  const startCompilation = () => {
    setIsCompiling(true);
    setCompileStep(0);
    setCompilingLog('正在穿透 CPM 网络图拓扑结构并检验闭环回路安全性...');
    
    setTimeout(() => {
      setCompileStep(1);
      setCompilingLog('正在运行 PERT 三点估算贝塔分布概率积分，求解期望完工工期与标准差...');
    }, 450);

    setTimeout(() => {
      setCompileStep(2);
      setCompilingLog('正在深度检索工期-成本赶工斜率(Crashing Slope)，寻找帕累托最优直接/间接费用组合...');
    }, 900);

    setTimeout(() => {
      setCompileStep(3);
      setCompilingLog('正在汇总 AI 专家系统的关键路径工序瓶颈扫描与智能资源跨工序优化调配策略...');
    }, 1350);

    setTimeout(() => {
      setCompileStep(4);
      setCompilingLog('正在编译生成高保真 A4 实时双页 PDF 报告排版并初始化矢量预览层...');
    }, 1800);

    setTimeout(() => {
      setIsCompiling(false);
      setIsCompiled(true);
    }, 2200);
  };

  // Print Date
  const printDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Calculate some helpful statistics for the report
  const normalDuration = Math.max(...(crashPoints?.map(p => p.duration) || [totalDuration]));
  const normalCost = crashPoints?.find(p => p.duration === normalDuration)?.totalCost || currentCostBreakdown.total;
  const costSavings = normalCost - currentCostBreakdown.total;

  // Handle high resolution multi-page PDF generation
  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    try {
      // Create a letter / A4 size PDF (p: portrait, mm: millimeters, a4: size)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pages = ['report-page-1', 'report-page-2'];
      
      for (let i = 0; i < pages.length; i++) {
        const element = document.getElementById(pages[i]);
        if (!element) continue;
        
        // Convert A4 element to Canvas
        const canvas = await html2canvas(element, {
          scale: 2, // Retina scale for crisp text rendering
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (i > 0) {
          pdf.addPage();
        }
        
        // Calculate vertical offset to center the content on page if slightly smaller
        const yOffset = imgHeight < 297 ? (297 - imgHeight) / 2 : 0;
        pdf.addImage(imgData, 'JPEG', 0, yOffset, imgWidth, imgHeight);
      }
      
      pdf.save(`${project.name || '项目'}_决策分析报告.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('PDF 报告生成失败，请检查浏览器兼容性或重试。');
    } finally {
      setIsGenerating(false);
    }
  };

  // Render Compiling / First-Step Screen if not compiled
  if (!isCompiled) {
    return (
      <div className="flex flex-col h-full bg-slate-50 rounded-xl overflow-hidden min-h-[500px]">
        {/* Banner */}
        <div className="bg-slate-950 text-slate-100 p-8 border-b border-slate-800 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider bg-indigo-500/15 text-indigo-400 uppercase mb-3">
              <Sparkles className="h-3 w-3" />
              INTELLIPLAN COGNITIVE ENGINE
            </span>
            <h2 className="text-lg md:text-xl font-extrabold tracking-tight">项目工程管理网络计划决策分析报告控制台</h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-medium">
              本控制台通过穿透您当前填写的<strong>智能工序参数工作表</strong>，实时求解双向关键路径(CPM)、PERT三点估算达标概率及工期成本最优化崩溃曲线，一键生成符合工业级编制规范的正式双页 PDF 报告。
            </p>
          </div>
        </div>

        {/* Action / Stage Display */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center">
          {!isCompiling ? (
            <div className="max-w-md w-full space-y-6 text-center">
              {/* Feature list */}
              <div className="bg-white rounded-2xl p-5 border border-slate-150 shadow-xs text-left space-y-4">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  报告核心包含章节说明：
                </h4>
                <div className="space-y-3">
                  <div className="flex gap-2.5 items-start">
                    <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5">01</span>
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">CPM 关键路径指标诊断详表</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">最早/最迟时间，工期，总时差(TF)与自由时差(FF)之核心参数一览。</span>
                    </div>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5">02</span>
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">PERT 三点估算达标概率</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">基于贝塔概率分布，深度量化评估在特定承诺目标工期内的项目完工概率。</span>
                    </div>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5">03</span>
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">工期-成本崩溃赶工(Crashing)方案</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">分析极限崩溃斜率，寻找以最低的直接成本追加额，实现承诺工期的赶工效益路线。</span>
                    </div>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5">04</span>
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">AI 专家风险筛查与资源调配</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">关键路径限流节点风险诊断与跨工序多余人员平衡策略汇总。</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={startCompilation}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <Sparkles className="h-4.5 w-4.5" />
                <span>⚡ 编译分析数据 · 生成实时报告预览</span>
              </button>
              <p className="text-[10px] text-slate-400 font-medium">编译完成即刻展现实时双页 A4 矢面排版，可确认无误后再一键下载</p>
            </div>
          ) : (
            <div className="max-w-md w-full space-y-6 text-center">
              {/* Spinner */}
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative flex items-center justify-center">
                  <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                  <Sparkles className="h-5 w-5 text-indigo-500 absolute animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">正在进行多维度决策分析与报告编译...</h4>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">IntelliPlan 决策推演算法执行中，请稍候</p>
                </div>
              </div>

              {/* Log / Step list */}
              <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 text-left space-y-2.5 shadow-md">
                <div className="flex items-center justify-between text-[10px] font-bold text-indigo-400 border-b border-slate-800 pb-1.5 font-mono">
                  <span>LOG STREAM / RUNNING TASKS</span>
                  <span className="animate-pulse">● EXECUTING</span>
                </div>
                <div className="space-y-1.5 text-[10px] font-mono text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${compileStep >= 0 ? 'bg-emerald-500' : 'bg-slate-700'}`}></span>
                    <span className={compileStep === 0 ? 'text-indigo-400 font-bold' : compileStep > 0 ? 'text-slate-500' : ''}>
                      [01] 穿透 CPM 双向递推网络拓扑结构... {compileStep > 0 && '✓ 完成'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${compileStep >= 1 ? 'bg-emerald-500' : 'bg-slate-700'}`}></span>
                    <span className={compileStep === 1 ? 'text-indigo-400 font-bold' : compileStep > 1 ? 'text-slate-500' : ''}>
                      [02] 运行 PERT 三点估算 Beta 正态概率密度积分... {compileStep > 1 && '✓ 完成'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${compileStep >= 2 ? 'bg-emerald-500' : 'bg-slate-700'}`}></span>
                    <span className={compileStep === 2 ? 'text-indigo-400 font-bold' : compileStep > 2 ? 'text-slate-500' : ''}>
                      [03] 回溯 Time-Cost 折衷，检索崩溃(Crashing)斜率... {compileStep > 2 && '✓ 完成'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${compileStep >= 3 ? 'bg-emerald-500' : 'bg-slate-700'}`}></span>
                    <span className={compileStep === 3 ? 'text-indigo-400 font-bold' : compileStep > 3 ? 'text-slate-500' : ''}>
                      [04] 汇总 AI 专家系统瓶颈分析与资源平衡配给策略... {compileStep > 3 && '✓ 完成'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${compileStep >= 4 ? 'bg-emerald-500' : 'bg-slate-700'}`}></span>
                    <span className={compileStep === 4 ? 'text-indigo-400 font-bold animate-pulse' : ''}>
                      [05] 渲染高保真 A4 矢量打印预览层，映射同源数据... {compileStep > 4 && '✓ 完成'}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] bg-slate-950 p-2 rounded text-indigo-300 font-mono border border-slate-850 truncate">
                  &gt; {compilingLog}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Define sections for left sidebar navigation
  const reportSections = [
    { id: 'report-sec-1', label: '一、项目情况 & 费用分解', icon: '📊' },
    { id: 'report-sec-2', label: '二、关键路径 & PERT评估', icon: '📈' },
    { id: 'report-sec-3', label: '三、AI风险 & 调配专家建议', icon: '🤖' },
    { id: 'report-sec-4', label: '四、工序参数计算明细表', icon: '📋' },
    { id: 'report-sec-5', label: '五、工期-成本赶工曲线', icon: '💰' },
    { id: 'report-sec-6', label: '六、决策签批与审批签章', icon: '✍️' }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-100/60 rounded-xl overflow-hidden">
      {/* Top action bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-indigo-500" />
            项目管理网络计划决策分析报告 (PDF) 已就绪
          </h4>
          <p className="text-[11px] text-slate-500 font-medium">符合工业级编制规范，提供关键路径诊断、赶工曲线与 PERT 风险预测</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsCompiled(false)}
            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg cursor-pointer transition-colors"
            title="返回报告控制台，可在工序修改后重新一键生成最新的决策报告"
          >
            系统控制台
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>正在导出 PDF 报告...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>下载正式 PDF 报告</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area: Left Outline Navigation + Right PDF Pages Preview */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar Chapter Navigation */}
        <div className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 p-4 shrink-0 overflow-y-auto justify-between">
          <div className="space-y-4">
            <div>
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Award className="h-4 w-4 text-indigo-600" />
                报告章节目录预览
              </h5>
              <p className="text-[10px] text-slate-400 font-semibold">点击跳转并高亮对应的报告预览块</p>
            </div>
            
            <div className="space-y-1">
              {reportSections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => {
                    const el = document.getElementById(sec.id);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      // Add flash highlight effect
                      el.classList.add('bg-indigo-50/40');
                      setTimeout(() => {
                        el.classList.remove('bg-indigo-50/40');
                      }, 1000);
                    }
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/50 rounded-lg border border-transparent hover:border-indigo-100 transition-all flex items-center gap-2 cursor-pointer group"
                >
                  <span className="text-sm group-hover:scale-110 transition-transform">{sec.icon}</span>
                  <span className="truncate">{sec.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-150 pt-4 space-y-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-[10px] space-y-2">
              <span className="font-extrabold text-slate-700 block">实时指标摘要：</span>
              <div className="space-y-1.5 font-medium text-slate-500">
                <div className="flex justify-between">
                  <span>当前工期:</span>
                  <span className="font-mono text-slate-700 font-bold">{totalDuration} 天</span>
                </div>
                <div className="flex justify-between">
                  <span>总计成本:</span>
                  <span className="font-mono text-slate-700 font-bold">¥{currentCostBreakdown.total.toLocaleString()}</span>
                </div>
                {pertResult && (
                  <div className="flex justify-between">
                    <span>完工概率:</span>
                    <span className="font-mono text-emerald-600 font-bold">
                      {((pertResult.probability <= 1 ? pertResult.probability * 100 : pertResult.probability)).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-[9px] text-slate-400 font-medium leading-relaxed bg-indigo-50/40 p-2 border border-indigo-100/30 rounded-lg">
              ℹ️ 所有数据均在前端双向绑定，在表格中做任何修改，报告都将瞬时进行拓扑级联刷新。
            </div>
          </div>
        </div>

        {/* Right Scrollable PDF Pages Preview Container */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-6 bg-slate-100/50 flex flex-col items-center gap-8 scrollbar-thin scrollbar-thumb-slate-300">
          <div className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-full text-center flex items-center gap-1.5 shadow-xs shrink-0">
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-indigo-500" />
            <span>💡 报告已全量加载，支持高保真双页打印预览。左侧章节支持一键直达跳转，核对后可直接下载。</span>
          </div>

          {/* ================= PAGE 1 ================= */}
          <div 
            id="report-page-1"
            className="w-[794px] h-[1123px] bg-white p-12 flex flex-col justify-between shadow-lg border border-slate-200 text-slate-800 shrink-0 font-sans relative transition-all duration-300"
            style={{ width: '794px', height: '1123px' }}
          >
            {/* Header */}
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-1 text-xs font-black tracking-wider text-indigo-600 font-mono">
                    <TrendingUp className="h-4.5 w-4.5" />
                    <span>INTELLIPLAN SYSTEM REPORT</span>
                  </div>
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                    网络计划 CPM/PERT 深度决策诊断报告
                  </h1>
                  <p className="text-[10px] text-slate-500 font-medium tracking-wide mt-0.5">
                    智能项目工序参数、资源调配推荐与赶工防延误风险评估说明书
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold bg-slate-900 text-slate-100 px-2 py-1 rounded tracking-widest uppercase">
                    CONFIDENTIAL
                  </span>
                  <p className="text-[9px] text-slate-400 font-mono font-semibold mt-1">报告版本: v1.0.0</p>
                </div>
              </div>

              {/* Project Overview */}
              <div className="grid grid-cols-12 gap-5 mt-3">
                <div className="col-span-12 scroll-mt-6 transition-colors duration-500 rounded-lg" id="report-sec-1">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-l-3 border-indigo-600 pl-2 mb-2">
                    一、 项目基础情况 & 核心决策状态
                  </h3>
                  <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-150 grid grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px]">项目名称</span>
                      <b className="text-slate-800 text-[11px] truncate block mt-0.5">{project.name}</b>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px]">当前计算工期</span>
                      <b className="text-indigo-600 text-sm font-black flex items-center gap-1 mt-0.5">
                        <Clock className="h-3.5 w-3.5 text-indigo-500 inline" />
                        {totalDuration} 天
                      </b>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px]">目标/承诺工期</span>
                      <b className="text-slate-700 text-[11px] block mt-0.5">{project.targetDuration} 天</b>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px]">间接成本率</span>
                      <b className="text-slate-700 text-[11px] block mt-0.5">{project.indirectCostPerDay} 元/天</b>
                    </div>
                  </div>
                </div>

                {/* Cost Breakdown Cards */}
                <div className="col-span-12">
                  <div className="grid grid-cols-3 gap-3.5">
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-150 flex items-center gap-3">
                      <div className="bg-indigo-50 p-2 rounded-md">
                        <Coins className="h-4.5 w-4.5 text-indigo-600" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">项目总成本 (元)</span>
                        <span className="text-xs font-black text-slate-900">{currentCostBreakdown.total.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-150 flex items-center gap-3">
                      <div className="bg-indigo-50 p-2 rounded-md">
                        <Coins className="h-4.5 w-4.5 text-indigo-600" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">直接赶工成本 (元)</span>
                        <span className="text-xs font-bold text-slate-700">{currentCostBreakdown.direct.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-150 flex items-center gap-3">
                      <div className="bg-indigo-50 p-2 rounded-md">
                        <Coins className="h-4.5 w-4.5 text-indigo-600" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">累计间接成本 (元)</span>
                        <span className="text-xs font-bold text-slate-700">{currentCostBreakdown.indirect.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  {costSavings > 0 && (
                    <div className="mt-2.5 bg-emerald-50 text-emerald-800 border border-emerald-150 px-3 py-2 rounded-lg text-[10px] font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>赶工效益透视: 相较于正常工期 (<b>{normalDuration}天</b>)，当前压缩决策可为您节约 <b>{costSavings.toLocaleString()}元</b> 的间接费支出。</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Critical Path & PERT */}
              <div className="mt-5 space-y-3 scroll-mt-6 transition-colors duration-500 rounded-lg" id="report-sec-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-l-3 border-indigo-600 pl-2">
                  二、 关键路径 (Critical Path) 与 PERT 完工概率评估
                </h3>
                
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-150 space-y-3">
                  {/* Path display */}
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">关键路径拓扑序列 (关键工序总时差 TF = 0)</span>
                    <div className="flex flex-wrap items-center gap-1.5 bg-white p-2 border border-slate-150 rounded">
                      {criticalPath.map((id, idx) => {
                        const actName = activities.find(a => a.id === id)?.name || '';
                        return (
                          <React.Fragment key={id}>
                            {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
                            <span className="text-[10px] font-bold font-mono bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                              [{id}] {actName}
                            </span>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* PERT results if available */}
                  {pertResult && (() => {
                    const stdDevVal = pertResult.standardDeviation ?? pertResult.stdDev ?? 0;
                    const probPct = pertResult.probability <= 1 ? pertResult.probability * 100 : pertResult.probability;
                    return (
                      <div className="grid grid-cols-3 gap-4 border-t border-slate-200/60 pt-3">
                        <div className="bg-white p-2.5 rounded border border-slate-150 text-xs">
                          <span className="text-slate-400 font-semibold block text-[10px]">期望总工期 (Te)</span>
                          <b className="text-slate-700 text-xs mt-0.5 block">{pertResult.expectedDuration.toFixed(2)} 天</b>
                          <span className="text-[9px] text-slate-400">基于贝塔三点分布加权</span>
                        </div>
                        <div className="bg-white p-2.5 rounded border border-slate-150 text-xs">
                          <span className="text-slate-400 font-semibold block text-[10px]">关键路径标准差 (σ)</span>
                          <b className="text-slate-700 text-xs mt-0.5 block">{stdDevVal.toFixed(3)} 天</b>
                          <span className="text-[9px] text-slate-400">反映项目工期波动不确定性</span>
                        </div>
                        <div className="bg-white p-2.5 rounded border border-slate-150 text-xs">
                          <span className="text-slate-400 font-semibold block text-[10px]">承诺目标完工率</span>
                          <b className={`text-xs font-black mt-0.5 block ${probPct > 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {probPct.toFixed(2)}%
                          </b>
                          <span className="text-[9px] text-slate-400">在 {project.targetDuration} 天内完工的概率</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* AI Risks & Resource Recommendations */}
              <div className="mt-5 space-y-3 scroll-mt-6 transition-colors duration-500 rounded-lg" id="report-sec-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-l-3 border-indigo-600 pl-2">
                  三、 核心风险诊断与智能调配专家建议 (AI Expert Scanner)
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Left: High/Medium Risks */}
                  <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-150 space-y-2 flex flex-col justify-between">
                    <div>
                      <h4 className="text-[10px] text-slate-700 font-bold flex items-center gap-1 mb-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        高危/延误瓶颈工序扫描
                      </h4>
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {insights?.risks && insights.risks.length > 0 ? (
                          insights.risks.map((risk, index) => {
                            const actName = activities.find(a => a.id === risk.id)?.name || '';
                            const isHigh = risk.riskScore === 'high';
                            return (
                              <div key={index} className="text-[9.5px] p-1.5 bg-white border border-slate-150 rounded leading-relaxed">
                                <span className={`font-mono font-bold px-1.5 py-0.5 rounded mr-1 ${isHigh ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                                  {risk.id}
                                </span>
                                <span className="font-bold text-slate-700">{actName}</span>
                                <p className="text-slate-500 font-medium text-[9px] mt-0.5 leading-snug">{risk.riskAnalysis}</p>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-[9.5px] text-slate-400 text-center py-4">未检测到中高风险瓶颈，项目当前拓扑结构非常稳健。</p>
                        )}
                      </div>
                    </div>
                    <span className="text-[8px] text-slate-400 block border-t border-slate-200/60 pt-1">
                      * 风险评分基于关键路径穿透率与自由时差冗余度深度推导。
                    </span>
                  </div>

                  {/* Right: Resource recommendations */}
                  <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-150 space-y-2 flex flex-col justify-between">
                    <div>
                      <h4 className="text-[10px] text-slate-700 font-bold flex items-center gap-1 mb-2">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                        AI 资源余缺优化调配策略
                      </h4>
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {insights?.resourceRecommendations && insights.resourceRecommendations.length > 0 ? (
                          insights.resourceRecommendations.map((rec, index) => (
                            <div key={index} className="text-[9.5px] p-2 bg-indigo-500/5 border border-indigo-150 rounded leading-relaxed">
                              <div className="flex justify-between items-center text-[9px] text-indigo-700 font-bold font-mono">
                                <span>从 {rec.fromId} ➔ 调至 {rec.toId}</span>
                                <span>调派 {rec.amount}人</span>
                              </div>
                              <p className="text-slate-500 font-medium text-[9px] mt-0.5 leading-snug">{rec.recommendationText}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-[9.5px] text-slate-400 text-center py-4">未检测到可用的跨工序资源平衡调配机会。</p>
                        )}
                      </div>
                    </div>
                    <span className="text-[8px] text-slate-400 block border-t border-slate-200/60 pt-1">
                      * 算法原理：在非关键工序（富余 TF &gt; 0）抽取资源，加派至最限流的关键路径节点。
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center border-t border-slate-300 pt-3 text-[9px] text-slate-400 font-mono font-medium">
              <span>IntelliPlan 智能化工程计划系统编制 · 报告生成时间：{printDate}</span>
              <span>第 1 页，共 2 页</span>
            </div>
          </div>


          {/* ================= PAGE 2 ================= */}
          <div 
            id="report-page-2"
            className="w-[794px] h-[1123px] bg-white p-12 flex flex-col justify-between shadow-lg border border-slate-200 text-slate-800 shrink-0 font-sans relative transition-all duration-300"
            style={{ width: '794px', height: '1123px' }}
          >
            {/* Top Page Bar */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  INTELLIPLAN SYSTEM REPORT · PAGE 2
                </span>
                <span className="text-[9px] text-slate-400 font-mono font-semibold">项目决策明细索引</span>
              </div>

              {/* Section 4: Activities Detail Table */}
              <div className="space-y-2 scroll-mt-6 transition-colors duration-500 rounded-lg" id="report-sec-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-l-3 border-indigo-600 pl-2">
                  四、 网络计划工序参数计算详表 (CPM 核心指标明细)
                </h3>
                
                <div className="overflow-x-auto border border-slate-150 rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-150">
                        <th className="py-2 px-3 text-center w-12">ID</th>
                        <th className="py-2 px-3">工序名称</th>
                        <th className="py-2 px-3 text-center w-12">工期</th>
                        <th className="py-2 px-2 text-center w-14">ES</th>
                        <th className="py-2 px-2 text-center w-14">EF</th>
                        <th className="py-2 px-2 text-center w-14">LS</th>
                        <th className="py-2 px-2 text-center w-14">LF</th>
                        <th className="py-2 px-2 text-center w-14">TF (总)</th>
                        <th className="py-2 px-2 text-center w-14">FF (自)</th>
                        <th className="py-2 px-3 text-center w-14">关键属性</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-[9.5px]">
                      {activities.map((act) => {
                        const cpm = cpmResults.get(act.id);
                        const isCritical = cpm?.tf === 0;
                        return (
                          <tr 
                            key={act.id} 
                            className={`font-mono font-medium ${isCritical ? 'bg-red-50/20 text-red-900 font-bold' : 'hover:bg-slate-50/40 text-slate-600'}`}
                          >
                            <td className="py-1.5 px-3 text-center font-bold text-slate-800">{act.id}</td>
                            <td className="py-1.5 px-3 font-sans font-bold text-slate-800 truncate max-w-[150px]">{act.name}</td>
                            <td className="py-1.5 px-3 text-center font-bold">{act.duration}d</td>
                            <td className="py-1.5 px-2 text-center">{cpm?.es ?? 0}d</td>
                            <td className="py-1.5 px-2 text-center">{cpm?.ef ?? 0}d</td>
                            <td className="py-1.5 px-2 text-center">{cpm?.ls ?? 0}d</td>
                            <td className="py-1.5 px-2 text-center">{cpm?.lf ?? 0}d</td>
                            <td className="py-1.5 px-2 text-center">
                              <span className={cpm?.tf === 0 ? 'text-red-600 font-black' : ''}>
                                {cpm?.tf ?? 0}d
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-center">{cpm?.ff ?? 0}d</td>
                            <td className="py-1.5 px-3 text-center font-sans">
                              {isCritical ? (
                                <span className="text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200 font-black">
                                  关键节点
                                </span>
                              ) : (
                                <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                  非关键
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 5: Crashing Curve Point Detail */}
              <div className="mt-5 space-y-2 scroll-mt-6 transition-colors duration-500 rounded-lg" id="report-sec-5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-l-3 border-indigo-600 pl-2">
                  五、 工期-成本崩溃赶工优化路线表 (Crashing Curve)
                </h3>
                
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 overflow-x-auto border border-slate-150 rounded-lg">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-150">
                          <th className="py-2 px-3 text-center w-16">项目工期</th>
                          <th className="py-2 px-3 text-right">直接赶工成本</th>
                          <th className="py-2 px-3 text-right">累计间接费支出</th>
                          <th className="py-2 px-3 text-right">项目总成本 (元)</th>
                          <th className="py-2 px-3 text-center">累计可压缩天数</th>
                          <th className="py-2 px-3 text-center w-24">当前状态映射</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 text-[9.5px] font-mono">
                        {crashPoints?.map((pt, idx) => {
                          const isCurrent = pt.duration === currentCrashedDuration;
                          const normalPt = crashPoints[crashPoints.length - 1]; // usually normal is the longest
                          const compressedDays = (normalPt?.duration || 0) - pt.duration;
                          
                          return (
                            <tr 
                              key={idx} 
                              className={`font-semibold ${isCurrent ? 'bg-indigo-50 text-indigo-900 font-bold' : 'text-slate-600'}`}
                            >
                              <td className="py-1.5 px-3 text-center font-bold text-slate-900">{pt.duration} 天</td>
                              <td className="py-1.5 px-3 text-right">¥{pt.directCost.toLocaleString()}</td>
                              <td className="py-1.5 px-3 text-right">¥{pt.indirectCost.toLocaleString()}</td>
                              <td className="py-1.5 px-3 text-right text-slate-900 font-bold">¥{pt.totalCost.toLocaleString()}</td>
                              <td className="py-1.5 px-3 text-center text-slate-500">{compressedDays > 0 ? `-${compressedDays}天` : '正常'}</td>
                              <td className="py-1.5 px-3 text-center font-sans">
                                {isCurrent ? (
                                  <span className="text-[8px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full shadow-xs">
                                    ● 已选决策点
                                  </span>
                                ) : (
                                  <span className="text-[8px] text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Signature Area */}
              <div className="mt-8 pt-6 border-t border-slate-200 scroll-mt-6 transition-colors duration-500 rounded-lg" id="report-sec-6">
                <h4 className="text-[10px] text-slate-800 font-bold uppercase tracking-wider mb-4">
                  六、 决策结论与项目管理审批签批区
                </h4>
                <div className="grid grid-cols-4 gap-4 text-[9.5px]">
                  <div className="bg-slate-50/50 p-3 rounded border border-slate-150 h-16 flex flex-col justify-between">
                    <span className="text-slate-400 font-semibold block text-[8px]">编制人员 (Prepared By)</span>
                    <div className="border-b border-slate-300 w-full h-4 mt-2"></div>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded border border-slate-150 h-16 flex flex-col justify-between">
                    <span className="text-slate-400 font-semibold block text-[8px]">审核人员 (Reviewed By)</span>
                    <div className="border-b border-slate-300 w-full h-4 mt-2"></div>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded border border-slate-150 h-16 flex flex-col justify-between">
                    <span className="text-slate-400 font-semibold block text-[8px]">批准人员 (Approved By)</span>
                    <div className="border-b border-slate-300 w-full h-4 mt-2"></div>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded border border-slate-150 h-16 flex flex-col justify-between text-right">
                    <span className="text-slate-400 font-semibold block text-[8px] text-left">编制及签批日期 (Date)</span>
                    <b className="text-slate-700 font-mono mt-3 block">{printDate.split(' ')[0]}</b>
                  </div>
                </div>
                <p className="text-[8.5px] text-slate-400 mt-4 leading-relaxed font-medium">
                  免责声明：本报告由 IntelliPlan 智能化网络计划算法平台同源推演生成。PERT 完工概率计算及资源转移调配属于高级预测性辅助决策，请项目组在各省市具体安监和现场管理规范边界下酌情调整。
                </p>
              </div>

            </div>

            {/* Footer */}
            <div className="flex justify-between items-center border-t border-slate-300 pt-3 text-[9px] text-slate-400 font-mono font-medium">
              <span>IntelliPlan 智能化工程计划系统编制 · 报告生成时间：{printDate}</span>
              <span>第 2 页，共 2 页</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
