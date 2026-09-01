import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import users from "./user.schema";
import z from "zod";

export const groups = pgTable('groups', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(), // unique — groups are found by name
    createdAt: timestamp('created_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id),
});

export type Group = typeof groups.$inferSelect
export type newGroup = typeof groups.$inferInsert

export const groupSchema = createSelectSchema(groups)
export const newGroupSchema = createInsertSchema(groups)

// Body schemas
export const createGroupBodySchema = newGroupSchema.pick({ name: true });
export const joinGroupBodySchema = z.object({ groupId: z.string().uuid() });

// Params schemas
export const groupParamsSchema = z.object({
    groupId: z.string().uuid(),
});

// Query schemas
export const searchGroupQuerySchema = z.object({
    name: z.string().min(1),
});

export default groups