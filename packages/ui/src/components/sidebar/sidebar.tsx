"use client";

import {
  Building2,
  Target,
  Users,
  StickyNote,
  Mail,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useUIStore } from "../../stores/ui-store";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: <LayoutDashboard size={18} /> },
  {
    label: "Opportunities",
    href: "/opportunities",
    icon: <Target size={18} />,
  },
  { label: "Accounts", href: "/accounts", icon: <Building2 size={18} /> },
  { label: "Contacts", href: "/contacts", icon: <Users size={18} /> },
  { label: "Notes", href: "/notes", icon: <StickyNote size={18} /> },
  { label: "Campaigns", href: "/campaigns", icon: <Mail size={18} /> },
];

interface SidebarProps {
  currentPath: string;
  onNavigate: (href: string) => void;
}

export function Sidebar({ currentPath, onNavigate }: SidebarProps) {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
        sidebarOpen ? "w-56" : "w-14"
      )}
    >
      <div className="flex h-12 items-center justify-between border-b border-sidebar-border px-3">
        {sidebarOpen && (
          <span className="text-sm font-semibold text-sidebar-foreground">
            Sales Agent
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive =
            currentPath === item.href ||
            (item.href !== "/" && currentPath.startsWith(item.href));

          return (
            <button
              key={item.href}
              onClick={() => onNavigate(item.href)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              {item.icon}
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
