import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Application, ApplicationStatus } from "@jobpilot/shared-types";
import { useMemo, useState } from "react";
import { ApplicationCard } from "@/components/kanban/ApplicationCard";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { KANBAN_COLUMNS, groupApplicationsByStatus } from "@/lib/applicationsApi";
import { isApplicationStatus } from "@jobpilot/shared-types";

interface KanbanBoardProps {
  applications: Application[];
  onSelect: (application: Application) => void;
  onMove: (id: string, status: ApplicationStatus) => Promise<void>;
}

export function KanbanBoard({ applications, onSelect, onMove }: KanbanBoardProps) {
  const grouped = useMemo(() => groupApplicationsByStatus(applications), [applications]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const activeApplication = applications.find((row) => row.id === activeId) ?? null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) {
      return;
    }

    const applicationId = String(active.id);
    const overId = String(over.id);
    let targetStatus: ApplicationStatus | null = null;

    if (isApplicationStatus(overId)) {
      targetStatus = overId;
    } else {
      const overCard = applications.find((row) => row.id === overId);
      targetStatus = overCard?.status ?? null;
    }

    const current = applications.find((row) => row.id === applicationId);
    if (!current || !targetStatus || current.status === targetStatus) {
      return;
    }

    void onMove(applicationId, targetStatus);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.status}
            status={column.status}
            label={column.label}
            applications={grouped[column.status]}
            onSelect={onSelect}
          />
        ))}
      </div>
      <DragOverlay>
        {activeApplication ? (
          <div className="w-72 opacity-95">
            <ApplicationCard application={activeApplication} onSelect={() => undefined} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
