// Shared DOMPurify profiles for preview and export surfaces.
(function (window) {
  const PREVIEW_TAGS = [
    'mjx-container',
    'svg',
    'line',
    'path',
    'g',
    'circle',
    'rect',
    'mark',
    'abbr',
  ];

  const PREVIEW_ATTRS = [
    'id',
    'class',
    'style',
    'viewBox',
    'xmlns',
    'width',
    'height',
    'stroke',
    'stroke-width',
    'stroke-linecap',
    'fill',
    'x1',
    'y1',
    'x2',
    'y2',
    'd',
    'aria-hidden',
    'focusable',
    'aria-pressed',
    'aria-label',
    'title',
    'tabindex',
    'role',
    'type',
    'data-marktide-tip',
    'data-code-id',
    'data-mermaid-source',
  ];

  const HTML_EXPORT_TAGS = PREVIEW_TAGS.concat([
    'marker',
    'defs',
    'pattern',
    'clipPath',
  ]);

  const HTML_EXPORT_ATTRS = PREVIEW_ATTRS.concat([
    'transform',
    'marker-end',
    'marker-start',
  ]);

  const PRINT_TAGS = [
    'mjx-container',
    'svg',
    'path',
    'g',
    'marker',
    'defs',
    'pattern',
    'clipPath',
    'wbr',
    'mark',
    'abbr',
  ];

  const PRINT_ATTRS = [
    'id',
    'class',
    'style',
    'viewBox',
    'd',
    'fill',
    'stroke',
    'transform',
    'marker-end',
    'marker-start',
    'title',
  ];

  function unique(values) {
    return Array.from(new Set(values));
  }

  function createConfig(options) {
    const mode = (options && options.mode) || 'preview';

    if (mode === 'print') {
      return {
        ADD_TAGS: PRINT_TAGS.slice(),
        ADD_ATTR: PRINT_ATTRS.slice(),
      };
    }

    if (mode === 'html') {
      return {
        ADD_TAGS: unique(HTML_EXPORT_TAGS),
        ADD_ATTR: unique(HTML_EXPORT_ATTRS),
      };
    }

    return {
      ADD_TAGS: PREVIEW_TAGS.slice(),
      ADD_ATTR: PREVIEW_ATTRS.slice(),
    };
  }

  function sanitize(html, options) {
    return DOMPurify.sanitize(html, createConfig(options));
  }

  window.MarkTideSanitizer = {
    createConfig,
    sanitize,
  };
})(window);
