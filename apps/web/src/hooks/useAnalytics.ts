import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import type { AnalyticsSummary, FunnelCounts } from "@jobpilot/shared-types";
import { fetchAnalyticsFunnel, fetchAnalyticsSummary } from "@/lib/platformApi";

export function useAnalytics() {
  const { getToken } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [funnel, setFunnel] = useState<FunnelCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const token = await getToken();
        if (!token) {
          setError("Not signed in");
          return;
        }
        const [summaryData, funnelData] = await Promise.all([
          fetchAnalyticsSummary(token),
          fetchAnalyticsFunnel(token),
        ]);
        setSummary(summaryData);
        setFunnel(funnelData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

  return { summary, funnel, loading, error };
}
