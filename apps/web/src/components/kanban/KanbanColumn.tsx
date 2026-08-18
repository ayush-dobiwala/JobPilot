import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Application, ApplicationStatus } from "@jobpilot/shared-types";
import { ApplicationCard } from "@/components/kanban/ApplicationCard";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  status: ApplicationStatus;
  label: string;
  applications: Application[];
  onSelect: (application: Application) => void;
}

export function KanbanColumn({ status, label, applications, onSelect }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border border-border bg-card/50",
        isOver && "border-primary/50 bg-primary/5",
      )}
    >
      <header className="flex items-center justify-between border-b border-border px-3 py-3">
        <h2 className="text-sm font-semibold">{label}</h2>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
          {applications.length}
        </span>
      </header>
      <SortableContext items={applications.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-[200px] flex-1 flex-col gap-2 p-2">
          {applications.map((application) => (
            <ApplicationCard key={application.id} application={application} onSelect={onSelect} />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}
