// @vitest-environment jsdom
import { fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { loadPluginApp, renderSlot } from "@get-bb/plugin-sdk/testing/app";
import type { rpcContract } from "./server";

const liveState = {
  environment: "staging" as const,
  inCall: true,
  call: {
    callId: "call-1",
    muted: false,
    transcribing: true,
    roomSlug: "demo-room",
    roomName: null,
    roomKind: "personal" as const,
    joinUrl: "https://staging.tuple.app/c/demo-room",
    participants: [],
  },
  connection: "connected",
  error: null,
  updatedAt: "2026-08-18T20:00:00.000Z",
};

const recentStoredCall = {
  callId: "recording-1",
  title: "Earlier launch review",
  summary: "Reviewed the rollout and assigned the remaining follow-ups.",
  startedAt: "2026-08-18T18:00:00.000Z",
  endedAt: "2026-08-18T18:20:00.000Z",
  participants: ["Morgan Lee", "Casey Chen"],
  promptContext: "Use stored Tuple call recording-1",
};

describe("Tuple Call app", () => {
  it("opens the Tuple thread panel when idle and adds call context when live", async () => {
    const app = await loadPluginApp(() => import("./app"));
    const action = app.composerCustomizations[0]!.actions![0]!;
    const idle = renderSlot(
      action,
      {},
      {
        settings: { environment: "staging", defaultMinutes: "5" },
        rpc: {
          getState: () => ({ ...liveState, inCall: false, call: null }),
        },
        openThreadPanel: () => true,
      },
    );

    fireEvent.click(await idle.findByRole("button", { name: "Open Tuple" }));
    expect(idle.inspection.navigateCalls).toEqual([
      {
        method: "openThreadPanel",
        options: { actionId: "call", title: "Tuple" },
      },
    ]);
    idle.lifecycle.unmount();

    const live = renderSlot(
      action,
      {},
      {
        settings: { environment: "staging", defaultMinutes: "5" },
        composer: { text: "Existing task" },
        rpc: {
          getState: () => liveState,
          getRecentCalls: () => [recentStoredCall],
          getSnapshot: () => ({
            callId: "call-1",
            minutes: 5,
            since: "2026-08-18T19:55:00.000Z",
            until: "2026-08-18T20:00:00.000Z",
            capturedAt: "2026-08-18T20:00:00.000Z",
            segmentCount: 1,
            transcript: "[04:00 PM] User 42: ship it",
            promptContext: "bounded context",
            truncated: false,
          }),
        },
      },
    );

    fireEvent.click(
      await live.findByRole("button", {
        name: "Add the last 5 minutes of this Tuple call to the draft",
      }),
    );
    await waitFor(() => expect(live.inspection.composer.text).toBe("Existing task\n\nbounded context"));
    expect(live.inspection.composer.focusCount).toBe(1);
    expect(live.container.querySelector('[style*="mask-image"]')).toBeTruthy();
    live.lifecycle.unmount();
  });

  it("starts transcription when the live composer action needs it", async () => {
    const app = await loadPluginApp(() => import("./app"));
    const action = app.composerCustomizations[0]!.actions![0]!;
    const slot = renderSlot(
      action,
      {},
      {
        settings: { environment: "staging", defaultMinutes: "5" },
        rpc: {
          getState: () => ({
            ...liveState,
            call: { ...liveState.call, transcribing: false },
          }),
          startTranscription: () => liveState,
        },
      },
    );

    fireEvent.click(await slot.findByRole("button", { name: "Start Tuple transcription" }));
    await slot.findByRole("button", {
      name: "Add the last 5 minutes of this Tuple call to the draft",
    });
    expect(slot.inspection.rpcCalls.map((call) => call.method)).toEqual([
      "getState",
      "startTranscription",
    ]);
    slot.lifecycle.unmount();
  });

  it("registers the intended BB surfaces and captures a reviewed snapshot", async () => {
    const app = await loadPluginApp(() => import("./app"));
    expect(app.navPanels).toHaveLength(1);
    expect(app.threadPanelActions).toHaveLength(1);
    expect(app.newThreadPanelActions).toHaveLength(1);
    expect(app.threadHeaderActions).toHaveLength(0);

    const slot = renderSlot(
      app.navPanels[0]!,
      { subPath: "" },
      {
        context: { projectId: "project-1", threadId: null },
        settings: { environment: "staging", defaultMinutes: "5" },
        rpc: {
          getState: () => liveState,
          getRecentCalls: () => [recentStoredCall],
          getSnapshot: () => ({
            callId: "call-1",
            minutes: 5,
            since: "2026-08-18T19:55:00.000Z",
            until: "2026-08-18T20:00:00.000Z",
            capturedAt: "2026-08-18T20:00:00.000Z",
            segmentCount: 1,
            transcript: "[04:00 PM] User 42: ship it",
            promptContext: "bounded context",
            truncated: false,
          }),
        },
      },
    );

    await slot.findByText("Current call");
    await slot.findByText("Transcribing · Personal room · Staging");
    fireEvent.click(await slot.findByRole("button", { name: "Use last 5 min" }));
    await slot.findByText("[04:00 PM] User 42: ship it");
    await slot.findByRole("heading", { name: "Recent calls" });
    await slot.findByText("Earlier launch review");
    expect(slot.inspection.rpcCalls.map((call) => call.method)).toEqual(["getState", "getRecentCalls", "getSnapshot"]);
    slot.lifecycle.unmount();
  });

  it("searches for an earlier call from the live-call page and returns to the current call", async () => {
    const app = await loadPluginApp(() => import("./app"));
    const olderStoredCall = {
      ...recentStoredCall,
      callId: "recording-2",
      title: "Older architecture review",
      matchKind: "spoken" as const,
      matchSnippet: "The [[architecture]] should keep call history available.",
    };
    const slot = renderSlot(
      app.navPanels[0]!,
      { subPath: "" },
      {
        context: { projectId: "project-1", threadId: null },
        settings: { cliCommand: "tuple-staging", defaultMinutes: "5" },
        rpc: {
          getState: () => liveState,
          getRecentCalls: () => [recentStoredCall],
          searchHistory: () => [olderStoredCall],
        },
      },
    );

    await slot.findByText("Current call");
    fireEvent.change(await slot.findByRole("searchbox", { name: "Search recent Tuple calls" }), {
      target: { value: "architecture" },
    });
    fireEvent.click(await slot.findByRole("button", { name: /Older architecture review/ }));
    await slot.findByText("The new thread will read this recording directly from Tuple.");
    fireEvent.click(await slot.findByRole("button", { name: "Recent calls" }));
    await slot.findByText("Current call");
    await slot.findByText("Older architecture review");
    slot.lifecycle.unmount();
  });

  it("keeps the live thread drawer compact and action-focused", async () => {
    const app = await loadPluginApp(() => import("./app"));
    const slot = renderSlot(
      app.threadPanelActions[0]!,
      { threadId: "thread-1", params: null },
      {
        settings: { environment: "staging", defaultMinutes: "5" },
        rpc: {
          getState: () => liveState,
        },
      },
    );

    await slot.findByText("Current call");
    await slot.findByText("Transcribing · Personal room");
    const copyLink = await slot.findByRole("button", { name: "Copy link" });
    expect(copyLink.querySelector('[data-icon="Link"]')).toBeTruthy();
    await slot.findByLabelText("Ask the current thread to");
    await slot.findByRole("button", { name: "Send 5 min of transcript" });
    expect(slot.queryByText("Your Tuple call is live")).toBeNull();
    slot.lifecycle.unmount();
  });

  it("turns the idle panel into a minimal room and call launcher", async () => {
    const app = await loadPluginApp(() => import("./app"));
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const slot = renderSlot(
      app.navPanels[0]!,
      { subPath: "" },
      {
        context: { projectId: "project-1", threadId: null },
        settings: { environment: "staging", defaultMinutes: "5" },
        rpc: {
          getState: () => ({
            ...liveState,
            inCall: false,
            call: null,
          }),
          getLaunchpad: () => ({
            personalRoom: {
              slug: "demo-room",
              joinUrl: "https://staging.tuple.app/c/demo-room",
            },
            calls: [
              {
                id: "call-2",
                participants: ["Alice Jones", "Bob Smith"],
                unknownParticipants: 0,
                capacity: 2,
                joinable: true,
                room: null,
                joinTarget: "alice@example.com",
              },
            ],
            history: [
              {
                callId: "recording-1",
                title: null,
                summary: "A concise summary of the recorded call.",
                startedAt: "2026-08-18T19:55:05.261Z",
                endedAt: "2026-08-18T20:15:21.740Z",
                participants: ["Morgan Lee", "Casey Chen"],
                promptContext: "Use stored Tuple call recording-1",
              },
            ],
          }),
          joinTuple: () => ({ ok: true as const }),
        },
      },
    );

    await slot.findByRole("heading", { name: "Personal room" });
    await slot.findByText("Your room");
    await slot.findByText("Alice Jones & Bob Smith");
    await slot.findByText("A concise summary of the recorded call.");
    expect(slot.queryByRole("button", { name: "Refresh" })).toBeNull();
    fireEvent.click(slot.getByRole("button", { name: /Your room/ }));
    await waitFor(() => expect(slot.inspection.rpcCalls.some((call) => call.method === "joinTuple")).toBe(true));
    expect(writeText).toHaveBeenCalledWith("https://staging.tuple.app/c/demo-room");
    fireEvent.click(slot.getByRole("button", { name: /Morgan Lee & Casey Chen/ }));
    await slot.findByText("The new thread will read this recording directly from Tuple.");
    slot.lifecycle.unmount();
  });

  it("searches beyond the recent-call page and previews the matching excerpt", async () => {
    const app = await loadPluginApp(() => import("./app"));
    const slot = renderSlot(
      app.navPanels[0]!,
      { subPath: "" },
      {
        context: { projectId: "project-1", threadId: null },
        settings: { cliCommand: "tuple-staging", defaultMinutes: "5" },
        rpc: {
          getState: () => ({ ...liveState, inCall: false, call: null }),
          getLaunchpad: () => ({
            personalRoom: null,
            calls: [],
            history: [{
              callId: "recent-call",
              title: "Today",
              summary: null,
              startedAt: "2026-08-19T14:00:00.000Z",
              endedAt: "2026-08-19T14:05:00.000Z",
              participants: ["Stephen Dolan"],
              promptContext: "Recent call",
            }],
          }),
          searchHistory: ({ query }: { query: string }) => [{
            callId: "older-call",
            title: "Launch planning",
            summary: null,
            startedAt: "2026-07-10T14:00:00.000Z",
            endedAt: "2026-07-10T14:25:00.000Z",
            participants: ["Stephen Dolan", "Sherlock"],
            promptContext: "Older call",
            matchKind: "spoken" as const,
            matchSnippet: `The [[${query}]] should include every locally recorded call.`,
          }],
        },
      },
    );

    fireEvent.change(await slot.findByRole("searchbox", { name: "Search recent Tuple calls" }), {
      target: { value: "launch" },
    });
    await slot.findByText("Launch planning");
    await slot.findByText("launch", { selector: "mark" });
    expect(slot.queryByText("Today")).toBeNull();
    expect(slot.inspection.rpcCalls.some((call) => call.method === "searchHistory" && call.input.query === "launch")).toBe(true);
    slot.lifecycle.unmount();
  });

  it("offers transcription as the recovery action when a call is live but not recording", async () => {
    const app = await loadPluginApp(() => import("./app"));
    const transcriptionOff = {
      ...liveState,
      call: { ...liveState.call, transcribing: false },
    };
    const slot = renderSlot(
      app.navPanels[0]!,
      { subPath: "" },
      {
        context: { projectId: "project-1", threadId: null },
        settings: { environment: "staging", defaultMinutes: "5" },
        rpc: {
          getState: () => transcriptionOff,
          getRecentCalls: () => [],
          startTranscription: () => liveState,
        },
      },
    );

    await slot.findByText("Transcription is off · Personal room · Staging");
    fireEvent.click(await slot.findByRole("button", { name: "Start transcription" }));
    await slot.findByText("Transcribing · Personal room · Staging");
    expect(slot.inspection.rpcCalls.map((call) => call.method)).toEqual(["getState", "getRecentCalls", "startTranscription"]);
    slot.lifecycle.unmount();
  });

  it("reduces the idle-transcription thread drawer to one recovery action", async () => {
    const app = await loadPluginApp(() => import("./app"));
    const transcriptionOff = {
      ...liveState,
      call: { ...liveState.call, transcribing: false },
    };
    const slot = renderSlot(
      app.threadPanelActions[0]!,
      { threadId: "thread-1", params: null },
      {
        settings: { environment: "staging", defaultMinutes: "5" },
        rpc: {
          getState: () => transcriptionOff,
          startTranscription: () => liveState,
        },
      },
    );

    await slot.findByText("Transcription is off · Personal room");
    expect(slot.queryByLabelText("Ask the current thread to")).toBeNull();
    expect(slot.queryByRole("button", { name: "Send 5 min of transcript" })).toBeNull();
    fireEvent.click(await slot.findByRole("button", { name: "Start transcription" }));
    await slot.findByLabelText("Ask the current thread to");
    expect(slot.inspection.rpcCalls.map((call) => call.method)).toEqual([
      "getState",
      "startTranscription",
    ]);
    slot.lifecycle.unmount();
  });
});
