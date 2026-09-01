import { pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { groups } from "./group.schema";
import users from "./user.schema";

export const roleEnum = pgEnum('role', ['member', 'admin']);

export const groupMembers = pgTable('group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').references(() => groups.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  role: roleEnum('role').default('member'),
  joinedAt: timestamp('joined_at').defaultNow(),
});

export type groupMembers = typeof groupMembers.$inferSelect
export type newGroupMembers = typeof groupMembers.$inferInsert

export const groupMemberSchema = createSelectSchema(groupMembers)
export const newGroupMemberSchema = createInsertSchema(groupMembers)

export default groupMembers