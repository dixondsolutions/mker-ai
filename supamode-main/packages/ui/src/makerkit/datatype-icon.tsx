import {
  BinaryIcon,
  BracesIcon,
  Calendar,
  HashIcon,
  ListIcon,
  ToggleRightIcon,
  TypeIcon,
} from 'lucide-react';

import { PostgresDataType } from '@kit/types';

export function DataTypeIcon({
  type,
  className,
}: {
  type: PostgresDataType;
  className?: string;
}) {
  switch (type) {
    case 'integer':
    case 'bigint':
    case 'real':
    case 'double precision':
    case 'smallint':
    case 'numeric':
      return <HashIcon className={className} />;
    case 'character varying':
    case 'text':
      return <TypeIcon className={className} />;
    case 'boolean':
      return <ToggleRightIcon className={className} />;
    case 'date':
    case 'timestamp':
    case 'timestamp with time zone':
    case 'time':
      return <Calendar className={className} />;
    case 'json':
    case 'jsonb':
      return <BracesIcon className={className} />;
    case 'bytea':
      return <BinaryIcon className={className} />;
    case 'uuid':
      return (
        <span
          className={className + ' inline-flex items-center text-xs uppercase'}
        >
          id
        </span>
      );

    // custom types
    default:
      return <ListIcon className={className} />;
  }
}
