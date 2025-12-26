import {
  Braces,
  FileAudio,
  FileIcon,
  FileVideo,
  Hash,
  ListIcon,
  Palette,
  Text,
} from 'lucide-react';
import {
  Calendar,
  CodeXmlIcon,
  Image,
  Key,
  LinkIcon,
  Mail,
  MapPin,
  Phone,
  ToggleLeft,
  Upload,
} from 'lucide-react';

/**
 * Renders an icon based on the field type
 * @param type - The type of the field
 * @returns An icon
 */
export function FieldTypeIcon({ type }: { type: string }) {
  const className = 'text-muted-foreground h-3 w-3';

  switch (type) {
    case 'markdown':
    case 'html':
      return <CodeXmlIcon className={className} />;
    case 'email':
      return <Mail className={className} />;
    case 'url':
      return <LinkIcon className={className} />;
    case 'phone':
      return <Phone className={className} />;
    case 'address':
      return <MapPin className={className} />;
    case 'boolean':
      return <ToggleLeft className={className} />;
    case 'date':
    case 'timestamp':
    case 'timestamp with time zone':
      return <Calendar className={className} />;
    case 'uuid':
      return <Key className={className} />;
    case 'json':
    case 'jsonb':
      return <Braces className={className} />;
    case 'user-defined':
      return <ListIcon className={className} />;
    case 'file':
      return <Upload className={className} />;
    case 'image':
      return <Image className={className} />;
    case 'audio':
      return <FileAudio className={className} />;
    case 'video':
      return <FileVideo className={className} />;
    case 'color':
      return <Palette className={className} />;
    case 'text':
    case 'character varying':
      return <Text className={className} />;
    case 'number':
    case 'integer':
    case 'bigint':
    case 'smallint':
    case 'real':
    case 'double precision':
    case 'smallserial':
    case 'serial':
    case 'bigserial':
      return <Hash className={className} />;
    default:
      return <FileIcon className={className} />;
  }
}
