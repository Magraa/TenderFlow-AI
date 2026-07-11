import { afterEach, beforeEach } from 'vitest';
import { db } from './services/storageService';

// Clean up database before and after tests
beforeEach(() => {
  db.clearDatabase();
});

afterEach(() => {
  db.clearDatabase();
});
