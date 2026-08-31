import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingPage } from "@/app/landing/LandingPage";

describe("LandingPage", () => {
  it("renders the product pitch and auth CTAs", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /your job search, finally in one calm place/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^start free$/i })).toHaveAttribute("href", "/sign-up");
    expect(screen.getAllByRole("link", { name: /^sign in$/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^about$/i }).length).toBeGreaterThan(0);
  });
});
