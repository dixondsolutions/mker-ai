export interface StorageItem {
  name: string;
  id: string | null;
  updated_at: string | null;
  created_at: string | null;
  last_accessed_at: string | null;
  metadata: Record<string, unknown> | null;
  isDirectory: boolean;
  fileType: string;
  publicUrl?: string;
  previewUrl?: string;
  permissions?: {
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canUpload: boolean;
  };
}
