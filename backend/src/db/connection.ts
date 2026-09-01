import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'
import { env, isProd } from '../config/env'
import { remember } from '@epic-web/remember'

const createPool = () => {
    return new Pool({
        connectionString: env.DATABASE_URL
    })
}

let client;

if (isProd()) {
    client = createPool()
}
else {
    client = remember("db-pool", () => createPool())
}

export const db = drizzle({client, schema})
export default db