import { useAuth } from "@clerk/clerk-react";
import { PRO_MONTHLY_PRICE_USD } from "@jobpilot/shared-types";
import { useEffect, useState } from "react";
import type { Subscription } from "@jobpilot/shared-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createCheckoutSession, createPortalSession, fetchSubscription } from "@/lib/platformApi";

export function BillingPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useCurrentUser();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const token = await getToken();
        if (!token) {
          return;
        }
        const data = await fetchSubscription(token);
        if (!cancelled) {
          setSubscription(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load billing");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn]);

  async function upgrade() {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Not signed in");
      }
      const session = await createCheckoutSession(token);
      window.location.href = session.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  async function openPortal() {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Not signed in");
      }
      const session = await createPortalSession(token);
      window.location.href = session.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Portal failed");
    } finally {
      setBusy(false);
    }
  }

  const plan = user?.plan ?? "free";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Free includes 5 AI match scores / month. Pro unlocks unlimited scoring.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className={plan === "free" ? "border-primary" : undefined}>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>$0 / month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Kanban tracker + 5 match scores / month</p>
            <p>Application autofill — coming soon</p>
            {plan === "free" ? <p className="text-foreground">Current plan</p> : null}
          </CardContent>
        </Card>

        <Card className={plan === "pro" ? "border-primary" : undefined}>
          <CardHeader>
            <CardTitle>Pro</CardTitle>
            <CardDescription>${PRO_MONTHLY_PRICE_USD} / month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Unlimited AI match scores</p>
            <p>Early access to autofill when it launches</p>
            {loading ? <Skeleton className="h-9 w-32" /> : null}
            {!loading && plan === "free" ? (
              <Button disabled={busy} onClick={() => void upgrade()}>
                Upgrade with Stripe
              </Button>
            ) : null}
            {!loading && plan === "pro" ? (
              <Button disabled={busy} variant="outline" onClick={() => void openPortal()}>
                Manage subscription
              </Button>
            ) : null}
            {subscription?.status ? (
              <p className="text-xs">Stripe status: {subscription.status}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
