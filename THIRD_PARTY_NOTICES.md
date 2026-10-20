# Third-party notices

This project uses portions of **Brendan Bycroft’s LLM Visualization**:

- Interactive original: https://bbycroft.net/llm
- Source repository: https://github.com/bbycroft/llm-viz
- Pinned revision: `9da93742382f1bf36c020c38a1ace454e82c4490`
- Copyright (c) 2023-2026 Brendan Bycroft
- License: MIT; the complete notice is in [LICENSE.llm-viz](viewer/vendor/LICENSE.llm-viz).

Reused portions include the WebGL tensor block renderer and shaders, cube
geometry, GPT spatial layout, shader/buffer utilities, and vector/matrix math.
Original TypeScript files are retained in `viewer/vendor/llm-viz/upstream/`.
Their identities and adaptation details are in
[UPSTREAM.json](viewer/vendor/llm-viz/UPSTREAM.json).

`node scripts/vendor-bycroft.mjs` regenerates the browser modules with Node 24's
built-in TypeScript transformation. It substitutes runtime imports and small
compatibility helpers and removes a Node-specific filename reference; it does
not require the upstream Next.js application or install any packages.

Our SysML models, configuration adapter, source inspector, chapter controls,
compact layout, and browser scene controller integrate this code. The alternate
Bycroft layout uses the upstream GPT arrangement and computational dependencies;
those rendering details must not be mistaken for additional native SysML flows.

No personal homepage content, font assets, or model checkpoints from the
upstream application are included. No affiliation or endorsement is implied.
