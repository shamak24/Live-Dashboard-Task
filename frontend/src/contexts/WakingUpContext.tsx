import { createContext, useContext, useEffect, useState } from "react";
import { setWakingUpCallback } from "@/lib/api";

interface WakingUpContextValue {
  isWakingUp: boolean;
}

const WakingUpContext = createContext<WakingUpContextValue>({ isWakingUp: false });

export function WakingUpProvider({ children }: { children: React.ReactNode }) {
  const [isWakingUp, setIsWakingUp] = useState(false);

  useEffect(() => {
    setWakingUpCallback(setIsWakingUp);
  }, []);

  return (
    <WakingUpContext.Provider value={{ isWakingUp }}>
      {children}
    </WakingUpContext.Provider>
  );
}

export function useWakingUp() {
  return useContext(WakingUpContext);
}

export function WakingUpOverlay() {
  const { isWakingUp } = useWakingUp();
  if (!isWakingUp) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <h2 className="text-lg font-semibold">Waking up the server</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This can take up to a minute on first load while the backend starts.
          Hang tight — we&apos;re almost there.
        </p>
      </div>
    </div>
  );
}
