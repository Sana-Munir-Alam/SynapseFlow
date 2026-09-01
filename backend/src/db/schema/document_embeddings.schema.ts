import { pgTable, text, timestamp, uuid, vector } from "drizzle-orm/pg-core";
import { courseFiles } from "./notes.schema";

const documentEmbeddings = pgTable("document_embeddings", {
    id: uuid("id").primaryKey().defaultRandom(),
    fileId: uuid("file_id")
        .references(() => courseFiles.id, { onDelete: "cascade" })
        .notNull(),
    chunkText: text("chunk_text").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    embedding: vector("embedding", { dimensions: 3072 }).notNull(),
})

export default documentEmbeddings;