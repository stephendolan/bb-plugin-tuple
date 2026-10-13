import { createFakePluginHost, makeHostResponse } from "@get-bb/plugin-sdk/testing";
import { describe, expect, it, vi } from "vitest";
import plugin, {
  boundTranscriptOutput,
  liveCallReferencePrompt,
  normalizeState,
  selectMachine,
  storedCallReferencePrompt,
  storedCallMatchesQuery,
  transcriptSearchQuery,
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
    expect(prompt).toContain("tuple-staging agent guide history");
    expect(prompt).toContain("read `tuple-staging agent guide history` and follow it");
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
    expect(prompt).toContain("tuple-staging agent guide live-call");
    expect(prompt).not.toContain("tuple-staging agent guide history");
    expect(prompt).not.toContain("tuple_call_context");
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
    expect(storedCallMatchesQuery(call, "retro")).toBe(false);
  });

  it("turns consumer search text into a safe trigram-compatible FTS query", () => {
    expect(transcriptSearchQuery("a launch demo")).toBe('"launch" "demo"');
    expect(transcriptSearchQuery('say "hello"')).toBe('"say" """hello"""');
    expect(transcriptSearchQuery("a to")).toBeNull();
  });
});

const machines = [
  { id: "host_server", name: "Homeserver" },
  { id: "host_mac", name: "Mac Mini" },
];

describe("selectMachine", () => {
  it("defaults to the machine running the bb server", () => {
    expect(selectMachine(machines, "", "host_server")).toEqual(machines[0]);
  });

  it("finds a machine by ID or case-insensitive name", () => {
    expect(selectMachine(machines, "host_mac", "host_server")).toEqual(machines[1]);
    expect(selectMachine(machines, "  mac mini ", "host_server")).toEqual(machines[1]);
  });

  it("names the available machines when none match", () => {
    expect(() => selectMachine(machines, "Laptop", "host_server")).toThrow(
      'No machine is named "Laptop". Set Tuple machine to one of: Homeserver, Mac Mini.',
    );
  });

  it("asks for an ID when several machines share a name", () => {
    expect(() => selectMachine([...machines, { id: "host_mac_2", name: "mac mini" }], "Mac Mini", null)).toThrow(
      'More than one machine is named "Mac Mini". Set Tuple machine to its ID.',
    );
  });

  it("asks for a machine when the server's machine is unknown", () => {
    expect(() => selectMachine(machines, "", null)).toThrow("Set Tuple machine to the machine that runs Tuple.");
  });
});

type HostCall = { method: string; input: unknown; hostId: string; signal?: AbortSignal };

function respondLikeTuple(call: HostCall) {
  if (call.method === "followState") {
    return new Promise((_, reject) => {
      call.signal?.addEventListener("abort", () => reject(new Error("cancelled")), { once: true });
    });
  }
  const { args } = call.input as { args: string[] };
  return { stdout: args.includes("state") ? JSON.stringify({ in_call: false }) : "[]" };
}

async function loadPlugin(options: { settings?: Record<string, string>; respond?: (call: HostCall) => unknown } = {}) {
  const { bb, harness } = createFakePluginHost({
    pluginId: "tuple",
    settings: options.settings,
    sdk: {
      hosts: {
        list: async (args?: { type?: string }) =>
          args?.type === "persistent" ? machines.map((machine) => makeHostResponse(machine)) : [],
      },
      system: { config: async () => ({ primaryHostId: "host_server" }) },
    },
    experimental_callHostRpc: options.respond ?? respondLikeTuple,
  });
  await plugin(bb);
  return harness;
}

describe("Tuple machine", () => {
  it("runs the Tuple CLI on the configured machine", async () => {
    const harness = await loadPlugin({ settings: { machine: "Mac Mini" } });

    await harness.callRpc("getLaunchpad");

    expect(harness.experimental_hostRpcCalls.map(({ hostId, input }) => [hostId, (input as { args: string[] }).args])).toEqual([
      ["host_mac", ["--format", "json", "rooms", "list", "--kind", "personal", "--members"]],
      ["host_mac", ["--format", "json", "call", "list", "--limit", "6"]],
      ["host_mac", ["--format", "json", "capture", "list", "--limit", "8"]],
    ]);
  });

  it("uses the bb server's machine by default", async () => {
    const harness = await loadPlugin();

    await harness.callRpc("getRecentCalls");

    expect(harness.experimental_hostRpcCalls.map(({ hostId }) => hostId)).toEqual(["host_server"]);
  });

  it("names the machine when the Tuple CLI fails there", async () => {
    const harness = await loadPlugin({
      respond: () => {
        throw new Error('Tuple CLI "tuple" was not found on PATH.');
      },
    });

    await expect(harness.callRpc("getRecentCalls")).rejects.toThrow('Homeserver: Tuple CLI "tuple" was not found on PATH.');
    await expect(harness.callRpc("getState")).resolves.toMatchObject({
      inCall: false,
      error: 'Homeserver: Tuple CLI "tuple" was not found on PATH.',
    });
  });

  it("publishes live call state followed on the Tuple machine", async () => {
    const harness = await loadPlugin({ settings: { machine: "Mac Mini" } });
    const service = harness.runService("call-state");
    const follow = await vi.waitFor(() => {
      const call = harness.experimental_hostRpcCalls.find(({ method }) => method === "followState");
      if (!call) throw new Error("follower not started");
      return call;
    });
    const { followId } = follow.input as { followId: string };

    await harness.experimental_emitHostSignal("host_mac", "state", {
      followId: "stale-follow",
      line: JSON.stringify({ in_call: true, call: { call_id: "stale-call" } }),
    });
    await harness.experimental_emitHostSignal("host_mac", "state", {
      followId,
      line: JSON.stringify({ in_call: true, call: { call_id: "call-1", participants: [{ name: "Sherlock" }] } }),
    });

    await vi.waitFor(() => expect(harness.realtimeSignals).toHaveLength(1));
    expect(follow.hostId).toBe("host_mac");
    expect(harness.realtimeSignals[0]).toMatchObject({
      channel: "call-state",
      payload: { inCall: true, call: { callId: "call-1", participants: ["Sherlock"] } },
    });

    service.controller.abort();
    await service.done;
  });

  it("moves the follower when Tuple machine changes", async () => {
    const harness = await loadPlugin({ settings: { machine: "Mac Mini" } });
    const service = harness.runService("call-state");
    const followedMachines = () =>
      harness.experimental_hostRpcCalls.filter(({ method }) => method === "followState").map(({ hostId }) => hostId);
    await vi.waitFor(() => expect(followedMachines()).toEqual(["host_mac"]));

    await harness.setSettings({ machine: "Homeserver" });

    await vi.waitFor(() => expect(followedMachines()).toEqual(["host_mac", "host_server"]));
    service.controller.abort();
    await service.done;
  });
});
