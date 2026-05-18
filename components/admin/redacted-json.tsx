import { Fragment } from "react";

/**
 * Renders a JSON blob as pretty-printed text, BUT replaces literal
 * `"[REDACTED]"` strings with a visually-distinct chip so admins can
 * see at a glance "data exists but is hidden" rather than mistaking
 * an empty field for a missing value.
 *
 * Backend redaction lives in two places:
 *   - src/common/utils/redact-pii.util.ts (audit_log writes)
 *   - src/modules/payments/utils/redact-payload.util.ts (admin listEvents)
 *
 * Both emit the exact string `[REDACTED]` at the position where the
 * original value used to live. The match below is anchored on the
 * surrounding quotes so we don't accidentally turn the LITERAL word
 * "redacted" appearing in a sentence into a chip.
 */
const REDACTED_TOKEN = '"[REDACTED]"';

export function RedactedJson({ value }: { value: unknown }) {
  const raw = JSON.stringify(value, null, 2) ?? "null";
  // Split on the literal so we can splice chip elements between the
  // surviving text. The split is cheap; the worst-case payload is
  // a few KB.
  const parts = raw.split(REDACTED_TOKEN);
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-slate-200 bg-white p-3 font-mono text-[11px] text-slate-700">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <span
              className="mx-0.5 inline-flex items-center rounded-sm border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500"
              title="PII redacted by the backend before persistence."
            >
              redacted
            </span>
          )}
        </Fragment>
      ))}
    </pre>
  );
}
