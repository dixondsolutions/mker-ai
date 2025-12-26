import {
  ColumnMetadata,
  ColumnSize,
  LayoutColumn,
  LayoutGroup,
  LayoutMode,
  LayoutRow,
  RecordLayout,
  RecordLayoutConfig,
} from '@kit/types';

// Re-export types for compatibility
export type {
  ColumnSize,
  LayoutColumn,
  LayoutRow,
  LayoutGroup,
  LayoutMode,
  RecordLayoutConfig,
  RecordLayout,
};

export interface LayoutDesignerProps {
  availableColumns: ColumnMetadata[];
  currentLayout?: RecordLayout;
  onLayoutChange: (layout: RecordLayout) => void;
  onSave: (layout: RecordLayout) => Promise<void>;
  isReadOnly?: boolean;
}

export interface LayoutDesignerConfigProps {
  availableColumns: ColumnMetadata[];
  currentLayoutConfig?: RecordLayoutConfig;
  onLayoutChange: (layoutConfig: RecordLayoutConfig) => void;
  onSave: (layoutConfig: RecordLayoutConfig) => Promise<void>;
  isReadOnly?: boolean;
}

// Enhanced drag item types for better type safety
export interface BaseDragItem {
  type: 'column' | 'available-column' | 'row' | 'group';
  mode: LayoutMode;
}

export interface ColumnDragItem extends BaseDragItem {
  type: 'column';
  data: LayoutColumn;
}

export interface AvailableColumnDragItem extends BaseDragItem {
  type: 'available-column';
  data: ColumnMetadata;
}

export interface RowDragItem extends BaseDragItem {
  type: 'row';
  row: LayoutRow;
  groupId: string;
}

export interface GroupDragItem extends BaseDragItem {
  type: 'group';
  group: LayoutGroup;
}

export type DragItem =
  | ColumnDragItem
  | AvailableColumnDragItem
  | RowDragItem
  | GroupDragItem;

export interface DropResult {
  draggedItem: DragItem;
  targetRowId: string;
  targetIndex: number;
}

// Drop zone data types for better type safety
export interface BaseDropZoneData {
  mode: LayoutMode;
}

export interface RowDropZoneData extends BaseDropZoneData {
  type: 'row-drop-zone';
  groupId: string;
  rowId: string;
}

export interface ColumnInsertZoneData extends BaseDropZoneData {
  type: 'column-insert-zone';
  position: 'before' | 'after';
  rowId: string;
  groupId: string;
  columnIndex: number;
}

export interface RowInsertZoneData extends BaseDropZoneData {
  type: 'row-insert-zone';
  position: 'before' | 'after';
  groupId: string;
  rowIndex: number;
}

export type DropZoneData =
  | RowDropZoneData
  | ColumnInsertZoneData
  | RowInsertZoneData;
