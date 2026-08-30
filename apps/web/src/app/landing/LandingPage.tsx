import { motion } from "framer-motion";
import { ArrowRight, Bot, KanbanSquare, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { PRO_MONTHLY_PRICE_USD } from "@jobpilot/shared-types";

const features = [
  {
    title: "Kanban tracker",
    description: "Wishlist through offer, without a spreadsheet.",
    icon: KanbanSquare,
  },
  {
    title: "AI match score",
    description: "See missing keywords before you apply.",
    icon: Sparkles,
  },
  {
    title: "Human-in-the-loop autofill",
    description: "We fill the form. You confirm submit.",
    icon: Bot,
  },
];

const demoColumns = [
  { id: "wishlist", title: "Wishlist", items: ["Stripe SWE", "Notion Intern"] },
  { id: "applied", title: "Applied", items: ["Vercel Frontend"] },
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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_hsl(243_75%_28%_/_0.45),_transparent_55%),linear-gradient(180deg,_hsl(224_40%_8%),_hsl(224_35%_6%))]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-2xl font-semibold tracking-tight text-primary"
        >
          JobPilot
        </motion.p>
        <div className="flex items-center gap-3">
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

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div>
            <Badge>Job search, on rails</Badge>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight md:text-6xl">
              Track every application. Autofill the busywork. Stay in control.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              JobPilot is the autopilot for a CS job search — Kanban tracking, AI resume matching,
              and ATS autofill that stops before submit.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/sign-up">Create a free account</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/sign-in">I already have an account</Link>
              </Button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.45 }}
            className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-2xl shadow-primary/10 backdrop-blur"
          >
            <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
              Interactive mini-Kanban
            </p>
            <div className="grid grid-cols-3 gap-2">
              {columns.map((column) => (
                <div key={column.id} className="rounded-lg bg-background/60 p-2">
                  <p className="mb-2 text-xs font-medium">{column.title}</p>
                  <div className="space-y-2">
                    {column.items.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="w-full rounded-md border border-border bg-card px-2 py-2 text-left text-xs hover:border-primary"
                        onClick={() => moveCard(column.id, item)}
                      >
                        {item}
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          tap to advance
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.section>

        <section className="mt-20 grid gap-4 md:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.08 }}
            >
              <Card className="h-full bg-card/80">
                <CardHeader>
                  <feature.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>

        <section className="mt-20 rounded-2xl border border-border/70 bg-card/50 p-8 md:p-10">
          <h2 className="font-display text-3xl font-semibold">Simple pricing</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Start free. Upgrade when you need unlimited AI match scores.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Free</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>$0</p>
                <p>Kanban + 5 match scores / month + HITL autofill</p>
              </CardContent>
            </Card>
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle>Pro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>${PRO_MONTHLY_PRICE_USD}/mo</p>
                <p>Unlimited match scores + priority automation</p>
                <Button asChild className="mt-2">
                  <Link to="/sign-up">Start free, upgrade later</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
