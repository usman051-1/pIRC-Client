import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useEffect, useRef, useState } from "react";
import { WS_EVENTS, type WsMessage, type InsertChannel, type InsertMessage, type InsertUser } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// === API Hooks ===

export function useChannels() {
  return useQuery({
    queryKey: [api.channels.list.path],
    queryFn: async () => {
      const res = await fetch(api.channels.list.path);
      if (!res.ok) throw new Error("Failed to fetch channels");
      return api.channels.list.responses[200].parse(await res.json());
    },
  });
}

export function useChannelMessages(channelName: string) {
  return useQuery({
    queryKey: [api.channels.history.path, channelName],
    queryFn: async () => {
      const url = buildUrl(api.channels.history.path, { name: channelName });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch history");
      return api.channels.history.responses[200].parse(await res.json());
    },
    enabled: !!channelName && channelName !== "Status", // Don't fetch for system status tab
  });
}

export function useUsers() {
  return useQuery({
    queryKey: [api.users.list.path],
    queryFn: async () => {
      const res = await fetch(api.users.list.path);
      if (!res.ok) throw new Error("Failed to fetch users");
      return api.users.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertChannel) => {
      const res = await fetch(api.channels.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create channel");
      return api.channels.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.channels.list.path] });
    },
  });
}

// === WebSocket Hook ===

type WSStatus = "connecting" | "connected" | "disconnected" | "error";

export function useIRCWebSocket(user: InsertUser | null) {
  const [status, setStatus] = useState<WSStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?username=${encodeURIComponent(user.username)}`;
    
    setStatus("connecting");
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setStatus("connected");
      // queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
    };

    socket.onclose = () => {
      setStatus("disconnected");
    };

    socket.onerror = () => {
      setStatus("error");
      toast({
        title: "Connection Error",
        description: "Lost connection to the server.",
        variant: "destructive",
      });
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsMessage;
        
        if (data.type === WS_EVENTS.MESSAGE) {
          // Invalidate specific channel messages if we have a channel context
          if (data.channel) {
             queryClient.invalidateQueries({ queryKey: [api.channels.history.path, data.channel] });
          }
        }
        
        if (data.type === WS_EVENTS.JOIN || data.type === WS_EVENTS.PART) {
          queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
        }

        // We can also emit a global event for the Chat component to listen to via a custom event bus or context
        // For simplicity in this MVP, we dispatch a window event
        const customEvent = new CustomEvent('irc-message', { detail: data });
        window.dispatchEvent(customEvent);

      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [user, queryClient, toast]);

  const sendMessage = (content: string, channel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && user) {
      wsRef.current.send(JSON.stringify({
        type: WS_EVENTS.MESSAGE,
        content,
        channel,
        user: user.username
      }));
    }
  };

  const joinChannel = (channel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && user) {
      wsRef.current.send(JSON.stringify({
        type: WS_EVENTS.JOIN,
        channel,
        user: user.username
      }));
    }
  };
  
  const partChannel = (channel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && user) {
      wsRef.current.send(JSON.stringify({
        type: WS_EVENTS.PART,
        channel,
        user: user.username
      }));
    }
  };

  return { status, sendMessage, joinChannel, partChannel };
}
