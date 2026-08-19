import type { ReactNode } from "react";
import type { Launchpad } from "../server";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Icon } from "./ui/icon";
import { Input } from "./ui/input";
import {
  PANEL_CLIPPED_SURFACE_CLASS,
  PANEL_SECTION_CLASS,
  PANEL_SECTION_HEADING_CLASS,
} from "./ui/panel-styles";

export type StoredCall = Launchpad["history"][number];

export function storedCallTitle(call: StoredCall) {
  return call.title || call.participants.join(" & ") || "Recorded Tuple call";
}

export function storedCallTime(call: StoredCall) {
  const started = new Date(call.startedAt);
  const today = new Date();
  const isToday = started.toDateString() === today.toDateString();
  const date = isToday
    ? "Today"
    : started.toLocaleDateString([], { month: "short", day: "numeric" });
  const time = started.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (!call.endedAt) return `${date} · ${time}`;
  const minutes = Math.max(1, Math.round((new Date(call.endedAt).getTime() - started.getTime()) / 60_000));
  return `${date} · ${time} · ${minutes} min`;
}

function renderMatchSnippet(snippet: string): ReactNode {
  return snippet.split(/\[\[(.*?)\]\]/).map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="rounded-sm bg-amber-300/45 text-inherit dark:bg-amber-400/35">
        {part}
      </mark>
    ) : part,
  );
}

export interface RecentCallsSectionProps {
  calls: StoredCall[];
  loading?: boolean;
  error?: string | null;
  query: string;
  searchResults: StoredCall[] | null;
  searchLoading: boolean;
  searchError: string | null;
  className?: string;
  onRetry: () => void;
  onRetrySearch: () => void;
  onQueryChange: (query: string) => void;
  onSelect: (recording: StoredCall) => void;
}

export function RecentCallsSection({
  calls,
  loading = false,
  error = null,
  query,
  searchResults,
  searchLoading,
  searchError,
  className,
  onRetry,
  onRetrySearch,
  onQueryChange,
  onSelect,
}: RecentCallsSectionProps) {
  const searching = query.trim().length > 0;
  const canSearchCallContent = query.trim().split(/\s+/).some((term) => term.length >= 3);
  const visibleCalls = searching ? searchResults ?? [] : calls;

  if (!loading && !error && !calls.length) return null;

  return (
    <section className={cn(PANEL_SECTION_CLASS, className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={PANEL_SECTION_HEADING_CLASS}>Recent calls</h2>
        {searching && searchResults && !searchLoading && !searchError ? (
          <p className="text-muted-foreground shrink-0 text-[0.6875rem] tabular-nums opacity-70" role="status">
            {searchResults.length} {searchResults.length === 1 ? "match" : "matches"}
          </p>
        ) : null}
      </div>

      {!loading && !error ? (
        <form role="search" className="relative" onSubmit={(event) => event.preventDefault()}>
          <Icon name="Search" className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 h-lh shrink-0 -translate-y-1/2" aria-hidden="true" />
          <Input
            name="tuple-call-search"
            type="search"
            aria-label="Search recent Tuple calls"
            value={query}
            placeholder="Search titles, people, transcripts, and shared content…"
            className="h-9 pr-9 pl-9 text-base sm:text-sm [&::-webkit-search-cancel-button]:hidden"
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {searchLoading ? (
            <Icon name="Spinner" className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 h-lh shrink-0 -translate-y-1/2 animate-spin" aria-hidden="true" />
          ) : searching ? (
            <button
              type="button"
              className="text-muted-foreground focus-visible:outline-ring hover:text-foreground absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md focus-visible:outline-2"
              aria-label="Clear call search"
              onClick={() => onQueryChange("")}
            >
              <Icon name="Cancel" className="size-4 shrink-0" aria-hidden="true" />
            </button>
          ) : null}
        </form>
      ) : null}

      <div className={PANEL_CLIPPED_SURFACE_CLASS} aria-busy={loading || searchLoading}>
        {error ? (
          <div className="flex min-w-0 items-center gap-3 px-3 py-3" role="alert">
            <p className="text-destructive min-w-0 flex-1 text-sm text-pretty">Could not load recent Tuple calls.</p>
            <Button type="button" size="sm" variant="secondary" onClick={onRetry}>Retry</Button>
          </div>
        ) : loading ? (
          <div className="text-muted-foreground flex items-center gap-2 px-3 py-3 text-sm" role="status">
            <Icon name="Spinner" className="size-4 h-lh shrink-0 animate-spin" aria-hidden="true" />
            <span>Loading recent calls…</span>
          </div>
        ) : searchError ? (
          <div className="flex min-w-0 items-center gap-3 px-3 py-3" role="alert">
            <p className="text-destructive min-w-0 flex-1 text-sm text-pretty">Could not search Tuple calls.</p>
            <Button type="button" size="sm" variant="secondary" onClick={onRetrySearch}>Retry</Button>
          </div>
        ) : searching && searchLoading && !searchResults ? (
          <div className="text-muted-foreground flex items-center gap-2 px-3 py-3 text-sm" role="status">
            <Icon name="Spinner" className="size-4 h-lh shrink-0 animate-spin" aria-hidden="true" />
            <span>Searching all calls…</span>
          </div>
        ) : searching && !visibleCalls.length && !canSearchCallContent ? (
          <p className="text-muted-foreground px-3 py-3 text-sm text-pretty" role="status">
            Keep typing to search transcripts and shared content.
          </p>
        ) : searching && !visibleCalls.length ? (
          <p className="text-muted-foreground px-3 py-3 text-sm text-pretty" role="status">
            No calls match “{query.trim()}”.
          </p>
        ) : visibleCalls.map((call) => (
          <button
            key={call.callId}
            type="button"
            data-history-row
            className="active:bg-muted/60 after:bg-foreground/6 focus-visible:outline-ring hover:bg-muted/40 relative w-full min-w-0 cursor-pointer px-3 py-2.5 text-left after:absolute after:inset-x-0 after:bottom-0 after:h-px after:content-[''] last:after:hidden focus-visible:outline-2 focus-visible:-outline-offset-2"
            onClick={() => onSelect(call)}
          >
            <span className="block min-w-0 @min-[26rem]:grid @min-[26rem]:grid-cols-[minmax(0,1fr)_8.75rem] @min-[26rem]:gap-x-3">
              <span className="min-w-0 truncate text-sm font-medium">{storedCallTitle(call)}</span>
              <span
                className="text-muted-foreground hidden min-w-0 truncate text-left text-[0.6875rem] tabular-nums opacity-70 @min-[26rem]:block"
                title={storedCallTime(call)}
              >
                {storedCallTime(call)}
              </span>
              <span
                className={`text-muted-foreground mt-0.5 min-w-0 truncate text-xs @min-[26rem]:col-start-1 @min-[26rem]:row-start-2 ${call.matchSnippet ? "hidden" : "block"}`}
                title={call.matchSnippet ? undefined : call.summary ?? undefined}
                aria-hidden={call.matchSnippet || call.summary ? undefined : true}
              >
                {call.summary || "\u00a0"}
              </span>
              <span className="text-muted-foreground mt-0.5 hidden min-w-0 truncate text-left text-[0.6875rem] opacity-55 @min-[26rem]:col-start-2 @min-[26rem]:row-start-2 @min-[26rem]:block">
                {call.participants.length} {call.participants.length === 1 ? "participant" : "participants"}
              </span>
            </span>
            {call.matchSnippet ? (
              <span className="text-muted-foreground mt-1.5 line-clamp-2 border-l border-foreground/12 pl-2 text-sm/5 text-pretty">
                <span className="text-foreground/70 font-medium">
                  {call.matchKind === "content" ? "Shared screen: " : "Transcript: "}
                </span>
                {renderMatchSnippet(call.matchSnippet)}
              </span>
            ) : null}
            <span className={`mt-0.5 block truncate text-[0.6875rem] text-muted-foreground @min-[26rem]:hidden ${call.summary ? "opacity-70" : ""}`}>
              {storedCallTime(call)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
