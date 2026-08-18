import { Root } from "@radix-ui/react-label";
import { type LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <Root
      className={cn("text-sm font-medium leading-none text-foreground", className)}
      {...props}
    />
  );
}
