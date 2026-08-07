"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { API_URL, ensureAccessToken } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import type { AppNotification } from "@/lib/types";

/**
 * Connects to the /notifications Socket.IO namespace with a JWT handshake
 * and invalidates TanStack Query caches when a real-time event arrives.
 */
export function useNotificationsSocket() {
  const queryClient = useQueryClient();
  const user = useAuth((s) => s.user);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let socket: Socket | null = null;

    (async () => {
      const token = await ensureAccessToken();
      if (!token || cancelled) return;
      socket = io(`${API_URL}/notifications`, {
        auth: { token },
        transports: ["websocket"],
        reconnectionDelay: 2000,
      });
      socketRef.current = socket;

      socket.on("notification", (payload: Partial<AppNotification>) => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        if (payload.taskId) queryClient.invalidateQueries({ queryKey: ["tasks"] });
        if (payload.title) {
          toast(payload.title, { description: payload.body });
        }
      });
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [user, queryClient]);
}
