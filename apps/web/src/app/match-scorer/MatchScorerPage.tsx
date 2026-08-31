import { FileUp, Pencil, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useMatchScorer } from "@/hooks/useMatchScorer";

export function MatchScorerPage() {
  const {
    resumes,
    usage,
    result,
    loading,
    error,
    saveResume,
    uploadResume,
    renameResume,
    removeResume,
    analyze,
  } = useMatchScorer();

  const [resumeLabel, setResumeLabel] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [savingResume, setSavingResume] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const effectiveResumeId = useMemo(() => {
    if (selectedResumeId && resumes.some((row) => row.id === selectedResumeId)) {
      return selectedResumeId;
    }
    return resumes[0]?.id ?? "";
  }, [resumes, selectedResumeId]);

  const selectedResume = resumes.find((row) => row.id === effectiveResumeId) ?? null;

  const remainingLabel =
    usage?.limit === null
      ? "Unlimited scans (Pro)"
      : `${Math.max(0, (usage?.limit ?? 5) - (usage?.used ?? 0))} scans left this month`;

  const canSave =
    resumeLabel.trim() !== "" && (pendingFile !== null || resumeText.trim() !== "");

  async function handleSaveResume() {
    if (!canSave) return;
    setSavingResume(true);
    try {
      const label = resumeLabel.trim();
      const created = pendingFile
        ? await uploadResume(pendingFile, label)
        : await saveResume(resumeText.trim(), label);
      setSelectedResumeId(created.id);
      setResumeText("");
      setPendingFile(null);
      setResumeLabel("");
    } finally {
      setSavingResume(false);
    }
  }

  async function handleRename(id: string) {
    if (editLabel.trim() === "") return;
    await renameResume(id, editLabel.trim());
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    const resume = resumes.find((row) => row.id === id);
    const ok = window.confirm(
      resume
        ? `Delete “${resume.label}”? You won’t be able to use it for match scores anymore.`
        : "Delete this resume?",
    );
    if (!ok) return;
    try {
      await removeResume(id);
      if (selectedResumeId === id) {
        setSelectedResumeId("");
      }
    } catch {
      // error message is set in the hook
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Sparkles className="h-6 w-6 text-primary" />
            Match Scorer
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Save different versions of your resume with clear names (for example “Backend —
            APIs” or “DevOps — cloud”). When you score a job, pick the version that matches that
            role.
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

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add a resume</CardTitle>
              <CardDescription>
                Give it a name you’ll recognize later, then upload a PDF/Word file or paste text.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resume-label">Resume name</Label>
                <Input
                  id="resume-label"
                  value={resumeLabel}
                  onChange={(e) => setResumeLabel(e.target.value)}
                  placeholder='e.g. "Frontend — React roles" or "Data analyst"'
                />
                <p className="text-xs text-muted-foreground">
                  Tip: include the kind of job this version is for, so it’s easy to choose later.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resume-file">Upload PDF or Word</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    htmlFor="resume-file"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    <FileUp className="h-4 w-4 text-primary" />
                    Choose file
                  </label>
                  <input
                    id="resume-file"
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="sr-only"
                    disabled={savingResume}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setPendingFile(file);
                      if (file && resumeLabel.trim() === "") {
                        setResumeLabel(file.name.replace(/\.[^.]+$/, ""));
                      }
                      e.target.value = "";
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {pendingFile
                      ? pendingFile.name
                      : "PDF or .docx · max 5 MB (not old .doc)"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resume-text">Or paste text</Label>
                <Textarea
                  id="resume-text"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste resume text if you don’t have a file handy…"
                  className="min-h-[100px]"
                  disabled={pendingFile !== null}
                />
              </div>

              <Button
                type="button"
                disabled={savingResume || !canSave}
                onClick={() => void handleSaveResume()}
              >
                {savingResume ? "Saving…" : "Save resume"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your resume library</CardTitle>
              <CardDescription>
                Select which version to score against the job below. Rename or delete anytime.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {resumes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No resumes yet — add one above so you can match it to jobs.
                </p>
              ) : (
                resumes.map((resume) => {
                  const selected = resume.id === effectiveResumeId;
                  const editing = editingId === resume.id;
                  return (
                    <div
                      key={resume.id}
                      className={`rounded-xl border p-4 transition-colors ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card/60 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => setSelectedResumeId(resume.id)}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">{resume.label}</p>
                            {resume.isPrimary ? (
                              <Badge className="border-primary/30 bg-primary/10 text-primary">
                                Default
                              </Badge>
                            ) : null}
                            {selected ? (
                              <Badge className="border-border bg-secondary text-muted-foreground">
                                Selected for scoring
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Saved {new Date(resume.uploadedAt).toLocaleDateString()}
                            {resume.storagePath.includes("upload/") ? " · from file" : " · from text"}
                          </p>
                        </button>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Rename resume"
                            onClick={() => {
                              setEditingId(resume.id);
                              setEditLabel(resume.label);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Delete resume"
                            onClick={() => void handleDelete(resume.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {editing ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="max-w-sm"
                          />
                          <Button size="sm" onClick={() => void handleRename(resume.id)}>
                            Save name
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Score a job</CardTitle>
              <CardDescription>
                {selectedResume
                  ? `Using “${selectedResume.label}”. Paste the job description and run the score.`
                  : "Save a resume first, then paste a job description."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jd">Job description</Label>
                <Textarea
                  id="jd"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job posting here…"
                  className="min-h-[180px]"
                />
              </div>
              <Button
                type="button"
                disabled={loading || !effectiveResumeId || jobDescription.trim() === ""}
                onClick={() => void analyze(effectiveResumeId, jobDescription.trim())}
              >
                {loading ? "Analyzing…" : "Run match score"}
              </Button>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit xl:sticky xl:top-24">
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>Score, missing keywords, and suggested edits.</CardDescription>
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
                Pick a named resume, paste a job, and run a score to see fit.
              </p>
            ) : null}

            {result ? (
              <>
                {selectedResume ? (
                  <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                    Scored with <span className="font-medium text-foreground">{selectedResume.label}</span>
                  </p>
                ) : null}
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
