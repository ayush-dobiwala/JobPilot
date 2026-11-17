import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import type { Profile } from "@jobpilot/shared-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProfile, updateProfile } from "@/lib/platformApi";

export function SettingsPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [workAuthStatus, setWorkAuthStatus] = useState("");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const token = await getToken();
        if (!token) {
          return;
        }
        const data = await fetchProfile(token);
        if (cancelled) {
          return;
        }
        setProfile(data);
        setPhone(data?.phone ?? "");
        setLocation(data?.location ?? "");
        setLinkedinUrl(data?.linkedinUrl ?? "");
        setPortfolioUrl(data?.portfolioUrl ?? "");
        setWorkAuthStatus(data?.workAuthStatus ?? "");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load profile");
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

  async function onSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Not signed in");
      }
      const updated = await updateProfile(token, {
        phone: phone || null,
        location: location || null,
        linkedinUrl: linkedinUrl || null,
        portfolioUrl: portfolioUrl || null,
        workAuthStatus: workAuthStatus || null,
      });
      setProfile(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your contact and work-auth defaults for applications (autofill coming soon).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            {profile ? "Edit and save your autofill defaults." : "Create your profile."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <Skeleton className="h-40 w-full" /> : null}
          {!loading ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn URL</Label>
                  <Input
                    id="linkedin"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolio">Portfolio URL</Label>
                  <Input
                    id="portfolio"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="workAuth">Work authorization</Label>
                  <Input
                    id="workAuth"
                    value={workAuthStatus}
                    onChange={(e) => setWorkAuthStatus(e.target.value)}
                    placeholder="e.g. US citizen, needs sponsorship"
                  />
                </div>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {saved ? <p className="text-sm text-primary">Saved.</p> : null}
              <Button disabled={saving} onClick={() => void onSave()}>
                Save profile
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
