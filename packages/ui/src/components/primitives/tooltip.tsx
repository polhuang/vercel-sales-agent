"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

function Tooltip({ content, children, side = "top" }: TooltipProps) {
  return (
    <div className="group relative inline-flex">
      {children}
      <div
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md group-hover:block",
          side === "top" && "bottom-full left-1/2 mb-2 -translate-x-1/2",
          side === "bottom" && "top-full left-1/2 mt-2 -translate-x-1/2",
          side === "left" && "right-full top-1/2 mr-2 -translate-y-1/2",
          side === "right" && "left-full top-1/2 ml-2 -translate-y-1/2"
        )}
      >
        {content}
      </div>
    </div>
  );
}

export { Tooltip };
