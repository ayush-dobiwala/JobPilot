import { useAuth } from "@clerk/clerk-react";
import type { MatchScoreResponse, MatchScoreUsageResponse, Resume } from "@jobpilot/shared-types";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/applicationsApi";
import {
  createResume,
  deleteResume,
  fetchMatchScoreUsage,
  listResumes,
  runMatchScore,
  updateResume,
  uploadResumeFile,
} from "@/lib/matchScoreApi";

export function useMatchScorer() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [usage, setUsage] = useState<MatchScoreUsageResponse | null>(null);
  const [result, setResult] = useState<MatchScoreResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    const token = await getToken();
    const [resumeRows, usageRow] = await Promise.all([
      listResumes(token),
      fetchMatchScoreUsage(token),
    ]);
    setResumes(resumeRows);
    setUsage(usageRow);
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    void refresh().catch(() => {
      setError("Failed to load match scorer data");
    });
  }, [refresh]);

  const saveResume = useCallback(
    async (parsedText: string, label: string) => {
      try {
        const token = await getToken();
        const created = await createResume(token, {
          parsedText,
          label,
          isPrimary: resumes.length === 0,
        });
        setResumes((prev) => [created, ...prev.filter((row) => row.id !== created.id)]);
        setError(null);
        return created;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not save resume";
        setError(message);
        throw err;
      }
    },
    [getToken, resumes.length],
  );

  const uploadResume = useCallback(
    async (file: File, label: string) => {
      try {
        const token = await getToken();
        const created = await uploadResumeFile(token, file, {
          label,
          isPrimary: resumes.length === 0,
        });
        setResumes((prev) => [created, ...prev.filter((row) => row.id !== created.id)]);
        setError(null);
        return created;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not upload resume";
        setError(message);
        throw err;
      }
    },
    [getToken, resumes.length],
  );

  const renameResume = useCallback(
    async (id: string, label: string) => {
      try {
        const token = await getToken();
        const updated = await updateResume(token, id, { label });
        setResumes((prev) => prev.map((row) => (row.id === id ? updated : row)));
        setError(null);
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not rename resume";
        setError(message);
        throw err;
      }
    },
    [getToken],
  );

  const removeResume = useCallback(
    async (id: string) => {
      const token = await getToken();
      try {
        await deleteResume(token, id);
        setResumes((prev) => prev.filter((row) => row.id !== id));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete resume");
        throw err;
      }
    },
    [getToken],
  );

  const analyze = useCallback(
    async (resumeId: string, jobDescription: string) => {
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const token = await getToken();
        const score = await runMatchScore(token, { resumeId, jobDescription });
        setResult(score);
        const usageRow = await fetchMatchScoreUsage(token);
        setUsage(usageRow);
      } catch (err) {
        if (err instanceof ApiError && err.status === 402) {
          setError("Free tier limit reached (5 scans/month). Upgrade to Pro for unlimited scans.");
        } else {
          setError(err instanceof Error ? err.message : "Match score failed");
        }
      } finally {
        setLoading(false);
      }
    },
    [getToken],
  );

  return {
    resumes,
    usage,
    result,
    loading,
    error,
    saveResume,
    uploadResume,
    renameResume,
    removeResume,
    analyze,
    refresh,
  };
}
