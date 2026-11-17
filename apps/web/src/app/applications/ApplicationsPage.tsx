import { useAuth } from "@clerk/clerk-react";
import type { Application } from "@jobpilot/shared-types";
import { Link2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { ApplicationDetailDialog } from "@/components/kanban/ApplicationDetailDialog";
import { CreateApplicationDialog } from "@/components/kanban/CreateApplicationDialog";
import { EmptyBoard } from "@/components/kanban/EmptyBoard";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { KanbanSkeleton } from "@/components/kanban/KanbanSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useApplications } from "@/hooks/useApplications";
import { importWishlistFromUrl } from "@/lib/platformApi";

export function ApplicationsPage() {
  const { getToken } = useAuth();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Application | null>(null);
  const [jobUrl, setJobUrl] = useState("");
  const [savingFromUrl, setSavingFromUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlSuccess, setUrlSuccess] = useState<string | null>(null);
  const { applications, status, error, add, update, remove, moveToStatus, reload } =
    useApplications(search);

  const showEmpty = status === "ready" && applications.length === 0 && search.trim() === "";

  async function saveFromJobUrl() {
    const url = jobUrl.trim();
    if (!url) {
      setUrlError("Paste a job posting URL first.");
      return;
    }
    setSavingFromUrl(true);
    setUrlError(null);
    setUrlSuccess(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Not signed in");
      }
      const result = await importWishlistFromUrl(token, url);
      setJobUrl("");
      setUrlSuccess(`Saved ${result.company} — ${result.roleTitle} to Wishlist.`);
      await reload();
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Could not save that job link");
    } finally {
      setSavingFromUrl(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Applications</h1>
          <p className="text-sm text-muted-foreground">
            Drag cards across columns as your pipeline moves.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Add application
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4" />
            Add from job link
          </CardTitle>
          <CardDescription>
            Paste a posting URL and we will pull company + title into Wishlist.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://boards.example.com/jobs/123"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveFromJobUrl();
                }
              }}
            />
            <Button disabled={savingFromUrl} onClick={() => void saveFromJobUrl()}>
              {savingFromUrl ? "Saving…" : "Save to Wishlist"}
            </Button>
          </div>
          {urlError ? <p className="text-sm text-destructive">{urlError}</p> : null}
          {urlSuccess ? <p className="text-sm text-muted-foreground">{urlSuccess}</p> : null}
        </CardContent>
      </Card>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company or role..."
          className="pl-9"
        />
      </div>

      {status === "loading" || status === "idle" ? <KanbanSkeleton /> : null}
      {status === "error" ? (
        <p className="text-sm text-destructive">{error ?? "Failed to load applications."}</p>
      ) : null}
      {showEmpty ? <EmptyBoard onAdd={() => setCreateOpen(true)} /> : null}
      {status === "ready" && !showEmpty ? (
        <KanbanBoard
          applications={applications}
          onSelect={setSelected}
          onMove={async (id, nextStatus) => {
            await moveToStatus(id, nextStatus);
          }}
        />
      ) : null}

      <CreateApplicationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={async (input) => {
          await add(input);
        }}
      />

      <ApplicationDetailDialog
        application={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onSaveNotes={async (id, notes) => {
          await update(id, { notes });
        }}
        onDelete={remove}
      />
    </div>
  );
}
