"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@sales-agent/ui/components/primitives/button";
import { Badge } from "@sales-agent/ui/components/primitives/badge";
import { Dialog } from "@sales-agent/ui/components/primitives/dialog";
import { Input } from "@sales-agent/ui/components/primitives/input";
import { Plus, UserMinus } from "lucide-react";
import { enrollContacts, unenrollContact } from "../../actions/campaigns";
import type { Contact } from "@sales-agent/db/schema";

interface EnrollmentRow {
  enrollment: {
    id: string;
    campaignId: string;
    contactId: string;
    currentStepId: string | null;
    status: string | null;
    nextSendAt: string | null;
    enrolledAt: string;
    threadId: string | null;
    gmailMessageId: string | null;
  };
  contactFirstName: string | null;
  contactLastName: string | null;
  contactEmail: string | null;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  completed: "secondary",
  replied: "secondary",
  bounced: "destructive",
  unsubscribed: "outline",
};

interface EnrollmentPanelProps {
  campaignId: string;
  enrollments: EnrollmentRow[];
  allContacts: Contact[];
}

export function EnrollmentPanel({
  campaignId,
  enrollments,
  allContacts,
}: EnrollmentPanelProps) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = React.useState(false);

  // Filter out already enrolled contacts
  const enrolledContactIds = new Set(
    enrollments.map((e) => e.enrollment.contactId)
  );
  const availableContacts = allContacts.filter(
    (c) => !enrolledContactIds.has(c.id) && c.email
  );
  const filteredContacts = availableContacts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.firstName?.toLowerCase().includes(q) ||
      c.lastName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  const handleEnroll = async () => {
    if (selected.size === 0) return;
    setEnrolling(true);
    await enrollContacts(campaignId, Array.from(selected));
    setSelected(new Set());
    setPickerOpen(false);
    setEnrolling(false);
    router.refresh();
  };

  const handleUnenroll = async (enrollmentId: string) => {
    await unenrollContact(enrollmentId);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {enrollments.length} contact{enrollments.length !== 1 ? "s" : ""}{" "}
          enrolled
        </p>
        <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
          <Plus size={14} className="mr-1" />
          Enroll Contacts
        </Button>
      </div>

      {/* Enrollment list */}
      <div className="rounded-lg border border-border divide-y divide-border">
        {enrollments.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No contacts enrolled yet. Click &ldquo;Enroll Contacts&rdquo; to add
            contacts to this campaign.
          </div>
        ) : (
          enrollments.map((row) => (
            <div
              key={row.enrollment.id}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                  {(row.contactFirstName?.[0] ?? "").toUpperCase()}
                  {(row.contactLastName?.[0] ?? "").toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium">
                    {[row.contactFirstName, row.contactLastName]
                      .filter(Boolean)
                      .join(" ")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {row.contactEmail}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Badge
                  variant={
                    STATUS_VARIANT[row.enrollment.status ?? "active"]
                  }
                >
                  {row.enrollment.status ?? "active"}
                </Badge>
                {row.enrollment.status === "active" && (
                  <button
                    onClick={() => handleUnenroll(row.enrollment.id)}
                    className="rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                    title="Unenroll"
                  >
                    <UserMinus size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Contact picker dialog */}
      <Dialog
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setSelected(new Set());
          setSearch("");
        }}
        title="Enroll Contacts"
        width="max-w-lg"
      >
        <div className="space-y-3">
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-64 overflow-y-auto rounded-md border border-border divide-y divide-border">
            {filteredContacts.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {availableContacts.length === 0
                  ? "All contacts are already enrolled"
                  : "No matching contacts"}
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isSelected = selected.has(contact.id);
                return (
                  <label
                    key={contact.id}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const next = new Set(selected);
                        if (isSelected) next.delete(contact.id);
                        else next.add(contact.id);
                        setSelected(next);
                      }}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {contact.firstName} {contact.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {contact.email}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {selected.size} selected
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPickerOpen(false);
                  setSelected(new Set());
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleEnroll}
                disabled={selected.size === 0 || enrolling}
              >
                {enrolling
                  ? "Enrolling..."
                  : `Enroll ${selected.size} Contact${selected.size !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
