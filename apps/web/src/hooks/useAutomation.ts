import { useAuth } from "@clerk/clerk-react";
import { useCallback, useEffect, useState } from "react";
import type { AutomationRun } from "@jobpilot/shared-types";
import {
  cancelAutomationRun,
  confirmSubmit,
  enqueueAutofill,
  enqueueScrape,
  fetchAutomationRuns,
} from "@/lib/platformApi";

export function useAutomation() {
  const { getToken } = useAuth();
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setError("Not signed in");
      setLoading(false);
      return;
    }
    try {
      const data = await fetchAutomationRuns(token);
      setRuns(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load runs");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, 4000);
    return () => window.clearInterval(id);
  }, [refresh]);

  async function saveJobFromUrl(url: string) {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Not signed in");
      }
      await enqueueScrape(token, { url });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save job from link");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function startAutofill(applicationId: string, formUrl: string) {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Not signed in");
      }
      await enqueueAutofill(token, { applicationId, formUrl });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start form prepare");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function confirm(runId: string) {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Not signed in");
      }
      await confirmSubmit(token, runId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark Applied");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function cancel(runId: string) {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Not signed in");
      }
      await cancelAutomationRun(token, runId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not stop job");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  return { runs, loading, error, busy, saveJobFromUrl, startAutofill, confirm, cancel, refresh };
}
