"use client";

import { useEffect, useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";

export default function ThemeSwitcher() {
  const { resolvedTheme: activeTheme, setTheme: applyTheme } = useTheme();
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);

  if (!hasMounted) return <div className="h-9 w-9 rounded-full" aria-hidden />;

  const darkModeActive = activeTheme === "dark";
  return (
    <button
      onClick={() => applyTheme(darkModeActive ? "light" : "dark")}
      className="rounded-full p-2 hover:bg-muted"
      aria-label="Toggle theme"
    >
      {darkModeActive ? <SunMedium className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
    </button>
  );
}