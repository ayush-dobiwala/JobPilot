import { Skeleton } from "@/components/ui/skeleton";

export function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="w-72 shrink-0 space-y-3 rounded-xl border border-border p-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ))}
    </div>
  );
}
