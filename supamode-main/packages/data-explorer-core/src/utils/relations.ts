import type { RelationConfig } from '@kit/types';

type RelationType = RelationConfig['type'];

type RawRelationConfig = Partial<RelationConfig> & {
  relation_type?: RelationType;
};

/**
 * Normalize relation metadata and return only relations that represent lookups
 * stored on the source record (many-to-one or one-to-one).
 */
export function getLookupRelations(relationsConfig: unknown): RelationConfig[] {
  const relationsArray = Array.isArray(relationsConfig)
    ? relationsConfig
    : relationsConfig && typeof relationsConfig === 'object'
      ? Object.values(relationsConfig as Record<string, unknown>)
      : [];

  return relationsArray
    .map((relation) => {
      if (!relation || typeof relation !== 'object') {
        return null;
      }

      const candidate = relation as RawRelationConfig;

      const relationType =
        candidate.type ?? candidate.relation_type ?? 'many_to_one';

      if (relationType !== 'many_to_one' && relationType !== 'one_to_one') {
        return null;
      }

      return {
        ...candidate,
        type: relationType,
      } as RelationConfig;
    })
    .filter((relation): relation is RelationConfig => relation !== null);
}
