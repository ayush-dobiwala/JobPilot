import { describe, expect, it } from "vitest";
import {
  createMockMatchScorer,
  extractMockKeywords,
  parseModelJson,
} from "../src/services/matchScorer.js";

describe("parseModelJson", () => {
  it("parses a valid model payload", () => {
    const parsed = parseModelJson(`Here you go:
{"score": 82, "missingKeywords": ["kubernetes"], "suggestions": ["Add metrics"]}`);
    expect(parsed).toEqual({
      score: 82,
      missingKeywords: ["kubernetes"],
      suggestions: ["Add metrics"],
    });
  });

  it("rejects invalid scores", () => {
    expect(parseModelJson('{"score": 120, "missingKeywords": [], "suggestions": []}')).toBeNull();
  });
});

describe("extractMockKeywords", () => {
  it("ignores job ids and filler words from amazon-style JDs", () => {
    const jd = `
Software Development Engineer, Amazon Customer Service
Job ID: 10441359 | Amazon Canada
Want to build customer service experiences that resolve millions of contacts

Basic Qualifications
- 3+ years of non-internship professional software development experience
- Experience programming with at least one software programming language
- 2+ years of design patterns, reliability and scaling

Preferred Qualifications
- Experience with full software development life cycle
- Bachelor's degree in computer science or equivalent
- Experience in debugging, profiling in large-scale systems

Key job responsibilities
- Design, build, and operate distributed services
- Own features including operational excellence and on-call
`;
    const keywords = extractMockKeywords(jd);
    expect(keywords.join(" ")).not.toMatch(/10441359|want|millions|canada|amazon/i);
    expect(
      keywords.some((k) =>
        /distributed|design patterns|on-call|debugging|life cycle|computer science/i.test(k),
      ),
    ).toBe(true);
  });
});

describe("createMockMatchScorer", () => {
  it("scores higher when resume covers extracted skills", async () => {
    const scorer = createMockMatchScorer();
    const jd = `
Basic Qualifications
- Experience with design patterns and distributed services
- on-call and operational excellence
Preferred Qualifications
- debugging and profiling in large-scale systems
`;
    const weak = await scorer.score("Retail cashier. Friendly.", jd);
    const strong = await scorer.score(
      "Built distributed services with design patterns, on-call rotations, operational excellence, debugging and profiling large-scale systems.",
      jd,
    );
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(weak.missingKeywords.length).toBeGreaterThan(0);
  });
});
