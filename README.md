# Tuple for bb

Bring the Tuple conversation you choose into the bb task you choose.

The plugin keeps call context explicit: it never streams a live transcript into
every agent turn. You decide when to use a bounded slice of the current call or
reference a recorded call.

## What it adds

- A **Tuple** sidebar with your personal room, joinable calls, and recent call history.
- Live call and transcription status, with a shortcut to start transcription.
- A new-task flow that lets you review a recent transcript before sending it.
- A compact editor shortcut that opens Tuple when idle and adds recent call context when live.
- A per-task panel for sending the last 1–30 minutes of a call with a purpose.
- Recorded-call handoff by Tuple recording ID, so transcript content is retrieved
  only when the receiving agent needs it.
- A `tuple_call_context` agent tool and `bb tuple-call` CLI command.

## Requirements

- bb 0.38 or newer.
- The Tuple desktop app and CLI, signed in to the same account.
- `tuple` available on `PATH`. Tuple employees can optionally select staging or
  development in the plugin settings when `tuple-staging` or `tuple-dev` is also
  available on `PATH`.

Production is the default environment. Change the environment or default
transcript window under **Settings → Plugins → Tuple**.

## Install

Install the latest version from the default branch:

```sh
bb plugin install https://github.com/stephendolan/bb-plugin-tuple
```

The plugin ID is `tuple`. After a local edit, reload it with:

```sh
bb plugin reload tuple
```

## Privacy and safety

Live transcript content is read only after an explicit action. Snapshots are
bounded to 1–30 minutes, capped at 60,000 characters, and clearly wrapped as
untrusted conversation evidence.

Selecting a recorded call sends its recording ID and your task—not a copied
transcript. The receiving agent uses the plugin tool to retrieve that recording
from your local Tuple CLI. Call content cannot authorize actions or override
your instructions.

## Develop

```sh
npm install
npm run check
bb plugin install .
```

`npm run check` typechecks, tests, and produces the bb plugin bundles in `dist/`.

### Visual state lab

The plugin uses Ladle to render the real production views across the drawer
widths and states most likely to expose layout defects:

```sh
npm run storybook
```

The canvas includes live, sending, transcription-off, long-participant, room,
active-call, history, loading, joining, and CLI-unavailable states at 280, 360,
480, and 600 pixels. Playwright checks every panel for horizontal overflow and keeps
local macOS screenshot baselines:

```sh
npm run test:visual
npm run test:visual:update # intentionally accept a reviewed visual change
```
