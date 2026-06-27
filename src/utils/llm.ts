/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Helper to sanitize and extract JSON from model responses (handles markdown blocks and reasoning segments)
export function cleanAndParseJSON(text: string): any {
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    // Remove deepseek <think>...</think> tags if present
    let cleanText = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    // Remove markdown code blocks if present (```json ... ```)
    cleanText = cleanText.replace(/```json\s*([\s\S]*?)\s*```/g, '$1').trim();
    cleanText = cleanText.replace(/```\s*([\s\S]*?)\s*```/g, '$1').trim();
    
    try {
      return JSON.parse(cleanText);
    } catch (e2) {
      // Extract first matching outer {...} block
      const firstCurly = cleanText.indexOf('{');
      const lastCurly = cleanText.lastIndexOf('}');
      if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
        const jsonCandidate = cleanText.substring(firstCurly, lastCurly + 1);
        try {
          return JSON.parse(jsonCandidate);
        } catch (e3) {
          console.error("Failed to parse extracted JSON block:", jsonCandidate, e3);
        }
      }
      throw new Error("模型返回的内容不是合法的 JSON。请确认网络畅通或更换更稳定的 API-Key。");
    }
  }
}

export interface LLMSettings {
  apiKey: string;
  model: 'gemini' | 'deepseek';
  customEndpoint?: string;
}

export function getLLMSettings(): LLMSettings {
  const apiKey = localStorage.getItem('llm_api_key') || '';
  const model = (localStorage.getItem('llm_model') as 'gemini' | 'deepseek') || 'gemini';
  const customEndpoint = localStorage.getItem('llm_custom_endpoint') || '';
  return { apiKey, model, customEndpoint };
}

export function saveLLMSettings(settings: LLMSettings) {
  localStorage.setItem('llm_api_key', settings.apiKey);
  localStorage.setItem('llm_model', settings.model);
  if (settings.customEndpoint) {
    localStorage.setItem('llm_custom_endpoint', settings.customEndpoint);
  } else {
    localStorage.removeItem('llm_custom_endpoint');
  }
}

export async function callClientLLM(
  activities: any[],
  projectInfo: { name: string; targetDuration: number; indirectCostPerDay: number },
  type: 'insight' | 'chat',
  chatHistory: any[] = [],
  userMessage: string = ''
): Promise<any> {
  const { apiKey, model, customEndpoint } = getLLMSettings();

  if (!apiKey) {
    throw new Error("请先点击专家面板右上角齿轮图标 ⚙ 设置大模型 API-Key！");
  }

  // Define prompts based on type
  let systemPrompt = '';
  let userPrompt = '';

  if (type === 'insight') {
    systemPrompt = `你是一位精通运筹学、项目管理和网络计划技术（CPM/PERT）的专家。当前项目：${projectInfo.name || '工程项目'}，目标工期：${projectInfo.targetDuration || 24}天，每日间接成本：${projectInfo.indirectCostPerDay || 2}万元。`;
    userPrompt = `下面是项目的工序列表：
${JSON.stringify(activities, null, 2)}

请对这些工序进行风险深度评估和动态资源调配推荐。
请务必返回一个合法的 JSON 对象，不要包含任何 markdown 标记或 \`\`\`json 开头，其格式必须如下：
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
  } else {
    systemPrompt = `你是一个内置在智能网络计划协同系统中的“What-If”沙盘模拟AI专家。
当前项目基本信息：名称：${projectInfo.name || '网络计划项目'}，目标工期：${projectInfo.targetDuration || 24}天，间接成本：${projectInfo.indirectCostPerDay || 2}万元/天。

当前工序数据集：
${JSON.stringify(activities, null, 2)}

请根据用户的问题进行“What-If”多场景推理，给出补救方案。
特别地，如果你识别到用户的问题暗示了某项或多项工序的突发延误或停摆，请生成一个沙盘突变操作指令(sandboxAction)来更新特定工序的工期或增加其延误，让前端直接高亮渲染受灾后的对比网络图。
例如：如果用户说“下雨外部施工停摆3天”，而工序A是外部施工，你可以触发对A的延误（时长增加3天）。

返回必须是一个合法的 JSON 对象，不要带任何 markdown 或 \`\`\`json 框。格式必须如下：
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
如果用户说的话不涉及具体的延误，或者只是普通对话，sandboxAction 应当为 null。`;

    userPrompt = `历史对话：
${JSON.stringify(chatHistory.slice(-6), null, 2)}

用户最新的问题："${userMessage}"`;
  }

  // Executing Model call
  if (model === 'gemini') {
    // Gemini direct call
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [
        {
          parts: [
            { text: `${systemPrompt}\n\n${userPrompt}` }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: type === 'insight' ? 0.2 : 0.3
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Gemini API 调用失败 (${response.status})`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error("Gemini 模型未返回有效文本内容。");
    }

    return cleanAndParseJSON(responseText);
  } else {
    // DeepSeek R1 / OpenRouter / Custom OpenAI compatible call
    const defaultEndpoint = 'https://api.deepseek.com/chat/completions';
    const endpoint = customEndpoint || defaultEndpoint;
    
    // Choose model identifier based on endpoint
    let modelName = 'deepseek-reasoner';
    if (endpoint.includes('siliconflow')) {
      modelName = 'deepseek-ai/DeepSeek-R1';
    } else if (endpoint.includes('openrouter')) {
      modelName = 'deepseek/deepseek-r1';
    }

    const payload = {
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: type === 'insight' ? 0.2 : 0.3
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API 调用失败 (${response.status}): ${errorText.substring(0, 100)}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content;
    if (!responseText) {
      throw new Error("DeepSeek 模型未返回有效内容。");
    }

    return cleanAndParseJSON(responseText);
  }
}
