import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthToken } from "@/lib/auth-token";
import type { Booking } from "@/types";

const SOCKET_URL = String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "") ||
  window.location.origin;

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) {
      setSocket(null);
      setConnected(false);
      return;
    }

    const token = getAuthToken();
    const s = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    s.on("booking:updated", (booking: Booking) => {
      queryClient.setQueriesData<{ data: Booking[]; pagination: unknown }>(
        { queryKey: ["bookings"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((b) =>
              b.id === booking.id ? booking : b
            ),
          };
        }
      );

      queryClient.setQueriesData<{ data: Booking[]; pagination: unknown }>(
        { queryKey: ["customer-portal-bookings"] },
        (old) => {
          if (!old) return old;
          const exists = old.data.some((b) => b.id === booking.id);
          const data = exists
            ? old.data.map((b) => (b.id === booking.id ? booking : b))
            : [booking, ...old.data];
          return { ...old, data };
        }
      );

      queryClient.setQueryData(["booking", booking.id], booking);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["mechanics"] });
    });

    setSocket(s);

    return () => {
      s.removeAllListeners();
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [user, queryClient]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
