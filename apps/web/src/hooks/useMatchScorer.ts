import { useAuth } from "@clerk/clerk-react";
import type { MatchScoreResponse, MatchScoreUsageResponse, Resume } from "@jobpilot/shared-types";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/applicationsApi";
import {
  createResume,
  fetchMatchScoreUsage,
  listResumes,
  runMatchScore,
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
    async (parsedText: string) => {
      const token = await getToken();
      const created = await createResume(token, { parsedText, isPrimary: resumes.length === 0 });
      setResumes((prev) => [created, ...prev]);
      return created;
    },
    [getToken, resumes.length],
  );

  const uploadResume = useCallback(
    async (file: File) => {
      const token = await getToken();
      const created = await uploadResumeFile(token, file, resumes.length === 0);
      setResumes((prev) => [created, ...prev]);
      return created;
    },
    [getToken, resumes.length],
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
    analyze,
    refresh,
  };
}
