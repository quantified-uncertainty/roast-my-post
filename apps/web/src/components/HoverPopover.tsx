"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface HoverPopoverProps {
  content: React.ReactNode;
  children: React.ReactNode;
  triggerClassName?: string;
  contentClassName?: string;
}

export function HoverPopover({
  content,
  children,
  triggerClassName,
  contentClassName,
}: HoverPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        asChild
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <span className={triggerClassName}>{children}</span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        className={cn("max-w-xl p-3 text-sm", contentClassName)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
