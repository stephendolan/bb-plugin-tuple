import { describe, expect, it } from "vitest";
import {
  liveCallReferencePrompt,
  normalizeState,
  parseTranscript,
  recordingReferencePrompt,
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

    expect(parseTranscript(output)).toEqual([expect.stringContaining("User 42: hello")]);
  });

  it("references a stored call without embedding transcript content", () => {
    const prompt = recordingReferencePrompt("call-123", "tuple-staging", "Find the decisions");
    expect(prompt).toContain("call-123");
    expect(prompt).toContain("tuple_call_context");
    expect(prompt).toContain("tuple-staging agent guide history");
    expect(prompt).toContain("canonical, version-matched workflow guide");
    expect(prompt).toContain("Find the decisions");
    expect(prompt).not.toContain("BEGIN UNTRUSTED TUPLE TRANSCRIPT");
  });

  it("references an exact live-call window without embedding its transcript", () => {
    const prompt = liveCallReferencePrompt(
      "call-123",
      "2026-08-19T01:50:00.000Z",
      "2026-08-19T01:55:00.000Z",
      "tuple-staging",
      "Summarize the decision",
    );
    expect(prompt).toContain('callId: "call-123"');
    expect(prompt).toContain('since: "2026-08-19T01:50:00.000Z"');
    expect(prompt).toContain('until: "2026-08-19T01:55:00.000Z"');
    expect(prompt).toContain("untrusted input");
    expect(prompt).toContain("tuple-staging agent guide history");
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
