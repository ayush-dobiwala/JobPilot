import { useState } from "react";
import { ExternalLink, CheckCircle2, Search, Wand2 } from "lucide-react";
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

export function AutomationPage() {
  const { runs, loading, error, busy, startScrape, startAutofill, confirm } = useAutomation();
  const { applications, reload: refreshApps } = useApplications("");
  const [query, setQuery] = useState("software engineer");
  const [jobUrl, setJobUrl] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [formUrl, setFormUrl] = useState(`${DEFAULT_WORKER}/fixtures/demo-apply.html`);

  const selected = applications.find((app) => app.id === applicationId);

  function onSelectApplication(id: string) {
    setApplicationId(id);
    const app = applications.find((row) => row.id === id);
    if (app?.jobUrl) {
      setFormUrl(app.jobUrl);
    }
  }

  async function onSearch() {
    const q = query.trim();
    const u = jobUrl.trim();
    if (!q && !u) {
      return;
    }
    await startScrape(q, u || undefined);
    await refreshApps();
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
          Search or paste a job link, prepare the application form with your profile, open it to
          double-check, submit yourself, then mark it Applied on your board. JobPilot never submits
          without you.
        </p>
      </div>

      <ol className="grid gap-3 md:grid-cols-3">
        {[
          { n: "1", t: "Find roles", d: "Search or paste an apply link — we add them to Wishlist." },
          { n: "2", t: "Prepare form", d: "Autofill from your profile. You review before sending." },
          { n: "3", t: "Submit & track", d: "Submit on the employer site, then mark Applied here." },
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
              <Search className="h-4 w-4 text-primary" />
              Find jobs
            </CardTitle>
            <CardDescription>
              Sample search results create Wishlist cards with company, title, and apply link.
              Complete your{" "}
              <Link to="/settings" className="text-primary underline-offset-2 hover:underline">
                profile
              </Link>{" "}
              first for better autofill.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="query">What kind of job?</Label>
              <Input
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. product designer, data analyst"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobUrl">Or paste an application link</Label>
              <Input
                id="jobUrl"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <Button
              disabled={busy || (!query.trim() && !jobUrl.trim())}
              onClick={() => void onSearch()}
            >
              Search & add to Wishlist
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              Prepare application
            </CardTitle>
            <CardDescription>
              We fill the form with your saved details, take a screenshot, then open it for you to
              review.
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
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>Searches, prepared forms, and apply confirmations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <Skeleton className="h-24 w-full" /> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!loading && runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet — start with a search.</p>
          ) : null}
          {runs.map((run) => {
            const awaiting = run.logs.some((log) => log.step === "awaiting_confirm");
            const marked = run.logs.some((log) => log.step === "marked_applied");
            const reviewUrl = reviewUrlFromRun(run.logs);
            const fields = filledFieldsFromRun(run.logs);
            const screenshot = [...run.logs]
              .reverse()
              .find((log) => log.screenshotUrl?.startsWith("data:image"));

            return (
              <div key={run.id} className="rounded-xl border border-border bg-background/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium capitalize text-foreground">
                      {run.type === "scrape" ? "Job search" : "Form prepare"} · {run.status}
                    </p>
                    <p className="text-xs text-muted-foreground">{run.id}</p>
                  </div>
                  {run.type === "autofill" && awaiting && !marked ? (
                    <div className="flex flex-wrap gap-2">
                      {reviewUrl ? (
                        <Button asChild size="sm" variant="outline">
                          <a href={reviewUrl} target="_blank" rel="noreferrer">
                            Open form to review
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      ) : null}
                      <Button size="sm" disabled={busy} onClick={() => void onMarkApplied(run.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        I submitted — mark Applied
                      </Button>
                    </div>
                  ) : null}
                  {marked ? (
                    <p className="flex items-center gap-1 text-sm text-accent">
                      <CheckCircle2 className="h-4 w-4" />
                      On your Applied column
                    </p>
                  ) : null}
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
