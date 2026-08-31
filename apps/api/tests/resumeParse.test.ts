import { describe, expect, it } from "vitest";
import { assertAllowedResumeFile, ResumeParseError } from "../src/lib/resumeParse.js";

describe("resumeParse", () => {
  it("accepts pdf and docx under size limit", () => {
    expect(() => assertAllowedResumeFile("cv.pdf", 1024)).not.toThrow();
    expect(() => assertAllowedResumeFile("Resume.DOCX", 2048)).not.toThrow();
  });

  it("rejects old .doc and oversized files", () => {
    expect(() => assertAllowedResumeFile("old.doc", 100)).toThrow(ResumeParseError);
    expect(() => assertAllowedResumeFile("big.pdf", 6 * 1024 * 1024)).toThrow(ResumeParseError);
    expect(() => assertAllowedResumeFile("notes.txt", 100)).toThrow(ResumeParseError);
  });
});
