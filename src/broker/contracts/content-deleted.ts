import type { contents } from '../../database/schema.ts';

export type ContentDeleted = {
  content: typeof contents.$inferSelect;
};
