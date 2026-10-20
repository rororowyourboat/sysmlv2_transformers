# SysML v2 transformer architecture atlas

A collection of readable SysML v2 transformer definitions and a small architecture
viewer. Models are the source of truth; generated viewer data retain exact source
text, source hashes, inherited settings, parts, ports and connections.

Initial configurations:

| Model | Blocks | Width | Heads | Vocabulary | Scope |
| --- | ---: | ---: | ---: | ---: | --- |
| GPT-2 Small | 12 | 768 | 12 | 50257 | Released configuration and logical structure |
| nanoGPT default | 12 | 768 | 12 | 50304 | `GPTConfig` defaults, not `train.py` overrides |
| nanoGPT tiny | 4 | 128 | 4 | 256 | Project-authored teaching example |

This project captures architecture. It does not load weights, run inference or
claim numerical parity with any implementation. It is separate from the
[SysML/Flexo experiment study](https://github.com/DynamicalSystemsGroup/sysmlv2_llm).

## Open the viewer

Use Node 24 (no npm dependencies or install step):

```bash
node scripts/build.mjs
node scripts/serve.mjs
```

Open <http://127.0.0.1:8182/>. The server binds to localhost. Any ordinary static
HTTP server can also serve this directory; open `viewer/index.html`. Browser
modules and fetch require HTTP, not `file://`.

The default guided walkthrough pairs a chapter narrative with a spatial tensor
view. Choose a model, step through embeddings, normalization, attention, MLP,
residuals and output, or select a decoder block. Orbit, pan and zoom the canvas;
use **Fit model**, **Focus stage** or **Tensor list**. **Bycroft layout** switches
to the upstream per-head spatial arrangement; **Compact layout** returns to the
flow-oriented arrangement. Both use the actual upstream block renderer. Toggle parameter slabs,
representations, flows and labels. Clicking a tensor exposes its exact dimensions
and **SysML source** opens the corresponding definition and modeled flows.
The sequence length T is illustrative; no weights or activations are loaded.

The **SysML explorer** link opens `viewer/atlas.html`: the original 2D
Connections/Definitions/Sources/Compare interface. Drag nodes and toggle visibility;
positions persist locally per model/scope/view. Source inspection covers all files.
These are focused architecture projections, not a complete SysML notation renderer.

## Validate and test

```bash
node --test tests/*.test.mjs
# Native SysML validation with an existing engine (nothing is installed):
node scripts/build.mjs --engine /absolute/path/to/opensysml
```

An engine build validates all source files before generating the viewer data;
its binary hash and diagnostics are retained in `viewer/models.json`. A plain
build regenerates data without claiming native validation. `just check`,
`just serve` and `just validate /path/to/opensysml` are equivalent conveniences.

## Add an architecture

1. Add a `.sysml` package under `models/`, reusing or extending the library.
2. Add its named root definition and reference links to `models/catalog.json`.
3. Update the source review in `docs/sources.json` with pinned upstream versions.
4. Run native validation, rebuild, test and inspect the viewer.

Use `default =` on overridable attributes. Model dimensions live in SysML;
the catalog contains discovery metadata and citations, not a second copy of
architecture settings. Names are unique within this initial library profile.
See [modeling boundaries](docs/modeling.md) and [pinned sources](docs/sources.json).

The source adapter is intentionally constrained to the repository's part,
inheritance, scalar/default attribute, port, connection and binding profile. It
is not a general SysML parser or semantic evaluator. Do not add arbitrary syntax
and assume the source navigator will interpret it correctly.

## Layout

- `models/library.sysml`: reusable logical components and pre-norm decoder block.
- `models/gpt2.sysml`, `models/nanogpt.sysml`: architecture configurations.
- `viewer/`: standalone UI and generated source-derived data.
- `scripts/`: source adapter, build and local static server.
- `tests/`: source integrity, inheritance and connection checks.

The Git remote is `git@github.com-personal:rororowyourboat/sysmlv2_transformers.git`.
The safe `.envrc` contains only `use_personal`; review and trust it yourself if
you use direnv. No credentials or external services are needed to view models.

## Credits

This viewer reuses **Brendan Bycroft’s [LLM Visualization](https://bbycroft.net/llm)**
([llm-viz source](https://github.com/bbycroft/llm-viz)), including its WebGL tensor
block renderer, shaders, geometry, GPT spatial layout and supporting math/buffer
utilities. Thank you to Brendan for making this work available under MIT.

The reused source is pinned to commit
`9da93742382f1bf36c020c38a1ace454e82c4490`. Original TypeScript, file hashes,
transformations and the MIT notice are retained under `viewer/vendor/`.
See [third-party notices](THIRD_PARTY_NOTICES.md) and
[upstream provenance](viewer/vendor/llm-viz/UPSTREAM.json).

Our additions are the SysML models and source adapter, architecture-to-renderer
mapping, source inspector, chapter UI and compact flow layout. This is an
independent adaptation. No checkpoint values or upstream inference engine are
loaded.
