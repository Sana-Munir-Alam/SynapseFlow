import { pgTable, uuid, varchar, integer, boolean, timestamp, text, pgEnum, unique } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import users from './user.schema'

export const mcqDifficultyEnum = pgEnum('mcq_difficulty', ['easy', 'medium', 'hard'])

// ---- courses --------------------------------------------------------------
// One row per course a user creates.
// FK: user_id → users.id (cascade delete)

export const courses = pgTable('courses', {
    id:        uuid('id').primaryKey().defaultRandom(),
    userId:    uuid('user_id')
                   .references(() => users.id, { onDelete: 'cascade' })
                   .notNull(),
    name:      varchar('name', { length: 150 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
    uniqueUserCourseName: unique().on(t.userId, t.name),
}))

export type Course    = typeof courses.$inferSelect
export type NewCourse = typeof courses.$inferInsert

export const insertCourseSchema = createInsertSchema(courses)
export const selectCourseSchema = createSelectSchema(courses)

export default courses

// ---- course_files ---------------------------------------------------------
// Metadata for each file a user uploads to a course.
// FK: course_id → courses.id (cascade delete)
// User is derived via: course_files.course_id → courses.user_id

export const courseFiles = pgTable('course_files', {
    id:           uuid('id').primaryKey().defaultRandom(),
    courseId:     uuid('course_id')
                      .references(() => courses.id, { onDelete: 'cascade' })
                      .notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    storagePath:  varchar('storage_path', { length: 500 }).notNull(),
    mimeType:     varchar('mime_type', { length: 100 }).notNull(),
    sizeBytes:    integer('size_bytes').notNull().default(0),
    aiProcessed:  boolean('ai_processed').notNull().default(false),
    createdAt:    timestamp('created_at').notNull().defaultNow(),
})

export type CourseFile    = typeof courseFiles.$inferSelect
export type NewCourseFile = typeof courseFiles.$inferInsert

export const insertCourseFileSchema = createInsertSchema(courseFiles)
export const selectCourseFileSchema = createSelectSchema(courseFiles)

// ---- flashcards -----------------------------------------------------------
// One row per flashcard.
// FK: course_id      → courses.id      (cascade delete)
// FK: source_file_id → course_files.id (set null if file deleted)
// User is derived via: flashcards.course_id → courses.user_id

export const flashcards = pgTable('flashcards', {
    id:           uuid('id').primaryKey().defaultRandom(),
    courseId:     uuid('course_id')
                      .references(() => courses.id, { onDelete: 'cascade' })
                      .notNull(),
    sourceFileId: uuid('source_file_id')
                      .references(() => courseFiles.id, { onDelete: 'set null' }),
    question:     text('question').notNull(),
    answer:       text('answer').notNull(),
    aiGenerated:  boolean('ai_generated').notNull().default(false),
    createdAt:    timestamp('created_at').notNull().defaultNow(),
    updatedAt:    timestamp('updated_at').notNull().defaultNow(),
})

export type Flashcard    = typeof flashcards.$inferSelect
export type NewFlashcard = typeof flashcards.$inferInsert

export const insertFlashcardSchema = createInsertSchema(flashcards)
export const selectFlashcardSchema = createSelectSchema(flashcards)

// ---- flashcard_sessions ---------------------------------------------------
// One row per study session.
// FK: course_id → courses.id (cascade delete)
// FK: user_id   → users.id   (cascade delete)
 
export const flashcardSessions = pgTable('flashcard_sessions', {
    id:          uuid('id').primaryKey().defaultRandom(),
    userId:      uuid('user_id')
                     .references(() => users.id, { onDelete: 'cascade' })
                     .notNull(),
    courseId:    uuid('course_id')
                     .references(() => courses.id, { onDelete: 'cascade' })
                     .notNull(),
    familiarCount:   integer('familiar_count').notNull().default(0),
    unfamiliarCount: integer('unfamiliar_count').notNull().default(0),
    totalCards:      integer('total_cards').notNull().default(0),
    startedAt:   timestamp('started_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
    expiresAt:   timestamp('expires_at').notNull(),
})

export type FlashcardSession    = typeof flashcardSessions.$inferSelect
export type NewFlashcardSession = typeof flashcardSessions.$inferInsert
 
export const insertFlashcardSessionSchema = createInsertSchema(flashcardSessions)
export const selectFlashcardSessionSchema = createSelectSchema(flashcardSessions)
 
// ---- mcqs -----------------------------------------------------------------
// Multiple-choice questions.
// FK: course_id      → courses.id      (cascade delete)
// FK: source_file_id → course_files.id (set null if file deleted)
// User is derived via: mcqs.course_id → courses.user_id

export const mcqs = pgTable('mcqs', {
    id:            uuid('id').primaryKey().defaultRandom(),
    courseId:      uuid('course_id')
                       .references(() => courses.id, { onDelete: 'cascade' })
                       .notNull(),
    sourceFileId:  uuid('source_file_id')
                       .references(() => courseFiles.id, { onDelete: 'set null' }),
    question:      text('question').notNull(),
    explanation:   text('explanation'),
    difficulty:    mcqDifficultyEnum('difficulty').notNull().default('medium'),
    aiGenerated:   boolean('ai_generated').notNull().default(false),
    createdAt:     timestamp('created_at').notNull().defaultNow(),
    updatedAt:     timestamp('updated_at').notNull().defaultNow(),
})

export type Mcq    = typeof mcqs.$inferSelect
export type NewMcq = typeof mcqs.$inferInsert

export const insertMcqSchema = createInsertSchema(mcqs)
export const selectMcqSchema = createSelectSchema(mcqs)

// ---- mcq_options ---------------------------------------------------------
// One row per MCQ option.
// FK: mcq_id → mcqs.id (cascade delete)

export const mcqOptions = pgTable('mcq_options', {
    id:          uuid('id').primaryKey().defaultRandom(),
    mcqId:       uuid('mcq_id')
                     .references(() => mcqs.id, { onDelete: 'cascade' })
                     .notNull(),
    optionIndex: integer('option_index').notNull(),
    optionText:  text('option_text').notNull(),
    isCorrect:   boolean('is_correct').notNull().default(false),
    createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
    uniqueMcqOptionIndex: unique().on(t.mcqId, t.optionIndex),
}))

export type McqOption    = typeof mcqOptions.$inferSelect
export type NewMcqOption = typeof mcqOptions.$inferInsert

export const insertMcqOptionSchema = createInsertSchema(mcqOptions)
export const selectMcqOptionSchema = createSelectSchema(mcqOptions)

// ---- mcq_attempts ---------------------------------------------------------
// Tracks each time a user answers an MCQ.
// FK: mcq_id             → mcqs.id        (cascade delete)
// FK: selected_option_id → mcq_options.id (cascade delete)
// FK: user_id            → users.id       (cascade delete)

export const mcqAttempts = pgTable('mcq_attempts', {
    id:             uuid('id').primaryKey().defaultRandom(),
    mcqId:          uuid('mcq_id')
                        .references(() => mcqs.id, { onDelete: 'cascade' })
                        .notNull(),
    userId:         uuid('user_id')
                        .references(() => users.id, { onDelete: 'cascade' })
                        .notNull(),
    selectedOptionId: uuid('selected_option_id')
                        .references(() => mcqOptions.id, { onDelete: 'cascade' })
                        .notNull(),
    isCorrect:      boolean('is_correct').notNull(),
    attemptedAt:    timestamp('attempted_at').notNull().defaultNow(),
})

export type McqAttempt    = typeof mcqAttempts.$inferSelect
export type NewMcqAttempt = typeof mcqAttempts.$inferInsert

export const insertMcqAttemptSchema = createInsertSchema(mcqAttempts)
export const selectMcqAttemptSchema = createSelectSchema(mcqAttempts)
