"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImportDialog } from "./import-dialog";

interface ExistingLabel {
  id: string;
  name: string;
  color: string;
}

interface ImportButtonProps {
  projectId: string;
  existingLabels: ExistingLabel[];
}

function ImportIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

export function ImportButton({ projectId, existingLabels }: ImportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <ImportIcon className="size-4" />
        インポート
      </Button>
      <ImportDialog
        projectId={projectId}
        existingLabels={existingLabels}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
