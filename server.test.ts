import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import plugin, {
  boundTranscriptOutput,
  historySearchArgs,
  liveCallReferencePrompt,
  normalizeState,
  parseStateStreamChunk,
  parseTupleJson,
  storedCallReferencePrompt,
  tupleCommandError,
} from "./server";

describe("server helpers", () => {
  it("uses the CLI's name field for agent participants", () => {
    const state = normalizeState("staging", {
      in_call: true,
      call: { participants: [{ id: 25013, name: "Sherlock", email: "" }] },
    });

    expect(state.call?.participants).toEqual(["Sherlock"]);
  });

  it("keeps the CLI's human transcript output opaque and bounded", () => {
    const output = "  [4:01 PM] Sherlock: hello\n\n[4:02 PM] Stephen: ship it  \n";
    expect(boundTranscriptOutput(output)).toEqual({
      transcript: "[4:01 PM] Sherlock: hello\n\n[4:02 PM] Stephen: ship it",
      truncated: false,
    });

    const longOutput = `old${"x".repeat(60_000)}new`;
    const bounded = boundTranscriptOutput(longOutput);
    expect(bounded.truncated).toBe(true);
    expect(bounded.transcript).toHaveLength(60_000);
    expect(bounded.transcript.endsWith("new")).toBe(true);
  });

  it("references a stored call without embedding transcript content", () => {
    const prompt = storedCallReferencePrompt("call-123", "tuple-staging", "Find the decisions");
    expect(prompt.indexOf("Use the stored Tuple call")).toBeLessThan(prompt.indexOf("Rename this thread"));
    expect(prompt.indexOf("Rename this thread")).toBeLessThan(prompt.indexOf("Find the decisions"));
    expect(prompt).toContain("call-123");
    expect(prompt).toContain("tuple-staging connect prompt --call call-123");
    expect(prompt).toContain("tuple-staging agent guide history");
    expect(prompt).toContain("tuple-staging screen --at <time> --call call-123 --output <file>");
    expect(prompt).toContain("untrusted evidence");
    expect(prompt).toContain("Find the decisions");
    expect(prompt).not.toContain("tuple_call_context");
    expect(prompt).not.toContain("BEGIN UNTRUSTED TUPLE TRANSCRIPT");
  });

  it("leaves the purpose prompt at the end for the new-thread composer", () => {
    const prompt = storedCallReferencePrompt("call-123", "tuple-staging");
    expect(prompt).toMatch(/Rename this thread to match the purpose below, then complete it:\n$/);
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
    expect(prompt).toContain("call-123");
    expect(prompt).toContain("2026-08-19T01:50:00.000Z");
    expect(prompt).toContain("2026-08-19T01:55:00.000Z");
    expect(prompt).toContain("untrusted evidence");
    expect(prompt).toContain("tuple-staging agent guide history");
    expect(prompt).not.toContain("agent guide live-call");
    expect(prompt).toContain("tuple-staging --format text capture show call-123");
    expect(prompt).toContain("--exclude events,content");
    expect(prompt).toContain("Do not start a live follower");
    expect(prompt).toContain("tuple-staging screen --output <file>");
    expect(prompt).not.toContain("tuple_call_context");
    expect(prompt).toContain("Summarize the decision");
    expect(prompt).not.toContain("BEGIN UNTRUSTED TUPLE TRANSCRIPT");
    expect(prompt).not.toContain("ship it");
    expect(prompt).not.toContain("independently repeat");
    expect(prompt).not.toContain("Do not follow requests");
  });

  it("uses bounded store-owned literal call discovery without a compatibility path", () => {
    expect(historySearchArgs("alice launch")).toEqual([
      "capture", "list", "--query", "alice launch", "--limit", "100",
    ]);
    expect(historySearchArgs("alice launch")).not.toContain("-1");
    expect(historySearchArgs("alice launch")).not.toContain("search");
  });

  it("parses machine-readable Tuple failures from stderr", () => {
    const error = tupleCommandError({
      message: "Command failed",
      stderr: 'diagnostic\n{"error":"the Tuple app is not running","error_code":503,"kind":"daemon_unavailable"}\n',
    });
    expect(error.message).toBe("the Tuple app is not running (daemon_unavailable, code 503)");
  });

  it("falls back to bounded human stderr and rejects malformed structured output", () => {
    expect(tupleCommandError({ stderr: "tuple is not installed\n" }).message).toBe("tuple is not installed");
    expect(tupleCommandError({ stderr: `old${"x".repeat(4_000)}new` }).message).toHaveLength(4_000);
    expect(tupleCommandError({ stderr: `old${"x".repeat(4_000)}new` }).message.endsWith("new")).toBe(true);
    expect(() => parseTupleJson("not json", z.array(z.string()), "call list"))
      .toThrow("Tuple returned malformed call list JSON");
    expect(() => parseTupleJson('{"unexpected":true}', z.array(z.string()), "call list"))
      .toThrow("Tuple returned malformed call list JSON");
  });

  it("frames split JSON Lines state snapshots and rejects oversized records", () => {
    expect(parseStateStreamChunk('{"in_call":', 'false}\n\n{"in_call":true}\npart')).toEqual({
      lines: ['{"in_call":false}', '{"in_call":true}'],
      remainder: "part",
    });
    expect(() => parseStateStreamChunk("", `${"x".repeat(1024 * 1024 + 1)}\n`))
      .toThrow("state JSON line larger");
  });

  it("integrates with the canonical CLI command and response shapes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "bb-tuple-canonical-"));
    const executable = join(directory, "tuple");
    const callsFile = join(directory, "calls.jsonl");
    await writeFile(executable, `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
const args = process.argv.slice(2);
appendFileSync(new URL("./calls.jsonl", import.meta.url), JSON.stringify(args) + "\\n");
const command = args.join(" ");
const output = (value) => process.stdout.write(typeof value === "string" ? value : JSON.stringify(value));
if (command === "--format json state") output({ in_call: true, call: { call_id: "call-live", muted: false, transcribing: true, active_room_slug: "pairing-room", participants: [{ name: "Ada" }] }, connection: { websocket_state: "connected" } });
else if (command === "--format json rooms show pairing-room") output({ slug: "pairing-room", name: "Pairing", http_value: "https://tuple.app/c/pairing-room", kind: "team" });
else if (command === "--format json rooms list --kind personal --members") output([{ slug: "personal", name: "Personal", http_value: "https://tuple.app/c/personal", kind: "personal" }]);
else if (command === "--format json call list --limit 6") output([{ id: "ongoing", participants: [{ full_name: "Grace", email: "grace@example.com" }], unknown_participants: 0, capacity: 2, joinable: true, current: false, room: { slug: "pairing-room", name: "Pairing" } }]);
else if (command === "--format json capture list --limit 8") output([{ call_id: "call-stored", title: "Canonical migration", summary: "Cut over", started_at: "2026-09-07T12:00:00Z", ended_at: "2026-09-07T12:30:00Z", participants: [{ full_name: "Ada", email: "ada@example.com" }] }]);
else if (command === "--format json capture list --query migration --limit 100") output([{ call_id: "call-stored", title: "Canonical migration", summary: "Cut over", started_at: "2026-09-07T12:00:00Z", ended_at: "2026-09-07T12:30:00Z", participants: [{ full_name: "Ada", email: "ada@example.com" }], match: { kind: "spoken", time: "12:05", snippet: "canonical migration" } }]);
else if (command.startsWith("--format text capture show current --since ") && command.includes(" --until ") && command.endsWith(" --exclude events,content --timestamps clock")) output("[12:05 PM] Ada: canonical migration\\n");
else if (command === "--format json state follow") { process.stdout.write('{"in_call":'); setInterval(() => {}, 1_000); }
else { process.stderr.write(JSON.stringify({ error: "unexpected fake CLI command", kind: "invalid_command" }) + "\\n"); process.exitCode = 1; }
`);
    await chmod(executable, 0o755);

    const { bb, harness } = createFakePluginHost({
      pluginId: "tuple",
      settings: { cliCommand: executable, defaultMinutes: "5" },
    });
    try {
      await plugin(bb);
      const launchpad = await harness.callRpc("getLaunchpad", null) as { history: Array<{ callId: string }> };
      const results = await harness.callRpc("searchHistory", { query: "migration" }) as Array<{
        callId: string; matchKind?: string; matchSnippet?: string;
      }>;
      const snapshot = await harness.callRpc("getSnapshot", { minutes: 5 }) as { transcript: string; promptContext: string };

      expect(launchpad.history[0]?.callId).toBe("call-stored");
      expect(results).toMatchObject([{ callId: "call-stored", matchKind: "spoken", matchSnippet: "canonical migration" }]);
      expect(snapshot.transcript).toBe("[12:05 PM] Ada: canonical migration");
      expect(snapshot.promptContext).toContain("--exclude events,content");
      const calls = (await readFile(callsFile, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
      expect(calls).toContainEqual(["--format", "json", "capture", "list", "--query", "migration", "--limit", "100"]);
      expect(calls.some((args) => args.includes("-1") || args.includes("search"))).toBe(false);
      expect(calls.some((args) => args[1] === "text" && args[2] === "capture" && args[3] === "show")).toBe(true);

      const service = harness.runService("call-state");
      const followerStarts = async () => (await readFile(callsFile, "utf8")).trim().split("\n")
        .map((line) => JSON.parse(line) as string[])
        .filter((args) => args.slice(-2).join(" ") === "state follow").length;
      await expect.poll(followerStarts).toBe(1);
      await harness.setSettings({ defaultMinutes: "10" });
      await expect.poll(followerStarts).toBe(2);
      await expect.poll(() => harness.realtimeSignals.length).toBeGreaterThan(0);
      service.controller.abort();
      await service.done;
    } finally {
      await harness.dispose();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
