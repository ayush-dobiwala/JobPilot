import { useEffect, useState } from "react";
import { BookmarkPlus, CheckCircle2, ExternalLink, Square, Trash2, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useApplications } from "@/hooks/useApplications";
import { useAutomation } from "@/hooks/useAutomation";

const DEFAULT_WORKER =
  import.meta.env.VITE_WORKER_URL?.replace(/\/$/, "") ||
  "https://jobpilot-worker-kx0g.onrender.com";

function logMessage(runLogs: { step: string; message: string }[], step: string): string | null {
  const entry = [...runLogs].reverse().find((log) => log.step === step);
  return entry?.message ?? null;
}

function reviewUrlFromRun(runLogs: { step: string; message: string }[]): string | null {
  const review = logMessage(runLogs, "review_url");
  if (review?.startsWith("Review URL:")) {
    return review.replace(/^Review URL:\s*/, "").trim();
  }
  const form = logMessage(runLogs, "form_url");
  if (form?.startsWith("Form URL:")) {
    return form.replace(/^Form URL:\s*/, "").trim();
  }
  return null;
}

function filledFieldsFromRun(runLogs: { step: string; message: string }[]): Record<string, string> {
  const raw = logMessage(runLogs, "filled_fields");
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function isActiveStatus(status: string): boolean {
  return status === "queued" || status === "running";
}

function isFinishedStatus(status: string): boolean {
  return status === "success" || status === "failed" || status === "canceled";
}

export function AutomationPage() {
  const {
    runs,
    loading,
    error,
    busy,
    saveJobFromUrl,
    startAutofill,
    confirm,
    cancel,
    remove,
    clearFinished,
  } = useAutomation();
  const { applications, reload: refreshApps } = useApplications("");

  const [jobUrl, setJobUrl] = useState("");
  const [wishlistError, setWishlistError] = useState<string | null>(null);
  const [savingWishlist, setSavingWishlist] = useState(false);

  const [applicationId, setApplicationId] = useState("");
  const [formUrl, setFormUrl] = useState(`${DEFAULT_WORKER}/fixtures/demo-apply.html`);

  const selected = applications.find((app) => app.id === applicationId);
  const canAddWishlist = /^https?:\/\//i.test(jobUrl.trim());
  const finishedCount = runs.filter((run) => isFinishedStatus(run.status)).length;

  useEffect(() => {
    if (!applicationId) return;
    const app = applications.find((row) => row.id === applicationId);
    if (app?.jobUrl) {
      setFormUrl(app.jobUrl);
    }
  }, [applicationId, applications]);

  function onSelectApplication(id: string) {
    setApplicationId(id);
    const app = applications.find((row) => row.id === id);
    if (app?.jobUrl) {
      setFormUrl(app.jobUrl);
    }
  }

  async function onAddToWishlist() {
    if (!canAddWishlist) return;
    setSavingWishlist(true);
    setWishlistError(null);
    try {
      const result = await saveJobFromUrl(jobUrl.trim());
      setJobUrl("");
      setApplicationId(result.applicationId);
      setFormUrl(result.jobUrl);
      await refreshApps();
    } catch (err) {
      setWishlistError(err instanceof Error ? err.message : "Could not add to Wishlist");
    } finally {
      setSavingWishlist(false);
    }
  }

  async function onMarkApplied(runId: string) {
    await confirm(runId);
    await refreshApps();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Apply with assistance</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Paste a job page link — we open it, read the title and company, and save it on your
          Wishlist so you can apply later. Then prepare the form, submit yourself, and mark Applied.
          JobPilot never submits without you.
        </p>
      </div>

      <ol className="grid gap-3 md:grid-cols-3">
        {[
          {
            n: "1",
            t: "Save to Wishlist",
            d: "Paste the job description link. We fill in company and title for you.",
          },
          {
            n: "2",
            t: "Prepare form",
            d: "Autofill from your profile. You review before sending.",
          },
          {
            n: "3",
            t: "Submit & track",
            d: "Submit on the employer site, then mark Applied here.",
          },
        ].map((step) => (
          <li
            key={step.n}
            className="rounded-xl border border-border/80 bg-card/70 p-4 backdrop-blur-sm"
          >
            <p className="font-display text-2xl font-semibold text-primary/80">{step.n}</p>
            <p className="mt-1 font-medium text-foreground">{step.t}</p>
            <p className="mt-1 text-xs text-muted-foreground">{step.d}</p>
          </li>
        ))}
      </ol>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookmarkPlus className="h-4 w-4 text-primary" />
              Add to Wishlist
            </CardTitle>
            <CardDescription>
              Only the job page URL is required. We open the page in the background, pull company +
              title, and add a card on your{" "}
              <Link to="/applications" className="text-primary underline-offset-2 hover:underline">
                Applications
              </Link>{" "}
              board for later. Complete your{" "}
              <Link to="/settings" className="text-primary underline-offset-2 hover:underline">
                profile
              </Link>{" "}
              for better autofill when you apply.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="jobUrl">Job page link</Label>
              <Input
                id="jobUrl"
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://jobs.example.com/…/role-name"
                required
              />
              <p className="text-xs text-muted-foreground">
                Use the job description / posting page (not a search results page).
              </p>
            </div>
            <Button
              disabled={savingWishlist || busy || !canAddWishlist}
              onClick={() => void onAddToWishlist()}
            >
              {savingWishlist || busy ? "Reading job page…" : "Save to Wishlist"}
            </Button>
            {wishlistError ? <p className="text-sm text-destructive">{wishlistError}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              Prepare application
            </CardTitle>
            <CardDescription>
              Pick a Wishlist role, prepare the form with your profile, then open it to review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="applicationId">Application on your board</Label>
              <select
                id="applicationId"
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
                value={applicationId}
                onChange={(e) => onSelectApplication(e.target.value)}
              >
                <option value="">Select an application</option>
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    [{app.status}] {app.company} — {app.roleTitle}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="formUrl">Application form URL</Label>
              <Input id="formUrl" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} />
              {selected ? (
                <p className="text-xs text-muted-foreground">
                  Using board card: {selected.company} · {selected.roleTitle}
                </p>
              ) : null}
            </div>
            <Button
              disabled={busy || !applicationId || !formUrl.trim()}
              onClick={() => void startAutofill(applicationId, formUrl.trim())}
            >
              Prepare form (autofill)
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Activity</CardTitle>
            <CardDescription>
              Wishlist imports and form prepares. Stop active jobs, or remove finished ones.
            </CardDescription>
          </div>
          {finishedCount > 0 ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void clearFinished()}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear finished ({finishedCount})
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <Skeleton className="h-24 w-full" /> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!loading && runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity yet — paste a job link above to save it on Wishlist.
            </p>
          ) : null}
          {runs.map((run) => {
            const awaiting = run.logs.some((log) => log.step === "awaiting_confirm");
            const marked = run.logs.some((log) => log.step === "marked_applied");
            const reviewUrl = reviewUrlFromRun(run.logs);
            const fields = filledFieldsFromRun(run.logs);
            const screenshot = [...run.logs]
              .reverse()
              .find((log) => log.screenshotUrl?.startsWith("data:image"));
            const canStop = isActiveStatus(run.status);
            const canRemove = isFinishedStatus(run.status);

            return (
              <div key={run.id} className="rounded-xl border border-border bg-background/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium capitalize text-foreground">
                      {run.type === "scrape" ? "Wishlist import" : "Form prepare"} · {run.status}
                    </p>
                    <p className="text-xs text-muted-foreground">{run.id}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canStop ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void cancel(run.id)}
                      >
                        <Square className="h-3.5 w-3.5" />
                        Stop
                      </Button>
                    ) : null}
                    {canRemove ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void remove(run.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    ) : null}
                    {run.type === "autofill" && awaiting && !marked ? (
                      <>
                        {reviewUrl ? (
                          <Button asChild size="sm" variant="outline">
                            <a href={reviewUrl} target="_blank" rel="noreferrer">
                              Open form to review
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => void onMarkApplied(run.id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />I submitted — mark Applied
                        </Button>
                      </>
                    ) : null}
                    {marked ? (
                      <p className="flex items-center gap-1 text-sm text-accent">
                        <CheckCircle2 className="h-4 w-4" />
                        On your Applied column
                      </p>
                    ) : null}
                  </div>
                </div>

                {Object.keys(fields).length > 0 ? (
                  <dl className="mt-3 grid gap-1 rounded-lg bg-muted/40 p-3 text-xs sm:grid-cols-2">
                    {Object.entries(fields).map(([key, value]) => (
                      <div key={key}>
                        <dt className="font-medium uppercase tracking-wide text-muted-foreground">
                          {key.replaceAll("_", " ")}
                        </dt>
                        <dd className="truncate text-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {run.logs
                    .filter((log) => !["filled_fields", "screenshot"].includes(log.step))
                    .slice(-5)
                    .map((log, index) => (
                      <li key={`${run.id}-${index}`}>
                        <span className="text-foreground">{log.step}:</span> {log.message}
                      </li>
                    ))}
                </ul>

                {screenshot?.screenshotUrl ? (
                  <img
                    src={screenshot.screenshotUrl}
                    alt="Prepared application form"
                    className="mt-3 max-h-72 rounded-lg border border-border"
                  />
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
