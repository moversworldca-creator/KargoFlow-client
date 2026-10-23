# Shared template builder

Both frontend applications import this module through their existing builder paths.
Keep document serialization, HTML sanitization, table operations, mode metadata,
and reusable dialogs here. Authentication, API clients, and workflow orchestration
remain in the application that owns them; shared components receive callbacks.

`core/documentAdapter.js` converts the canvas document into the backend builder
document. It preserves backend settings and maps canvas page boundaries to
`section.page_break_before`. Empty sections preserve intentional blank pages.
The inverse conversion reconstructs canvas pages from those section boundaries.
The flat `items` collection is a convenience index; `pages` owns placement.

Layout controls in `settings` override hydrated legacy top-level layout values.
`backendSettings` retains options that have no editor control. Estimate portal
flags preserve explicit false values, and margins preserve zero values.

The platform persistence tests exercise both application imports against this
shared contract. Both applications explicitly include this directory in their
Tailwind sources so shared components receive production styling.

The canvas document model, inline editors, tables, document block rendering, and
HTML compiler are shared too. Application `DocumentBlock` adapters inject tenant
image/clause access; the platform adapter has no tenant access. Document surfaces
use the saved font and margins explicitly, independent of dashboard typography.

`data-template-document` marks authored content. Dashboard table, button, and dark
theme overrides exclude this boundary so they cannot recolor cloned documents.
