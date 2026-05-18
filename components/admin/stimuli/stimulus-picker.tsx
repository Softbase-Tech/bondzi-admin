"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Plus, X } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { QuestionStimulus } from "@/types/api";
import { StimulusModal } from "./stimulus-modal";

interface Props {
  /** Currently attached stimulus id, or null when standalone. */
  value: string | null;
  onChange: (stimulusId: string | null) => void;
}

/**
 * Combobox-style picker. Lists existing shared stimuli with a search filter,
 * lets the admin attach/detach, and provides an inline "Create new" entry
 * point that opens the StimulusModal — newly created stimuli auto-attach
 * to the question being edited.
 */
export function StimulusPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: stimuli, isLoading } = useQuery({
    queryKey: QK.STIMULI_LIST({ search: search || undefined }),
    queryFn: () =>
      unwrap<QuestionStimulus[]>(
        api.get("/admin/stimuli", {
          params: search ? { search, limit: 50 } : { limit: 50 },
        }),
      ),
    enabled: open,
  });

  /** When attached, fetch the row so we can render its title/body preview. */
  const { data: attached } = useQuery({
    queryKey: QK.STIMULUS_DETAIL(value ?? ""),
    enabled: Boolean(value),
    queryFn: () =>
      unwrap<QuestionStimulus>(api.get(`/admin/stimuli/${value}`)),
  });

  const filtered = useMemo(() => stimuli ?? [], [stimuli]);

  return (
    <div className="flex flex-col gap-2">
      {value && attached ? (
        <div className="flex items-start gap-3 rounded-md border border-sky-200 bg-sky-50 p-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-sky-900">
              Attached stimulus
            </div>
            <div className="mt-0.5 truncate text-sm font-medium text-slate-900">
              {attached.title ?? "(untitled)"}
            </div>
            <div className="mt-1 line-clamp-2 text-xs text-slate-600">
              {attached.body}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange(null)}
            aria-label="Detach stimulus"
          >
            <X className="h-3.5 w-3.5" />
            Detach
          </Button>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-200 px-3 py-2.5 text-sm text-slate-500">
          No stimulus attached. Standalone questions render as a single card.
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
          {value ? "Change stimulus" : "Attach existing"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          New stimulus
        </Button>
      </div>

      {open && (
        <div className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-2">
            <Input
              autoFocus
              placeholder="Search by title or body..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ScrollArea className="h-72">
            {isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                {search
                  ? `No stimuli match “${search}”.`
                  : "No stimuli yet — click New stimulus above."}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={`w-full px-3 py-2.5 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none ${
                        s.id === value ? "bg-sky-50" : ""
                      }`}
                      onClick={() => {
                        onChange(s.id);
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-slate-900">
                          {s.title ?? "(untitled)"}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          · {s.questionCount ?? 0} use
                          {(s.questionCount ?? 0) === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="mt-0.5 line-clamp-1 text-xs text-slate-600">
                        {s.body}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
      )}

      <StimulusModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        stimulus={null}
        onSaved={(s) => onChange(s.id)}
      />
    </div>
  );
}
