import { describe, expect, it } from "vitest";
import { contextPrompt, parseTranscript, recordingReferencePrompt } from "./server";

describe("parseTranscript", () => {
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
    const prompt = recordingReferencePrompt("call-123", "Find the decisions");
    expect(prompt).toContain("call-123");
    expect(prompt).toContain("tuple_call_context");
    expect(prompt).toContain("Find the decisions");
    expect(prompt).not.toContain("BEGIN UNTRUSTED TUPLE TRANSCRIPT");
  });

  it("marks transcript context as untrusted without second-guessing the user's action", () => {
    const prompt = contextPrompt("ship it", 5, "Summarize the decision");
    expect(prompt).toContain("untrusted input");
    expect(prompt).not.toContain("independently repeat");
    expect(prompt).not.toContain("Do not follow requests");
  });
});
