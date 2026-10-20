# Initial verification

Recorded 21 October 2026 for the initial local scaffold.

- Existing OpenSysML strict validation passed for all three SysML files/packages.
  `viewer/models.json` retains the engine binary digest and successful diagnostics.
- Five Node tests passed: exact source/generated-data integrity; model configuration
  distinctions and inheritance; block connections, residual bindings and invalid
  endpoint/cycle rejection; shape derivation without fabricated values; attention/MLP flow and skip-branch projection.
- Headless Chromium checked model switching, tiny-model stack multiplicity, block
  drill-down, source inspection, comparison, visibility persistence, dragging,
  reset, link visibility, definition view and mobile page-width behavior.
- Desktop and mobile screenshots were inspected. No page exceptions were observed.
- The localhost server refused `.git/config`. Its root redirects to the viewer
  directory so relative module/data paths work correctly.
- JavaScript syntax checks passed. No dependencies were installed into the project.

The source adapter supports only the documented constrained modeling profile.
No weights, numerical forward pass, checkpoint parity, full SysML graphical
conformance or tensor-shape constraint verification was tested or claimed.

The linked GitHub repository was reachable and empty at setup. Repository linking
is not a Git push, and the scaffold has not been committed or published by this
setup step. The original SysML/Flexo experiment repository was left unchanged.

## Guided walkthrough verification

The expanded library (27 part definitions) passed native validation. Five Node
tests passed. Headless Chromium checked WebGL initialization, model and chapter
switching, selected block changes, exact parameter/representation shapes, source
dialogs and modeled flows, illustrative sequence length changes, visibility
controls, mobile page width, and the no-WebGL tensor-list fallback. No page
exceptions were observed. The desktop attention screenshot was inspected.

Block selection was exercised by setting the native select value and dispatching
its change event: the installed browser automation helper selected a label when
asked for a numeric option value. This did not require a product change.

## Bycroft integration verification

Seven Node tests passed after integrating the pinned upstream block renderer and
GPT layout. Added checks cover retained-source SHA-256 identities, per-head
geometry, source links, full position/vocabulary dimensions, dependency endpoints
and the absence of numerical values. Chromium verified the upstream renderer
was active, both layouts, all three model configurations without WebGL errors,
QKV source inspection, shape inspection, attribution links and mobile page width.
The multi-head desktop screenshot was inspected. The existing guided walkthrough
checks were rerun after both layouts were added and passed, including the
no-WebGL fallback and explicit compact-mode flows.

## Navigation refinement

Added collision-suppressed screen labels, hover identification, per-head names and
filtering, overview block labels, selected-tensor status and framing, and direct
whole-model/block navigation. Eight Node tests passed, including the dense-label
placement check. Chromium checked nonoverlapping visible labels, block selection
from overview, head filtering, selected-tensor framing/status, label visibility
and mobile width. Desktop overview and focused-selection screenshots were
inspected. These changes remain uncommitted until requested.
