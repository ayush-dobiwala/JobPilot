import { useAuth } from "@clerk/clerk-react";
import type { Application, ApplicationEvent } from "@jobpilot/shared-types";
import { ExternalLink, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { listApplicationEvents } from "@/lib/applicationsApi";

interface ApplicationDetailDialogProps {
  application: Application | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveNotes: (id: string, notes: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ApplicationDetailDialog({
  application,
  open,
  onOpenChange,
  onSaveNotes,
  onDelete,
}: ApplicationDetailDialogProps) {
  const { getToken } = useAuth();
  const [notes, setNotes] = useState("");
  const [eventsLoading, setEventsLoading] = useState(false);
  const [events, setEvents] = useState<ApplicationEvent[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!application || !open) {
      return;
    }
    setNotes(application.notes ?? "");
    setEventsLoading(true);
    void (async () => {
      try {
        const token = await getToken();
        const rows = await listApplicationEvents(token, application.id);
        setEvents(rows);
      } catch {
        setEvents([]);
      } finally {
        setEventsLoading(false);
      }
    })();
  }, [application, getToken, open]);

  if (!application) {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveNotes(application.id, notes);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(application.id);
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{application.roleTitle}</DialogTitle>
          <DialogDescription>{application.company}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-secondary px-2 py-0.5 capitalize">
              {application.status}
            </span>
            {application.matchScore !== null ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                {application.matchScore}% match
              </span>
            ) : null}
            {application.salaryRange ? (
              <span className="rounded-full bg-secondary px-2 py-0.5">
                {application.salaryRange}
              </span>
            ) : null}
          </div>

          {application.jobUrl ? (
            <a
              href={application.jobUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View posting
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="detail-notes">Notes</Label>
            <Textarea
              id="detail-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Interview prep, contacts, follow-ups..."
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Activity</p>
            {eventsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {events.map((event) => (
                  <li key={event.id} className="rounded-md bg-secondary/50 px-3 py-2">
                    <span className="font-medium capitalize text-foreground">
                      {event.eventType.replace("_", " ")}
                    </span>
                    <span className="ml-2 text-xs">
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleDelete()}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "Deleting..." : "Delete"}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : "Save notes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
