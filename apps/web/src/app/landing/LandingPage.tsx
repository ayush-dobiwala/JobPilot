import { PRO_MONTHLY_PRICE_USD } from "@jobpilot/shared-types";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ClipboardList, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const helps = [
  {
    title: "Keep every application organized",
    description:
      "See where each job stands — saved, applied, interview, offer — on a simple board instead of sticky notes and spreadsheets.",
    icon: ClipboardList,
  },
  {
    title: "Know if a job fits your resume",
    description:
      "Paste a job posting and get a clear match score, missing skills to watch for, and simple suggestions to improve your resume.",
    icon: Sparkles,
  },
  {
    title: "Fill applications faster — you approve",
    description:
      "JobPilot can fill common online job forms for you, then stop. You review everything and decide when to submit.",
    icon: Wand2,
  },
] as const;

const steps = [
  {
    step: "1",
    title: "Create a free account",
    body: "Sign up in a minute. No credit card needed to start.",
  },
  {
    step: "2",
    title: "Add jobs and your resume",
    body: "Track roles you’re interested in and save your resume text once.",
  },
  {
    step: "3",
    title: "Score, organize, apply smarter",
    body: "Check fit, move cards on your board, and use autofill when you’re ready.",
  },
] as const;

const demoColumns = [
  { id: "wishlist", title: "Saved", items: ["Design role @ Acme", "Analyst @ Northwind"] },
  { id: "applied", title: "Applied", items: ["Support @ Bright"] },
  { id: "interview", title: "Interview", items: [] as string[] },
] as const;

export function LandingPage() {
  const [columns, setColumns] = useState(
    demoColumns.map((column) => ({ ...column, items: [...column.items] })),
  );

  function moveCard(fromCol: string, item: string) {
    setColumns((prev) => {
      const without = prev.map((column) => ({
        ...column,
        items: column.items.filter((entry) => entry !== item),
      }));
      return without.map((column) =>
        column.id === fromCol
          ? column
          : column.id === "applied" && fromCol === "wishlist"
            ? { ...column, items: [...column.items, item] }
            : column.id === "interview" && fromCol === "applied"
              ? { ...column, items: [...column.items, item] }
              : column,
      );
    });
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden surface-atmosphere">
      <div className="pointer-events-none absolute inset-0 mesh-grid opacity-70" aria-hidden />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl font-semibold tracking-tight text-foreground"
        >
          JobPilot
        </motion.p>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/about"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            About
          </Link>
          <ThemeToggle />
          <Button asChild variant="ghost">
            <Link to="/sign-in">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/sign-up">
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6 pb-8 pt-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]"
        >
          <div>
            <Badge>Made for job seekers</Badge>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] text-foreground md:text-6xl">
              Your job search, finally in one calm place
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              JobPilot helps you track applications, see if a job matches your resume, and fill out
              forms faster — you always review before anything is sent.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="shadow-lg shadow-primary/25">
                <Link to="/sign-up">Start free</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/about">What is JobPilot?</Link>
              </Button>
            </div>
            <ul className="mt-8 space-y-2 text-sm text-muted-foreground">
              {[
                "Free to try — no jargon, no setup headache",
                "You approve before any application is submitted",
                `Pro is $${PRO_MONTHLY_PRICE_USD}/month for unlimited resume–job match checks`,
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.5 }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-[2rem] bg-primary/20 blur-3xl" aria-hidden />
            <div className="relative rounded-2xl border border-border/80 bg-card/90 p-5 shadow-2xl shadow-primary/20 backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Try the board
                </p>
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                  Tap a card to move it
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {columns.map((column) => (
                  <div key={column.id} className="rounded-xl bg-muted/50 p-2.5">
                    <p className="mb-2 text-xs font-semibold text-foreground">{column.title}</p>
                    <div className="space-y-2">
                      {column.items.map((item) => (
                        <motion.button
                          key={item}
                          type="button"
                          layout
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full rounded-lg border border-border bg-card px-2.5 py-2.5 text-left text-xs font-medium text-foreground shadow-sm transition-colors hover:border-primary"
                          onClick={() => moveCard(column.id, item)}
                        >
                          {item}
                        </motion.button>
                      ))}
                      {column.items.length === 0 ? (
                        <p className="px-1 py-3 text-center text-[10px] text-muted-foreground">
                          Empty
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.section>

        <section id="how-it-helps" className="mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold text-foreground md:text-4xl">
              What JobPilot helps you do
            </h2>
            <p className="mt-3 text-muted-foreground">
              Plain and simple — no tech background needed.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {helps.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: index * 0.08 }}
              >
                <Card className="h-full border-border/80 bg-card/80 backdrop-blur-sm transition-transform hover:-translate-y-1 hover:border-primary/40">
                  <CardHeader>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold text-foreground md:text-4xl">
              How it works
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="rounded-2xl border border-border/80 bg-card/70 p-6 backdrop-blur-sm"
              >
                <p className="font-display text-4xl font-semibold text-primary/80">{item.step}</p>
                <h3 className="mt-3 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section
          id="pricing"
          className="mt-24 rounded-3xl border border-border/80 bg-card/75 p-8 shadow-xl shadow-primary/10 backdrop-blur-md md:p-12"
        >
          <h2 className="font-display text-3xl font-semibold text-foreground">Simple pricing</h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Start free. Upgrade only if you want unlimited resume match checks.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Card className="bg-background/60">
              <CardHeader>
                <CardTitle>Free</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p className="text-3xl font-semibold text-foreground">$0</p>
                <p>
                  Application board, 5 match checks each month, and form-fill help with your
                  approval.
                </p>
              </CardContent>
            </Card>
            <Card className="border-primary/50 bg-background/60 shadow-lg shadow-primary/10">
              <CardHeader>
                <CardTitle>Pro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p className="text-3xl font-semibold text-foreground">
                  ${PRO_MONTHLY_PRICE_USD}
                  <span className="text-base font-normal text-muted-foreground">/month</span>
                </p>
                <p>Unlimited match checks and faster automation when you’re applying a lot.</p>
                <Button asChild className="mt-2">
                  <Link to="/sign-up">Start free, upgrade later</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <div className="relative z-10 mt-16">
        <SiteFooter />
      </div>
    </div>
  );
}
