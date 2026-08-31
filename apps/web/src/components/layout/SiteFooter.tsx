import { Link } from "react-router-dom";

const footerLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/sign-up", label: "Get started" },
  { to: "/sign-in", label: "Sign in" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/70 bg-card/40 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm space-y-2">
          <p className="font-display text-xl font-semibold text-foreground">JobPilot</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            A simple home for your job search — organize applications, check resume fit, and fill
            forms faster. You stay in control.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-3" aria-label="Footer">
          {footerLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-border/50 px-6 py-4">
        <p className="mx-auto max-w-6xl text-xs text-muted-foreground">
          © {new Date().getFullYear()} JobPilot. Built for job seekers who want less chaos and more
          clarity.
        </p>
      </div>
    </footer>
  );
}
