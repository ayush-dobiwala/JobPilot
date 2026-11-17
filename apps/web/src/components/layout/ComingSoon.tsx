import { Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ComingSoon({
  title,
  description,
  highlights = [],
}: {
  title: string;
  description: string;
  highlights?: string[];
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <Badge>Coming soon</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock3 className="h-5 w-5 text-primary" />
            In progress
          </CardTitle>
          <CardDescription>
            This feature is queued for launch. Everything else in JobPilot is ready to use today.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {highlights.length > 0 ? (
            <ul className="space-y-2 text-sm text-muted-foreground">
              {highlights.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Check back soon — we will ship this carefully so you stay in control of every submit.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
