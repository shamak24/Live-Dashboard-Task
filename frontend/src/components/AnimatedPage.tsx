import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function AnimatedPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, [location.pathname]);

  return (
    <div
      className={cn(
        "transition-opacity duration-300 ease-out",
        visible ? "opacity-100" : "opacity-0",
        className
      )}
    >
      {children}
    </div>
  );
}
