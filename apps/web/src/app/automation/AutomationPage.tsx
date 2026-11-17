import { ComingSoon } from "@/components/layout/ComingSoon";

export function AutomationPage() {
  return (
    <ComingSoon
      title="Automation"
      description="One-click application submit is pending. Track jobs, score resumes, and manage your pipeline while we finish safe autofill."
      highlights={[
        "Fill common application forms from your saved profile and resume",
        "You review every field before anything is submitted",
        "Human-in-the-loop by design — no blind auto-apply spam",
      ]}
    />
  );
}
