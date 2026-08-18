import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, later wins on conflicts. Used by shadcn primitives. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
