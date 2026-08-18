import type { Application } from "@jobpilot/shared-types";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { ApplicationDetailDialog } from "@/components/kanban/ApplicationDetailDialog";
import { CreateApplicationDialog } from "@/components/kanban/CreateApplicationDialog";
import { EmptyBoard } from "@/components/kanban/EmptyBoard";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { KanbanSkeleton } from "@/components/kanban/KanbanSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApplications } from "@/hooks/useApplications";

export function ApplicationsPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Application | null>(null);
  const { applications, status, error, add, update, remove, moveToStatus } =
    useApplications(search);

  const showEmpty = status === "ready" && applications.length === 0 && search.trim() === "";

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
          onMove={async (id, status) => {
            await moveToStatus(id, status);
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
