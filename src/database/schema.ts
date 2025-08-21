import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['watcher', 'manager']);

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  email: text().notNull().unique(),
  password: text().notNull(),
  role: userRole().notNull().default('watcher'),
});

export const titles = pgTable('titles', {
  id: uuid().primaryKey().defaultRandom(),
  title: text().notNull(),
  description: text().notNull(),
  category: text().array().notNull(),
  posterUrl: text().notNull(),
  releaseDate: timestamp({ withTimezone: true }).notNull(),
});

export const contentStatus = pgEnum('content_status', [
  'ready',
  'failed',
  'processing',
  'pending',
]);

export const contents = pgTable('contents', {
  id: uuid().primaryKey().defaultRandom(),

  locationUrl: text().notNull(),
  streamUrl: text(),

  status: contentStatus().notNull().default('pending'),

  titleId: uuid()
    .notNull()
    .references(() => titles.id),

  sizeInBytes: integer().notNull(),
  durationInSeconds: integer().notNull(),

  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
