"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmWord?: string;
  onConfirm: () => Promise<void> | void;
  busy?: boolean;
}

/** Admin safety gate — admin must type the confirm word to proceed. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmWord = "GENERATE",
  onConfirm,
  busy,
}: Props) {
  const [typed, setTyped] = useState("");
  const match = typed === confirmWord;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="confirm-word">
            Type <span className="font-mono font-semibold">{confirmWord}</span> to
            confirm
          </Label>
          <Input
            id="confirm-word"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!match || busy}
            loading={busy}
            onClick={async () => {
              await onConfirm();
              setTyped("");
            }}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
