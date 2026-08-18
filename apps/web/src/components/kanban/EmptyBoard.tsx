import { Briefcase, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyBoardProps {
  onAdd: () => void;
}

export function EmptyBoard({ onAdd }: EmptyBoardProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
        <Briefcase className="h-8 w-8" />
      </div>
      <h2 className="font-display text-xl font-semibold">No applications yet</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Track every role in one place. Add your first application to populate the Kanban board.
      </p>
      <Button className="mt-6" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add application
      </Button>
    </div>
  );
}
