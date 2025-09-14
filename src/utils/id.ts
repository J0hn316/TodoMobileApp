import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique ID string.
 * Wraps uuidv4() so we can swap out implementation later if needed.
 */
export const generateId = (): string => uuidv4();
