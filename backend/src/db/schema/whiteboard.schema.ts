import { pgTable, varchar, uuid, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import groups from "./group.schema";

export const whiteboards = pgTable("whiteboards", {
    boardId: varchar("board_id").primaryKey(),
    groupId: uuid("group_id").references(() => groups.id, { onDelete: 'cascade' }),
    snapshot: jsonb("snapshot").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Whiteboard = typeof whiteboards.$inferSelect;
export type NewWhiteboard = typeof whiteboards.$inferInsert;

export const insertWhiteboardSchema = createInsertSchema(whiteboards);
export const selectWhiteboardSchema = createSelectSchema(whiteboards);

export default whiteboards;