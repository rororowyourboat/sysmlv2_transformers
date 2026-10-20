# Modeling scope

These are derived logical architecture descriptions of pinned implementations
and configurations, not files published by the original model authors. Sources
and SHA-256 identities are in `sources.json`. No checkpoint was downloaded.

The initial library describes learned token and position embeddings, addition,
dropout, an ordered decoder stack, final normalization and a tied language head.
The reusable block has pre-normalization, causal attention, two residual additions
and a 4x GELU feed-forward network. Boundary bindings and connections are distinct.
The source declares which bindings preserve residual input; the inspector lists
these without presenting them as ordinary part-to-part connections.

The ordered decoder collection records multiplicity and execution order by
intent. Indexed serial interconnections are not expanded into separate native
connections. The collapsed stack's displayed multiplicity uses the selected
model's blockCount through the library's explicit depth binding. Individual
layer weights, caches, fused kernels, distributed placements and training state
are not represented. No claim of per-port tensor shape validation is made.

GELU details matter: the original GPT-2 implementation uses a tanh approximation,
whereas nanoGPT calls PyTorch's default `nn.GELU()`. The nanoGPT dataclass default
bias setting is true; its training script can override it. A padded 50304-token
vocabulary must not silently be relabeled as GPT-2's 50257-token vocabulary.
The tiny model is our example, not an upstream release.

Current native validation checks the SysML files with an existing OpenSysML
engine. Application checks cover inheritance, known component definitions,
connection endpoints and the declared decoder profile's width/head/MLP rules.
Neither check establishes numerical equivalence or exact runtime tensor shapes.

The source adapter uses unique unqualified definition names and a constrained
textual profile. Import/name resolution, arbitrary expressions, redefined part
collections and general SysML syntax are not supported. Native validation is
separate; the UI's Definitions tab is a focused type projection and does not
claim a complete SysML v2 graphical notation implementation.

To extend beyond GPT-style decoder blocks (for example RMSNorm, RoPE, grouped-query
attention or gated MLPs), introduce explicit component types and their real
connections rather than only changing a model name or a width. Record the
source revision and verify the new diagram against implementation code.

## Computation flows and visualization

Attention explicitly connects Q/K/V projection, scaled scores, causal masking,
softmax, weighted values, head concatenation, projection and dropout. The MLP
connects expansion, GELU, contraction and dropout. Block boundary bindings preserve
both residual bypasses. The viewer projects these declarations into its stage flows.

`weightShape` string annotations encode parameter-axis expressions using named
architecture dimensions. A restricted application evaluator derives displayed
shapes; these annotations are not native tensor constraints. Bias and normalization
vectors are omitted from the spatial overview. Tied embeddings appear at both uses,
without claiming they are distinct parameters. Batch axes are omitted.

The guided view expands one selected block. Repeated-block serial arrows and lines
from parameter matrices to operations illustrate computational intent; they are
not additional native SysML connections. Physical slab sizes and grid density are
compressed for readability; selected dimensions and the tensor list give exact
logical sizes. T is an example sequence length, not an input prompt or execution.

## Upstream Bycroft renderer and layout

Both spatial modes use the pinned upstream `blockRender` WebGL implementation
(shaders, cube geometry and uniform-buffer rendering), through
`viewer/bycroft-renderer.mjs`. The scene controller retains our camera, picking,
HTML labels, lifecycle and source inspection; it is not the entire upstream app.

The **Bycroft layout** option additionally invokes upstream `genGptModelLayout`
with settings derived from the selected SysML definition. It separates Q/K/V
parameter slices and attention heads in depth. The source mapping points these
slices to the combined `QKVProjection`, and reduction intermediates to their
containing LayerNorm or Softmax operation. They are visualization details, not
new native SysML declarations. Computational dependency lines in this mode come
from the upstream layout. Causal masking is implicit in its attention dependency
metadata; dropout has no separate geometry. The compact mode retains our explicit
mask/dropout stages and the connections extracted from SysML.

The upstream layout assumes a GPT-style pre-norm block with a 4x MLP and learned
position embeddings. Do not apply it to another family without an explicit
adapter. No upstream inference, weight loading or illustrative random data run.
The position matrix's geometry depicts T rows, while inspection reports the full
SysML matrix. Vocabulary geometry is capped at twice model width for legibility;
the inspector preserves the real vocabulary size. No upstream parameter-count
estimate is surfaced. The displayed slabs are not a memory-use chart.

Original TypeScript sources, provenance and MIT notices are retained under
`viewer/vendor/`. `node scripts/vendor-bycroft.mjs` regenerates browser modules
with Node 24's built-in (currently experimental) TypeScript transformation; serving
the checked-in modules requires no transformation or package installation.
