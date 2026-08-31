import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

function readDarkPreference() {
  return localStorage.getItem("theme") === "dark";
}

export function useTheme() {
  const [dark, setDark] = useState(readDarkPreference);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const toggle = () => setDark((value) => !value);

  return { dark, setDark, toggle };
}

export function ThemeToggle({
  className,
}: {
  className?: string;
}) {
  const { dark, toggle } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
