import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  isOnline: boolean("is_online").default(true),
  lastSeen: timestamp("last_seen").defaultNow(),
});

export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // e.g. "#general"
  topic: text("topic"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  channelId: text("channel_id"), // Can be a channel name or null for system messages
  userId: text("user_id"), // Username of sender
  content: text("content").notNull(),
  type: text("type").notNull().default("privmsg"), // privmsg, action, notice, join, part, quit
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
});

export const insertChannelSchema = createInsertSchema(channels).pick({
  name: true,
  topic: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  channelId: true,
  userId: true,
  content: true,
  type: true,
});

// === TYPES ===

export type User = typeof users.$inferSelect;
export type Channel = typeof channels.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// WebSocket Event Types
export const WS_EVENTS = {
  MESSAGE: 'message',
  JOIN: 'join',
  PART: 'part',
  NICK: 'nick',
  ERROR: 'error',
} as const;

export interface WsMessage {
  type: keyof typeof WS_EVENTS;
  channel?: string;
  user?: string;
  content?: string;
  timestamp?: string;
}
