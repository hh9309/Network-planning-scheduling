/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Project, Activity, ChatMessage } from '../types';
import { 
  Send, 
  AlertTriangle, 
  Cpu, 
  HelpCircle, 
  ArrowRight, 
  User, 
  RefreshCw, 
  Layers, 
  CheckCircle2, 
  X, 
  Loader2, 
  Settings, 
  Eye, 
  EyeOff, 
  Sliders,
  Check
} from 'lucide-react';
import { getLLMSettings, saveLLMSettings, callClientLLM } from '../utils/llm';

interface AIExpertPanelProps {
  project: Project;
  activities: Activity[];
  insights: {
    risks: { id: string; riskScore: 'low' | 'medium' | 'high'; riskAnalysis: string }[];
    resourceRecommendations: {
      fromId: string;
      toId: string;
      resourceType: string;
      amount: number;
      recommendationText: string;
    }[];
  } | null;
  loadingInsights: boolean;
  onRefreshInsights: () => void;
  onApplySandboxAction: (title: string, durationModifications: { id: string; newDuration: number }[]) => void;
  onExitSandbox: () => void;
  sandboxActive: boolean;
  sandboxTitle: string | null;
  onApplyResourceAdjustment: (fromId: string, toId: string, amount: number) => void;
}

export const AIExpertPanel: React.FC<AIExpertPanelProps> = ({
  project,
  activities,
  insights,
  loadingInsights,
  onRefreshInsights,
  onApplySandboxAction,
  onExitSandbox,
  sandboxActive,
  sandboxTitle,
  onApplyResourceAdjustment
}) => {
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '您好！我是您的智能网络计划专家。输入 API-Key 后即可激活高级 AI 协同能力：\n\n1. **回答 What-If 沙盘模拟**：您可以问我“如果下周下雨外部施工停摆3天会如何？”我会为您即时构建沙盘模型进行两图对比。\n2. **资源冲突解决方案**：为您自动调配非关键路径上富余的资源。\n3. **防延误风险评估**：通过预测模型为您分析潜在的工期崩溃风险。',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Settings Panel States
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelSelect, setModelSelect] = useState<'gemini' | 'deepseek'>('gemini');
  const [customEndpointInput, setCustomEndpointInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Load LLM configurations on mount
  useEffect(() => {
    const s = getLLMSettings();
    setApiKeyInput(s.apiKey);
    setModelSelect(s.model);
    setCustomEndpointInput(s.customEndpoint || '');
  }, []);

  // Auto scroll to chat bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isSendingMessage]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveLLMSettings({
      apiKey: apiKeyInput.trim(),
      model: modelSelect,
      customEndpoint: customEndpointInput.trim()
    });
    setConfigSuccess(true);
    setTimeout(() => {
      setConfigSuccess(false);
      setShowSettings(false);
    }, 1200);

    // Refresh parents insights dynamically if key is supplied
    if (apiKeyInput.trim()) {
      setTimeout(() => {
        onRefreshInsights();
      }, 300);
    }
  };

  // Handle chat submission
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingMessage) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [
      ...prev,
      {
        role: 'user',
        content: userMsg,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setIsSendingMessage(true);

    try {
      const data = await callClientLLM(
        activities,
        {
          name: project.name,
          targetDuration: project.targetDuration,
          indirectCostPerDay: project.indirectCostPerDay
        },
        'chat',
        chatHistory,
        userMsg
      );

      setChatHistory(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply || '分析完毕。',
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          sandboxMode: !!data.sandboxAction
        }
      ]);

      // If a sandbox action is returned, load it in the parent
      if (data.sandboxAction) {
        onApplySandboxAction(
          data.sandboxAction.title || '突发外部环境情景沙盘',
          data.sandboxAction.durationModifications || []
        );
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setChatHistory(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `抱歉，模型演算失败: ${err.message || '网络连接超时'}。您可以点击右上角 ⚙ 设置有效的大模型 API-Key 再次尝试。`,
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const hasApiKeySet = !!apiKeyInput.trim();

  return (
    <div className="w-full flex flex-col h-full bg-slate-50 text-slate-800 rounded-2xl shadow-sm overflow-hidden border border-slate-150">
      {/* Panel Header */}
      <div className="bg-white p-4 border-b border-slate-150 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100">
            <Cpu className="h-6 w-6 text-indigo-600 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-extrabold text-slate-900 tracking-tight">AI 计划协同决策专家</h3>
            <p className="text-xs md:text-sm text-slate-500 font-medium">大语言模型（Gemini & DeepSeek）浏览器直接调用</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 border rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
              showSettings 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
            title="大模型接口配置 (API-Key 独立管理)"
          >
            <Settings className="h-4 w-4" />
          </button>
          
          <button
            onClick={onRefreshInsights}
            disabled={loadingInsights || !hasApiKeySet}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 rounded-lg transition-colors text-slate-500 cursor-pointer disabled:opacity-40"
            title={hasApiKeySet ? "重新扫描并分析网络计划" : "请先配置 API-Key"}
          >
            <RefreshCw className={`h-4 w-4 ${loadingInsights ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expandable Settings Tray */}
      {showSettings && (
        <div className="bg-white border-b border-slate-150 p-4 shadow-inner space-y-3.5 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-sm md:text-base font-bold text-slate-800 flex items-center gap-1">
              <Sliders className="h-4.5 w-4.5 text-indigo-500" />
              大语言模型高级配置（支持静态 GitHub 直接部署）
            </span>
            <button 
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <form onSubmit={handleSaveSettings} className="space-y-3.5">
            {/* Model select */}
            <div>
              <label className="block text-xs md:text-sm font-bold text-slate-600 mb-1.5">选择目标大模型</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setModelSelect('gemini')}
                  className={`py-2 px-3 rounded-lg border text-center text-xs md:text-sm font-bold cursor-pointer transition-all ${
                    modelSelect === 'gemini'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Gemini 1.5/3.5 Flash
                </button>
                <button
                  type="button"
                  onClick={() => setModelSelect('deepseek')}
                  className={`py-2 px-3 rounded-lg border text-center text-xs md:text-sm font-bold cursor-pointer transition-all ${
                    modelSelect === 'deepseek'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  DEEPSEEK R1 (推理)
                </button>
              </div>
            </div>

            {/* API Key Input */}
            <div>
              <label className="block text-xs md:text-sm font-bold text-slate-600 mb-1.5">手工输入 API-Key</label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={
                    modelSelect === 'gemini' 
                      ? "输入您的 Google Gemini API-Key..." 
                      : "输入您的 DeepSeek API-Key..."
                  }
                  required
                  className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-lg text-xs md:text-sm outline-none text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Custom Endpoint Input (Optional, for DeepSeek compatible APIs) */}
            {modelSelect === 'deepseek' && (
              <div>
                <label className="block text-xs md:text-sm font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                  <span>自定义 API 端点 (可选)</span>
                  <span className="text-[10px] md:text-xs text-slate-400 font-normal">支持 SiliconFlow / OpenRouter</span>
                </label>
                <input
                  type="text"
                  value={customEndpointInput}
                  onChange={(e) => setCustomEndpointInput(e.target.value)}
                  placeholder="默认: https://api.deepseek.com/chat/completions"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs md:text-sm outline-none text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white font-mono"
                />
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                {configSuccess ? (
                  <>
                    <Check className="h-4 w-4 animate-bounce" />
                    <span>确认配置成功！</span>
                  </>
                ) : (
                  <span>确认大模型及密钥配置</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Body tabs or sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* API-Key missing alert */}
        {!hasApiKeySet && (
          <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-xl flex flex-col gap-2.5 shadow-xs">
            <div className="flex gap-2.5 items-start">
              <Cpu className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs md:text-sm font-extrabold text-indigo-800">未检测到模型密钥配置</span>
                <p className="text-xs md:text-sm text-slate-700 leading-relaxed mt-1">
                  所有大模型推理功能均在浏览器本地调用。请点击右侧齿轮 ⚙，手工输入大模型 API-Key 确认后即可激活全部 AI 工序风险预警与沙盘功能。
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowSettings(true)}
                className="text-xs md:text-sm font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
              >
                <span>立即配置密钥</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Sandbox Warning notice */}
        {sandboxActive && (
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex flex-col gap-2.5 shadow-xs animate-pulse">
            <div className="flex gap-2.5 items-start">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs md:text-sm font-extrabold text-amber-800">沙盘模拟模式已加载</span>
                <p className="text-xs md:text-sm text-slate-700 font-semibold mt-1">
                  {sandboxTitle || '外部不确定风险对工期影响分析中'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-1">
              <button
                onClick={onExitSandbox}
                className="flex-1 py-1.5 px-2 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs md:text-sm font-bold border border-slate-200 transition-colors cursor-pointer"
              >
                退出沙盘 / 恢复
              </button>
            </div>
          </div>
        )}

        {/* SECTION 1: VISUAL RISK HEATMAP */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm md:text-base font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="h-4.5 w-4.5 text-indigo-500" />
              视觉化风险热力预警 (同源映射)
            </h4>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
              {activities.length}道工序已评估
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {activities.map(act => {
              const actInsight = insights?.risks?.find(r => r.id === act.id);
              const score = actInsight?.riskScore || 'low';
              
              const colorClass = 
                score === 'high' 
                  ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100/50' 
                  : score === 'medium'
                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100/50'
                  : 'bg-emerald-55/40 border-emerald-200 text-emerald-700 hover:bg-emerald-100/40';

              return (
                <div
                  key={`risk-grid-${act.id}`}
                  className={`border p-2 rounded-lg text-center cursor-pointer transition-all duration-200 group relative ${colorClass}`}
                  title={actInsight?.riskAnalysis || '正常工序'}
                >
                  <div className="text-xs md:text-sm font-mono font-black">{act.id}</div>
                  <div className="text-[10px] md:text-xs font-semibold opacity-90 truncate">{act.name}</div>
                  
                  {/* Tooltip bubble */}
                  <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2.5 w-52 bg-slate-900 text-xs text-slate-200 p-2.5 rounded-lg shadow-xl border border-slate-800 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-left">
                    <div className="font-bold mb-0.5">工序 {act.id} 风险诊断:</div>
                    <p className="leading-relaxed text-slate-300">{actInsight?.riskAnalysis || '该工序复杂度低，前置工序无延误瓶颈。'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: DYNAMIC RESOURCE RECOMMENDATION */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
          <h4 className="text-sm md:text-base font-bold text-slate-800 flex items-center gap-1.5">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
            AI 动态资源调配推荐
          </h4>
          
          {insights?.resourceRecommendations && insights.resourceRecommendations.length > 0 ? (
            insights.resourceRecommendations.map((rec, idx) => (
              <div
                key={`rec-${idx}`}
                className="bg-indigo-50/40 hover:bg-indigo-50/80 border border-indigo-100 p-3 rounded-lg flex flex-col gap-2 transition-all"
              >
                <div className="flex justify-between items-center text-xs md:text-sm text-indigo-700 font-black font-mono">
                  <span>从工序 {rec.fromId} ➔ 移至 {rec.toId}</span>
                  <span>抽调 {rec.amount} 名{rec.resourceType}</span>
                </div>
                <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-sans font-medium">
                  {rec.recommendationText}
                </p>
                <div className="flex justify-end">
                  <button
                    onClick={() => onApplyResourceAdjustment(rec.fromId, rec.toId, rec.amount)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded transition-colors cursor-pointer shadow-xs"
                  >
                    一键采纳配属 ⚡
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-slate-400 text-xs md:text-sm text-center py-2 font-mono">
              暂未检测到明显的资源冲突。如关键工期受限，推荐建议将自动刷新。
            </div>
          )}
        </div>

        {/* SECTION 3: CHAT AREA */}
        <div className="bg-white border border-slate-200 rounded-xl flex flex-col h-[280px] overflow-hidden shadow-xs">
          {/* Chat history list */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-200 bg-slate-50/50">
            {chatHistory.map((msg, idx) => (
              <div
                key={`msg-${idx}`}
                className={`flex gap-2.5 text-xs md:text-sm ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role !== 'user' && (
                  <div className="h-7 w-7 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 shadow-xs shrink-0 mt-0.5">
                    AI
                  </div>
                )}
                <div className="flex flex-col max-w-[85%]">
                  <div
                    className={`p-3 rounded-2xl text-xs md:text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-xs'
                        : 'bg-white text-slate-750 rounded-tl-none border border-slate-150 shadow-xs font-medium'
                    }`}
                  >
                    {/* Render basic markdown text (bold lists) */}
                    {msg.content.split('\n').map((line, lIdx) => (
                      <p key={lIdx} className={line ? 'mb-1.5 last:mb-0' : 'h-2'}>
                        {line}
                      </p>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 self-end mt-0.5 font-mono px-1">
                    {msg.timestamp}
                  </span>
                </div>
                {msg.role === 'user' && (
                  <div className="h-7 w-7 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0 mt-0.5">
                    <User className="h-4 w-4 text-slate-500" />
                  </div>
                )}
              </div>
            ))}
            
            {/* Thinking / typing animation */}
            {isSendingMessage && (
              <div className="flex gap-2.5 text-xs md:text-sm justify-start">
                <div className="h-7 w-7 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 shadow-xs shrink-0">
                  AI
                </div>
                <div className="p-3 rounded-2xl bg-white text-slate-500 border border-slate-150 rounded-tl-none flex items-center gap-1.5 font-mono shadow-xs text-xs md:text-sm">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                  <span>正在深度拓扑评估与多场景沙盘推理...</span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Quick inputs */}
          <div className="px-3 py-2 bg-white border-t border-slate-150 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none text-xs md:text-sm">
            <button
              onClick={() => setChatInput('如果下大雨外部施工停摆3天会如何？')}
              className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer text-slate-600 font-bold"
            >
              🌧️ 下雨停摆3天
            </button>
            <button
              onClick={() => setChatInput('核心软件开发人员感冒请假导致工序D延期5天')}
              className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer text-slate-600 font-bold"
            >
              🤒 开发工序D延误5天
            </button>
          </div>

          {/* Input field Form */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-slate-50 flex gap-2 border-t border-slate-150">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="向AI专家发起 What-If 提问..."
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs md:text-sm outline-none text-slate-700 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 shadow-xs"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isSendingMessage || !hasApiKeySet}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
