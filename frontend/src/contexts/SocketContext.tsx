import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import type { Booking } from "@/types";

const SOCKET_URL =
  import.meta.env.VITE_API_URL || window.location.origin;

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const s = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    s.on("booking:updated", (booking: Booking) => {
      // Update bookings list cache in place
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

      // Update single booking cache
      queryClient.setQueryData(["booking", booking.id], booking);

      // Invalidate dashboard stats for live counter updates
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["mechanics"] });
    });

    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [queryClient]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
