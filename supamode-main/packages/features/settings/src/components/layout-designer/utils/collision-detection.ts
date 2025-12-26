import {
  CollisionDetection,
  closestCenter,
  pointerWithin,
} from '@dnd-kit/core';

import { COLLISION_ID_PATTERNS, matchesCollisionPattern } from './drag-helpers';

/**
 * Custom collision detection to prioritize specific zones and prevent conflicts
 *
 * This function implements a hierarchical collision detection system that:
 * 1. Allows native column sorting within rows to work properly
 * 2. Prioritizes column insert zones for new columns from palette
 * 3. Handles row insert zones for row reordering
 * 4. Falls back to general row drop zones
 * 5. Uses closest center as ultimate fallback
 */
export const customCollisionDetection: CollisionDetection = (args) => {
  // First, try pointer-within detection for more precise targeting
  const pointerCollisions = pointerWithin(args);

  if (pointerCollisions.length > 0) {
    // For column reordering within rows, prioritize sortable columns
    const columnCollision = pointerCollisions.find((collision) =>
      matchesCollisionPattern(
        collision.id.toString(),
        COLLISION_ID_PATTERNS.COLUMN_SORTABLE,
      ),
    );

    // If we have a column collision and we're dragging a column, let native sorting handle it
    if (columnCollision && args.active.data.current?.['type'] === 'column') {
      return [columnCollision];
    }

    // Prioritize column insert zones for new columns from palette
    const insertZoneCollision = pointerCollisions.find((collision) => {
      const id = collision.id.toString();
      return (
        matchesCollisionPattern(id, COLLISION_ID_PATTERNS.COLUMN_INSERT) &&
        !matchesCollisionPattern(id, COLLISION_ID_PATTERNS.ROW_INSERT)
      );
    });

    if (
      insertZoneCollision &&
      args.active.data.current?.['type'] === 'available-column'
    ) {
      return [insertZoneCollision];
    }

    // Then prioritize row insert zones for row reordering
    const rowInsertCollision = pointerCollisions.find((collision) =>
      matchesCollisionPattern(
        collision.id.toString(),
        COLLISION_ID_PATTERNS.ROW_INSERT,
      ),
    );

    if (rowInsertCollision) {
      return [rowInsertCollision];
    }

    // Finally, fall back to row drop zones
    const rowDropCollision = pointerCollisions.find((collision) => {
      const id = collision.id.toString();
      return (
        matchesCollisionPattern(id, COLLISION_ID_PATTERNS.ROW_DROP) &&
        !matchesCollisionPattern(id, COLLISION_ID_PATTERNS.ROW_INSERT)
      );
    });

    if (rowDropCollision) {
      return [rowDropCollision];
    }

    // Return the first collision if no specific prioritization matches
    const firstCollision = pointerCollisions[0];
    return firstCollision ? [firstCollision] : [];
  }

  // Fallback to closest center if pointer-within doesn't work
  const centerCollisions = closestCenter(args);
  return centerCollisions.filter(
    (collision): collision is NonNullable<typeof collision> =>
      collision !== undefined,
  );
};
