import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Application } from "@jobpilot/shared-types";
import { Building2, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ApplicationCardProps {
  application: Application;
  onSelect: (application: Application) => void;
}

export function ApplicationCard({ application, onSelect }: ApplicationCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: application.id,
    data: { status: application.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
        isDragging && "opacity-60 ring-2 ring-primary",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 cursor-grab text-muted-foreground active:cursor-grabbing"
          aria-label="Drag application"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button type="button" className="flex-1 text-left" onClick={() => onSelect(application)}>
          <p className="font-medium leading-snug">{application.roleTitle}</p>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            {application.company}
          </p>
          {application.matchScore !== null ? (
            <Badge className="mt-2">{application.matchScore}% match</Badge>
          ) : null}
        </button>
      </div>
    </article>
  );
}
