const col1 = Array.from({ length: 12 }, (_, i) => `X-${i + 1}`);
const col2 = Array.from({ length: 12 }, (_, i) => `XI-${i + 1}`);
const col3 = Array.from({ length: 12 }, (_, i) => `XII-${i + 1}`);

/**
 * ALL_CLASSES is used for voter/DPT registration and management.
 * Includes "GTK" at the top.
 */
export const ALL_CLASSES = ['GTK', ...col1, ...col2, ...col3];

/**
 * CANDIDATE_CLASSES is used for candidate registration (e.g. MPK SMABA).
 * Per requirements, GTK is excluded from being a candidate.
 */
export const CANDIDATE_CLASSES = [...col1, ...col2, ...col3];
