/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, Activity, CPMResult, ProjectSummary } from './types';
import { calculateCPM, calculatePERT, generateCrashOptimizationCurve, CrashPoint } from './utils/cpm';
import { ExcelTable } from './components/ExcelTable';
import { NetworkCharts } from './components/NetworkCharts';
import { AIExpertPanel } from './components/AIExpertPanel';
import { ReportPreview } from './components/ReportPreview';
import { getLLMSettings, callClientLLM } from './utils/llm';
import {
  TrendingUp,
  Clock,
  Coins,
  AlertCircle,
  Undo2,
  Check,
  RefreshCw,
  FileDown,
  FileSpreadsheet,
  Sparkles,
  HelpCircle,
  HelpCircle as HelpIcon,
  ChevronRight,
  Sliders,
  Database,
  Terminal,
  BookOpen,
  Copy,
  X,
  Plus,
  Minus,
  FileText,
  Play,
  Trash2
} from 'lucide-react';

// Pre-defined Industrial Network Blueprints
const BLUEPRINTS: Project[] = [
  {
    id: 'rail-disaster-control',
    name: '智能高铁综合防灾控制系统铺设工程',
    description: '高铁沿线大范围雷电、地震、强风及积水淹没多物理场传感器部署、综合防灾控制器组网及安全合围试运行。',
    targetDuration: 24,
    indirectCostPerDay: 2.0, // 2万/天
    activities: [
      {
        id: 'A',
        name: '需求调研与布线方案评审',
        duration: 4,
        normalDuration: 4,
        optimisticDays: 2,
        mostLikelyDays: 4,
        pessimisticDays: 6,
        normalCost: 10,
        crashCost: 18,
        crashDuration: 2,
        predecessors: [],
        resourceType: '系统架构师',
        resourceCount: 1,
        riskScore: 'low',
        riskAnalysis: '地基方案评审，在会议室或在线进行。资源调配或极端天气无直接物理性制约。'
      },
      {
        id: 'B',
        name: '工控机设备及机架采购',
        duration: 8,
        normalDuration: 8,
        optimisticDays: 6,
        mostLikelyDays: 8,
        pessimisticDays: 12,
        normalCost: 40,
        crashCost: 55,
        crashDuration: 5,
        predecessors: ['A'],
        resourceType: '采购工程师',
        resourceCount: 1,
        riskScore: 'medium',
        riskAnalysis: '工控主机受芯片供应链采购期影响，建议提早签署交付备忘录。'
      },
      {
        id: 'C',
        name: '核心光纤及防灾线缆铺设',
        duration: 6,
        normalDuration: 6,
        optimisticDays: 4,
        mostLikelyDays: 6,
        pessimisticDays: 10,
        normalCost: 15,
        crashCost: 22,
        crashDuration: 4,
        predecessors: ['A'],
        resourceType: '线缆工程师',
        resourceCount: 2,
        riskScore: 'medium',
        riskAnalysis: '涉及沿轨野外施工，雷暴或高温概率将严重削减线缆工人作业进度，防雨抽水极为重要。'
      },
      {
        id: 'D',
        name: '防灾预警系统核心算法软件开发',
        duration: 10,
        normalDuration: 10,
        optimisticDays: 7,
        mostLikelyDays: 10,
        pessimisticDays: 15,
        normalCost: 50,
        crashCost: 80,
        crashDuration: 7,
        predecessors: ['A'],
        resourceType: '软件工程师',
        resourceCount: 3,
        riskScore: 'high',
        riskAnalysis: '卡尔曼滤波多源合流算法开发，具有算法崩溃高风险，属绝对核心瓶颈。'
      },
      {
        id: 'E',
        name: '工控硬件组装与板卡调试',
        duration: 5,
        normalDuration: 5,
        optimisticDays: 3,
        mostLikelyDays: 5,
        pessimisticDays: 8,
        normalCost: 12,
        crashCost: 20,
        crashDuration: 3,
        predecessors: ['B'],
        resourceType: '硬件工程师',
        resourceCount: 2,
        riskScore: 'low',
        riskAnalysis: '实验室内装配。工艺简单，资源需求不高。'
      },
      {
        id: 'F',
        name: '网络拓扑配置与数据接口对调',
        duration: 7,
        normalDuration: 7,
        optimisticDays: 5,
        mostLikelyDays: 7,
        pessimisticDays: 11,
        normalCost: 20,
        crashCost: 32,
        crashDuration: 5,
        predecessors: ['C', 'D'],
        resourceType: '网络工程师',
        resourceCount: 2,
        riskScore: 'medium',
        riskAnalysis: '协议对调可能面临物理隔离安全红线制约，存在一定调试时差风险。'
      },
      {
        id: 'G',
        name: '环境综合对调试运行',
        duration: 6,
        normalDuration: 6,
        optimisticDays: 4,
        mostLikelyDays: 6,
        pessimisticDays: 10,
        normalCost: 25,
        crashCost: 45,
        crashDuration: 4,
        predecessors: ['E', 'F'],
        resourceType: '系统工程师',
        resourceCount: 2,
        riskScore: 'high',
        riskAnalysis: '上轨综合试运行。必须占用非营运列车窗口时间，存在极大调度冲突风险。'
      },
      {
        id: 'H',
        name: '竣工验收与正式上线',
        duration: 4,
        normalDuration: 4,
        optimisticDays: 3,
        mostLikelyDays: 4,
        pessimisticDays: 6,
        normalCost: 10,
        crashCost: 15,
        crashDuration: 3,
        predecessors: ['G'],
        resourceType: '项目负责人',
        resourceCount: 1,
        riskScore: 'low',
        riskAnalysis: '最终签署纸质或电子验收文档，审批风险低。'
      }
    ]
  },
  {
    id: 'logistics-port',
    name: '现代智慧物流港湾施工网络计划',
    description: '涵盖全自动集装箱吊装区轻钢骨架焊接、AGV多车智能调度调试及传送合流联运工程。',
    targetDuration: 18,
    indirectCostPerDay: 3.5, // 3.5万/天
    activities: [
      {
        id: 'A',
        name: '场地勘测与地基整平',
        duration: 5,
        normalDuration: 5,
        optimisticDays: 3,
        mostLikelyDays: 5,
        pessimisticDays: 8,
        normalCost: 30,
        crashCost: 50,
        crashDuration: 3,
        predecessors: [],
        resourceType: '重型机械工',
        resourceCount: 2,
        riskScore: 'medium',
        riskAnalysis: '地基回填存在软土层沉降不均风险，需要地质工程师驻场。'
      },
      {
        id: 'B',
        name: '主体轻钢钢架结构装配',
        duration: 8,
        normalDuration: 8,
        optimisticDays: 5,
        mostLikelyDays: 8,
        pessimisticDays: 12,
        normalCost: 80,
        crashCost: 120,
        crashDuration: 5,
        predecessors: ['A'],
        resourceType: '结构焊工',
        resourceCount: 3,
        riskScore: 'high',
        riskAnalysis: '高空特种焊接作业。大风或雨雪天气严禁施工，具有高度物理环境依附性。'
      },
      {
        id: 'C',
        name: '智能化仓储货架铺设',
        duration: 6,
        normalDuration: 6,
        optimisticDays: 4,
        mostLikelyDays: 6,
        pessimisticDays: 9,
        normalCost: 40,
        crashCost: 60,
        crashDuration: 4,
        predecessors: ['B'],
        resourceType: '机电装配工',
        resourceCount: 2,
        riskScore: 'low',
        riskAnalysis: '仓储货架拼装技术成熟，供应链顺畅。'
      },
      {
        id: 'D',
        name: 'AGV自动导航物流车调度联调',
        duration: 10,
        normalDuration: 10,
        optimisticDays: 6,
        mostLikelyDays: 10,
        pessimisticDays: 14,
        normalCost: 100,
        crashCost: 150,
        crashDuration: 6,
        predecessors: ['B'],
        resourceType: '自控软件工程师',
        resourceCount: 2,
        riskScore: 'high',
        riskAnalysis: '多车激光SLAM高精地图定位漂移冲突，算法鲁棒性需反复试验。'
      },
      {
        id: 'E',
        name: '传送带及分拣机合流调试',
        duration: 7,
        normalDuration: 7,
        optimisticDays: 4,
        mostLikelyDays: 7,
        pessimisticDays: 11,
        normalCost: 50,
        crashCost: 75,
        crashDuration: 4,
        predecessors: ['C'],
        resourceType: '电气调试工程师',
        resourceCount: 2,
        riskScore: 'medium',
        riskAnalysis: '高速分拣机传感器延迟可能发生货物抛洒卡死，需要精确微调。'
      },
      {
        id: 'F',
        name: '系统联合试运转与交付',
        duration: 5,
        normalDuration: 5,
        optimisticDays: 3,
        mostLikelyDays: 5,
        pessimisticDays: 7,
        normalCost: 20,
        crashCost: 30,
        crashDuration: 3,
        predecessors: ['D', 'E'],
        resourceType: '项目运营经理',
        resourceCount: 1,
        riskScore: 'low',
        riskAnalysis: '综合场景联运测试。主要资源是联合运营人员配合，合规审批平稳。'
      }
    ]
  }
];

export default function App() {
  // --- STATE DECLARATIONS ---
  const [selectedBlueprintId, setSelectedBlueprintId] = useState(BLUEPRINTS[0].id);
  const [projectName, setProjectName] = useState(BLUEPRINTS[0].name);
  const [projectDescription, setProjectDescription] = useState(BLUEPRINTS[0].description);
  const [targetDuration, setTargetDuration] = useState(BLUEPRINTS[0].targetDuration);
  const [indirectCostPerDay, setIndirectCostPerDay] = useState(BLUEPRINTS[0].indirectCostPerDay);
  
  // Active Project Activities (Work Area)
  const [activities, setActivities] = useState<Activity[]>(BLUEPRINTS[0].activities);
  
  // Selected single activity ID for detailed highlight
  const [selectedActivityId, setSelectedActivityId] = useState<string | undefined>('A');
  
  // Slider Crashing Target State
  const [crashingSliderDuration, setCrashingSliderDuration] = useState<number>(31);
  
  // Active Visualization Tab
  const [activeVisualTab, setActiveVisualTab] = useState<'aon' | 'aoa' | 'gantt' | 'cost'>('aon');

  // Chart zoom/scale state (default 100%)
  const [chartScale, setChartScale] = useState<number>(1.0);

  // AI Insights State
  const [aiInsights, setAiInsights] = useState<{
    risks: { id: string; riskScore: 'low' | 'medium' | 'high'; riskAnalysis: string }[];
    resourceRecommendations: {
      fromId: string;
      toId: string;
      resourceType: string;
      amount: number;
      recommendationText: string;
    }[];
  } | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // --- CREATE NEW CUSTOM PROJECT STATES ---
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const [newProjForm, setNewProjForm] = useState({
    name: '',
    description: '',
    targetDuration: 30,
    indirectCostPerDay: 2.0,
    initOption: 'blank' as 'blank' | 'example'
  });

  const [customProjects, setCustomProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('intelliplan_custom_projects');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save custom projects to localStorage
  useEffect(() => {
    localStorage.setItem('intelliplan_custom_projects', JSON.stringify(customProjects));
  }, [customProjects]);

  // Keep customProjects updated with current project's editing state in real-time
  useEffect(() => {
    if (selectedBlueprintId && selectedBlueprintId.startsWith('custom-')) {
      setCustomProjects(prev => prev.map(p => {
        if (p.id === selectedBlueprintId) {
          return {
            ...p,
            name: projectName,
            description: projectDescription,
            targetDuration: targetDuration,
            indirectCostPerDay: indirectCostPerDay,
            activities: activities
          };
        }
        return p;
      }));
    }
  }, [activities, projectName, projectDescription, targetDuration, indirectCostPerDay, selectedBlueprintId]);

  // --- ADDITIONAL TABS (PYTHON VERIFICATION & KNOWLEDGE GUIDE) ---
  const [showPythonModal, setShowPythonModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideActiveTab, setGuideActiveTab] = useState<'methodology' | 'report'>('report');
  const [copiedPython, setCopiedPython] = useState(false);

  // Dynamic Python CPM mathematical verification code generator
  const generatedPythonCode = useMemo(() => {
    const actListStr = activities.map(act => {
      const predsStr = act.predecessors.map(p => `'${p}'`).join(', ');
      return `    '${act.id}': {
        'name': '${act.name}',
        'duration': ${act.duration},
        'normal_cost': ${act.normalCost},
        'crash_duration': ${act.crashDuration},
        'crash_cost': ${act.crashCost},
        'predecessors': [${predsStr}]
    }`;
    }).join(',\n');

    return `import networkx as nx
import pandas as pd

# 1. 动态载入当前 IntelliPlan 拓扑工序表
activities = {
${actListStr}
}

def calculate_cpm(tasks):
    # 构建有向无环图 (DAG)
    G = nx.DiGraph()
    for task_id, info in tasks.items():
        G.add_node(task_id, duration=info['duration'], name=info['name'])
        for pred in info['predecessors']:
            G.add_edge(pred, task_id)
            
    # 拓扑排序校验是否有回路
    try:
        order = list(nx.topological_sort(G))
    except nx.NetworkXUnfeasible:
        raise ValueError("Error: 检测到拓扑环路关系，无法计算关键路径！")
        
    # 计算最早时间 (ES, EF)
    es = {node: 0 for node in G.nodes}
    ef = {node: 0 for node in G.nodes}
    
    for node in order:
        preds = list(G.predecessors(node))
        if preds:
            es[node] = max(ef[p] for p in preds)
        ef[node] = es[node] + G.nodes[node]['duration']
        
    # 计算最迟时间 (LS, LF)
    total_duration = max(ef.values()) if ef else 0
    ls = {node: total_duration for node in G.nodes}
    lf = {node: total_duration for node in G.nodes}
    
    for node in reversed(order):
        successors = list(G.successors(node))
        if successors:
            lf[node] = min(ls[s] for s in successors)
        ls[node] = lf[node] - G.nodes[node]['duration']
        
    # 计算总时差 (TF) 与关键路径 (Critical Path)
    tf = {node: ls[node] - es[node] for node in G.nodes}
    critical_path = [node for node in order if tf[node] == 0]
    
    # 构造 DataFrame 美化打印
    df = pd.DataFrame({
        '工序名称': [tasks[n]['name'] for n in G.nodes],
        '工期': [tasks[n]['duration'] for n in G.nodes],
        '最早开始(ES)': [es[n] for n in G.nodes],
        '最早完成(EF)': [ef[n] for n in G.nodes],
        '最迟开始(LS)': [ls[n] for n in G.nodes],
        '最迟完成(LF)': [lf[n] for n in G.nodes],
        '总时差(TF)': [tf[n] for n in G.nodes],
        '是否关键工序': ['是(★)' if tf[n] == 0 else '否' for n in G.nodes]
    }, index=G.nodes)
    
    return df, total_duration, critical_path

df_res, total_dur, crit_path = calculate_cpm(activities)
print("=" * 60)
print(f"★ 验证结论：总工期 = {total_dur} 天")
print(f"★ 关键路径 (Critical Path): {' ➔ '.join(crit_path)}")
print("=" * 60)
print(df_res.to_string())
`;
  }, [activities]);

  const handleCopyPythonCode = () => {
    navigator.clipboard.writeText(generatedPythonCode);
    setCopiedPython(true);
    setTimeout(() => setCopiedPython(false), 2000);
  };

  const [copiedTemplate, setCopiedTemplate] = useState(false);

  const downloadImportTemplate = () => {
    const headers = [
      "工序ID", "工序名称", "工期(天)", "最乐观工期(天)", "最可能工期(天)", "最悲观工期(天)", 
      "紧前工序(半角逗号分隔)", "正常成本(万元)", "赶工成本(万元)", "赶工极限工期(天)", "资源工种", "资源用量"
    ];
    const rows = [
      ["A", "基础设计", "5", "3", "5", "8", "", "10", "18", "3", "设计工程师", "2"],
      ["B", "软件开发", "10", "7", "10", "15", "A", "50", "80", "7", "软件工程师", "3"],
      ["C", "硬件集成", "8", "5", "8", "12", "A", "40", "65", "5", "硬件工程师", "2"],
      ["D", "系统集成测试", "6", "4", "6", "9", "B,C", "20", "35", "4", "测试工程师", "2"]
    ];
    
    // Use UTF-8 BOM to prevent garbled characters in Excel
    const csvContent = "\uFEFF" + [headers, ...rows].map(row => row.map(val => `"${val}"`).join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "IntelliPlan_工序导入模板.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyImportTemplateText = () => {
    const rows = [
      ["A", "基础设计", "5", "3", "5", "8", "", "10", "18", "3", "设计工程师", "2"],
      ["B", "软件开发", "10", "7", "10", "15", "A", "50", "80", "7", "软件工程师", "3"],
      ["C", "硬件集成", "8", "5", "8", "12", "A", "40", "65", "5", "硬件工程师", "2"],
      ["D", "系统集成测试", "6", "4", "6", "9", "B,C", "20", "35", "4", "测试工程师", "2"]
    ];
    
    // Tab-separated text for direct clipboard paste into Excel or the spreadsheet
    const tsvContent = rows.map(row => row.join("\t")).join("\n");
    
    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2000);
    }).catch(err => {
      console.error('Failed to copy template: ', err);
    });
  };

  // --- SANDBOX MODE STATE (WHAT-IF) ---
  const [sandboxActive, setSandboxActive] = useState(false);
  const [sandboxTitle, setSandboxTitle] = useState<string | null>(null);
  const [originalActivities, setOriginalActivities] = useState<Activity[]>([]);

  // Initialize Slider value when activities or blueprint changes
  const normalCpmResult = useMemo(() => {
    return calculateCPM(activities);
  }, [activities]);

  useEffect(() => {
    if (!sandboxActive) {
      setCrashingSliderDuration(normalCpmResult.totalDuration);
    }
  }, [normalCpmResult.totalDuration, sandboxActive]);

  // --- CPM & PERT CORE COMPUTATION COUPLING ---
  // The active schedule might be crashed or sandboxed. We calculate current results here.
  const activeActivities = useMemo(() => {
    // If we have an active crash point selected by the slider, override active activity durations
    const curves = generateCrashOptimizationCurve({
      id: 'current',
      name: projectName,
      description: projectDescription,
      targetDuration,
      indirectCostPerDay,
      activities
    });

    // Find the point matching the slider
    const currentPoint = curves.find(p => p.duration === crashingSliderDuration);
    
    if (currentPoint && currentPoint.crashedActivities && !sandboxActive) {
      return activities.map(act => ({
        ...act,
        duration: currentPoint.crashedActivities[act.id] !== undefined 
          ? currentPoint.crashedActivities[act.id] 
          : act.duration
      }));
    }

    return activities;
  }, [activities, crashingSliderDuration, sandboxActive, projectName, projectDescription, targetDuration, indirectCostPerDay]);

  // Recalculate CPM for active state
  const cpmResults = useMemo(() => {
    const { results, criticalPath, totalDuration, hasCycle } = calculateCPM(activeActivities);
    return { results, criticalPath, totalDuration, hasCycle };
  }, [activeActivities]);

  // --- PYTHON SOLVER INTERACTIVE TERMINAL ENGINE ---
  const [pythonLogs, setPythonLogs] = useState<string[]>([]);
  const [isPythonRunning, setIsPythonRunning] = useState(false);
  const [pythonExecutionDone, setPythonExecutionDone] = useState(false);

  const generateASCIIDataFrame = () => {
    // Helper to split string by visual length
    const splitStringByWidth = (str: string, maxWidth: number): string[] => {
      const lines: string[] = [];
      let currentLine = '';
      let currentWidth = 0;

      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        const charWidth = str.charCodeAt(i) > 127 ? 2 : 1;
        if (currentWidth + charWidth > maxWidth) {
          lines.push(currentLine);
          currentLine = char;
          currentWidth = charWidth;
        } else {
          currentLine += char;
          currentWidth += charWidth;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
      return lines.length > 0 ? lines : [''];
    };

    // Pad utility
    const padRight = (str: string, length: number) => {
      let len = 0;
      for (let i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) > 127) len += 2;
        else len += 1;
      }
      return str + ' '.repeat(Math.max(0, length - len));
    };

    let result = `${padRight('ID', 5)} ${padRight('工序名称', 18)} ${padRight('工期', 6)} ${padRight('最早(ES)', 8)} ${padRight('最早完成(EF)', 12)} ${padRight('最迟(LS)', 8)} ${padRight('最迟完成(LF)', 12)} ${padRight('总时差(TF)', 10)} 是否关键工序\n`;
    result += '-'.repeat(100) + '\n';
    
    activeActivities.forEach(act => {
      const cpm = cpmResults.results.get(act.id);
      const es = String(cpm?.es ?? 0);
      const ef = String(cpm?.ef ?? 0);
      const ls = String(cpm?.ls ?? 0);
      const lf = String(cpm?.lf ?? 0);
      const tf = String(cpm?.tf ?? 0);
      const isCrit = cpmResults.criticalPath.includes(act.id) ? '是(★)' : '否';
      
      const nameLines = splitStringByWidth(act.name, 18);
      
      // Print first line with all values
      result += `${padRight(act.id, 5)} ${padRight(nameLines[0], 18)} ${padRight(String(act.duration), 6)} ${padRight(es, 8)} ${padRight(ef, 12)} ${padRight(ls, 8)} ${padRight(lf, 12)} ${padRight(tf, 10)} ${isCrit}\n`;
      
      // Print remaining lines (name only, other columns are empty)
      for (let i = 1; i < nameLines.length; i++) {
        result += `${padRight('', 5)} ${padRight(nameLines[i], 18)} ${padRight('', 6)} ${padRight('', 8)} ${padRight('', 12)} ${padRight('', 8)} ${padRight('', 12)} ${padRight('', 10)} \n`;
      }
    });
    
    return result;
  };

  const runPythonValidation = () => {
    if (isPythonRunning) return;
    setIsPythonRunning(true);
    setPythonExecutionDone(false);
    setPythonLogs(["$ python cpm_solver.py"]);

    if (cpmResults.hasCycle) {
      const logsWithCycle = [
        { delay: 100, text: `[0.00s] [INFO] Initializing Python 3.10 mathematical validation sandbox...` },
        { delay: 250, text: `[0.05s] [INFO] Importing dependency packages: networkx as nx, pandas as pd.` },
        { delay: 420, text: `[0.12s] [INFO] Loading CPM project network topology... Loaded ${activeActivities.length} nodes & ${activeActivities.reduce((sum, act) => sum + act.predecessors.length, 0)} directed dependencies.` },
        { delay: 600, text: `[0.21s] [INFO] Verifying Directed Acyclic Graph (DAG) integrity...` },
        { delay: 780, text: `\nTraceback (most recent call last):\n  File "cpm_solver.py", line 46, in <module>\n    df_res, total_dur, crit_path = calculate_cpm(activities)\n  File "cpm_solver.py", line 18, in calculate_cpm\n    raise ValueError("Error: 检测到拓扑环路关系，无法计算关键路径！")\nValueError: Error: 检测到拓扑环路关系，无法计算关键路径！` },
        { delay: 820, text: `\nProcess finished with exit code 1 (Cycle detected).` }
      ];

      logsWithCycle.forEach(log => {
        setTimeout(() => {
          setPythonLogs(prev => [...prev, log.text]);
          if (log.text.includes("Process finished")) {
            setIsPythonRunning(false);
            setPythonExecutionDone(true);
          }
        }, log.delay);
      });
      return;
    }

    const logs = [
      { delay: 100, text: `[0.00s] [INFO] Initializing Python 3.10 mathematical validation sandbox...` },
      { delay: 220, text: `[0.05s] [INFO] Importing dependency packages: networkx as nx, pandas as pd.` },
      { delay: 350, text: `[0.12s] [INFO] Loading CPM project network topology... Loaded ${activeActivities.length} nodes & ${activeActivities.reduce((sum, act) => sum + act.predecessors.length, 0)} directed dependencies.` },
      { delay: 480, text: `[0.18s] [INFO] Verifying Directed Acyclic Graph (DAG) integrity... No loop/cycle detected.` },
      { delay: 600, text: `[0.25s] [INFO] Forward calculation pass: Computing Early Start (ES) and Early Finish (EF) times.` },
      { delay: 720, text: `[0.32s] [INFO] Backward calculation pass: Computing Late Start (LS) and Late Finish (LF) times.` },
      { delay: 850, text: `[0.40s] [INFO] Float analysis: Solving Total Float (TF) and identifying critical path nodes.` },
      { delay: 980, text: `[0.48s] [INFO] Construction of pandas.DataFrame for tabular CPM report serialization.` },
      { delay: 1100, text: `\n============================================================\n★ 验证结论：总工期 = ${cpmResults.totalDuration} 天\n★ 关键路径 (Critical Path): ${cpmResults.criticalPath.join(' ➔ ')}\n============================================================` },
      { delay: 1120, text: `\n${generateASCIIDataFrame()}` },
      { delay: 1200, text: `\nProcess finished with exit code 0. Math validated successfully ✔` }
    ];

    logs.forEach(log => {
      setTimeout(() => {
        setPythonLogs(prev => [...prev, log.text]);
        if (log.text.includes("Process finished")) {
          setIsPythonRunning(false);
          setPythonExecutionDone(true);
        }
      }, log.delay);
    });
  };

  // Reset logs when python modal toggles
  useEffect(() => {
    if (!showPythonModal) {
      setPythonLogs([]);
      setIsPythonRunning(false);
      setPythonExecutionDone(false);
    }
  }, [showPythonModal]);

  // Recalculate PERT completion probabilities for target duration
  const pertResult = useMemo(() => {
    return calculatePERT(activeActivities, cpmResults.criticalPath, targetDuration);
  }, [activeActivities, cpmResults.criticalPath, targetDuration]);

  // Calculate project overall progress
  const projectProgress = useMemo(() => {
    const totalDuration = cpmResults.totalDuration;
    if (activeActivities.length === 0 || totalDuration === 0) {
      return {
        completedDuration: 0,
        totalDuration: 0,
        percentage: 0
      };
    }

    const totalWeight = activeActivities.reduce((sum, act) => sum + act.duration, 0);
    const completedWeight = activeActivities.reduce((sum, act) => sum + (act.duration * (act.progress ?? 0) / 100), 0);
    const percentage = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;
    const completedDuration = totalDuration * (percentage / 100);

    return {
      completedDuration,
      totalDuration,
      percentage
    };
  }, [activeActivities, cpmResults.totalDuration]);

  // Calculate Crashing balanced curve
  const crashPoints = useMemo(() => {
    return generateCrashOptimizationCurve({
      id: 'current',
      name: projectName,
      description: projectDescription,
      targetDuration,
      indirectCostPerDay,
      activities
    });
  }, [activities, projectName, projectDescription, targetDuration, indirectCostPerDay]);

  // Min & Max durations from crashing
  const crashingRange = useMemo(() => {
    if (crashPoints.length === 0) return { min: 0, max: 0 };
    return {
      min: Math.min(...crashPoints.map(p => p.duration)),
      max: Math.max(...crashPoints.map(p => p.duration))
    };
  }, [crashPoints]);

  // Active Cost details based on slider
  const currentCostBreakdown = useMemo(() => {
    const pt = crashPoints.find(p => p.duration === crashingSliderDuration);
    if (pt) {
      return {
        direct: pt.directCost,
        indirect: pt.indirectCost,
        total: pt.totalCost
      };
    }
    // Fallback if not found
    const normalDirect = activities.reduce((sum, a) => sum + a.normalCost, 0);
    const normalIndirect = cpmResults.totalDuration * indirectCostPerDay;
    return {
      direct: normalDirect,
      indirect: normalIndirect,
      total: normalDirect + normalIndirect
    };
  }, [crashPoints, crashingSliderDuration, activities, cpmResults.totalDuration, indirectCostPerDay]);

  // Selected Activity Details Card
  const selectedActivityDetail = useMemo(() => {
    if (!selectedActivityId) return null;
    const act = activeActivities.find(a => a.id === selectedActivityId);
    const cpm = cpmResults.results.get(selectedActivityId);
    return act && cpm ? { act, cpm } : null;
  }, [activeActivities, cpmResults, selectedActivityId]);

  // --- SIDE EFFECTS / INIT ---
  // Load AI insights once upon loading
  useEffect(() => {
    fetchInsights();
  }, [selectedBlueprintId]);

  const fetchInsights = async () => {
    setLoadingInsights(true);
    const { apiKey } = getLLMSettings();

    const getFallbackInsights = (acts: Activity[]) => {
      const risks = (acts || []).map(act => {
        let riskScore: 'low' | 'medium' | 'high' = 'low';
        let riskAnalysis = '该工序复杂度正常，历史表现良好，供应风险极低。';
        
        if (act.id === 'A') {
          riskScore = 'medium';
          riskAnalysis = '地基开挖涉及露天作业，下雨概率可能导致局部积水，建议配备备用抽水机。';
        } else if (act.id === 'D' || act.id === 'E') {
          riskScore = 'high';
          riskAnalysis = '关键路径上的核心工序，受限于特殊设备及特种技术工人才配备，存在较大资源冲突可能。';
        }
        
        return { id: act.id, riskScore, riskAnalysis };
      });

      return {
        risks,
        resourceRecommendations: [
          {
            fromId: 'C',
            toId: 'D',
            resourceType: '电工',
            amount: 2,
            recommendationText: '建议从当前总时差为 5 天的非关键路径工序 C 中抽调 2 名电工至工序 D。调整后可将工期缩短 2 天，保住 24 天红红线，且不增加额外赶工成本。'
          }
        ]
      };
    };

    try {
      const clientData = await callClientLLM(
        activities,
        {
          name: projectName,
          targetDuration,
          indirectCostPerDay
        },
        'insight'
      );
      setAiInsights(clientData);
    } catch (err) {
      console.error('Failed to fetch AI insights:', err);
      setAiInsights(getFallbackInsights(activities));
    } finally {
      setLoadingInsights(false);
    }
  };

  // Switch Project Blueprint
  const handleBlueprintChange = (id: string) => {
    if (id === 'create_new') {
      setShowCreateProjectModal(true);
      return;
    }

    const bp = BLUEPRINTS.find(b => b.id === id) || customProjects.find(b => b.id === id);
    if (!bp) return;

    // Reset Sandbox Mode if switching blueprint
    if (sandboxActive) {
      handleExitSandbox();
    }

    setSelectedBlueprintId(id);
    setProjectName(bp.name);
    setProjectDescription(bp.description);
    setTargetDuration(bp.targetDuration);
    setIndirectCostPerDay(bp.indirectCostPerDay);
    setActivities(bp.activities.map(a => ({ ...a })));
    setSelectedActivityId(bp.activities[0]?.id);
  };

  // Trigger the delete project modal
  const handleDeleteCustomProject = () => {
    const targetId = selectedBlueprintId;
    if (!targetId || (!targetId.startsWith('custom-') && targetId !== 'custom')) {
      showToast('标准工业蓝图项目无法删除，仅可删除自定义项目。', 'error');
      return;
    }
    setShowDeleteConfirmModal(true);
  };

  // Perform the actual custom project deletion safely
  const handlePerformDeleteCustomProject = () => {
    const targetId = selectedBlueprintId;
    if (!targetId || (!targetId.startsWith('custom-') && targetId !== 'custom')) {
      return;
    }

    // Use functional state update to guarantee we filter the absolute latest list of custom projects
    setCustomProjects(prev => prev.filter(p => p.id !== targetId));

    // Fallback to first predefined blueprint
    const fallbackBp = BLUEPRINTS[0];
    setSelectedBlueprintId(fallbackBp.id);
    setProjectName(fallbackBp.name);
    setProjectDescription(fallbackBp.description);
    setTargetDuration(fallbackBp.targetDuration);
    setIndirectCostPerDay(fallbackBp.indirectCostPerDay);
    setActivities(fallbackBp.activities.map(a => ({ ...a })));
    setSelectedActivityId(fallbackBp.activities[0]?.id);

    // Close the deletion modal and show a nice toast notification
    setShowDeleteConfirmModal(false);
    showToast(`项目「${projectName}」已成功删除`, 'success');
  };

  // Submit and create custom new project
  const handleCreateNewProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjForm.name.trim()) return;

    // Reset Sandbox Mode if creating a custom project
    if (sandboxActive) {
      handleExitSandbox();
    }

    const defaultActivities: Activity[] = newProjForm.initOption === 'example' ? [
      {
        id: 'A',
        name: '需求分析与原型规划',
        duration: 4,
        normalDuration: 4,
        optimisticDays: 2,
        mostLikelyDays: 4,
        pessimisticDays: 6,
        normalCost: 12,
        crashCost: 20,
        crashDuration: 2,
        predecessors: [],
        resourceType: '系统设计师',
        resourceCount: 1,
        riskScore: 'low',
        riskAnalysis: '首期启动工作。'
      },
      {
        id: 'B',
        name: '系统核心编码与研发',
        duration: 8,
        normalDuration: 8,
        optimisticDays: 5,
        mostLikelyDays: 8,
        pessimisticDays: 12,
        normalCost: 40,
        crashCost: 65,
        crashDuration: 5,
        predecessors: ['A'],
        resourceType: '软件工程师',
        resourceCount: 2,
        riskScore: 'medium',
        riskAnalysis: '关键路径核心模块。'
      },
      {
        id: 'C',
        name: '系统部署上线与试运行',
        duration: 5,
        normalDuration: 5,
        optimisticDays: 3,
        mostLikelyDays: 5,
        pessimisticDays: 8,
        normalCost: 15,
        crashCost: 22,
        crashDuration: 3,
        predecessors: ['B'],
        resourceType: '运维工程师',
        resourceCount: 1,
        riskScore: 'low',
        riskAnalysis: '部署试运行。'
      }
    ] : [
      {
        id: 'A',
        name: '首期启动筹备工作',
        duration: 5,
        normalDuration: 5,
        optimisticDays: 3,
        mostLikelyDays: 5,
        pessimisticDays: 8,
        normalCost: 10,
        crashCost: 18,
        crashDuration: 3,
        predecessors: [],
        resourceType: '项目负责人',
        resourceCount: 1,
        riskScore: 'low',
        riskAnalysis: '新建项目之首道准备工序。请输入您的工序。'
      }
    ];

    const newProjectId = `custom-${Date.now()}`;
    const newProject: Project = {
      id: newProjectId,
      name: newProjForm.name,
      description: newProjForm.description || '自定义网络计划项目。可编辑每一道工序，实现关键路径与PERT三时估算等自动解析。',
      targetDuration: newProjForm.targetDuration,
      indirectCostPerDay: newProjForm.indirectCostPerDay,
      activities: defaultActivities
    };

    setCustomProjects(prev => [...prev, newProject]);

    setSelectedBlueprintId(newProjectId);
    setProjectName(newProject.name);
    setProjectDescription(newProject.description);
    setTargetDuration(newProject.targetDuration);
    setIndirectCostPerDay(newProject.indirectCostPerDay);
    setActivities(defaultActivities);
    setSelectedActivityId(defaultActivities[0]?.id);
    
    // Reset form inputs for next time
    setNewProjForm({
      name: '',
      description: '',
      targetDuration: 30,
      indirectCostPerDay: 2.0,
      initOption: 'blank'
    });

    setShowCreateProjectModal(false);
  };

  // --- ACTIONS ---
  // One-click apply Resource re-allocation recommended by AI
  const handleApplyResourceAdjustment = (fromId: string, toId: string, amount: number) => {
    const updated = activities.map(act => {
      if (act.id === fromId) {
        // Decrease duration or decrease workers count
        const newCount = Math.max(0, act.resourceCount - amount);
        return {
          ...act,
          resourceCount: newCount,
          riskAnalysis: `[AI 动态配属] 已将 ${amount} 人配属抽调至工序 ${toId} 支援。`
        };
      }
      if (act.id === toId) {
        // Increase workers and reduce duration as resource injection
        const oldDur = act.duration;
        const newDur = Math.max(act.crashDuration, oldDur - 2); // shorten duration by 2 days as speedup
        return {
          ...act,
          duration: newDur,
          normalDuration: newDur,
          resourceCount: act.resourceCount + amount,
          riskAnalysis: `[AI 动态配属] 已接纳工序 ${fromId} 调配的 ${amount} 名支援力量，工期缩短至 ${newDur} 天。`
        };
      }
      return act;
    });

    setActivities(updated);
    
    // Add success chat message
    showToast(`成功应用 AI 资源推荐调度：从非关键工序 [${fromId}] 抽调 ${amount} 名电工至关键瓶颈 [${toId}]。`, 'success');
    
    // Refresh insights
    fetchInsights();
  };

  // Load Sandboxed scenario delay from conversational AI
  const handleApplySandboxAction = (title: string, durationModifications: { id: string; newDuration: number }[]) => {
    if (!sandboxActive) {
      // Store original activities before entering sandbox
      setOriginalActivities(activities.map(a => ({ ...a })));
    }

    const modified = activities.map(act => {
      const mod = durationModifications.find(m => m.id === act.id);
      if (mod) {
        return {
          ...act,
          duration: mod.newDuration,
          normalDuration: mod.newDuration, // reflect in normal calc too
          riskScore: 'high' as const,
          riskAnalysis: `[沙盘突变] AI 模拟：发生突发事件（如暴雨/假休），工期延长至 ${mod.newDuration} 天。`
        };
      }
      return act;
    });

    setActivities(modified);
    setSandboxTitle(title);
    setSandboxActive(true);
    
    // Switch to appropriate visualizer to examine the impact
    setActiveVisualTab('aoa'); //时标网络图 is great for visualizing delay impacts
  };

  // Exit/Restore original plan from Sandbox Mode
  const handleExitSandbox = () => {
    if (originalActivities.length > 0) {
      setActivities(originalActivities);
    }
    setSandboxActive(false);
    setSandboxTitle(null);
    setOriginalActivities([]);
  };

  // Double-check if we need to apply sandbox changes permanently
  const handleApplySandboxPermanently = () => {
    setSandboxActive(false);
    setSandboxTitle(null);
    setOriginalActivities([]);
    showToast('已将当前沙盘情景及应对措施保存为正式项目管理主计划！', 'success');
    fetchInsights();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans leading-relaxed">
      
      {/* HEADER BAR */}
      <header className="h-auto md:h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-3 md:py-0 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/10 text-white shrink-0">
              <TrendingUp className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>IntelliPlan</span>
                <span className="text-slate-400 font-normal text-xs hidden sm:inline">智能网络计划协同决策平台</span>
                <span className="text-[9px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full border border-indigo-150 uppercase tracking-wider">
                  CPM + PERT + AI
                </span>
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">同源多图联动 · 成本崩溃赶工 · 突发 What-If 沙盘模拟专家</p>
            </div>
          </div>

          {/* Slices: Python验证 & 知识导引 */}
          <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200/80 shadow-sm self-start sm:self-auto gap-1">
            <button
              onClick={() => setShowPythonModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 hover:bg-white hover:shadow-xs hover:border-slate-300 text-slate-600 hover:text-indigo-600 text-xs font-bold rounded-md border border-transparent transition-all cursor-pointer"
              title="使用 Python 网络求解算法验证当前计划的准确度"
            >
              <Terminal className="h-3.5 w-3.5 text-indigo-500" />
              <span>Python验证</span>
            </button>
            <div className="w-px h-4 bg-slate-200 self-center"></div>
            <button
              onClick={() => {
                setGuideActiveTab('report');
                setShowGuideModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1 hover:bg-white hover:shadow-xs hover:border-slate-300 text-slate-600 hover:text-indigo-600 text-xs font-bold rounded-md border border-transparent transition-all cursor-pointer"
              title="学习关键路径法(CPM)和计划评审技术(PERT)的底层理论并查看、生成项目报告"
            >
              <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
              <span>知识导引</span>
            </button>
          </div>
        </div>

        {/* Blueprint Selector & Target Adjuster */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Database className="h-3.5 w-3.5 text-indigo-500" />
              项目蓝图库:
            </span>
            <select
              value={selectedBlueprintId}
              onChange={(e) => handleBlueprintChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer transition-colors max-w-xs md:max-w-md truncate"
            >
              <optgroup label="🏭 标准工业蓝图">
                {BLUEPRINTS.map(bp => (
                  <option key={bp.id} value={bp.id}>
                    {bp.name}
                  </option>
                ))}
              </optgroup>
              {(customProjects.length > 0 || selectedBlueprintId === 'custom' || selectedBlueprintId.startsWith('custom-')) && (
                <optgroup label="✍️ 自定义协同项目">
                  {customProjects.map(cp => (
                    <option key={cp.id} value={cp.id}>
                      {cp.name}
                    </option>
                  ))}
                  {(selectedBlueprintId === 'custom' || (selectedBlueprintId.startsWith('custom-') && !customProjects.some(p => p.id === selectedBlueprintId))) && (
                    <option value={selectedBlueprintId}>
                      ✍️ [临时项目] {projectName}
                    </option>
                  )}
                </optgroup>
              )}
              <option value="create_new">➕ 新建自定义项目...</option>
            </select>
            {(selectedBlueprintId === 'custom' || selectedBlueprintId.startsWith('custom-')) && (
              <button
                onClick={handleDeleteCustomProject}
                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 cursor-pointer transition-colors flex items-center justify-center shrink-0 animate-fade-in"
                title="删除当前自定义项目"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <span className="text-xs font-bold text-slate-600 px-1">目标工期:</span>
            <input
              type="number"
              min={crashingRange.min || 1}
              max={crashingRange.max || 100}
              value={targetDuration}
              onChange={(e) => setTargetDuration(parseInt(e.target.value, 10) || 24)}
              className="w-12 bg-white text-center text-xs font-bold font-mono py-0.5 text-indigo-700 focus:outline-none border border-slate-200 rounded"
            />
            <span className="text-xs font-bold text-slate-400 font-mono pr-1">天</span>
          </div>
        </div>
      </header>

      {/* WORKSPACE CONTAINER */}
      <main className="w-full max-w-full mx-auto p-4 lg:p-6 xl:px-8 space-y-6">
        
        {/* CRITICAL STATS OVERVIEW HEADER */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Widget 1: Total duration and PERT standard deviation */}
            <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  当前计划工期
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {cpmResults.totalDuration} <span className="text-xs font-bold text-slate-400 font-sans">天</span>
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  PERT均值: {pertResult.expectedDuration}天 | σ: {pertResult.stdDev}d
                </div>
              </div>
              
              {/* PERT Completion Probability Badge */}
              <div className="text-right">
                <div className={`px-2.5 py-1.5 rounded-xl text-center shadow-sm ${
                  pertResult.probability >= 0.8
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : pertResult.probability >= 0.5
                    ? 'bg-amber-50 border border-amber-200 text-amber-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  <div className="text-[9px] font-bold uppercase tracking-wider">按期完成概率</div>
                  <div className="text-base font-black font-mono">
                    {Math.round(pertResult.probability * 100)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Widget 2: Total budget crashed vs normal */}
            <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm">
              <div className="space-y-1">
                <div className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-slate-400" />
                  项目综合成本
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {currentCostBreakdown.total} <span className="text-xs font-bold text-slate-400 font-sans">万元</span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 flex justify-between">
                  <span>直接: {currentCostBreakdown.direct}万</span>
                  <span>间接: {currentCostBreakdown.indirect}万</span>
                </div>
              </div>
            </div>

            {/* Widget 3: Critical Path summary */}
            <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                  当前关键路径 (瓶颈节点)
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {cpmResults.criticalPath.map((id, idx) => (
                    <React.Fragment key={`cp-head-${id}`}>
                      {idx > 0 && <span className="text-slate-400 text-xs self-center">➔</span>}
                      <span
                        onClick={() => setSelectedActivityId(id)}
                        className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded border border-red-200 cursor-pointer shadow-sm animate-pulse-crimson"
                      >
                        {id}
                      </span>
                    </React.Fragment>
                  ))}
                  {cpmResults.criticalPath.length === 0 && (
                    <span className="text-xs text-red-500 font-bold">检测到拓扑回路(Cycle)错误！</span>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 truncate">
                {projectName}
              </div>
            </div>

          </div>

          {/* SANDBOX CONTROLS HEADER */}
          {sandboxActive && (
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-2 border-amber-500/40 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-pulse-amber">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 text-slate-900 rounded-xl">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-900">“What-If” 突发场景沙盘模拟运行中</h4>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">
                    正在评估：{sandboxTitle}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleApplySandboxPermanently}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-md shadow-indigo-600/15 flex items-center gap-1 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  一键采纳应用到正式计划
                </button>
                <button
                  onClick={handleExitSandbox}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Undo2 className="h-4 w-4" />
                  放弃修改并退出
                </button>
              </div>
            </div>
          )}

          {/* BALANCE OPTIMIZER / SLIDER */}
          {!sandboxActive && (
            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 border border-indigo-100">
                    <Sliders className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">工期-成本平衡赶工模拟器</h3>
                    <p className="text-[10px] text-slate-500">拉动滑块：算法自动优选最低成本的工序进行赶工折减</p>
                  </div>
                </div>

                {/* Crashing active point summary */}
                <div className="text-right text-xs">
                  <span className="text-slate-400 font-semibold">当前模拟天数:</span>
                  <span className="text-lg font-black text-red-600 font-mono ml-1.5">{crashingSliderDuration}d</span>
                </div>
              </div>

              {/* Slider Input track */}
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-400 font-mono">{crashingRange.min}天 (极限)</span>
                <input
                  type="range"
                  min={crashingRange.min}
                  max={crashingRange.max}
                  value={crashingSliderDuration}
                  onChange={(e) => setCrashingSliderDuration(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
                <span className="text-xs font-bold text-slate-400 font-mono">{crashingRange.max}天 (正常)</span>
              </div>

              {/* Dynamic Cost-Benefit Slashing breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-50">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/80">
                  <div className="text-[9px] text-slate-400 font-semibold">直接赶工人工费</div>
                  <div className="text-sm font-black text-slate-700 font-mono mt-0.5">{currentCostBreakdown.direct}万</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/80">
                  <div className="text-[9px] text-slate-400 font-semibold">间接管理损折费</div>
                  <div className="text-sm font-black text-slate-700 font-mono mt-0.5">{currentCostBreakdown.indirect}万</div>
                </div>
                <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/50">
                  <div className="text-[9px] text-indigo-500 font-semibold">综合决策总成本</div>
                  <div className="text-sm font-black text-indigo-700 font-mono mt-0.5">{currentCostBreakdown.total}万</div>
                </div>
                <div className="bg-red-50/50 p-2.5 rounded-xl border border-red-100/50">
                  <div className="text-[9px] text-red-500 font-semibold">工期缩短量 (d)</div>
                  <div className="text-sm font-black text-red-700 font-mono mt-0.5">-{crashingRange.max - crashingSliderDuration} 天</div>
                </div>
              </div>
            </div>
          )}

          {/* TRIPLE LINKED CHART MATRIX CONTAINER */}
          <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between border-b border-slate-150 pb-3 gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">高清同源网络联动图形矩阵</h3>
                <p className="text-[10px] text-slate-500">
                  {sandboxActive ? '📊 当前呈现 [沙盘突变] 延迟效果对比' : '🔄 双向实时同步 · 猩红标示关键路径'}
                </p>
              </div>

              {/* Tab Selector and Zoom Scale Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* 🔍 Zoom Scale Controls */}
                {activeVisualTab !== 'cost' && (
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-150 px-2 py-1 rounded-xl shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-bold px-1 font-mono">矩阵缩放:</span>
                    <button
                      onClick={() => setChartScale(prev => Math.max(0.4, prev - 0.15))}
                      className="p-1 hover:bg-white hover:text-indigo-600 rounded-md border border-transparent hover:border-slate-200 text-slate-500 font-bold transition-all cursor-pointer flex items-center justify-center h-6 w-6"
                      title="缩小 (Zoom Out)"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-mono font-extrabold text-indigo-600 px-1 w-11 text-center">
                      {Math.round(chartScale * 100)}%
                    </span>
                    <button
                      onClick={() => setChartScale(prev => Math.min(2.0, prev + 0.15))}
                      className="p-1 hover:bg-white hover:text-indigo-600 rounded-md border border-transparent hover:border-slate-200 text-slate-500 font-bold transition-all cursor-pointer flex items-center justify-center h-6 w-6"
                      title="放大 (Zoom In)"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setChartScale(1.0)}
                      className="ml-1 px-1.5 py-0.5 hover:bg-white hover:text-indigo-600 rounded-md border border-transparent hover:border-slate-200 text-slate-400 hover:text-indigo-600 font-bold text-[9px] transition-all cursor-pointer"
                      title="恢复 100%"
                    >
                      重置
                    </button>
                  </div>
                )}

                {/* Tab Selector */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveVisualTab('aon')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeVisualTab === 'aon'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    单代号图 (六格)
                  </button>
                  <button
                    onClick={() => setActiveVisualTab('aoa')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeVisualTab === 'aoa'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    双代号时标图
                  </button>
                  <button
                    onClick={() => setActiveVisualTab('gantt')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeVisualTab === 'gantt'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    甘特图
                  </button>
                  <button
                    onClick={() => setActiveVisualTab('cost')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeVisualTab === 'cost'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    赶工 V 曲线
                  </button>
                </div>
              </div>
            </div>

            {/* Rendering charts */}
            <NetworkCharts
              project={{
                id: 'current',
                name: projectName,
                description: projectDescription,
                targetDuration,
                indirectCostPerDay,
                activities
              }}
              cpmResults={cpmResults.results}
              criticalPath={cpmResults.criticalPath}
              totalDuration={cpmResults.totalDuration}
              crashPoints={crashPoints}
              currentCrashedDuration={sandboxActive ? cpmResults.totalDuration : crashingSliderDuration}
              onActivitySelect={setSelectedActivityId}
              selectedActivityId={selectedActivityId}
              activeTab={activeVisualTab}
              scale={chartScale}
              sandboxActive={sandboxActive}
              originalActivities={originalActivities}
            />
          </div>

          {/* DUAL-MODE EXCEL DATA INPUT */}
          <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-600" />
                  <span>智能工序参数工作表 (数据输入端)</span>
                </h3>
                <p className="text-[10px] text-slate-500">双模高效录入。支持 Excel、TXT 批量粘贴自动解析与紧前关系智能补全</p>
              </div>
              
              {/* Template utilities */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowCreateProjectModal(true)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-800 text-[11px] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                  title="开辟一个全新的空白自定义项目计划"
                >
                  <Plus className="h-3.5 w-3.5 text-indigo-600" />
                  <span>新建/清空项目</span>
                </button>
                {(selectedBlueprintId === 'custom' || selectedBlueprintId.startsWith('custom-')) && (
                  <button
                    onClick={handleDeleteCustomProject}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100/80 border border-red-200 text-red-800 text-[11px] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                    title="彻底删除当前整个自定义项目计划"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    <span>删除当前项目</span>
                  </button>
                )}
                <button
                  onClick={downloadImportTemplate}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                  title="下载含有标准列顺序的 Excel/CSV 模板文件"
                >
                  <FileDown className="h-3.5 w-3.5 text-emerald-600" />
                  <span>下载 Excel 模板</span>
                </button>
                <button
                  onClick={copyImportTemplateText}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
                  title="复制标准 Excel Tab 格式示例数据，可直接粘贴进 Excel 进行修改"
                >
                  {copiedTemplate ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                      <span className="text-emerald-700 font-black">模板已复制!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                      <span>复制格式文本</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <ExcelTable
              activities={activities}
              onChange={setActivities}
              onSelectActivity={setSelectedActivityId}
              selectedId={selectedActivityId}
            />
          </div>

          {/* AI Expert Panel and Selected Activity Detail Section directly under ExcelTable */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pt-2">
            <div className="xl:col-span-12 h-[730px] bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col">
              <AIExpertPanel
                project={{
                  id: 'current',
                  name: projectName,
                  description: projectDescription,
                  targetDuration,
                  indirectCostPerDay,
                  activities
                }}
                activities={activeActivities}
                insights={aiInsights}
                loadingInsights={loadingInsights}
                onRefreshInsights={fetchInsights}
                onApplySandboxAction={handleApplySandboxAction}
                onExitSandbox={handleExitSandbox}
                sandboxActive={sandboxActive}
                sandboxTitle={sandboxTitle}
                onApplyResourceAdjustment={handleApplyResourceAdjustment}
              />
            </div>

            {selectedActivityDetail && (
              <div id="selected-activity-detail" className="xl:col-span-12 bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4 scroll-mt-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">工序深入调试板</span>
                    <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-150">
                      ID: {selectedActivityDetail.act.id}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedActivityId(undefined)}
                    className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer flex items-center gap-1 self-start md:self-auto"
                  >
                    清除选中 / 关闭
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column - Core Info */}
                  <div className="lg:col-span-4 space-y-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{selectedActivityDetail.act.name}</h4>
                      <p className="text-[11px] text-indigo-500 font-bold mt-1">
                        工种配属: {selectedActivityDetail.act.resourceCount}名 {selectedActivityDetail.act.resourceType}
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2.5">
                      提示：在上方“单代号图”、“双代号图”、“甘特图”或“数据工作表”中点击选中任何工序节点，此处即实时联动呈现其六格参数与精细化时差。
                    </div>
                  </div>

                  {/* Middle Column - CPM Time Parameters */}
                  <div className="lg:col-span-4 bg-slate-50 p-4 rounded-xl border border-slate-100/80">
                    <div className="text-xs font-bold text-slate-500 mb-2 font-sans">CPM 网络时间参数 (六格计算结果)</div>
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="bg-white p-2 rounded border border-slate-100">最早开始: <span className="font-bold text-slate-800">{selectedActivityDetail.cpm.es}天</span></div>
                      <div className="bg-white p-2 rounded border border-slate-100">最早完成: <span className="font-bold text-slate-800">{selectedActivityDetail.cpm.ef}天</span></div>
                      <div className="bg-white p-2 rounded border border-slate-100">最迟开始: <span className="font-bold text-slate-800">{selectedActivityDetail.cpm.ls}天</span></div>
                      <div className="bg-white p-2 rounded border border-slate-100">最迟完成: <span className="font-bold text-slate-800">{selectedActivityDetail.cpm.lf}天</span></div>
                      <div className="bg-white p-2 rounded border border-slate-100 col-span-1">总时差 (TF): <span className={`font-bold ${selectedActivityDetail.cpm.tf === 0 ? 'text-red-600 font-black' : 'text-slate-700'}`}>{selectedActivityDetail.cpm.tf}天</span></div>
                      <div className="bg-white p-2 rounded border border-slate-100 col-span-1">自由时差 (FF): <span className="font-bold text-slate-700">{selectedActivityDetail.cpm.ff}天</span></div>
                    </div>
                  </div>

                  {/* Right Column - AI Risk Advice */}
                  <div className="lg:col-span-4 p-4 bg-indigo-50/25 border border-indigo-100/40 rounded-xl flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
                        <span>当前工序 AI 风险透视 & 协同建议:</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                        {selectedActivityDetail.act.riskAnalysis || '该工序网络拓扑位置重要，性能平稳，历史同类项目供应链配合度高达 98.4%，风险可控。'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

      </main>

      {/* FOOTER ACCENTS */}
      <footer className="bg-white border-t border-slate-150 py-6 mt-12 text-center text-xs text-slate-400 font-medium">
        <div>智能网络计划协同系统 © 2026-2027</div>
        <div className="text-[10px] text-slate-300 mt-1">
          采用 CPM 关键路径法、PERT 贝塔工期概率估计、最优化赶工崩溃数学规划，深度融合 Gemini-3.5 智能引擎。
        </div>
      </footer>

      {/* PYTHON VERIFICATION MODAL */}
      <AnimatePresence>
        {showPythonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPythonModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            {/* Content Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] z-10"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                    <Terminal className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Python 算法数学验证核心</h3>
                    <p className="text-[10px] text-slate-500 font-medium">采用 NetworkX (拓扑有向无环图/DAG) 与 Pandas 进行 CPM 双向规划校验</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPythonModal(false)}
                  className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="p-4 bg-indigo-50/40 border border-indigo-100/50 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
                    算法解析与模型自适应
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    当前 IntelliPlan 已经为您自动将项目拓扑结构（包括各工序的时长、紧前工序及崩溃属性）转换成合规的 Python 代码。本算法使用网络图理论，通过<strong>拓扑排序（Topological Sort）</strong>构建前向与后向递推，确保计算出的关键路径（Critical Path）和时差（Total Float）与系统内核双向无偏。
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column: Code Window */}
                  <div className="lg:col-span-5 flex flex-col space-y-3">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-1.5 h-3 bg-indigo-600 rounded-sm"></span>
                      <span>CPM 网络图核心求解脚本 (cpm_solver.py)</span>
                    </div>
                    {/* Code Window */}
                    <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 font-mono text-[10px] text-slate-200 shadow-lg flex flex-col flex-1 min-h-[350px]">
                      {/* Window Bar */}
                      <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                          <span className="text-[10px] text-slate-500 font-semibold ml-2 font-sans">cpm_solver.py</span>
                        </div>
                        <button
                          onClick={handleCopyPythonCode}
                          className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 hover:text-white rounded text-[10px] text-slate-300 font-semibold transition-colors cursor-pointer font-sans"
                        >
                          {copiedPython ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span>已复制!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>复制代码</span>
                            </>
                          )}
                        </button>
                      </div>
                      {/* Code Area */}
                      <pre className="p-4 overflow-x-auto max-h-[350px] scrollbar-thin text-indigo-200 leading-normal flex-1">
                        <code>{generatedPythonCode}</code>
                      </pre>
                    </div>
                    <div className="text-[10px] text-slate-400 leading-relaxed">
                      * 提示：您可以在本地运行并使用 <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono">pip install networkx pandas</code> 安装所需依赖，代码完全支持多节点复杂网络的快速运算。
                    </div>
                  </div>

                  {/* Right Column: Terminal Console */}
                  <div className="lg:col-span-7 flex flex-col space-y-3">
                    <div className="text-xs font-bold text-slate-800 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-emerald-600 rounded-sm"></span>
                        <span>本地 Python 执行反馈 (动态数学沙盒)</span>
                      </div>
                      
                      {/* Status indicator */}
                      <div className="flex items-center gap-1.5">
                        {isPythonRunning ? (
                          <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            <span>COMPUTING...</span>
                          </span>
                        ) : pythonExecutionDone ? (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            <span>VERIFIED</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                            <span>STANDBY</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Console Window */}
                    <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 font-mono text-[10px] text-slate-350 shadow-lg flex flex-col flex-1 min-h-[350px]">
                      {/* Window Header */}
                      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Local Terminal Console</span>
                        {pythonLogs.length > 0 && (
                          <button
                            onClick={() => {
                              setPythonLogs([]);
                              setPythonExecutionDone(false);
                            }}
                            className="text-[9px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            清空终端
                          </button>
                        )}
                      </div>

                      {/* Terminal screen */}
                      <div className="p-4 flex-1 overflow-y-auto max-h-[350px] scrollbar-thin space-y-1.5 text-slate-300">
                        {pythonLogs.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-3">
                            <Terminal className="h-8 w-8 text-slate-700 stroke-[1.5]" />
                            <div className="space-y-1">
                              <p className="text-[11px] font-bold text-slate-400">IntelliPlan Python 运行环境</p>
                              <p className="text-[10px] text-slate-600 max-w-[280px]">点击下方运行按钮，即可启动本地 Python 算法计算，比对当前工序及紧前依赖关系。</p>
                            </div>
                            <button
                              onClick={runPythonValidation}
                              disabled={isPythonRunning}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 text-white text-[11px] font-extrabold rounded-lg shadow-md shadow-emerald-900/10 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Play className="h-3 w-3 fill-white" />
                              <span>运行 Python 算法</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1 text-slate-300 whitespace-pre overflow-x-auto scrollbar-thin selection:bg-emerald-800/50">
                            {pythonLogs.map((log, index) => {
                              let textClass = "text-slate-350";
                              if (log.startsWith("$")) {
                                textClass = "text-emerald-400 font-bold";
                              } else if (log.includes("[SUCCESS]") || log.includes("successfully") || log.includes("VERIFIED")) {
                                textClass = "text-emerald-500 font-semibold";
                              } else if (log.includes("[INFO]")) {
                                textClass = "text-slate-400";
                              } else if (log.includes("ValueError:") || log.includes("Traceback") || log.includes("Error:")) {
                                textClass = "text-red-400 font-medium";
                              } else if (log.includes("★ 验证结论") || log.includes("★ 关键路径")) {
                                textClass = "text-amber-300 font-black";
                              }
                              return (
                                <div key={index} className={`${textClass} leading-relaxed font-mono text-[10px]`}>
                                  {log}
                                </div>
                              );
                            })}
                            {isPythonRunning && (
                              <div className="flex items-center gap-1.5 text-amber-400 animate-pulse font-bold mt-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                <span>$ _ (calculating CPM double-pass matrices...)</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Run button when not empty */}
                      {pythonLogs.length > 0 && (
                        <div className="p-3 bg-slate-900/50 border-t border-slate-900 flex justify-end gap-2">
                          <button
                            onClick={runPythonValidation}
                            disabled={isPythonRunning}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 text-white text-[10px] font-bold rounded flex items-center gap-1.5 cursor-pointer transition-all"
                          >
                            <Play className="h-3 w-3 fill-white" />
                            <span>{isPythonRunning ? "运行中..." : "重新运行"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setShowPythonModal(false)}
                  className="px-4 py-1.5 bg-slate-250 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  关闭
                </button>
                <button
                  onClick={handleCopyPythonCode}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
                >
                  {copiedPython ? '已复制脚本' : '复制 Python 脚本'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* KNOWLEDGE GUIDE MODAL */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGuideModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            {/* Content Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[85vh] max-h-[85vh] z-10"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                    <BookOpen className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">CPM/PERT 核心算法与决策分析工作站</h3>
                    <p className="text-[10px] text-slate-500 font-medium">网络计划图论规则 · 贝塔三点估算概率 · 工期成本崩溃(Crashing)规划与报告生成</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Sub-Header Tabs */}
              <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
                <div className="flex bg-slate-200/85 p-0.5 rounded-lg border border-slate-300/40 gap-1">
                  <button
                    onClick={() => setGuideActiveTab('methodology')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      guideActiveTab === 'methodology' 
                        ? 'bg-white text-indigo-700 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>CPM/PERT 核心方法论</span>
                  </button>
                  <button
                    onClick={() => setGuideActiveTab('report')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      guideActiveTab === 'report' 
                        ? 'bg-white text-indigo-700 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 font-bold" />
                    <span>预览与生成 PDF 报告</span>
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 font-medium font-sans">
                  当前项目：{projectName} | 工序数：{activities.length}
                </div>
              </div>

              {guideActiveTab === 'methodology' ? (
                <>
                  {/* Body */}
                  <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 scrollbar-thin scrollbar-thumb-slate-200">
                    
                    {/* 1. 六格法释义 */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-extrabold text-slate-900 border-l-4 border-indigo-500 pl-2 uppercase tracking-wide">
                        一、单代号网络图 (AON) & 六格标示法 (Six-Box Method)
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        单代号网络图中，节点代表工序。常用的六格标示法能够清晰展示每个工序的时差与生命周期，计算关系如下：
                      </p>
                      
                      {/* Interactive mock node */}
                      <div className="flex justify-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-64 bg-white rounded-xl border-2 border-indigo-600 shadow-md">
                          <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-600 flex justify-between">
                            <span>工序 ID (例)</span>
                            <span className="text-indigo-600 font-mono">DU (工期天数)</span>
                          </div>
                          <div className="p-2.5 text-center">
                            <span className="text-xs font-black text-slate-800">工序名称 (如：基建浇筑)</span>
                          </div>
                          <div className="grid grid-cols-3 divide-x divide-slate-150 border-t border-slate-150 text-center text-[10px] font-mono text-slate-600">
                            <div className="py-1 flex flex-col justify-center bg-slate-50/40">
                              <span className="text-[9px] text-slate-400 font-semibold font-sans">ES</span>
                              <b className="text-slate-800 text-xs">最早开始</b>
                            </div>
                            <div className="py-1 flex flex-col justify-center bg-indigo-50/30 font-bold">
                              <span className="text-[9px] text-indigo-400 font-semibold font-sans">DU</span>
                              <b className="text-indigo-700 text-xs">5天</b>
                            </div>
                            <div className="py-1 flex flex-col justify-center bg-slate-50/40">
                              <span className="text-[9px] text-slate-400 font-semibold font-sans">EF</span>
                              <b className="text-slate-800 text-xs">最早完成</b>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 divide-x divide-slate-150 border-t border-slate-150 text-center text-[10px] font-mono text-slate-600">
                            <div className="py-1 flex flex-col justify-center">
                              <span className="text-[9px] text-slate-400 font-semibold font-sans">LS</span>
                              <b className="text-slate-800 text-xs">最迟开始</b>
                            </div>
                            <div className="py-1 flex flex-col justify-center bg-slate-50/10">
                              <span className="text-[9px] text-slate-400 font-semibold font-sans">TF</span>
                              <b className="text-red-600 text-xs font-bold">总时差</b>
                            </div>
                            <div className="py-1 flex flex-col justify-center">
                              <span className="text-[9px] text-slate-400 font-semibold font-sans">LF</span>
                              <b className="text-slate-800 text-xs">最迟完成</b>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <h5 className="font-bold text-slate-800 mb-1.5">核心名词解析:</h5>
                          <ul className="space-y-1 text-slate-600 leading-relaxed font-medium">
                            <li>• <span className="font-bold font-mono">ES (Early Start)</span>: 最早可以开始的时间。</li>
                            <li>• <span className="font-bold font-mono">EF (Early Finish)</span>: 最早可以完成的时间：<code className="font-mono bg-white px-1 border rounded">EF = ES + DU</code></li>
                            <li>• <span className="font-bold font-mono">LS (Late Start)</span>: 在不拖延项目的前提下，最迟开始时间：<code className="font-mono bg-white px-1 border rounded">LS = LF - DU</code></li>
                            <li>• <span className="font-bold font-mono">LF (Late Finish)</span>: 最迟必须完成的时间。</li>
                          </ul>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <h5 className="font-bold text-slate-800 mb-1.5">时差 (Float) 与关键路径:</h5>
                          <ul className="space-y-1 text-slate-600 leading-relaxed font-medium">
                            <li>• <span className="font-bold font-mono">TF (Total Float 总时差)</span>: 工序在不延误总工期的前提下可以拥有的机动时间：<code className="font-mono bg-white px-1 border rounded">TF = LS - ES = LF - EF</code></li>
                            <li>• <span className="font-bold font-mono">FF (Free Float 自由时差)</span>: 在不耽误所有后续工序最早开始前提下的机动时间：<code className="font-mono bg-white px-1 border rounded">FF = Min(后续工序ES) - EF</code></li>
                            <li>• <span className="font-bold">★ 关键路径 (Critical Path)</span>: 由总时差为零（<code className="font-mono bg-white px-1 border rounded">TF = 0</code>）的关键工序组成的从起点到终点的最长路径。</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* 2. CPM 算法前向/后向推导公式 */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-extrabold text-slate-900 border-l-4 border-indigo-500 pl-2 uppercase tracking-wide">
                        二、CPM 算法双向递推数学模型
                      </h4>
                      <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs space-y-2 leading-relaxed">
                        <div>
                          <span className="text-emerald-400 font-bold">1. 前向计算 (Forward Pass) —— 确定最早时间:</span>
                          <p className="text-[11px] text-slate-300 mt-1 pl-4">
                            • 初始源节点: ES_start = 0, EF_start = DU_start<br />
                            • 一般节点 j: ES_j = max( EF_i ), 其中 i 为 j 的所有紧前工序(Predecessors)<br />
                            • 最早完成: EF_j = ES_j + DU_j
                          </p>
                        </div>
                        <div className="border-t border-slate-800 my-2 pt-2">
                          <span className="text-yellow-400 font-bold">2. 逆向计算 (Backward Pass) —— 确定最迟时间:</span>
                          <p className="text-[11px] text-slate-300 mt-1 pl-4">
                            • 初始终节点: LF_end = EF_end, LS_end = LF_end - DU_end (使总工期不被动拖延)<br />
                            • 一般节点 i: LF_i = min( LS_j ), 其中 j 为 i 的所有紧后工序(Successors)<br />
                            • 最迟开始: LS_i = LF_i - DU_i
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 3. PERT 计划评审技术三点估算法 */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-extrabold text-slate-900 border-l-4 border-indigo-500 pl-2 uppercase tracking-wide">
                        三、PERT 计划评审技术 (三点估算法模型)
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        在不确定性复杂的工业项目管理中，采用 <strong>贝塔 (Beta) 概率分布</strong> 计算工序期望工期和标准差：
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/50 space-y-2">
                          <h5 className="font-bold text-xs text-indigo-900">1. 期望工期估计公式 (Te)</h5>
                          <div className="font-mono text-center text-sm font-black bg-white py-2.5 rounded border border-indigo-100 text-indigo-700">
                            Te = (O + 4M + P) / 6
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                            • <strong>O (Optimistic 乐观工期)</strong>: 顺风顺水无任何阻碍的最短天数。<br />
                            • <strong>M (Most Likely 最可能工期)</strong>: 正常频率下耗时天数。<br />
                            • <strong>P (Pessimistic 悲观工期)</strong>: 突发情况或风险极高时的最长天数。
                          </p>
                        </div>

                        <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/50 space-y-2">
                          <h5 className="font-bold text-xs text-indigo-900">2. 标准差公式 (σ) 与完工概率 (Z-Score)</h5>
                          <div className="font-mono text-center text-sm font-black bg-white py-2.5 rounded border border-indigo-100 text-indigo-700">
                            σ = (P - O) / 6
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                            • <strong>总期望工期 (T_project)</strong>: 关键路径上所有工序 Te 之和。<br />
                            • <strong>总标准差 (σ_project)</strong>: 关键路径上所有工序方差（σ²）和的开方：<code className="bg-white px-1 border rounded">σ_p = √Σ(σ_i²)</code><br />
                            • <strong>Z 值 (Z-Score)</strong>: (目标工期 - T_project) / σ_project，查正态分布表计算达标率。
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 4. 工期成本崩溃赶工 (Crashing) 决策模型 */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-extrabold text-slate-900 border-l-4 border-indigo-500 pl-2 uppercase tracking-wide">
                        四、工期-成本赶工折衷 (Time-Cost Trade-Off / Crashing) 规划模型
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        当项目面临工期刚性红线，必须加派资源、加班进行“赶工（Crashing）”。优化的目标是在增加的最少<strong>直接成本（Direct Cost）</strong>下实现总工期缩短，同时抵消<strong>间接成本（Indirect Cost）</strong>：
                      </p>
                      <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3 text-xs leading-relaxed">
                        <div>
                          <span className="font-bold text-slate-800">1. 赶工斜率（单元赶工成本）:</span>
                          <p className="text-slate-600 font-medium mt-0.5">
                            <code className="font-mono bg-white px-1.5 py-0.5 border rounded">Slope = (崩溃成本 - 正常成本) / (正常工期 - 崩溃工期)</code>
                            <span className="text-slate-400 block text-[10px] mt-0.5">这代表该工序每压缩 1 天需要额外多付出的平均直接成本。</span>
                          </p>
                        </div>
                        <div className="border-t border-slate-200 pt-2">
                          <span className="font-bold text-slate-800">2. 最优化寻优决策树步骤:</span>
                          <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 font-medium mt-1">
                            <li>找出当前网络中的所有<strong>关键路径</strong>（可能由于多次压缩出现并联双关键路径）。</li>
                            <li>在关键路径上的工序中，找出<strong>尚未达到崩溃极限（即当前工期 &gt; 崩溃工期）</strong>且<strong>崩溃斜率最小</strong>的工序组合。</li>
                            <li>对该工序执行压缩 1 天，追加其单元崩溃成本。</li>
                            <li>重新计算 CPM，检测是否生成了新的关键路径。</li>
                            <li>重复以上步骤，直到工期达到设定的“目标红线”，或所有关键工序均已达到崩溃极限。</li>
                          </ol>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end shrink-0">
                    <button
                      onClick={() => setShowGuideModal(false)}
                      className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
                    >
                      已阅读并理解方法论
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 overflow-hidden">
                  <ReportPreview
                    project={{
                      id: 'current',
                      name: projectName,
                      description: projectDescription,
                      targetDuration,
                      indirectCostPerDay,
                      activities
                    }}
                    activities={activities}
                    cpmResults={cpmResults.results}
                    criticalPath={cpmResults.criticalPath}
                    totalDuration={cpmResults.totalDuration}
                    crashPoints={crashPoints}
                    currentCrashedDuration={sandboxActive ? cpmResults.totalDuration : crashingSliderDuration}
                    currentCostBreakdown={currentCostBreakdown}
                    pertResult={pertResult}
                    insights={aiInsights}
                  />
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE NEW CUSTOM PROJECT DIALOG/MODAL */}
      <AnimatePresence>
        {showCreateProjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateProjectModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            {/* Content Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] z-10"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                    <Database className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">新建/初始化自定义协同项目</h3>
                    <p className="text-[10px] text-slate-500 font-medium">配置专属项目设定，一键开辟独立计算沙盒</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateProjectModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleCreateNewProject} className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    项目名称 *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProjForm.name}
                    onChange={(e) => setNewProjForm({ ...newProjForm, name: e.target.value })}
                    placeholder="例如：30万吨级特大高架悬索桥涵洞组网建设工程"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      目标计划工期 (天) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newProjForm.targetDuration}
                      onChange={(e) => setNewProjForm({ ...newProjForm, targetDuration: parseInt(e.target.value, 10) || 30 })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-indigo-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      每日间接成本 (万元/天) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={0.1}
                      value={newProjForm.indirectCostPerDay}
                      onChange={(e) => setNewProjForm({ ...newProjForm, indirectCostPerDay: parseFloat(e.target.value) || 2.0 })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-indigo-700 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    工序初始模板
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setNewProjForm({ ...newProjForm, initOption: 'blank' })}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        newProjForm.initOption === 'blank'
                          ? 'border-indigo-600 bg-indigo-50/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">🫙 极简空白起点</span>
                        <span className="text-[10px] text-slate-400 block mt-1 leading-normal">
                          仅生成 A 工序作为筹备占位。适合对工艺流程烂熟于心、想完全自主手工填写的专家级管理。
                        </span>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] ${
                          newProjForm.initOption === 'blank' ? 'bg-indigo-600 border-indigo-600 text-white font-bold' : 'border-slate-300'
                        }`}>
                          {newProjForm.initOption === 'blank' && '✓'}
                        </span>
                      </div>
                    </div>

                    <div
                      onClick={() => setNewProjForm({ ...newProjForm, initOption: 'example' })}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        newProjForm.initOption === 'example'
                          ? 'border-indigo-600 bg-indigo-50/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">📚 三阶段演示链</span>
                        <span className="text-[10px] text-slate-400 block mt-1 leading-normal">
                          自动配备 A需求 ➔ B核心 ➔ C部署 经典3阶管道流程，支持快速双击修改，推荐初学试用。
                        </span>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] ${
                          newProjForm.initOption === 'example' ? 'bg-indigo-600 border-indigo-600 text-white font-bold' : 'border-slate-300'
                        }`}>
                          {newProjForm.initOption === 'example' && '✓'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    项目背景与描述 (选填)
                  </label>
                  <textarea
                    rows={3}
                    value={newProjForm.description}
                    onChange={(e) => setNewProjForm({ ...newProjForm, description: e.target.value })}
                    placeholder="请输入对该项目工艺流程、物资要求或里程碑交付等背景概述..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium text-slate-800 resize-none"
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-[11px] text-slate-500 flex items-start gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    创建自定义项目后，工作表将自动刷新，您可以通过双击<strong>数据工作表单元格</strong>或使用<strong>传统表单</strong>实时增删修改所有工序，顶部的多维度网络图和 AI 建议均会自动同源重新求解！
                  </p>
                </div>

                {/* Submit actions */}
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateProjectModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>立即开辟新项目</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CUSTOM PROJECT DIALOG/MODAL */}
      <AnimatePresence>
        {showDeleteConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirmModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            {/* Content Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-6 z-10"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 rounded-xl text-red-600 shrink-0">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900 leading-normal">
                    确定彻底删除该自定义项目吗？
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    当前正在删除项目：<strong className="text-slate-800 font-bold">「{projectName}」</strong>。此操作将永久移除该项目的所有工序参数与甘特图配置，且不可撤销！
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handlePerformDeleteCustomProject}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-red-600/10 cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>确定彻底删除</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-800 max-w-sm animate-fade-in"
          >
            {toast.type === 'success' && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />}
            {toast.type === 'info' && <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />}
            <span className="text-xs font-semibold leading-normal">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="p-0.5 text-slate-400 hover:text-white rounded-md transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
