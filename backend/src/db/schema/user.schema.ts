import {
    pgTable, uuid, varchar, timestamp
} from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    firstName: varchar("first_name", { length: 50 }),
    lastName: varchar("last_name", { length: 50 }),
    username: varchar("username", { length: 50 }),
    password: varchar("password", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
})

export type User = typeof users.$inferSelect
export type newUser = typeof users.$inferInsert
export const insertUserSchema = createInsertSchema(users)
export const selectUserSchema = createSelectSchema(users)

export default users