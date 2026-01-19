import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === REST API ===
  
  app.get(api.channels.list.path, async (_req, res) => {
    const channels = await storage.getChannels();
    res.json(channels);
  });

  app.post(api.channels.create.path, async (req, res) => {
    try {
      const input = api.channels.create.input.parse(req.body);
      const channel = await storage.createChannel(input.name, input.topic || undefined);
      res.status(201).json(channel);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get(api.channels.history.path, async (req, res) => {
    const name = decodeURIComponent(req.params.name);
    const history = await storage.getChannelHistory(name);
    res.json(history);
  });

  app.get(api.users.list.path, async (_req, res) => {
    const users = await storage.getOnlineUsers();
    res.json(users);
  });

  // === SEED DATA ===
  const existingChannels = await storage.getChannels();
  if (existingChannels.length === 0) {
    await storage.createChannel("#general", "General chat for everyone");
    await storage.createChannel("#random", "Random discussions");
    await storage.createChannel("#help", "Need help? Ask here.");
  }

  // === WEBSOCKET SERVER ===
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  const clients = new Map<WebSocket, { username: string; channels: Set<string> }>();

  wss.on("connection", (ws) => {
    const state = { username: `Guest${Math.floor(Math.random() * 10000)}`, channels: new Set<string>() };
    clients.set(ws, state);

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle NICK command
        if (message.type === 'nick') {
          const oldNick = state.username;
          const newNick = message.content;
          state.username = newNick;
          await storage.updateUserStatus(newNick, true);
          
          // Broadcast nick change to all channels user is in
          broadcastToAll({
            type: 'message',
            content: `*** ${oldNick} is now known as ${newNick}`,
            user: 'System',
            channel: 'System' // Or broadcast to specific channels
          });
          return;
        }

        // Handle JOIN command
        if (message.type === 'join') {
          const channelName = message.channel;
          state.channels.add(channelName);
          await storage.createChannel(channelName);
          
          broadcastToChannel(channelName, {
            type: 'join',
            user: state.username,
            channel: channelName,
            content: `has joined ${channelName}`
          });
          return;
        }

        // Handle PART command
        if (message.type === 'part') {
          const channelName = message.channel;
          state.channels.delete(channelName);
          
          broadcastToChannel(channelName, {
            type: 'part',
            user: state.username,
            channel: channelName,
            content: `has left ${channelName}`
          });
          return;
        }

        // Handle PRIVMSG (Normal messages)
        if (message.type === 'message') {
          const { channel, content } = message;
          
          // Persist message
          await storage.createMessage({
            channelId: channel,
            userId: state.username,
            content: content,
            type: 'privmsg'
          });

          broadcastToChannel(channel, {
            type: 'message',
            user: state.username,
            channel: channel,
            content: content
          });
        }

      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    });

    ws.on("close", () => {
      // Notify channels of quit
      for (const channel of state.channels) {
        broadcastToChannel(channel, {
          type: 'part',
          user: state.username,
          channel: channel,
          content: `has disconnected`
        });
      }
      storage.updateUserStatus(state.username, false);
      clients.delete(ws);
    });

    // Send welcome
    ws.send(JSON.stringify({
      type: 'message',
      channel: 'System',
      user: 'Server',
      content: 'Welcome to pIRC! /nick <name> to change nickname, /join #channel to join.'
    }));
  });

  function broadcastToChannel(channel: string, message: any) {
    const msgString = JSON.stringify(message);
    for (const [client, state] of clients.entries()) {
      if (state.channels.has(channel) || channel === 'System') { // System messages go to everyone or can be targeted
        if (client.readyState === WebSocket.OPEN) {
          client.send(msgString);
        }
      }
    }
  }

  function broadcastToAll(message: any) {
    const msgString = JSON.stringify(message);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msgString);
      }
    }
  }

  return httpServer;
}
