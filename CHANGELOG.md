# Changelog

## [v1.8.0] - 2026-06-10 - Stronger editor and PDF exports

MarkTide now has a stronger editor, cleaner previews, and more reliable PDF exports.

### Added

- Added a Monaco-powered editor experience with improved input handling, layout behavior, and shortcut support.
- Added a visible app version badge so users can quickly see the current MarkTide version.
- Added a What's New modal to announce major version updates inside the app.
- Added wrap and unwrap controls for overflowing preview code blocks.
- Added hover and focus hints for code block actions.
- Added code wrap, unwrap, and action hints to exported HTML files.
- Added support for decimal-outline and tab-indented nested lists.

### Changed

- Rebranded the app as MarkTide Code Editor & Viewer and refreshed the footer year.
- Improved the dark and light theme experience with a smoother radial reveal transition.
- Reworked the mobile navigation into a hamburger panel for smaller screens.
- Improved preview-only, editor-only, and split-view layout stability.
- Improved editor behavior by routing more editing actions through the Monaco pipeline.
- Improved Markdown list handling so preview, export, and print output stay more consistent.
- Improved loading behavior so the app waits for readiness before showing the full interface.
- Updated the What's New content and app version references for v1.8.0.

### Fixed

- Fixed editor-only clipping when the toolbar is hidden on small screens.
- Fixed Monaco layout and wrap behavior in editor-only mode.
- Fixed Ctrl+Shift+Arrow line movement in the Monaco editor.
- Fixed browser undo and redo conflicts with editor undo and redo behavior.
- Fixed Firefox preview scrollbar behavior so it better matches the split-view experience.
- Fixed mobile menu spacing, footer overlap, close behavior, and export layering issues.
- Fixed code block scrollbar styling so scrollbars appear only where expected.
- Fixed the textarea fallback alignment toggle.
- Fixed long Markdown table values in PDF export so URLs, file paths, hashes, and tokens wrap cleanly.
- Fixed PDF table columns being crushed when nearby columns contain long descriptions.
- Fixed large PDF tables creating unnecessary blank pages.
- Fixed PDF export margins so printed documents have more usable space.

## [v1.7.0] - 2025-08-03 - Bug and UX polish

MarkTide shipped a refreshed visual style, cleaner exports, and better mobile behavior.

### Added

- Added the Grok-inspired dark theme with black backgrounds and high-contrast text.
- Added frosted glass effects for interactive hover states and the toolbar.
- Added Google Fonts integration with Inter for text and Fira Code for code blocks.
- Added richer SEO metadata with a Schema.org WebApplication snippet.
- Added dynamic tooltips that show whether view buttons will hide or show content.
- Added a theme-aware loading screen that respects the user's theme preference earlier.
- Added mobile menu styling that better matches the desktop controls.
- Added a heartbeat animation to the footer heart icon.

### Changed

- Reworked the color palette around black, white, and dark gray styling.
- Increased bold text weight in dark mode for stronger contrast.
- Updated code block spacing for cleaner preview and export output.
- Improved list styling with circle bullets and decimal-style nested numbering.
- Synchronized HTML export styling with the live preview.
- Redesigned buttons with stronger geometric styling and white borders.
- Centered preview content with a page-like maximum width.

### Removed

- Removed unused SEO files that were no longer needed.
- Removed stray console logging and redundant CSS rules.
- Removed duplicate OpenGraph and Twitter card meta tags.

### Fixed

- Fixed a critical scroll issue caused by rapidly toggling editor and preview views.
- Fixed mobile editor height so the editor no longer appears as only a few lines.
- Fixed confusing view toggle logic by simplifying how the buttons behave.
- Fixed theme flash during loading before dark mode is applied.
- Fixed PDF export text wrapping and code block formatting consistency.
- Fixed view control button contrast in light mode.

## [v1.6.0] - 2025-06-15 - Feature and UX polish

MarkTide improved formatting controls, shortcuts, exports, and mobile editing.

### Added

- Added underline and text alignment formatting buttons.
- Added keyboard shortcuts for line deletion, line movement, bold, italic, undo, redo, indent, and outdent.
- Added a smoother loading wrapper to reduce initial load stutter.

### Changed

- Replaced the old export and import toolbar buttons with formatting controls.
- Improved heading buttons so they replace existing heading levels instead of stacking markers.
- Improved toolbar sizing across desktop breakpoints to reduce overflow.
- Improved PDF table styling with smaller font size and clearer cell padding.
- Improved code block spacing for tighter preview and export output.
- Improved HTML export styling so it better matches PDF output.
- Cleaned up unused editor, theme, scroll sync, and helper code.

### Removed

- Removed the old custom line-numbering gutter because it could desync from content.
- Removed the unused CodeMirror editor implementation.

### Fixed

- Fixed Mermaid diagram alignment in HTML and PDF exports.
- Fixed bold, italic, and underline controls so they behave more like word processor toggles.
- Fixed triple-click selection cleanup so trailing whitespace is trimmed.
- Fixed clipboard copy so only selected text is copied.
- Fixed hamburger menu behavior so the panel closes when clicking outside it.

## [v1.0.0] - 2025-05-26 - Initial public release

MarkTide launched as a browser-based Markdown editor and viewer.

### Added

- Added the first Markdown editor and live preview experience.
- Added support for Markdown formatting, code blocks, Mermaid diagrams, and math expressions.
- Added import and export foundations for working with Markdown content.
- Added the first app styling, images, README, and browser entry page.
- Added the open-source project license.

[v1.8.0]: https://github.com/zigzag-007/MarkTide-Viewer/compare/v1.7.0...v1.8.0
[v1.7.0]: https://github.com/zigzag-007/MarkTide-Viewer/compare/v1.6.0...v1.7.0
[v1.6.0]: https://github.com/zigzag-007/MarkTide-Viewer/compare/v1.0.0...v1.6.0
[v1.0.0]: https://github.com/zigzag-007/MarkTide-Viewer/releases/tag/v1.0.0
