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

    expect(screen.getByRole("heading", { name: /track every application/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create a free account/i })).toHaveAttribute(
      "href",
      "/sign-up",
    );
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });
});
