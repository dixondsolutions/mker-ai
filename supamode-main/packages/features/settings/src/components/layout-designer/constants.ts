/**
 * Layout Designer Constants
 *
 * This file contains all the magic numbers and constants used in the layout designer
 * to improve maintainability and avoid scattered hardcoded values.
 */

// Column constraints
export const MAX_COLUMNS_PER_ROW = 4;
export const MIN_COLUMNS_PER_ROW = 1;

// Drag and Drop configuration
export const DRAG_ACTIVATION_DISTANCE = 5;
export const DRAG_ACTIVATION_DELAY = 100;
export const DRAG_TOLERANCE = 5;

// Animation and timing
export const TRANSITION_DURATION = 150;
export const TRANSITION_EASING = 'cubic-bezier(0.25, 1, 0.5, 1)';
export const GROUP_SWAP_DEBOUNCE_TIME = 150;

// UI dimensions
export const MIN_EMPTY_ROW_HEIGHT = 120;
export const MIN_FILLED_ROW_HEIGHT = 80;
export const COLUMN_PALETTE_WIDTH = 72; // w-72 in Tailwind = 18rem = 288px

// Column sizes
export const COLUMN_SIZE_SINGLE = 1;
export const COLUMN_SIZE_HALF = 2;
export const COLUMN_SIZE_FULL = MAX_COLUMNS_PER_ROW;

// Layout defaults
export const DEFAULT_LAYOUT_NAME = 'Default Layout';
export const DEFAULT_GROUP_LABEL = 'Main Fields';

// ID generation
export const ID_LENGTH = 6; // Math.random().toString(36).substring(2, 9) generates 7 chars
