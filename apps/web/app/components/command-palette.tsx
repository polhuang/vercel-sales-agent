"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Building2,
  Users,
  StickyNote,
  Mail,
  Plus,
  Bot,
  PanelLeft,
} from "lucide-react";
import { useUIStore } from "@sales-agent/ui/stores/ui-store";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { toggleChatbot, toggleSidebar } = useUIStore();

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const navigate = (path: string) => {
    router.push(path);
    setOpen(false);
  };

  const run = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command Menu"
    >
      <Command.Input placeholder="Type a command or search..." />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>

        <Command.Group heading="Navigation">
          <Command.Item
            onSelect={() => navigate("/")}
            keywords={["home", "overview"]}
          >
            <LayoutDashboard size={14} />
            Dashboard
          </Command.Item>
          <Command.Item
            onSelect={() => navigate("/opportunities")}
            keywords={["deals", "pipeline", "opps"]}
          >
            <Target size={14} />
            Opportunities
          </Command.Item>
          <Command.Item
            onSelect={() => navigate("/accounts")}
            keywords={["companies", "orgs"]}
          >
            <Building2 size={14} />
            Accounts
          </Command.Item>
          <Command.Item
            onSelect={() => navigate("/contacts")}
            keywords={["people", "leads"]}
          >
            <Users size={14} />
            Contacts
          </Command.Item>
          <Command.Item
            onSelect={() => navigate("/notes")}
            keywords={["write", "meeting"]}
          >
            <StickyNote size={14} />
            Notes
          </Command.Item>
          <Command.Item
            onSelect={() => navigate("/campaigns")}
            keywords={["email", "outreach", "sequences"]}
          >
            <Mail size={14} />
            Campaigns
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Create">
          <Command.Item
            onSelect={() => navigate("/opportunities?create=1")}
            keywords={["new deal", "add opportunity"]}
          >
            <Plus size={14} />
            New Opportunity
          </Command.Item>
          <Command.Item
            onSelect={() => navigate("/accounts?create=1")}
            keywords={["new company", "add account"]}
          >
            <Plus size={14} />
            New Account
          </Command.Item>
          <Command.Item
            onSelect={() => navigate("/contacts?create=1")}
            keywords={["new person", "add contact"]}
          >
            <Plus size={14} />
            New Contact
          </Command.Item>
          <Command.Item
            onSelect={() => navigate("/notes?create=1")}
            keywords={["new note", "write note"]}
          >
            <Plus size={14} />
            New Note
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Tools">
          <Command.Item
            onSelect={() => run(toggleChatbot)}
            keywords={["ai", "assistant", "chat", "help"]}
          >
            <Bot size={14} />
            Open Chatbot
            <span className="cmdk-shortcut">Ctrl+J</span>
          </Command.Item>
          <Command.Item
            onSelect={() => run(toggleSidebar)}
            keywords={["collapse", "expand", "menu"]}
          >
            <PanelLeft size={14} />
            Toggle Sidebar
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
