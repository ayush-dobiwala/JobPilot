import { useAuth } from "@clerk/clerk-react";
import { useCallback, useEffect, useState } from "react";
import type {
  AutomationRun,
  PrepareDemoResponse,
  WishlistFromUrlResponse,
} from "@jobpilot/shared-types";
import {
  cancelAutomationRun,
  clearFinishedAutomationRuns,
  confirmSubmit,
  deleteAutomationRun,
  fetchAutomationRuns,
  importWishlistFromUrl,
  prepareDemoAutofill,
} from "@/lib/platformApi";

const WORKER_URL =
  import.meta.env.VITE_WORKER_URL?.replace(/\/$/, "") ||
  "https://jobpilot-worker-kx0g.onrender.com";

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
    void fetch(`${WORKER_URL}/health`).catch(() => undefined);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const hasActiveRuns = runs.some((run) => run.status === "queued" || run.status === "running");

  useEffect(() => {
    const id = window.setInterval(
      () => {
        void refresh();
      },
      hasActiveRuns ? 2000 : 8000,
    );
    return () => window.clearInterval(id);
  }, [refresh, hasActiveRuns]);

  async function saveJobFromUrl(url: string): Promise<WishlistFromUrlResponse> {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Not signed in");
      }
      const result = await importWishlistFromUrl(token, url);
      await refresh();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save job from link");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function prepareDemo(options: {
    applicationId: string;
    formUrl: string;
    resumeId?: string;
    autoSubmit?: boolean;
  }): Promise<PrepareDemoResponse> {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Not signed in");
      }
      const result = await prepareDemoAutofill(token, {
        applicationId: options.applicationId,
        formUrl: options.formUrl,
        ...(options.resumeId ? { resumeId: options.resumeId } : {}),
        autoSubmit: options.autoSubmit ?? true,
      });
      await refresh();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare demo form");
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

  async function remove(runId: string) {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Not signed in");
      }
      await deleteAutomationRun(token, runId);
      setRuns((prev) => prev.filter((run) => run.id !== runId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove activity");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function clearFinished() {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Not signed in");
      }
      await clearFinishedAutomationRuns(token);
      setRuns((prev) => prev.filter((run) => run.status === "queued" || run.status === "running"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear finished activity");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  return {
    runs,
    loading,
    error,
    busy,
    saveJobFromUrl,
    prepareDemo,
    confirm,
    cancel,
    remove,
    clearFinished,
    refresh,
  };
}
