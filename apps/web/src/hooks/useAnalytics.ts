import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import type { AnalyticsSummary, FunnelCounts } from "@jobpilot/shared-types";
import { fetchAnalyticsFunnel, fetchAnalyticsSummary } from "@/lib/platformApi";

export function useAnalytics() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [funnel, setFunnel] = useState<FunnelCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (!cancelled) {
            setError("Not signed in");
            setLoading(false);
          }
          return;
        }
        const [summaryData, funnelData] = await Promise.all([
          fetchAnalyticsSummary(token),
          fetchAnalyticsFunnel(token),
        ]);
        if (cancelled) {
          return;
        }
        setSummary(summaryData);
        setFunnel(funnelData);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load analytics");
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

  return { summary, funnel, loading, error };
}
