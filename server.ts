/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with recommended telemetry header
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// API Endpoint 1: Get AI Risk and Resource Recommendation Insights
app.post('/api/ai/insight', async (req, res) => {
  try {
    if (!ai) {
      return res.status(200).json({
        success: false,
        message: 'GEMINI_API_KEY is not configured in Secrets.',
        insights: getFallbackInsights(req.body.activities || [])
      });
    }

    const { activities, projectInfo } = req.body;
    
    const prompt = `你是一位精通运筹学、项目管理和网络计划技术（CPM/PERT）的专家。
当前项目：${projectInfo?.name || '工程项目'}，目标工期：${projectInfo?.targetDuration || 24}天，每日间接成本：${projectInfo?.indirectCostPerDay || 2}万元。

下面是项目的工序列表：
${JSON.stringify(activities, null, 2)}

请对这些工序进行风险深度评估和动态资源调配推荐。
请务必返回一个合法的 JSON 对象，不要包含 markdown 标记或 \`\`\`json 开头，其格式如下：
{
  "risks": [
    {
      "id": "工序ID",
      "riskScore": "low" | "medium" | "high",
      "riskAnalysis": "结合外部天气、供应链或工序复杂度等真实物理场景，给出2-3句生动的风险成因与预防措施分析。"
    }
  ],
  "resourceRecommendations": [
    {
      "fromId": "移出资源的非关键工序ID",
      "toId": "移入资源的延迟/关键路径工序ID",
      "resourceType": "工种名称，例如 电工",
      "amount": 2,
      "recommendationText": "建议从当前总时差为 X 天的非关键路径工序 A 中抽调 Y 名电工至工序 B。调整后可将工期缩短 Z 天，而不增加额外赶工成本。"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const resultText = response.text || '{}';
    const parsed = JSON.parse(resultText.trim());
    
    return res.json({
      success: true,
      insights: parsed
    });
  } catch (error: any) {
    console.error('Insight API error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error generating insights',
      insights: getFallbackInsights(req.body.activities || [])
    });
  }
});

// API Endpoint 2: What-If Sandbox Conversational Chat
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, history, activities, projectInfo } = req.body;

    if (!ai) {
      return res.status(200).json({
        success: false,
        message: 'GEMINI_API_KEY is not configured. Falling back to rules.',
        reply: `您好！检测到您尚未在 Secrets 中配置 GEMINI_API_KEY。
这是一个模拟应答：如果发生“${message}”，我建议您查看时序网络图，观察关键路径（猩红色）是否发生转移。
您可以尝试在“工期-成本赶工模拟器”中拉动滑块来减少工期。`,
        sandboxAction: null
      });
    }

    const prompt = `你是一个内置在智能网络计划协同系统中的“What-If”沙盘模拟AI专家。
用户正与你交流有关网络计划调整或突发外部风险的情况。
当前项目基本信息：名称：${projectInfo?.name || '网络计划项目'}，目标工期：${projectInfo?.targetDuration || 24}天，间接成本：${projectInfo?.indirectCostPerDay || 2}万元/天。

当前工序数据集：
${JSON.stringify(activities, null, 2)}

请根据用户的问题进行“What-If”多场景推理，给出补救方案。
特别地，如果你识别到用户的问题暗示了某项或多项工序的突发延误或停摆，请生成一个沙盘突变操作指令(sandboxAction)来更新特定工序的工期或增加其延误，让前端直接高亮渲染受灾后的对比网络图。
例如：如果用户说“下雨外部施工停摆3天”，而工序A是外部施工，你可以触发对A的延误。

返回必须是一个合法的 JSON 对象，不要带任何 markdown 或 \`\`\`json 框。格式如下：
{
  "reply": "你用精炼、大方、专业的中文给出解答，指出哪些工序会受到延误，关键路径是否会转移，总工期和总成本会如何增加，以及具体的补救资源调配策略。",
  "sandboxAction": {
    "title": "情景模拟：下雨外部施工停工 3 天",
    "description": "模拟外部施工（如 A、B 工序）工期因雨天突发停工增加 3 天后的影响。",
    "durationModifications": [
      { "id": "A", "newDuration": 8 } 
    ]
  }
}
如果用户说的话不涉及具体的延误，或者只是普通对话，sandboxAction 应当为 null。

用户问题："${message}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3
      }
    });

    const parsed = JSON.parse((response.text || '{}').trim());
    return res.json({
      success: true,
      reply: parsed.reply,
      sandboxAction: parsed.sandboxAction
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error processing conversation',
      reply: '抱歉，大语言模型响应超时或解析失败。建议检查关键路径工序以识别瓶颈。'
    });
  }
});

// Fallback logic when API key is missing
function getFallbackInsights(activities: any[]) {
  const risks = (activities || []).map((act: any) => {
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
        recommendationText: '建议从当前总时差为 5 天的非关键路径工序 C 中抽调 2 名电工至工序 D。调整后可将工期缩短 2 天，保住 24 天红线，且不增加额外赶工成本。'
      }
    ]
  };
}

// Start Server & Vite Setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`智能网络计划协同系统服务器运行在 http://localhost:${PORT}`);
  });
}

startServer();
