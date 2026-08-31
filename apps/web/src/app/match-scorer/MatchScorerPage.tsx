import { FileUp, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useMatchScorer } from "@/hooks/useMatchScorer";

function resumeLabel(
  resume: { id: string; parsedText: string | null; isPrimary: boolean; storagePath: string },
  index: number,
) {
  const filePart = resume.storagePath.includes("/")
    ? resume.storagePath.split("/").pop()
    : null;
  const fromFile =
    filePart && !filePart.startsWith("inline")
      ? filePart.replace(/^[0-9a-f-]{36}-/i, "")
      : null;
  const preview =
    fromFile || resume.parsedText?.slice(0, 48).replace(/\s+/g, " ") || `Resume ${index + 1}`;
  return resume.isPrimary ? `${preview} (primary)` : preview;
}

export function MatchScorerPage() {
  const { resumes, usage, result, loading, error, saveResume, uploadResume, analyze } =
    useMatchScorer();
  const [resumeText, setResumeText] = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [savingResume, setSavingResume] = useState(false);
  const [uploadName, setUploadName] = useState<string | null>(null);

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

  const handleUpload = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setSavingResume(true);
    setUploadName(file.name);
    try {
      const created = await uploadResume(file);
      setSelectedResumeId(created.id);
    } finally {
      setSavingResume(false);
      setUploadName(null);
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
            Upload a PDF or Word resume, or paste text, then compare it to a job description.
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
            <CardDescription>
              Attach PDF / Word (.docx), or paste text. We extract the words for matching.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resume-file">Upload resume</Label>
              <div className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor="resume-file"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  <FileUp className="h-4 w-4 text-primary" />
                  Choose PDF or Word
                </label>
                <input
                  id="resume-file"
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="sr-only"
                  disabled={savingResume}
                  onChange={(e) => {
                    void handleUpload(e.target.files);
                    e.target.value = "";
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  {uploadName
                    ? `Uploading ${uploadName}…`
                    : "Max 5 MB · .pdf or .docx (not old .doc)"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resume-text">Or paste resume text</Label>
              <Textarea
                id="resume-text"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume plain text here..."
                className="min-h-[120px]"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={savingResume || resumeText.trim() === ""}
                onClick={() => void handleSaveResume()}
              >
                {savingResume ? "Saving..." : "Save text resume"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resume-select">Saved resume</Label>
              {resumes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No saved resume yet — upload a file or paste text above.
                </p>
              ) : (
                <select
                  id="resume-select"
                  value={effectiveResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
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
