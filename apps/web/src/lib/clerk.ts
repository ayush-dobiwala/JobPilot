import type { Theme } from "@/stores/theme";

export function getClerkPublishableKey(): string {
  return import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "";
}

const light = {
  colorPrimary: "#0f766e",
  colorBackground: "#ffffff",
  colorText: "#0f172a",
  colorTextSecondary: "#475569",
  colorNeutral: "#64748b",
  colorInputBackground: "#f8fafc",
  colorInputText: "#0f172a",
  colorDanger: "#dc2626",
} as const;

const dark = {
  colorPrimary: "#a78bfa",
  colorBackground: "#12101f",
  colorText: "#f1f5f9",
  colorTextSecondary: "#c4b5fd",
  colorNeutral: "#a5b4fc",
  colorInputBackground: "#1a1730",
  colorInputText: "#f1f5f9",
  colorDanger: "#f87171",
} as const;

export function getClerkAppearance(theme: Theme) {
  const colors = theme === "dark" ? dark : light;
  return {
    variables: {
      ...colors,
      borderRadius: "0.75rem",
      fontFamily: '"Source Sans 3", Inter, sans-serif',
    },
    elements: {
      card: "shadow-lg border border-border",
      headerTitle: "font-display",
      userButtonPopoverCard: "border border-border shadow-xl !bg-[hsl(var(--popover))] !text-[hsl(var(--popover-foreground))]",
      userButtonPopoverMain: "!bg-[hsl(var(--popover))] !text-[hsl(var(--popover-foreground))]",
      userButtonPopoverActionButton:
        "!text-[hsl(var(--foreground))] hover:!bg-[hsl(var(--secondary))]",
      userButtonPopoverActionButtonText: "!text-[hsl(var(--foreground))]",
      userButtonPopoverActionButtonIcon: "!text-[hsl(var(--muted-foreground))]",
      userButtonPopoverFooter: "!bg-[hsl(var(--muted))] !text-[hsl(var(--muted-foreground))]",
      userPreviewMainIdentifier: "!text-[hsl(var(--foreground))]",
      userPreviewSecondaryIdentifier: "!text-[hsl(var(--muted-foreground))]",
    },
  } as const;
}

/** @deprecated Prefer getClerkAppearance(theme) so light/dark menus stay readable. */
export const clerkAppearance = getClerkAppearance("dark");
