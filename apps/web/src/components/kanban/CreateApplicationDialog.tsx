import type { ApplicationStatus, CreateApplicationRequest } from "@jobpilot/shared-types";
import { APPLICATION_STATUSES } from "@jobpilot/shared-types";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CreateApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreateApplicationRequest) => Promise<void>;
}

const statusLabels: Record<ApplicationStatus, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export function CreateApplicationDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateApplicationDialogProps) {
  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("wishlist");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCompany("");
    setRoleTitle("");
    setJobUrl("");
    setNotes("");
    setStatus("wishlist");
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        company: company.trim(),
        roleTitle: roleTitle.trim(),
        status,
        ...(jobUrl.trim() ? { jobUrl: jobUrl.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add application</DialogTitle>
          <DialogDescription>Track a new role on your board.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
              placeholder="Acme Corp"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roleTitle">Role</Label>
            <Input
              id="roleTitle"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              required
              placeholder="Software Engineer"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobUrl">Job URL (optional)</Label>
            <Input
              id="jobUrl"
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Column</Label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {APPLICATION_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {statusLabels[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Referral from..."
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Add application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
