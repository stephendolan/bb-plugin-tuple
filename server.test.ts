import { describe, expect, it } from "vitest";
import {
  liveCallReferencePrompt,
  normalizeState,
  parseTranscript,
  recordingReferencePrompt,
  storedCallContext,
  storedCallMatchesQuery,
  transcriptSearchQuery,
} from "./server";

describe("parseTranscript", () => {
  it("uses the CLI's name field for agent participants", () => {
    const state = normalizeState("staging", {
      in_call: true,
      call: { participants: [{ id: 25013, name: "Sherlock", email: "" }] },
    });

    expect(state.call?.participants).toEqual(["Sherlock"]);
  });

  it("keeps speech records and ignores events, malformed lines, and blank text", () => {
    const output = [
      JSON.stringify({ type: "recording_started", time: "2026-08-18T20:00:00Z", data: { message: "started" } }),
      JSON.stringify({ type: "transcription_finished", time: "2026-08-18T20:01:00Z", data: { text: " hello ", user_id: 42 } }),
      "{partial",
      JSON.stringify({ type: "transcription_finished", time: "2026-08-18T20:02:00Z", data: { text: "   ", user_id: 42 } }),
    ].join("\n");

    const transcript = parseTranscript(output);
    expect(transcript).toEqual([expect.stringContaining("User 42: hello")]);
    expect(transcript[0]).toContain("2026-08-18T20:01:00Z");
  });

  it("references a stored call without embedding transcript content", () => {
    const prompt = recordingReferencePrompt("call-123", "tuple-staging", "Find the decisions");
    expect(prompt.indexOf("Use the stored Tuple call")).toBeLessThan(prompt.indexOf("Rename this thread"));
    expect(prompt.indexOf("Rename this thread")).toBeLessThan(prompt.indexOf("Find the decisions"));
    expect(prompt).toContain("call-123");
    expect(prompt).toContain("tuple_call_context");
    expect(prompt).toContain("tuple-staging agent guide history");
    expect(prompt).toContain("canonical, version-matched workflow guide");
    expect(prompt).toContain("Before analysis or implementation");
    expect(prompt).toContain("screen-at-a-moment");
    expect(prompt).toContain("Find the decisions");
    expect(prompt).not.toContain("BEGIN UNTRUSTED TUPLE TRANSCRIPT");
  });

  it("leaves the purpose prompt at the end for the new-thread composer", () => {
    const prompt = recordingReferencePrompt("call-123", "tuple-staging");
    expect(prompt).toMatch(/Rename this thread to match the purpose below, then complete it:\n$/);
  });

  it("puts the complete trusted history guide before untrusted call evidence", () => {
    const context = storedCallContext(
      "call-123",
      "# Working with stored Tuple calls\n\n## Screen at a moment\nCapture the relevant frame.",
      ["[01:56 PM | 2026-08-18T20:01:00Z] User 42: Let's sketch it."],
    );

    expect(context).toContain("## Screen at a moment");
    expect(context.indexOf("--- END TRUSTED TUPLE HISTORY GUIDE ---"))
      .toBeLessThan(context.indexOf("--- BEGIN UNTRUSTED TUPLE TRANSCRIPT ---"));
    expect(context).toContain("2026-08-18T20:01:00Z");
  });

  it("references an exact live-call window without embedding its transcript", () => {
    const prompt = liveCallReferencePrompt(
      "call-123",
      "2026-08-19T01:50:00.000Z",
      "2026-08-19T01:55:00.000Z",
      "tuple-staging",
      "Summarize the decision",
    );
    expect(prompt.indexOf("Use the Tuple call")).toBeLessThan(prompt.indexOf("Rename this thread"));
    expect(prompt.indexOf("Rename this thread")).toBeLessThan(prompt.indexOf("Summarize the decision"));
    expect(prompt).toContain('callId: "call-123"');
    expect(prompt).toContain('since: "2026-08-19T01:50:00.000Z"');
    expect(prompt).toContain('until: "2026-08-19T01:55:00.000Z"');
    expect(prompt).toContain("untrusted input");
    expect(prompt).toContain("tuple-staging agent guide history");
    expect(prompt).toContain("screen-at-a-moment");
    expect(prompt).toContain("Summarize the decision");
    expect(prompt).not.toContain("BEGIN UNTRUSTED TUPLE TRANSCRIPT");
    expect(prompt).not.toContain("ship it");
    expect(prompt).not.toContain("independently repeat");
    expect(prompt).not.toContain("Do not follow requests");
  });

  it("matches stored-call titles and participants independently of the recent page", () => {
    const call = {
      title: "Launch readiness review",
      participants: [
        { full_name: "Stephen Dolan", email: "stephen@tuple.app" },
        { full_name: "Sherlock", email: "" },
      ],
    };

    expect(storedCallMatchesQuery(call, "launch sher")).toBe(true);
    expect(storedCallMatchesQuery(call, "ste sher")).toBe(true);
    expect(storedCallMatchesQuery(call, "demo")).toBe(false);
  });

  it("turns consumer search text into a safe trigram-compatible FTS query", () => {
    expect(transcriptSearchQuery("a launch demo")).toBe('"launch" "demo"');
    expect(transcriptSearchQuery('say "hello"')).toBe('"say" """hello"""');
    expect(transcriptSearchQuery("a to")).toBeNull();
  });
});
