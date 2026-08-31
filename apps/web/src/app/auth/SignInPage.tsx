import { SignIn } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { getClerkAppearance } from "@/lib/clerk";
import { useThemeStore } from "@/stores/theme";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function SignInPage() {
  const theme = useThemeStore((state) => state.theme);

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
