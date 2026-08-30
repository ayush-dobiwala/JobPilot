import type { MatchScoreResponse } from "@jobpilot/shared-types";

export interface MatchScorer {
  score(resumeText: string, jobDescription: string): Promise<MatchScoreResponse>;
}

interface AnthropicTextBlock {
  type: string;
  text?: string;
}

interface AnthropicMessageResponse {
  content?: AnthropicTextBlock[];
}

const STOPWORDS = new Set([
  "about",
  "above",
  "across",
  "after",
  "amazon",
  "amazonians",
  "afternoon",
  "applicant",
  "applicants",
  "applying",
  "atmosphere",
  "before",
  "being",
  "below",
  "between",
  "canada",
  "canadian",
  "collaborate",
  "collaborative",
  "company",
  "compensation",
  "contact",
  "contacts",
  "content",
  "continuous",
  "could",
  "country",
  "culture",
  "customer",
  "customers",
  "deeply",
  "description",
  "details",
  "directly",
  "disability",
  "during",
  "employer",
  "empowered",
  "equal",
  "every",
  "experience",
  "experiences",
  "feature",
  "features",
  "final",
  "focus",
  "from",
  "global",
  "growth",
  "have",
  "health",
  "hiring",
  "including",
  "inclusive",
  "information",
  "insurance",
  "interview",
  "into",
  "join",
  "listed",
  "location",
  "make",
  "making",
  "marketplace",
  "meaningful",
  "medical",
  "mentor",
  "mentorship",
  "might",
  "millions",
  "morning",
  "opportunity",
  "other",
  "package",
  "partner",
  "personal",
  "please",
  "position",
  "preferred",
  "protected",
  "qualifications",
  "range",
  "region",
  "regular",
  "resolve",
  "resources",
  "results",
  "salary",
  "should",
  "software",
  "status",
  "team",
  "teammates",
  "teams",
  "that",
  "their",
  "them",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "throughout",
  "toronto",
  "total",
  "under",
  "using",
  "visit",
  "want",
  "where",
  "which",
  "while",
  "will",
  "with",
  "within",
  "would",
  "your",
]);

/** Skill-ish phrases we look for in JDs when mocking (local/dev without Anthropic). */
const SKILL_PHRASES = [
  "distributed systems",
  "distributed services",
  "full-stack",
  "full stack",
  "software development life cycle",
  "design patterns",
  "source control",
  "code reviews",
  "on-call",
  "operational excellence",
  "large-scale systems",
  "real-time data",
  "customer experience",
  "system design",
  "computer science",
  "rest apis",
  "apis",
  "microservices",
  "debugging",
  "profiling",
  "typescript",
  "javascript",
  "python",
  "java",
  "kotlin",
  "golang",
  "rust",
  "c++",
  "node.js",
  "react",
  "aws",
  "kubernetes",
  "docker",
  "postgresql",
  "mysql",
  "redis",
  "graphql",
  "ci/cd",
  "unit testing",
  "integration testing",
  "architecture",
  "scalability",
  "reliability",
  "observability",
  "mentoring",
];

function parseModelJson(text: string): MatchScoreResponse | null {
  const trimmed = text.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as {
      score?: unknown;
      missingKeywords?: unknown;
      suggestions?: unknown;
    };
    if (
      typeof parsed.score !== "number" ||
      !Number.isInteger(parsed.score) ||
      parsed.score < 0 ||
      parsed.score > 100 ||
      !Array.isArray(parsed.missingKeywords) ||
      !parsed.missingKeywords.every((k) => typeof k === "string") ||
      !Array.isArray(parsed.suggestions) ||
      !parsed.suggestions.every((s) => typeof s === "string")
    ) {
      return null;
    }
    return {
      score: parsed.score,
      missingKeywords: parsed.missingKeywords,
      suggestions: parsed.suggestions,
    };
  } catch {
    return null;
  }
}

function qualificationsSlice(jobDescription: string): string {
  const lower = jobDescription.toLowerCase();
  const markers = ["basic qualifications", "preferred qualifications", "requirements", "key job responsibilities"];
  let start = -1;
  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx !== -1 && (start === -1 || idx < start)) {
      start = idx;
    }
  }
  if (start === -1) {
    return jobDescription;
  }
  const endMarkers = ["about the team", "a day in the life", "amazon is an equal", "job details", "base salary"];
  let end = jobDescription.length;
  for (const marker of endMarkers) {
    const idx = lower.indexOf(marker, start + 10);
    if (idx !== -1 && idx < end) {
      end = idx;
    }
  }
  return jobDescription.slice(start, end);
}

export function extractMockKeywords(jobDescription: string): string[] {
  const focus = qualificationsSlice(jobDescription).toLowerCase();
  const found: string[] = [];

  for (const phrase of SKILL_PHRASES) {
    if (focus.includes(phrase)) {
      found.push(phrase);
    }
  }

  // Also pull hyphen bullets that look like skills (short lines under quals).
  const bulletSkills = focus
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter((line) => line.length >= 12 && line.length <= 90)
    .filter((line) => !STOPWORDS.has(line.split(/\s+/)[0] ?? ""))
    .slice(0, 6);

  for (const bullet of bulletSkills) {
    if (!found.some((f) => bullet.includes(f))) {
      // Keep concise skill-ish fragments, not whole paragraphs.
      const clipped = bullet.replace(/\.$/, "");
      if (/experience|programming|design|build|develop|degree|cycle|debugging|architecture/i.test(clipped)) {
        found.push(clipped);
      }
    }
  }

  return Array.from(new Set(found)).slice(0, 12);
}

const MATCH_SCORE_PROMPT = `You are a resume coach for software engineering roles. Compare the resume to the job description.

Return ONLY valid JSON with this shape:
{"score": number 0-100, "missingKeywords": string[], "suggestions": string[]}

Rules:
- score reflects overall fit for the role (skills + seniority + domain)
- missingKeywords: ATS-relevant skills/tools/qualifications from the JD that are absent or weak in the resume (max 12)
- IGNORE: job IDs, locations, company name fluff, salary, benefits, EEO boilerplate, filler verbs (want/that/millions)
- Prefer concrete terms like "distributed systems", "on-call", "design patterns", languages, cloud, SDLC
- suggestions: concrete resume bullet edits a candidate could paste (max 5), not "add experience with <random word>"`;

function buildMatchUserMessage(resumeText: string, jobDescription: string): string {
  return `${MATCH_SCORE_PROMPT}

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}`;
}

export function createAnthropicMatchScorer(apiKey: string): MatchScorer {
  return {
    async score(resumeText, jobDescription) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: buildMatchUserMessage(resumeText, jobDescription),
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error (${response.status})`);
      }

      const body = (await response.json()) as AnthropicMessageResponse;
      const text = body.content?.find((block) => block.type === "text")?.text ?? "";
      const parsed = parseModelJson(text);
      if (!parsed) {
        throw new Error("Failed to parse match score response");
      }
      return parsed;
    },
  };
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

function resolveOpenAIEndpoints(apiKey: string, options?: { baseUrl?: string; model?: string }) {
  const isOpenRouter = apiKey.startsWith("sk-or-");
  const defaultBase = isOpenRouter ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1";
  const defaultModel = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";
  const baseUrl = (options?.baseUrl ?? defaultBase).replace(/\/$/, "");
  let model = options?.model ?? defaultModel;
  // College OpenRouter keys need provider/model form; plain "gpt-4o-mini" fails.
  if (isOpenRouter && !model.includes("/")) {
    model = `openai/${model}`;
  }
  return { baseUrl, model, isOpenRouter };
}

/** OpenAI, OpenRouter (sk-or-...), or Azure-compatible chat completions. */
export function createOpenAIMatchScorer(
  apiKey: string,
  options?: { baseUrl?: string; model?: string },
): MatchScorer {
  const { baseUrl, model, isOpenRouter } = resolveOpenAIEndpoints(apiKey, options);

  return {
    async score(resumeText, jobDescription) {
      const headers: Record<string, string> = {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      };
      if (isOpenRouter) {
        headers["HTTP-Referer"] = process.env.WEB_APP_URL ?? "http://localhost:5173";
        headers["X-Title"] = "JobPilot";
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "You return only valid JSON for resume-JD match scoring.",
            },
            {
              role: "user",
              content: buildMatchUserMessage(resumeText, jobDescription),
            },
          ],
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`LLM API error (${response.status}): ${detail.slice(0, 300)}`);
      }

      const body = (await response.json()) as OpenAIChatResponse;
      const text = body.choices?.[0]?.message?.content ?? "";
      const parsed = parseModelJson(text);
      if (!parsed) {
        throw new Error("Failed to parse LLM match score response");
      }
      return parsed;
    },
  };
}

export function createMockMatchScorer(result?: MatchScoreResponse): MatchScorer {
  return {
    async score(resumeText, jobDescription) {
      if (result) {
        return result;
      }
      const resumeLower = resumeText.toLowerCase();
      const keywords = extractMockKeywords(jobDescription);
      const missingKeywords = keywords.filter((keyword) => !resumeLower.includes(keyword.toLowerCase()));
      const matched = keywords.length - missingKeywords.length;
      const score =
        keywords.length === 0
          ? 55
          : Math.max(25, Math.min(92, Math.round((matched / keywords.length) * 100)));

      return {
        score,
        missingKeywords: missingKeywords.slice(0, 8),
        suggestions: missingKeywords.slice(0, 3).map((keyword) => {
          if (keyword.length > 60) {
            return `Add a resume bullet that covers: ${keyword.slice(0, 80)}…`;
          }
          return `Add a bullet quantifying impact with ${keyword} (tool, system, or practice).`;
        }),
      };
    },
  };
}

export { parseModelJson };
