import { access, chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { experimental_createHostEntryHarness } from "@get-bb/plugin-sdk/testing/host";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import hostEntry from "./host";

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "tuple-host-"));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

async function fakeTuple(script: string) {
  const command = join(directory, "tuple");
  await writeFile(command, `#!/usr/bin/env node\n${script}\n`);
  await chmod(command, 0o755);
  return command;
}

describe("host entry", () => {
  it("runs the Tuple CLI on its machine and returns stdout", async () => {
    const command = await fakeTuple("process.stdout.write(JSON.stringify(process.argv.slice(2)));");
    const harness = experimental_createHostEntryHarness(hostEntry);

    const { stdout } = await harness.experimental_call("run", {
      command,
      args: ["--format", "json", "state"],
      timeoutMs: 5_000,
      maxBuffer: 1024,
    });

    expect(JSON.parse(stdout)).toEqual(["--format", "json", "state"]);
  });

  it("explains a missing Tuple CLI instead of reporting spawn ENOENT", async () => {
    const harness = experimental_createHostEntryHarness(hostEntry);

    await expect(
      harness.experimental_call("run", { command: join(directory, "missing"), args: [], timeoutMs: 5_000, maxBuffer: 1024 }),
    ).rejects.toThrow(/was not found on PATH\. Install it, or set Tuple machine/);
  });

  it("signals each followed state line and reports a clean exit", async () => {
    const command = await fakeTuple(`
      console.log(JSON.stringify({ in_call: false }));
      console.log("");
      console.log(JSON.stringify({ in_call: true, call: { call_id: "call-1" } }));
    `);
    const harness = experimental_createHostEntryHarness(hostEntry);

    await expect(
      harness.experimental_call("followState", { command, followId: "follow-1", durationMs: 60_000 }),
    ).resolves.toEqual({ ended: "exited" });
    expect(harness.experimental_getSignals()).toEqual([
      { signal: "state", payload: { followId: "follow-1", line: '{"in_call":false}' } },
      { signal: "state", payload: { followId: "follow-1", line: '{"in_call":true,"call":{"call_id":"call-1"}}' } },
    ]);
  });

  it("stops the follower when its duration expires", async () => {
    const command = await fakeTuple('console.log("{}"); setInterval(() => {}, 1_000);');
    const harness = experimental_createHostEntryHarness(hostEntry);

    await expect(
      harness.experimental_call("followState", { command, followId: "follow-1", durationMs: 300 }),
    ).resolves.toEqual({ ended: "expired" });
  });

  it("reports the follower's stderr when it fails", async () => {
    const command = await fakeTuple('console.error("Tuple is not signed in"); process.exit(3);');
    const harness = experimental_createHostEntryHarness(hostEntry);

    await expect(
      harness.experimental_call("followState", { command, followId: "follow-1", durationMs: 60_000 }),
    ).rejects.toThrow("Tuple is not signed in");
  });

  it("stops a running follower when the call is cancelled", async () => {
    const command = await fakeTuple('console.log("{}"); setInterval(() => {}, 1_000);');
    const harness = experimental_createHostEntryHarness(hostEntry);
    const controller = new AbortController();

    const follow = harness.experimental_call(
      "followState",
      { command, followId: "follow-1", durationMs: 60_000 },
      { signal: controller.signal },
    );
    await vi.waitFor(() => expect(harness.experimental_getSignals()).toHaveLength(1));
    controller.abort();

    await expect(follow).rejects.toThrow();
  });

  it("does not start a follower for a call cancelled before it runs", async () => {
    const marker = join(directory, "started");
    const command = await fakeTuple(
      `require("node:fs").writeFileSync(${JSON.stringify(marker)}, ""); setInterval(() => {}, 1_000);`,
    );
    const harness = experimental_createHostEntryHarness(hostEntry);
    const controller = new AbortController();

    const follow = harness.experimental_call(
      "followState",
      { command, followId: "follow-1", durationMs: 60_000 },
      { signal: controller.signal },
    );
    controller.abort();

    await expect(follow).rejects.toThrow();
    await expect(access(marker)).rejects.toThrow();
  });
});
