import { db } from "./db";
import {
  users, channels, messages,
  type User, type Channel, type Message,
  type InsertUser, type InsertMessage
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStatus(username: string, isOnline: boolean): Promise<User>;
  getOnlineUsers(): Promise<User[]>;

  // Channels
  getChannels(): Promise<Channel[]>;
  getChannel(name: string): Promise<Channel | undefined>;
  createChannel(name: string, topic?: string): Promise<Channel>;

  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getChannelHistory(channelId: string, limit?: number): Promise<Message[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserStatus(username: string, isOnline: boolean): Promise<User> {
    // Upsert user if they don't exist, otherwise update status
    const existing = await this.getUser(username);
    if (!existing) {
      return this.createUser({ username });
    }
    const [user] = await db
      .update(users)
      .set({ isOnline, lastSeen: new Date() })
      .where(eq(users.username, username))
      .returning();
    return user;
  }

  async getOnlineUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.isOnline, true));
  }

  async getChannels(): Promise<Channel[]> {
    return db.select().from(channels);
  }

  async getChannel(name: string): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.name, name));
    return channel;
  }

  async createChannel(name: string, topic?: string): Promise<Channel> {
    const existing = await this.getChannel(name);
    if (existing) return existing;
    
    const [channel] = await db.insert(channels).values({ name, topic }).returning();
    return channel;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(message).returning();
    return msg;
  }

  async getChannelHistory(channelId: string, limit = 50): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.channelId, channelId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .then(rows => rows.reverse());
  }
}

export const storage = new DatabaseStorage();
