import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useMatchScorer } from "@/hooks/useMatchScorer";

function resumeLabel(
  resume: { id: string; parsedText: string | null; isPrimary: boolean },
  index: number,
) {
  const preview = resume.parsedText?.slice(0, 48).replace(/\s+/g, " ") ?? "Resume";
  return resume.isPrimary ? `${preview}… (primary)` : `${preview}… (#${index + 1})`;
}

export function MatchScorerPage() {
  const { resumes, usage, result, loading, error, saveResume, analyze } = useMatchScorer();
  const [resumeText, setResumeText] = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [savingResume, setSavingResume] = useState(false);

  const effectiveResumeId = useMemo(() => {
    if (selectedResumeId) return selectedResumeId;
    return resumes[0]?.id ?? "";
  }, [resumes, selectedResumeId]);

  const remainingLabel =
    usage?.limit === null
      ? "Unlimited scans (Pro)"
      : `${Math.max(0, (usage?.limit ?? 5) - (usage?.used ?? 0))} scans left this month`;

  const handleSaveResume = async () => {
    if (resumeText.trim() === "") return;
    setSavingResume(true);
    try {
      const created = await saveResume(resumeText.trim());
      setSelectedResumeId(created.id);
      setResumeText("");
    } finally {
      setSavingResume(false);
    }
  };

  const handleAnalyze = () => {
    if (!effectiveResumeId || jobDescription.trim() === "") return;
    void analyze(effectiveResumeId, jobDescription.trim());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Sparkles className="h-6 w-6 text-primary" />
            Match Scorer
          </h1>
          <p className="text-sm text-muted-foreground">
            Paste a job description and compare it against your resume. Without an Anthropic key the
            API uses a local heuristic mock — good for wiring tests, not interview-grade coaching.
          </p>
        </div>
        {usage ? (
          <Badge className="w-fit border-border bg-secondary text-muted-foreground">
            {remainingLabel}
          </Badge>
        ) : (
          <Skeleton className="h-6 w-40" />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
            <CardDescription>Save resume text once, reuse it for every JD.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resume-text">Resume text</Label>
              <Textarea
                id="resume-text"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume plain text here..."
                className="min-h-[140px]"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={savingResume || resumeText.trim() === ""}
                onClick={() => void handleSaveResume()}
              >
                {savingResume ? "Saving..." : "Save resume"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resume-select">Saved resume</Label>
              {resumes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No saved resume yet — paste one above.
                </p>
              ) : (
                <select
                  id="resume-select"
                  value={effectiveResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {resumes.map((resume, index) => (
                    <option key={resume.id} value={resume.id}>
                      {resumeLabel(resume, index)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="jd">Job description</Label>
              <Textarea
                id="jd"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description..."
                className="min-h-[180px]"
              />
            </div>

            <Button
              type="button"
              disabled={loading || !effectiveResumeId || jobDescription.trim() === ""}
              onClick={handleAnalyze}
            >
              {loading ? "Analyzing..." : "Run match score"}
            </Button>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>Score, missing keywords, and suggested bullet edits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="mx-auto h-24 w-24 rounded-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : null}

            {!loading && !result ? (
              <p className="text-sm text-muted-foreground">
                Run an analysis to see how well your resume matches the role.
              </p>
            ) : null}

            {result ? (
              <>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-primary/30 bg-primary/10">
                    <span className="font-display text-3xl font-bold text-primary">
                      {result.score}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Overall match score</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Missing keywords</p>
                  <div className="flex flex-wrap gap-2">
                    {result.missingKeywords.length === 0 ? (
                      <span className="text-sm text-muted-foreground">
                        None flagged — strong overlap.
                      </span>
                    ) : (
                      result.missingKeywords.map((keyword) => (
                        <Badge key={keyword} className="border-border bg-secondary text-foreground">
                          {keyword}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Suggested edits</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {result.suggestions.map((suggestion) => (
                      <li
                        key={suggestion}
                        className="rounded-md bg-secondary/60 px-3 py-2 text-foreground"
                      >
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
