import { useAnalytics } from "@/hooks/useAnalytics";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardPage() {
  const { user, status } = useCurrentUser();
  const { summary, loading: analyticsLoading, error: analyticsError } = useAnalytics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your search command center.</p>
      </div>

      {analyticsError ? <p className="text-sm text-destructive">{analyticsError}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>This week</CardTitle>
            <CardDescription>Applications logged</CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="font-display text-3xl">{summary?.applicationsThisWeek ?? 0}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Response rate</CardTitle>
            <CardDescription>Interview / applied pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="font-display text-3xl">{summary?.responseRate ?? 0}%</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your JobPilot plan</CardDescription>
          </CardHeader>
          <CardContent>
            {status === "loading" || status === "idle" ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : null}
            {status === "ready" && user ? (
              <div>
                <p className="font-medium">{user.name ?? user.email}</p>
                <p className="text-sm capitalize text-muted-foreground">{user.plan} plan</p>
              </div>
            ) : null}
            {status === "missing" ? (
              <p className="text-sm text-muted-foreground">
                Signed in, but your account row could not be created yet. Refresh once and try
                again.
              </p>
            ) : null}
            {status === "error" ? (
              <p className="text-sm text-destructive">
                Could not reach the API. Is it running on :3001?
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
