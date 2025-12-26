export interface GlobalSearchResult {
  rank: number;
  title: string;
  record: Record<string, string | number | boolean | null>;
  table_name: string;
  url_params: {
    id: string;
    table: string;
    schema: string;
  };
  schema_name: string;
  primary_keys: Array<string>;
  table_display: string;
}
