import { pgTable, uuid, varchar, text, integer, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import users from './user.schema'

export const achievementCategoryEnum = pgEnum('achievement_category', [ 'schedule', 'mcq', 'flashcard', 'streak', 'engagement',])

export const achievementDefinitions = pgTable('achievement_definitions', {
    id:          uuid('id').primaryKey().defaultRandom(),
    slug:        varchar('slug', { length: 80 }).notNull().unique(),
    title:       varchar('title', { length: 120 }).notNull(),
    description: text('description').notNull(),
    category:    achievementCategoryEnum('category').notNull(),
    icon:        varchar('icon', { length: 40 }).notNull().default('trophy'),
    targetValue: integer('target_value').notNull().default(1),
    sortOrder:   integer('sort_order').notNull().default(0),
    createdAt:   timestamp('created_at').notNull().defaultNow(),
    updatedAt:   timestamp('updated_at').notNull().defaultNow(),
})

export const userAchievements = pgTable('user_achievements', {
    id:              uuid('id').primaryKey().defaultRandom(),
    userId:          uuid('user_id')
                         .references(() => users.id, { onDelete: 'cascade' })
                         .notNull(),
    achievementId:   uuid('achievement_id')
                         .references(() => achievementDefinitions.id, { onDelete: 'cascade' })
                         .notNull(),
    earnedAt:        timestamp('earned_at').notNull().defaultNow(),
    progressValue:   integer('progress_value').notNull().default(0),
    metadata:        text('metadata'),
}, (t) => [
    unique().on(t.userId, t.achievementId),
])

export type AchievementDefinition = typeof achievementDefinitions.$inferSelect
export type NewAchievementDefinition = typeof achievementDefinitions.$inferInsert
export type UserAchievement = typeof userAchievements.$inferSelect
export type NewUserAchievement = typeof userAchievements.$inferInsert

export const insertAchievementDefinitionSchema = createInsertSchema(achievementDefinitions)
export const selectAchievementDefinitionSchema = createSelectSchema(achievementDefinitions)
export const insertUserAchievementSchema = createInsertSchema(userAchievements)
export const selectUserAchievementSchema = createSelectSchema(userAchievements)

export default achievementDefinitions