import { motion } from "framer-motion";
import { ArrowRight, Bot, KanbanSquare, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

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

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(243_80%_20%_/_0.35),_transparent_55%)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <p className="font-display text-xl font-semibold text-primary">JobPilot</p>
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

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="max-w-3xl"
        >
          <Badge>Job search, on rails</Badge>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-6xl">
            Track every application. Autofill the busywork. Stay in control.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            JobPilot is the autopilot for a CS job search — Kanban tracking, AI resume matching, and
            ATS autofill that stops before submit.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/sign-up">Create a free account</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/sign-in">I already have an account</Link>
            </Button>
          </div>
        </motion.section>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="bg-card/80">
              <CardHeader>
                <feature.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
