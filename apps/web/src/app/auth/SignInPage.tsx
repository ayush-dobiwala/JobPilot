import { SignIn } from "@clerk/clerk-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { warmApi } from "@/lib/api";
import { getClerkAppearance } from "@/lib/clerk";
import { useThemeStore } from "@/stores/theme";

export function SignInPage() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    // Start waking the API while the user types credentials.
    warmApi();
  }, []);

  return (
    <div className="flex min-h-screen flex-col surface-atmosphere">
      <div className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-xl font-semibold text-foreground">
          JobPilot
        </Link>
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-12">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          forceRedirectUrl="/dashboard"
          appearance={getClerkAppearance(theme)}
        />
      </div>
    </div>
  );
}
