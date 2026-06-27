var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var apiKey = process.env.GEMINI_API_KEY;
var ai = apiKey ? new import_genai.GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
}) : null;
app.post("/api/ai/insight", async (req, res) => {
  try {
    if (!ai) {
      return res.status(200).json({
        success: false,
        message: "GEMINI_API_KEY is not configured in Secrets.",
        insights: getFallbackInsights(req.body.activities || [])
      });
    }
    const { activities, projectInfo } = req.body;
    const prompt = `\u4F60\u662F\u4E00\u4F4D\u7CBE\u901A\u8FD0\u7B79\u5B66\u3001\u9879\u76EE\u7BA1\u7406\u548C\u7F51\u7EDC\u8BA1\u5212\u6280\u672F\uFF08CPM/PERT\uFF09\u7684\u4E13\u5BB6\u3002
\u5F53\u524D\u9879\u76EE\uFF1A${projectInfo?.name || "\u5DE5\u7A0B\u9879\u76EE"}\uFF0C\u76EE\u6807\u5DE5\u671F\uFF1A${projectInfo?.targetDuration || 24}\u5929\uFF0C\u6BCF\u65E5\u95F4\u63A5\u6210\u672C\uFF1A${projectInfo?.indirectCostPerDay || 2}\u4E07\u5143\u3002

\u4E0B\u9762\u662F\u9879\u76EE\u7684\u5DE5\u5E8F\u5217\u8868\uFF1A
${JSON.stringify(activities, null, 2)}

\u8BF7\u5BF9\u8FD9\u4E9B\u5DE5\u5E8F\u8FDB\u884C\u98CE\u9669\u6DF1\u5EA6\u8BC4\u4F30\u548C\u52A8\u6001\u8D44\u6E90\u8C03\u914D\u63A8\u8350\u3002
\u8BF7\u52A1\u5FC5\u8FD4\u56DE\u4E00\u4E2A\u5408\u6CD5\u7684 JSON \u5BF9\u8C61\uFF0C\u4E0D\u8981\u5305\u542B markdown \u6807\u8BB0\u6216 \`\`\`json \u5F00\u5934\uFF0C\u5176\u683C\u5F0F\u5982\u4E0B\uFF1A
{
  "risks": [
    {
      "id": "\u5DE5\u5E8FID",
      "riskScore": "low" | "medium" | "high",
      "riskAnalysis": "\u7ED3\u5408\u5916\u90E8\u5929\u6C14\u3001\u4F9B\u5E94\u94FE\u6216\u5DE5\u5E8F\u590D\u6742\u5EA6\u7B49\u771F\u5B9E\u7269\u7406\u573A\u666F\uFF0C\u7ED9\u51FA2-3\u53E5\u751F\u52A8\u7684\u98CE\u9669\u6210\u56E0\u4E0E\u9884\u9632\u63AA\u65BD\u5206\u6790\u3002"
    }
  ],
  "resourceRecommendations": [
    {
      "fromId": "\u79FB\u51FA\u8D44\u6E90\u7684\u975E\u5173\u952E\u5DE5\u5E8FID",
      "toId": "\u79FB\u5165\u8D44\u6E90\u7684\u5EF6\u8FDF/\u5173\u952E\u8DEF\u5F84\u5DE5\u5E8FID",
      "resourceType": "\u5DE5\u79CD\u540D\u79F0\uFF0C\u4F8B\u5982 \u7535\u5DE5",
      "amount": 2,
      "recommendationText": "\u5EFA\u8BAE\u4ECE\u5F53\u524D\u603B\u65F6\u5DEE\u4E3A X \u5929\u7684\u975E\u5173\u952E\u8DEF\u5F84\u5DE5\u5E8F A \u4E2D\u62BD\u8C03 Y \u540D\u7535\u5DE5\u81F3\u5DE5\u5E8F B\u3002\u8C03\u6574\u540E\u53EF\u5C06\u5DE5\u671F\u7F29\u77ED Z \u5929\uFF0C\u800C\u4E0D\u589E\u52A0\u989D\u5916\u8D76\u5DE5\u6210\u672C\u3002"
    }
  ]
}`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });
    const resultText = response.text || "{}";
    const parsed = JSON.parse(resultText.trim());
    return res.json({
      success: true,
      insights: parsed
    });
  } catch (error) {
    console.error("Insight API error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error generating insights",
      insights: getFallbackInsights(req.body.activities || [])
    });
  }
});
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, history, activities, projectInfo } = req.body;
    if (!ai) {
      return res.status(200).json({
        success: false,
        message: "GEMINI_API_KEY is not configured. Falling back to rules.",
        reply: `\u60A8\u597D\uFF01\u68C0\u6D4B\u5230\u60A8\u5C1A\u672A\u5728 Secrets \u4E2D\u914D\u7F6E GEMINI_API_KEY\u3002
\u8FD9\u662F\u4E00\u4E2A\u6A21\u62DF\u5E94\u7B54\uFF1A\u5982\u679C\u53D1\u751F\u201C${message}\u201D\uFF0C\u6211\u5EFA\u8BAE\u60A8\u67E5\u770B\u65F6\u5E8F\u7F51\u7EDC\u56FE\uFF0C\u89C2\u5BDF\u5173\u952E\u8DEF\u5F84\uFF08\u7329\u7EA2\u8272\uFF09\u662F\u5426\u53D1\u751F\u8F6C\u79FB\u3002
\u60A8\u53EF\u4EE5\u5C1D\u8BD5\u5728\u201C\u5DE5\u671F-\u6210\u672C\u8D76\u5DE5\u6A21\u62DF\u5668\u201D\u4E2D\u62C9\u52A8\u6ED1\u5757\u6765\u51CF\u5C11\u5DE5\u671F\u3002`,
        sandboxAction: null
      });
    }
    const prompt = `\u4F60\u662F\u4E00\u4E2A\u5185\u7F6E\u5728\u667A\u80FD\u7F51\u7EDC\u8BA1\u5212\u534F\u540C\u7CFB\u7EDF\u4E2D\u7684\u201CWhat-If\u201D\u6C99\u76D8\u6A21\u62DFAI\u4E13\u5BB6\u3002
\u7528\u6237\u6B63\u4E0E\u4F60\u4EA4\u6D41\u6709\u5173\u7F51\u7EDC\u8BA1\u5212\u8C03\u6574\u6216\u7A81\u53D1\u5916\u90E8\u98CE\u9669\u7684\u60C5\u51B5\u3002
\u5F53\u524D\u9879\u76EE\u57FA\u672C\u4FE1\u606F\uFF1A\u540D\u79F0\uFF1A${projectInfo?.name || "\u7F51\u7EDC\u8BA1\u5212\u9879\u76EE"}\uFF0C\u76EE\u6807\u5DE5\u671F\uFF1A${projectInfo?.targetDuration || 24}\u5929\uFF0C\u95F4\u63A5\u6210\u672C\uFF1A${projectInfo?.indirectCostPerDay || 2}\u4E07\u5143/\u5929\u3002

\u5F53\u524D\u5DE5\u5E8F\u6570\u636E\u96C6\uFF1A
${JSON.stringify(activities, null, 2)}

\u8BF7\u6839\u636E\u7528\u6237\u7684\u95EE\u9898\u8FDB\u884C\u201CWhat-If\u201D\u591A\u573A\u666F\u63A8\u7406\uFF0C\u7ED9\u51FA\u8865\u6551\u65B9\u6848\u3002
\u7279\u522B\u5730\uFF0C\u5982\u679C\u4F60\u8BC6\u522B\u5230\u7528\u6237\u7684\u95EE\u9898\u6697\u793A\u4E86\u67D0\u9879\u6216\u591A\u9879\u5DE5\u5E8F\u7684\u7A81\u53D1\u5EF6\u8BEF\u6216\u505C\u6446\uFF0C\u8BF7\u751F\u6210\u4E00\u4E2A\u6C99\u76D8\u7A81\u53D8\u64CD\u4F5C\u6307\u4EE4(sandboxAction)\u6765\u66F4\u65B0\u7279\u5B9A\u5DE5\u5E8F\u7684\u5DE5\u671F\u6216\u589E\u52A0\u5176\u5EF6\u8BEF\uFF0C\u8BA9\u524D\u7AEF\u76F4\u63A5\u9AD8\u4EAE\u6E32\u67D3\u53D7\u707E\u540E\u7684\u5BF9\u6BD4\u7F51\u7EDC\u56FE\u3002
\u4F8B\u5982\uFF1A\u5982\u679C\u7528\u6237\u8BF4\u201C\u4E0B\u96E8\u5916\u90E8\u65BD\u5DE5\u505C\u64463\u5929\u201D\uFF0C\u800C\u5DE5\u5E8FA\u662F\u5916\u90E8\u65BD\u5DE5\uFF0C\u4F60\u53EF\u4EE5\u89E6\u53D1\u5BF9A\u7684\u5EF6\u8BEF\u3002

\u8FD4\u56DE\u5FC5\u987B\u662F\u4E00\u4E2A\u5408\u6CD5\u7684 JSON \u5BF9\u8C61\uFF0C\u4E0D\u8981\u5E26\u4EFB\u4F55 markdown \u6216 \`\`\`json \u6846\u3002\u683C\u5F0F\u5982\u4E0B\uFF1A
{
  "reply": "\u4F60\u7528\u7CBE\u70BC\u3001\u5927\u65B9\u3001\u4E13\u4E1A\u7684\u4E2D\u6587\u7ED9\u51FA\u89E3\u7B54\uFF0C\u6307\u51FA\u54EA\u4E9B\u5DE5\u5E8F\u4F1A\u53D7\u5230\u5EF6\u8BEF\uFF0C\u5173\u952E\u8DEF\u5F84\u662F\u5426\u4F1A\u8F6C\u79FB\uFF0C\u603B\u5DE5\u671F\u548C\u603B\u6210\u672C\u4F1A\u5982\u4F55\u589E\u52A0\uFF0C\u4EE5\u53CA\u5177\u4F53\u7684\u8865\u6551\u8D44\u6E90\u8C03\u914D\u7B56\u7565\u3002",
  "sandboxAction": {
    "title": "\u60C5\u666F\u6A21\u62DF\uFF1A\u4E0B\u96E8\u5916\u90E8\u65BD\u5DE5\u505C\u5DE5 3 \u5929",
    "description": "\u6A21\u62DF\u5916\u90E8\u65BD\u5DE5\uFF08\u5982 A\u3001B \u5DE5\u5E8F\uFF09\u5DE5\u671F\u56E0\u96E8\u5929\u7A81\u53D1\u505C\u5DE5\u589E\u52A0 3 \u5929\u540E\u7684\u5F71\u54CD\u3002",
    "durationModifications": [
      { "id": "A", "newDuration": 8 } 
    ]
  }
}
\u5982\u679C\u7528\u6237\u8BF4\u7684\u8BDD\u4E0D\u6D89\u53CA\u5177\u4F53\u7684\u5EF6\u8BEF\uFF0C\u6216\u8005\u53EA\u662F\u666E\u901A\u5BF9\u8BDD\uFF0CsandboxAction \u5E94\u5F53\u4E3A null\u3002

\u7528\u6237\u95EE\u9898\uFF1A"${message}"`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });
    const parsed = JSON.parse((response.text || "{}").trim());
    return res.json({
      success: true,
      reply: parsed.reply,
      sandboxAction: parsed.sandboxAction
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error processing conversation",
      reply: "\u62B1\u6B49\uFF0C\u5927\u8BED\u8A00\u6A21\u578B\u54CD\u5E94\u8D85\u65F6\u6216\u89E3\u6790\u5931\u8D25\u3002\u5EFA\u8BAE\u68C0\u67E5\u5173\u952E\u8DEF\u5F84\u5DE5\u5E8F\u4EE5\u8BC6\u522B\u74F6\u9888\u3002"
    });
  }
});
function getFallbackInsights(activities) {
  const risks = (activities || []).map((act) => {
    let riskScore = "low";
    let riskAnalysis = "\u8BE5\u5DE5\u5E8F\u590D\u6742\u5EA6\u6B63\u5E38\uFF0C\u5386\u53F2\u8868\u73B0\u826F\u597D\uFF0C\u4F9B\u5E94\u98CE\u9669\u6781\u4F4E\u3002";
    if (act.id === "A") {
      riskScore = "medium";
      riskAnalysis = "\u5730\u57FA\u5F00\u6316\u6D89\u53CA\u9732\u5929\u4F5C\u4E1A\uFF0C\u4E0B\u96E8\u6982\u7387\u53EF\u80FD\u5BFC\u81F4\u5C40\u90E8\u79EF\u6C34\uFF0C\u5EFA\u8BAE\u914D\u5907\u5907\u7528\u62BD\u6C34\u673A\u3002";
    } else if (act.id === "D" || act.id === "E") {
      riskScore = "high";
      riskAnalysis = "\u5173\u952E\u8DEF\u5F84\u4E0A\u7684\u6838\u5FC3\u5DE5\u5E8F\uFF0C\u53D7\u9650\u4E8E\u7279\u6B8A\u8BBE\u5907\u53CA\u7279\u79CD\u6280\u672F\u5DE5\u4EBA\u624D\u914D\u5907\uFF0C\u5B58\u5728\u8F83\u5927\u8D44\u6E90\u51B2\u7A81\u53EF\u80FD\u3002";
    }
    return { id: act.id, riskScore, riskAnalysis };
  });
  return {
    risks,
    resourceRecommendations: [
      {
        fromId: "C",
        toId: "D",
        resourceType: "\u7535\u5DE5",
        amount: 2,
        recommendationText: "\u5EFA\u8BAE\u4ECE\u5F53\u524D\u603B\u65F6\u5DEE\u4E3A 5 \u5929\u7684\u975E\u5173\u952E\u8DEF\u5F84\u5DE5\u5E8F C \u4E2D\u62BD\u8C03 2 \u540D\u7535\u5DE5\u81F3\u5DE5\u5E8F D\u3002\u8C03\u6574\u540E\u53EF\u5C06\u5DE5\u671F\u7F29\u77ED 2 \u5929\uFF0C\u4FDD\u4F4F 24 \u5929\u7EA2\u7EBF\uFF0C\u4E14\u4E0D\u589E\u52A0\u989D\u5916\u8D76\u5DE5\u6210\u672C\u3002"
      }
    ]
  };
}
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u667A\u80FD\u7F51\u7EDC\u8BA1\u5212\u534F\u540C\u7CFB\u7EDF\u670D\u52A1\u5668\u8FD0\u884C\u5728 http://localhost:${PORT}`);
  });
}
startServer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
