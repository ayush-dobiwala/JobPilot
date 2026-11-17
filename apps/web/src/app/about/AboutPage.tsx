import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const principles = [
  {
    title: "Built for real job hunts",
    body: "Spreadsheets get messy. Random “auto-apply” tools feel risky. JobPilot sits in the middle: organized, helpful, and honest.",
  },
  {
    title: "You stay in charge",
    body: "Autofill is coming soon — and when it launches, JobPilot will pause for you. Nothing is sent until you say yes.",
  },
  {
    title: "Clear, not complicated",
    body: "You don’t need to be technical. If you can browse the web and upload a resume, you can use JobPilot.",
  },
] as const;

export function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col surface-atmosphere">
      <div className="pointer-events-none absolute inset-0 mesh-grid opacity-60" aria-hidden />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="font-display text-2xl font-semibold text-foreground">
          JobPilot
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Button asChild variant="ghost">
            <Link to="/sign-in">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/sign-up">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-6 pb-16 pt-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm font-medium uppercase tracking-wider text-primary">About</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-foreground md:text-5xl">
            Job search help that stays human
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            JobPilot helps you keep every job application in one place and see how well a job
            matches your resume. Safe form autofill is coming soon — without giving up control.
          </p>
        </motion.div>

        <div className="mt-12 space-y-4">
          {principles.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.08 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-primary/30 bg-primary/10 p-8 text-center">
          <h2 className="font-display text-2xl font-semibold text-foreground">Ready to try it?</h2>
          <p className="mt-2 text-muted-foreground">Free to start. No complicated setup.</p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/sign-up">Create a free account</Link>
          </Button>
        </div>
      </main>

      <div className="relative z-10">
        <SiteFooter />
      </div>
    </div>
  );
}
