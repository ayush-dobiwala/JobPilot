import { useAuth } from "@clerk/clerk-react";
import type {
  Application,
  CreateApplicationRequest,
  UpdateApplicationRequest,
} from "@jobpilot/shared-types";
import { useCallback, useEffect, useState } from "react";
import {
  createApplication,
  deleteApplication,
  listApplications,
  updateApplication,
} from "@/lib/applicationsApi";

export function useApplications(search: string) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const token = await getToken();
      const trimmed = search.trim();
      const result = await listApplications(token, trimmed === "" ? {} : { search: trimmed });
      setApplications(result.data);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to load applications");
    }
  }, [getToken, isLoaded, isSignedIn, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = useCallback(
    async (input: CreateApplicationRequest) => {
      const token = await getToken();
      const created = await createApplication(token, input);
      setApplications((prev) => [created, ...prev]);
      return created;
    },
    [getToken],
  );

  const update = useCallback(
    async (id: string, input: UpdateApplicationRequest) => {
      const token = await getToken();
      const updated = await updateApplication(token, id, input);
      setApplications((prev) => prev.map((row) => (row.id === id ? updated : row)));
      return updated;
    },
    [getToken],
  );

  const remove = useCallback(
    async (id: string) => {
      const token = await getToken();
      await deleteApplication(token, id);
      setApplications((prev) => prev.filter((row) => row.id !== id));
    },
    [getToken],
  );

  const moveToStatus = useCallback(
    async (id: string, status: Application["status"]) => {
      const existing = applications.find((row) => row.id === id);
      if (!existing || existing.status === status) {
        return existing;
      }
      setApplications((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
      try {
        return await update(id, { status });
      } catch (err) {
        setApplications((prev) => prev.map((row) => (row.id === id ? existing : row)));
        throw err;
      }
    },
    [applications, update],
  );

  return {
    applications,
    status,
    error,
    reload: load,
    add,
    update,
    remove,
    moveToStatus,
  };
}
