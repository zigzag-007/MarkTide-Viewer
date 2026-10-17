// Shared DOMPurify profiles for preview and export surfaces.
(function (window) {
  const SAFE_STYLE_PROPERTIES = new Set([
    '-webkit-background-clip',
    '-webkit-text-fill-color',
    'background',
    'background-color',
    'border',
    'border-bottom',
    'border-bottom-color',
    'border-bottom-style',
    'border-bottom-width',
    'border-collapse',
    'border-color',
    'border-left',
    'border-left-color',
    'border-left-style',
    'border-left-width',
    'border-radius',
    'border-right',
    'border-right-color',
    'border-right-style',
    'border-right-width',
    'border-spacing',
    'border-style',
    'border-top',
    'border-top-color',
    'border-top-style',
    'border-top-width',
    'border-width',
    'break-after',
    'break-before',
    'break-inside',
    'color',
    'display',
    'font-family',
    'font-size',
    'font-style',
    'font-weight',
    'height',
    'letter-spacing',
    'line-height',
    'margin',
    'margin-bottom',
    'margin-left',
    'margin-right',
    'margin-top',
    'max-height',
    'max-width',
    'min-height',
    'min-width',
    'opacity',
    'padding',
    'padding-bottom',
    'padding-left',
    'padding-right',
    'padding-top',
    'page-break-after',
    'page-break-before',
    'page-break-inside',
    'text-align',
    'text-decoration',
    'text-decoration-color',
    'text-decoration-line',
    'text-decoration-style',
    'text-decoration-thickness',
    'vertical-align',
    'white-space',
    'width',
  ]);
  const DIMENSION_PROPERTIES = new Set([
    'height',
    'max-height',
    'max-width',
    'min-height',
    'min-width',
    'width',
  ]);
  const SPACING_PROPERTIES = new Set([
    'margin',
    'margin-bottom',
    'margin-left',
    'margin-right',
    'margin-top',
    'padding',
    'padding-bottom',
    'padding-left',
    'padding-right',
    'padding-top',
  ]);
  const SAFE_DISPLAY_VALUES = new Set(['none', 'inline', 'inline-block', 'block']);
  const FORBIDDEN_TAGS = ['style'];
  const CSS_LENGTH_UNIT_TO_PX = {
    px: 1,
    pt: 96 / 72,
    pc: 16,
    in: 96,
    cm: 96 / 2.54,
    mm: 96 / 25.4,
    q: 96 / 101.6,
    rem: 16,
    em: 16,
    ex: 8,
    ch: 8,
  };
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

  const PDF_TAGS = [
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

  const PDF_ATTRS = [
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

  function getLengthLimit(property) {
    if (DIMENSION_PROPERTIES.has(property)) return 8192;
    if (SPACING_PROPERTIES.has(property)) return 1024;
    if (property === 'font-size' || property === 'line-height') return 512;
    if (property === 'letter-spacing' || property === 'text-decoration-thickness') return 128;
    if (property === 'border' || /^border-(?:top|right|bottom|left|width)$/.test(property)) return 512;
    return 0;
  }

  function hasOversizedLength(value, maxPixels) {
    const lengthPattern = /(-?\d*\.?\d+(?:e[+-]?\d+)?)\s*(px|pt|pc|in|cm|mm|q|rem|em|ex|ch|%)\b/gi;
    let match;

    while ((match = lengthPattern.exec(value))) {
      const amount = Math.abs(Number(match[1]));
      const unit = match[2].toLowerCase();
      if (!Number.isFinite(amount)) return true;
      if (unit === '%' && amount > 1000) return true;
      if (unit !== '%' && amount * CSS_LENGTH_UNIT_TO_PX[unit] > maxPixels) return true;
    }

    return false;
  }

  function isSafeStyleValue(property, value) {
    const normalized = String(value || '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim()
      .toLowerCase();

    if (!normalized) return false;
    if (/(?:expression|url|image-set|cross-fade|element|var)\s*\(/i.test(normalized)) return false;
    if (/(?:javascript|vbscript|data|file|https?)\s*:/i.test(normalized)) return false;
    if (/(?:^|[^:])\/\//.test(normalized)) return false;
    if (DIMENSION_PROPERTIES.has(property) && /(?:^|[\s(])[-+]?\d*\.?\d+(?:d?v[wh]|vmin|vmax)\b/i.test(normalized)) {
      return false;
    }
    if (SPACING_PROPERTIES.has(property) && /(?:^|[\s(,])-\d/.test(normalized)) return false;
    if (property === 'display' && !SAFE_DISPLAY_VALUES.has(normalized)) return false;
    const lengthLimit = getLengthLimit(property);
    if (lengthLimit && hasOversizedLength(normalized, lengthLimit)) return false;

    return true;
  }

  function filterInlineStyle(node, data) {
    if (String(data.attrName || '').toLowerCase() !== 'style') return;

    const style = node && node.style;
    if (!style) {
      data.keepAttr = false;
      return;
    }

    const safeDeclarations = [];
    for (let index = 0; index < style.length; index += 1) {
      const property = String(style.item(index) || '').toLowerCase();
      const value = style.getPropertyValue(property).trim();
      if (!SAFE_STYLE_PROPERTIES.has(property) || !isSafeStyleValue(property, value)) continue;

      const priority = style.getPropertyPriority(property) === 'important' ? ' !important' : '';
      safeDeclarations.push(`${property}:${value}${priority}`);
    }

    if (!safeDeclarations.length) {
      data.keepAttr = false;
      data.attrValue = '';
      return;
    }

    data.attrValue = safeDeclarations.join(';');
  }

  DOMPurify.addHook('uponSanitizeAttribute', filterInlineStyle);

  function createConfig(options) {
    const mode = (options && options.mode) || 'preview';

    if (mode === 'pdf') {
      return {
        ADD_TAGS: PDF_TAGS.slice(),
        ADD_ATTR: PDF_ATTRS.slice(),
        FORBID_TAGS: FORBIDDEN_TAGS.slice(),
      };
    }

    if (mode === 'html') {
      return {
        ADD_TAGS: unique(HTML_EXPORT_TAGS),
        ADD_ATTR: unique(HTML_EXPORT_ATTRS),
        FORBID_TAGS: FORBIDDEN_TAGS.slice(),
      };
    }

    return {
      ADD_TAGS: PREVIEW_TAGS.slice(),
      ADD_ATTR: PREVIEW_ATTRS.slice(),
      FORBID_TAGS: FORBIDDEN_TAGS.slice(),
    };
  }

  function sanitize(html, options) {
    return DOMPurify.sanitize(html, createConfig(options));
  }

  window.MarkTideSanitizer = {
    sanitize,
  };
})(window);
