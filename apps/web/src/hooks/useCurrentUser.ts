import { useAuth } from "@clerk/clerk-react";
import type { User } from "@jobpilot/shared-types";
import { useEffect, useState } from "react";
import { apiFetch, ApiTimeoutError } from "@/lib/api";

type Status = "idle" | "loading" | "ready" | "missing" | "error";

type CacheSnapshot = {
  user: User | null;
  status: Status;
  errorMessage: string | null;
};

let cache: CacheSnapshot = { user: null, status: "idle", errorMessage: null };
let inflight: Promise<CacheSnapshot> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

async function loadUser(getToken: () => Promise<string | null>): Promise<CacheSnapshot> {
  if (cache.status === "ready" && cache.user) {
    return cache;
  }
  if (inflight) {
    return inflight;
  }

  inflight = (async () => {
    cache = { ...cache, status: "loading", errorMessage: null };
    emit();
    try {
      const token = await getToken();
      if (!token) {
        cache = { user: null, status: "error", errorMessage: "Not signed in" };
        return cache;
      }
      const response = await apiFetch("/api/me", token);
      if (response.ok) {
        const body = (await response.json()) as User;
        cache = { user: body, status: "ready", errorMessage: null };
        return cache;
      }
      cache = {
        user: null,
        status: response.status === 404 ? "missing" : "error",
        errorMessage: response.status === 404 ? null : `API error ${response.status}`,
      };
      return cache;
    } catch (error) {
      const message =
        error instanceof ApiTimeoutError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not reach the API";
      cache = { user: null, status: "error", errorMessage: message };
      return cache;
    } finally {
      inflight = null;
      emit();
    }
  })();

  return inflight;
}

export function useCurrentUser() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [snapshot, setSnapshot] = useState<CacheSnapshot>(cache);

  useEffect(() => {
    const onChange = () => setSnapshot({ ...cache });
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }
    void loadUser(() => getToken());
  }, [getToken, isLoaded, isSignedIn]);

  return {
    user: snapshot.user,
    status: snapshot.status,
    errorMessage: snapshot.errorMessage,
  };
}
