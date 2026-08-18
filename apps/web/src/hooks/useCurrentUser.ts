import { useAuth } from "@clerk/clerk-react";
import type { User } from "@jobpilot/shared-types";
import { useEffect, useState } from "react";
import { apiFetch, shouldKeepPolling } from "@/lib/api";

const MAX_ATTEMPTS = 12;

export function useCurrentUser() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "missing" | "error">("idle");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    setStatus("loading");

    const poll = async () => {
      try {
        const token = await getToken();
        const response = await apiFetch("/api/me", token);
        if (cancelled) {
          return;
        }

        if (response.ok) {
          const body = (await response.json()) as User;
          setUser(body);
          setStatus("ready");
          return;
        }

        attempts += 1;
        if (shouldKeepPolling(response.status, attempts, MAX_ATTEMPTS)) {
          window.setTimeout(() => {
            void poll();
          }, 1250);
          return;
        }

        setStatus(response.status === 404 ? "missing" : "error");
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn]);

  return { user, status };
}
