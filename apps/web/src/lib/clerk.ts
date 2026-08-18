export function getClerkPublishableKey(): string {
  return import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "";
}

export const clerkAppearance = {
  variables: {
    colorPrimary: "#6366f1",
    colorBackground: "#0b0d16",
    colorText: "#f4f6fb",
    colorInputBackground: "#141826",
    colorInputText: "#f4f6fb",
    borderRadius: "0.75rem",
    fontFamily: "Inter, sans-serif",
  },
  elements: {
    card: "shadow-none border border-white/10",
    headerTitle: "font-display",
  },
} as const;
