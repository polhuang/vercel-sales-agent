"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Width of the sheet panel. Defaults to "lg" (512px). */
  width?: "sm" | "md" | "lg" | "xl";
}

const widthMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
} as const;

/**
 * Slide-over panel that renders on the right side of the screen with a
 * backdrop.  Animated with CSS transitions.
 */
export function Sheet({ open, onClose, title, children, width = "lg" }: SheetProps) {
  // Track whether the component has ever been opened so we mount it only once
  // and can run close transitions.
  const [mounted, setMounted] = React.useState(open);

  React.useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // After close transition, unmount
  const handleTransitionEnd = React.useCallback(() => {
    if (!open) setMounted(false);
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      onTransitionEnd={handleTransitionEnd}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        aria-label="Close panel"
      />

      {/* Panel */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col border-l border-border bg-background shadow-lg transition-transform duration-200 ease-out",
          widthMap[width],
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
