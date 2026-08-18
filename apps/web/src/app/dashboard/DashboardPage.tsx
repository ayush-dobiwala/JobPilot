import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function DashboardPage() {
  const { user, status } = useCurrentUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your search command center. Kanban and analytics land next.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>This week</CardTitle>
            <CardDescription>Applications logged</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Response rate</CardTitle>
            <CardDescription>Interview / applied</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Provisioned from Clerk</CardDescription>
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
                Signed in, waiting on the Clerk webhook to create your row in Postgres.
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
