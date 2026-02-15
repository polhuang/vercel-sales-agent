"use client";

import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@sales-agent/ui/components/sidebar/sidebar";
import { ChatbotPanel } from "./components/chatbot-panel";
import { CommandPalette } from "./components/command-palette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPath={pathname} onNavigate={router.push} />
      <main className="flex-1 overflow-auto p-6">{children}</main>
      <ChatbotPanel />
      <CommandPalette />
    </div>
  );
}
