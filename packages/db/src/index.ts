import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const connection = process.env.DATABASE_URL

if (!connection) {
    throw new Error('DATABASE_URL is not defined in environment variables');
}

const client = postgres(connection, {prepare: false});

export const db = drizzle(client, {schema})

export * from "./schema";