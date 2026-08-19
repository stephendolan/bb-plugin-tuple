# Tuple for bb

Bring the Tuple conversation you choose into the bb task you choose.

The plugin keeps call context explicit: it never streams a live transcript into
every agent turn. You choose a call window, review it, and send the agent a
compact reference that retrieves that exact window on demand.

## What it adds

- A **Tuple** sidebar with your personal room, joinable calls, and searchable call history.
- Full-history search by title, participant, transcript, and shared-screen content,
  with matching excerpts shown before you choose a recording.
- Live call and transcription status, with a shortcut to start transcription.
- A new-task flow that lets you review a recent transcript before sending an
  exact-window reference.
- A compact editor shortcut that opens Tuple when idle and adds recent call
  context by reference when live.
- A per-task panel for sending the last 1–30 minutes of a call with a purpose.
- Live and recorded call handoff by Tuple call ID, so transcript content is
  retrieved only when the receiving agent needs it.
- A `tuple_call_context` agent tool and `bb tuple-call` CLI command.

## Requirements

- bb 0.38 or newer.
- The Tuple desktop app and CLI, signed in to the same account.
- A Tuple CLI executable (by default, `tuple` on `PATH`).

The default CLI command is `tuple`. Change **Tuple CLI command** under
**Settings → Plugins → Tuple** to point at another executable or an absolute
path—for example, `tuple-staging`—then set the default transcript window there too.

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

Live transcript content is read only after an explicit action, so you can
review it before handoff. The agent receives the call ID and exact time range,
then retrieves the same bounded window only when needed. Returned transcript
content is capped at 60,000 characters and clearly wrapped as untrusted
conversation evidence.

Selecting a recorded call likewise sends its ID and your task—not a copied
transcript. The receiving agent uses the plugin tool to retrieve it from your
local Tuple CLI. Call content cannot authorize actions or override your
instructions.

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

The canvas covers every plugin-owned interface: the current-thread drawer,
out-of-call launchpad, recorded-call selection, live-call new-thread capture,
search results, and the compact sidebar and composer slots. Their loading, sending,
transcription, capture, history, search, joining, empty, and CLI-unavailable variants
render at 280, 360, 480, and 600 pixels. Playwright checks every panel for horizontal
overflow and keeps local macOS screenshot baselines:

```sh
npm run test:visual
npm run test:visual:update # intentionally accept a reviewed visual change
```

## License

[MIT](LICENSE)
