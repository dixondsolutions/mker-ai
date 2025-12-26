interface BaseSidebarItem {
  type: 'resource' | 'tool';
  key: string;
  label: string;
  icon?: string;
  path: string;
}

interface ResourceSidebarItem extends BaseSidebarItem {
  type: 'resource';
}

interface ToolSidebarItem extends BaseSidebarItem {
  type: 'tool';
  componentPath: string;
}

export type SidebarItem = ResourceSidebarItem | ToolSidebarItem;
export type SidebarConfig = Record<string, SidebarItem[]>;
