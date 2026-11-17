import { useAuth } from "@clerk/clerk-react";
import type { User } from "@jobpilot/shared-types";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export function useCurrentUser() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "missing" | "error">("idle");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let cancelled = false;
    setStatus("loading");

    void (async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (!cancelled) {
            setStatus("error");
          }
          return;
        }
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

        setStatus(response.status === 404 ? "missing" : "error");
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn]);

  return { user, status };
}
