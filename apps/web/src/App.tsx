import { ClerkProvider } from "@clerk/clerk-react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AnalyticsPage } from "@/app/analytics/AnalyticsPage";
import { ApplicationsPage } from "@/app/applications/ApplicationsPage";
import { SignInPage } from "@/app/auth/SignInPage";
import { SignUpPage } from "@/app/auth/SignUpPage";
import { AutomationPage } from "@/app/automation/AutomationPage";
import { BillingPage } from "@/app/billing/BillingPage";
import { DashboardPage } from "@/app/dashboard/DashboardPage";
import { LandingPage } from "@/app/landing/LandingPage";
import { MatchScorerPage } from "@/app/match-scorer/MatchScorerPage";
import { SettingsPage } from "@/app/settings/SettingsPage";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { clerkAppearance, getClerkPublishableKey } from "@/lib/clerk";

function MissingClerkConfig() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-2xl font-semibold">Add your Clerk keys</h1>
        <p className="text-sm text-muted-foreground">
          Set <code className="text-foreground">CLERK_PUBLISHABLE_KEY</code> and{" "}
          <code className="text-foreground">CLERK_SECRET_KEY</code> in the repo-root{" "}
          <code className="text-foreground">.env</code>, then restart Vite and the API.
        </p>
      </div>
    </div>
  );
}

export function App() {
  const publishableKey = getClerkPublishableKey();
  if (!publishableKey) {
    return <MissingClerkConfig />;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/"
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/applications" element={<ApplicationsPage />} />
              <Route path="/match-scorer" element={<MatchScorerPage />} />
              <Route path="/automation" element={<AutomationPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/billing" element={<BillingPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  );
}
