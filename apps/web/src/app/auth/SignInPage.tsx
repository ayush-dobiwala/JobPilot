import { SignIn } from "@clerk/clerk-react";
import { clerkAppearance } from "@/lib/clerk";

export function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard"
        appearance={clerkAppearance}
      />
    </div>
  );
}
