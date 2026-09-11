// src/types/layout.ts
export interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  showHeader?: boolean;
  showSidebar?: boolean;
}

export interface HeaderProps {
  className?: string;
}

export interface SidebarProps {
  className?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}