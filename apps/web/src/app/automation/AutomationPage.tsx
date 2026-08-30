import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useApplications } from "@/hooks/useApplications";
import { useAutomation } from "@/hooks/useAutomation";

const DEMO_FORM_URL = "http://localhost:8000/fixtures/demo-apply.html";

export function AutomationPage() {
  const { runs, loading, error, busy, startScrape, startAutofill, confirm } = useAutomation();
  const { applications } = useApplications("");
  const [query, setQuery] = useState("software engineer remote");
  const [applicationId, setApplicationId] = useState("");
  const [formUrl, setFormUrl] = useState(DEMO_FORM_URL);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Automation</h1>
        <p className="text-sm text-muted-foreground">
          Queue scrape/autofill jobs. Autofill fills the form and stops — you confirm submit.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Scrape jobs</CardTitle>
            <CardDescription>Uses the worker demo board / deterministic results.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="query">Search query</Label>
              <Input id="query" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <Button disabled={busy || !query.trim()} onClick={() => void startScrape(query.trim())}>
              Queue scrape
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Autofill application</CardTitle>
            <CardDescription>Defaults to the local demo ATS form on :8000.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="applicationId">Application</Label>
              <select
                id="applicationId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
              >
                <option value="">Select an application</option>
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.company} — {app.roleTitle}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="formUrl">Form URL</Label>
              <Input id="formUrl" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} />
            </div>
            <Button
              disabled={busy || !applicationId || !formUrl.trim()}
              onClick={() => void startAutofill(applicationId, formUrl.trim())}
            >
              Queue autofill
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Runs</CardTitle>
          <CardDescription>Status and structured logs from the worker.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <Skeleton className="h-24 w-full" /> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!loading && runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No automation runs yet.</p>
          ) : null}
          {runs.map((run) => (
            <div key={run.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium capitalize">
                    {run.type} · {run.status}
                  </p>
                  <p className="text-xs text-muted-foreground">{run.id}</p>
                </div>
                {run.type === "autofill" &&
                run.logs.some((log) => log.step === "awaiting_confirm") ? (
                  <Button size="sm" disabled={busy} onClick={() => void confirm(run.id)}>
                    Confirm submit
                  </Button>
                ) : null}
              </div>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                {run.logs.slice(-6).map((log, index) => (
                  <li key={`${run.id}-${index}`}>
                    <span className="text-foreground">{log.step}:</span> {log.message}
                  </li>
                ))}
              </ul>
              {run.logs
                .filter((log) => log.screenshotUrl?.startsWith("data:image"))
                .slice(-1)
                .map((log) => (
                  <img
                    key={log.timestamp}
                    src={log.screenshotUrl}
                    alt="Filled form screenshot"
                    className="mt-3 max-h-64 rounded-md border border-border"
                  />
                ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
