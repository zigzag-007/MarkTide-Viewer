// Shared Mermaid rendering and export helpers

(function (global) {
  function createMermaidShared(targetWindow) {
    const win = targetWindow || global;
    const doc = win.document || document;
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const constants = {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      fontSize: '16px',
      labelFontWeight: '700',
      exportLabelFontWeight: '300',
      edgeLabelBackground: '#e8f5e8',
      edgeLabelTextColor: '#24292e',
      nodeBorderColor: '#24292e',
      exportBackground: '#ffffff',
      exportPadding: 32
    };

    function parseSvgNumber(value) {
      const number = Number.parseFloat(value);
      return Number.isFinite(number) ? number : 0;
    }

    function setImportantStyle(element, property, value) {
      if (!element || !element.style) return;
      element.style.setProperty(property, value, 'important');
    }

    function getStyleValue(element, property) {
      if (!element || !element.style) return '';
      return element.style.getPropertyValue(property) || '';
    }

    function getDiagramFontFamily() {
      return constants.fontFamily;
    }

    function getThemeVariables() {
      return {
        fontFamily: constants.fontFamily
      };
    }

    function getMermaidConfig(options) {
      const opts = options || {};
      const mode = opts.mode || 'preview';
      const htmlLabels = mode !== 'pdf';

      return {
        startOnLoad: false,
        theme: mode === 'pdf' ? 'neutral' : 'default',
        themeVariables: getThemeVariables(),
        securityLevel: 'loose',
        htmlLabels: htmlLabels,
        flowchart: {
          useMaxWidth: mode !== 'export',
          htmlLabels: htmlLabels,
          curve: 'basis',
          nodeSpacing: 60,
          rankSpacing: 70
        },
        fontSize: 16
      };
    }

    function getReadableTextColor(fill) {
      if (!fill || fill === 'none' || fill.startsWith('url(')) {
        return null;
      }

      const namedColors = {
        black: '#000000',
        white: '#ffffff',
        red: '#ff0000',
        orange: '#ffa500',
        yellow: '#ffff00',
        green: '#008000',
        blue: '#0000ff',
        purple: '#800080',
        gray: '#808080',
        grey: '#808080'
      };

      let color = fill.trim().toLowerCase();
      color = namedColors[color] || color;

      let red;
      let green;
      let blue;

      const hexMatch = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
      if (hexMatch) {
        let hex = hexMatch[1];
        if (hex.length === 3) {
          hex = hex.split('').map((part) => part + part).join('');
        }
        red = parseInt(hex.slice(0, 2), 16);
        green = parseInt(hex.slice(2, 4), 16);
        blue = parseInt(hex.slice(4, 6), 16);
      } else {
        const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
        if (!rgbMatch) {
          return null;
        }
        red = Number(rgbMatch[1]);
        green = Number(rgbMatch[2]);
        blue = Number(rgbMatch[3]);
      }

      const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
      return luminance < 0.48 ? '#ffffff' : constants.edgeLabelTextColor;
    }

    function getNodeFill(shape) {
      const computedFill = win.getComputedStyle ? win.getComputedStyle(shape).fill : '';
      return computedFill || shape.getAttribute('fill') || shape.style.fill;
    }

    function setSolidEdgeLabelBackground(rect, important) {
      rect.setAttribute('fill', constants.edgeLabelBackground);
      rect.setAttribute('fill-opacity', '1');
      rect.setAttribute('opacity', '1');
      rect.setAttribute('stroke', 'none');

      if (important) {
        setImportantStyle(rect, 'fill', constants.edgeLabelBackground);
        setImportantStyle(rect, 'fill-opacity', '1');
        setImportantStyle(rect, 'opacity', '1');
        setImportantStyle(rect, 'stroke', 'none');
      } else {
        rect.style.setProperty('fill', constants.edgeLabelBackground);
        rect.style.setProperty('fill-opacity', '1');
        rect.style.setProperty('opacity', '1');
        rect.style.setProperty('stroke', 'none');
      }
    }

    function applyLabelColor(element, color) {
      if (element.setAttribute) {
        element.setAttribute('fill', color);
      }

      setImportantStyle(element, 'color', color);
      setImportantStyle(element, 'fill', color);
    }

    function applyLabelTypography(element, color) {
      setImportantStyle(element, 'font-family', constants.fontFamily);
      setImportantStyle(element, 'font-size', constants.fontSize);
      setImportantStyle(element, 'font-weight', constants.labelFontWeight);
      applyLabelColor(element, color);
    }

    function getOriginalForeignObjectNumber(foreignObject, key, attribute) {
      const dataAttribute = `data-marktide-${key}-original-${attribute}`;
      if (!foreignObject.hasAttribute(dataAttribute)) {
        foreignObject.setAttribute(dataAttribute, foreignObject.getAttribute(attribute) || '0');
      }

      return parseSvgNumber(foreignObject.getAttribute(dataAttribute));
    }

    function normalizeForeignObjectBox(foreignObject, key, paddingX, paddingY) {
      const width = getOriginalForeignObjectNumber(foreignObject, key, 'width');
      const height = getOriginalForeignObjectNumber(foreignObject, key, 'height');
      const x = getOriginalForeignObjectNumber(foreignObject, key, 'x');
      const y = getOriginalForeignObjectNumber(foreignObject, key, 'y');

      if (width > 0) {
        foreignObject.setAttribute('x', String(x - paddingX));
        foreignObject.setAttribute('width', String(width + paddingX * 2));
      }
      if (height > 0) {
        foreignObject.setAttribute('y', String(y - paddingY));
        foreignObject.setAttribute('height', String(height + paddingY * 2));
      }
      setImportantStyle(foreignObject, 'overflow', 'visible');
    }

    function normalizeNodeForeignObject(foreignObject) {
      normalizeForeignObjectBox(foreignObject, 'node', 4, 2);
    }

    function improveNodeLabelContrast(root) {
      root.querySelectorAll('.mermaid svg').forEach((svg) => {
        svg.querySelectorAll('g.node').forEach((node) => {
          const shape = node.querySelector('rect, polygon, circle, ellipse');
          if (!shape) return;

          const fill = getNodeFill(shape);
          const readableColor = getReadableTextColor(fill);
          if (!readableColor) return;

          shape.setAttribute('stroke', constants.nodeBorderColor);
          shape.setAttribute('stroke-width', '1');
          setImportantStyle(shape, 'stroke', constants.nodeBorderColor);
          setImportantStyle(shape, 'stroke-width', '1px');

          node.querySelectorAll('foreignObject').forEach(normalizeNodeForeignObject);
          node.querySelectorAll('text, tspan, .nodeLabel, .label, foreignObject div, foreignObject span, foreignObject p').forEach((label) => {
            applyLabelTypography(label, readableColor);
          });
        });
      });
    }

    function normalizeEdgeLabelForeignObject(foreignObject) {
      normalizeForeignObjectBox(foreignObject, 'edge', 4, 2);
    }

    function styleEdgeLabelPart(labelPart) {
      setImportantStyle(labelPart, 'display', 'inline-block');
      setImportantStyle(labelPart, 'padding', '0 2px');
      setImportantStyle(labelPart, 'line-height', '1.25');
      setImportantStyle(labelPart, 'background-color', constants.edgeLabelBackground);
      setImportantStyle(labelPart, 'color', constants.edgeLabelTextColor);
      setImportantStyle(labelPart, 'fill', constants.edgeLabelTextColor);
      setImportantStyle(labelPart, 'font-family', constants.fontFamily);
      setImportantStyle(labelPart, 'font-size', constants.fontSize);
      setImportantStyle(labelPart, 'font-weight', constants.labelFontWeight);
      setImportantStyle(labelPart, 'box-decoration-break', 'clone');
      setImportantStyle(labelPart, '-webkit-box-decoration-break', 'clone');
    }

    function styleEdgeSvgTextPartWithWeight(textPart, fontWeight) {
      textPart.setAttribute('font-family', constants.fontFamily);
      textPart.setAttribute('font-size', constants.fontSize);
      textPart.setAttribute('font-weight', fontWeight);
      setImportantStyle(textPart, 'font-family', constants.fontFamily);
      setImportantStyle(textPart, 'font-size', constants.fontSize);
      setImportantStyle(textPart, 'font-weight', fontWeight);
      applyLabelColor(textPart, constants.edgeLabelTextColor);
    }

    function styleEdgeSvgTextPart(textPart) {
      styleEdgeSvgTextPartWithWeight(textPart, constants.labelFontWeight);
    }

    function removeDefaultEdgeLabelBackgrounds(edgeLabel) {
      edgeLabel.querySelectorAll('rect:not(.marktide-edge-label-bg):not(.marktide-edge-label-halo)').forEach((rect) => {
        rect.remove();
      });
    }

    function addSvgEdgeTextBackground(edgeLabel, options) {
      const opts = options || {};
      const fontWeight = opts.fontWeight || constants.labelFontWeight;
      const label = edgeLabel.querySelector('.label') || edgeLabel;
      const text = label.querySelector('text');
      if (!text || typeof text.getBBox !== 'function') return;

      try {
        const box = text.getBBox();
        if (box.width <= 0 || box.height <= 0) return;

        label.querySelectorAll('.marktide-edge-label-bg, .marktide-edge-label-halo').forEach((element) => element.remove());

        const background = doc.createElementNS(svgNamespace, 'rect');
        background.classList.add('marktide-edge-label-bg');
        background.setAttribute('x', String(box.x - 3));
        background.setAttribute('y', String(box.y - 2));
        background.setAttribute('width', String(box.width + 6));
        background.setAttribute('height', String(box.height + 4));
        setSolidEdgeLabelBackground(background, true);
        (text.parentNode || label).insertBefore(background, text);

        text.querySelectorAll('tspan').forEach((tspan) => styleEdgeSvgTextPartWithWeight(tspan, fontWeight));
        styleEdgeSvgTextPartWithWeight(text, fontWeight);
      } catch (e) {
        if (win.console && win.console.warn) {
          win.console.warn('Mermaid edge label background failed:', e);
        }
      }
    }

    function stabilizeEdgeLabels(root) {
      root.querySelectorAll('.mermaid svg').forEach((svg) => {
        svg.querySelectorAll('.edgeLabel').forEach((edgeLabel) => {
          const labelText = (edgeLabel.textContent || '').trim();
          if (!labelText) return;

          setImportantStyle(edgeLabel, 'color', constants.edgeLabelTextColor);
          setImportantStyle(edgeLabel, 'fill', constants.edgeLabelTextColor);
          setImportantStyle(edgeLabel, 'font-family', constants.fontFamily);
          setImportantStyle(edgeLabel, 'font-weight', constants.labelFontWeight);

          removeDefaultEdgeLabelBackgrounds(edgeLabel);
          edgeLabel.querySelectorAll('foreignObject').forEach(normalizeEdgeLabelForeignObject);
          edgeLabel.querySelectorAll('foreignObject div, foreignObject span, foreignObject p').forEach(styleEdgeLabelPart);
          edgeLabel.querySelectorAll('.marktide-edge-label-bg').forEach((rect) => {
            setSolidEdgeLabelBackground(rect, true);
          });
          edgeLabel.querySelectorAll('text, tspan').forEach(styleEdgeSvgTextPart);

          addSvgEdgeTextBackground(edgeLabel);

          if (edgeLabel.parentNode) {
            edgeLabel.parentNode.appendChild(edgeLabel);
          }
        });
      });
    }

    function stabilizeSvgDimensions(svg) {
      const viewBox = svg.getAttribute('viewBox');
      if (!viewBox) return;

      const dimensions = viewBox.trim().split(/\s+/).map(Number);
      const width = dimensions[2];
      const height = dimensions[3];
      if (!Number.isFinite(width) || !Number.isFinite(height)) return;

      svg.setAttribute('width', Math.ceil(width).toString());
      svg.setAttribute('height', Math.ceil(height).toString());
      svg.style.display = 'block';
      svg.style.maxWidth = '100%';
      svg.style.height = 'auto';
      svg.style.margin = '0 auto';
    }

    function stabilizeMermaidDiagrams(root, options) {
      const container = root || doc;
      const opts = options || {};
      improveNodeLabelContrast(container);
      stabilizeEdgeLabels(container);

      if (opts.stabilizeDimensions) {
        container.querySelectorAll('.mermaid svg').forEach(stabilizeSvgDimensions);
      }
    }

    function inlineComputedStyles(sourceRoot, cloneRoot) {
      const sourceElements = [sourceRoot, ...sourceRoot.querySelectorAll('*')];
      const cloneElements = [cloneRoot, ...cloneRoot.querySelectorAll('*')];
      const styleProperties = [
        'fill',
        'stroke',
        'stroke-width',
        'stroke-dasharray',
        'stroke-linecap',
        'stroke-linejoin',
        'font-family',
        'font-size',
        'font-weight',
        'font-style',
        'color',
        'opacity',
        'text-anchor',
        'dominant-baseline',
        'paint-order'
      ];

      sourceElements.forEach((sourceElement, index) => {
        const cloneElement = cloneElements[index];
        if (!cloneElement || cloneElement.tagName.toLowerCase() === 'style') return;

        const computedStyle = win.getComputedStyle(sourceElement);
        styleProperties.forEach((property) => {
          const value = computedStyle.getPropertyValue(property);
          if (value) {
            cloneElement.style.setProperty(property, value);
          }
        });
      });
    }

    function replaceForeignObjectLabels(svg) {
      svg.querySelectorAll('foreignObject').forEach((foreignObject) => {
        const text = (foreignObject.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) {
          foreignObject.remove();
          return;
        }

        const width = parseSvgNumber(foreignObject.getAttribute('width'));
        const height = parseSvgNumber(foreignObject.getAttribute('height'));
        const x = parseSvgNumber(foreignObject.getAttribute('x')) + width / 2;
        const y = parseSvgNumber(foreignObject.getAttribute('y')) + height / 2;
        const isEdgeLabel = Boolean(foreignObject.closest('.edgeLabel'));
        const labelElement = foreignObject.querySelector('p, span, div') || foreignObject;
        const fontFamily = getStyleValue(labelElement, 'font-family') || constants.fontFamily;
        const fontSize = getStyleValue(labelElement, 'font-size') || constants.fontSize;
        const fontWeight = constants.exportLabelFontWeight;
        const textColor = getStyleValue(labelElement, 'fill')
          || getStyleValue(labelElement, 'color')
          || labelElement.getAttribute('fill')
          || labelElement.getAttribute('color')
          || constants.edgeLabelTextColor;
        const labelGroup = doc.createElementNS(svgNamespace, 'g');
        const textElement = doc.createElementNS(svgNamespace, 'text');

        textElement.setAttribute('x', String(x));
        textElement.setAttribute('y', String(y));
        textElement.setAttribute('text-anchor', 'middle');
        textElement.setAttribute('dominant-baseline', 'middle');
        textElement.setAttribute('fill', textColor);
        textElement.textContent = text;
        textElement.style.setProperty('font-family', fontFamily);
        textElement.style.setProperty('font-size', fontSize);
        textElement.style.setProperty('font-weight', fontWeight);
        textElement.style.setProperty('fill', textColor);

        if (isEdgeLabel) {
          const backgroundPaddingX = 4;
          const backgroundPaddingY = 2;
          const background = doc.createElementNS(svgNamespace, 'rect');

          background.classList.add('marktide-edge-label-bg');
          background.setAttribute('x', String(parseSvgNumber(foreignObject.getAttribute('x')) - backgroundPaddingX));
          background.setAttribute('y', String(parseSvgNumber(foreignObject.getAttribute('y')) - backgroundPaddingY));
          background.setAttribute('width', String(width + backgroundPaddingX * 2));
          background.setAttribute('height', String(height + backgroundPaddingY * 2));
          setSolidEdgeLabelBackground(background);

          labelGroup.appendChild(background);
        }

        labelGroup.appendChild(textElement);
        foreignObject.replaceWith(labelGroup);
      });

      if (svg.querySelector('foreignObject')) {
        throw new Error('SVG export still contains HTML labels');
      }
    }

    function prepareEdgeLabelsForExport(svg) {
      svg.querySelectorAll('.edgeLabel').forEach((edgeLabel) => {
        const labelText = (edgeLabel.textContent || '').trim();
        if (!labelText) return;

        setImportantStyle(edgeLabel, 'color', constants.edgeLabelTextColor);
        setImportantStyle(edgeLabel, 'fill', constants.edgeLabelTextColor);
        setImportantStyle(edgeLabel, 'font-family', constants.fontFamily);
        setImportantStyle(edgeLabel, 'font-weight', constants.exportLabelFontWeight);

        removeDefaultEdgeLabelBackgrounds(edgeLabel);
        edgeLabel.querySelectorAll('.marktide-edge-label-bg').forEach((rect) => {
          setSolidEdgeLabelBackground(rect, true);
        });
        edgeLabel.querySelectorAll('text, tspan').forEach((textPart) => {
          styleEdgeSvgTextPartWithWeight(textPart, constants.exportLabelFontWeight);
        });

        addSvgEdgeTextBackground(edgeLabel, { fontWeight: constants.exportLabelFontWeight });

        if (edgeLabel.parentNode) {
          edgeLabel.parentNode.appendChild(edgeLabel);
        }
      });
    }

    function padSvgForExport(svg, width, height) {
      const padding = constants.exportPadding;
      const viewBox = svg.getAttribute('viewBox');
      const box = viewBox ? viewBox.trim().split(/\s+/).map(Number) : [];
      const minX = Number.isFinite(box[0]) ? box[0] : 0;
      const minY = Number.isFinite(box[1]) ? box[1] : 0;
      const paddedWidth = width + padding * 2;
      const paddedHeight = height + padding * 2;

      svg.setAttribute('viewBox', `${minX - padding} ${minY - padding} ${paddedWidth} ${paddedHeight}`);
      svg.setAttribute('width', String(paddedWidth));
      svg.setAttribute('height', String(paddedHeight));
    }

    function measureExportClone(svg, callback) {
      if (!doc.body) {
        callback();
        return;
      }

      const host = doc.createElement('div');
      host.style.position = 'absolute';
      host.style.left = '-10000px';
      host.style.top = '-10000px';
      host.style.visibility = 'hidden';
      host.style.pointerEvents = 'none';
      host.style.width = '0';
      host.style.height = '0';
      host.style.overflow = 'visible';

      doc.body.appendChild(host);
      host.appendChild(svg);

      try {
        callback();
      } finally {
        if (host.parentNode) {
          host.parentNode.removeChild(host);
        }
      }
    }

    function prepareSvgClone(svg) {
      const clone = svg.cloneNode(true);
      const viewBox = svg.getAttribute('viewBox');
      const box = viewBox ? viewBox.split(/\s+/).map(Number) : [];
      const rect = svg.getBoundingClientRect ? svg.getBoundingClientRect() : { width: 0, height: 0 };
      const width = Math.ceil(box[2] || rect.width || svg.clientWidth || 1200);
      const height = Math.ceil(box[3] || rect.height || svg.clientHeight || 800);

      clone.setAttribute('xmlns', svgNamespace);
      clone.setAttribute('width', String(width));
      clone.setAttribute('height', String(height));
      if (!clone.getAttribute('viewBox')) {
        clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
      }

      inlineComputedStyles(svg, clone);
      replaceForeignObjectLabels(clone);
      measureExportClone(clone, () => prepareEdgeLabelsForExport(clone));
      padSvgForExport(clone, width, height);

      const background = doc.createElementNS(svgNamespace, 'rect');
      const paddedViewBox = clone.getAttribute('viewBox').trim().split(/\s+/).map(Number);
      const backgroundX = Number.isFinite(paddedViewBox[0]) ? paddedViewBox[0] : -constants.exportPadding;
      const backgroundY = Number.isFinite(paddedViewBox[1]) ? paddedViewBox[1] : -constants.exportPadding;

      background.setAttribute('x', String(backgroundX));
      background.setAttribute('y', String(backgroundY));
      background.setAttribute('width', String(width + constants.exportPadding * 2));
      background.setAttribute('height', String(height + constants.exportPadding * 2));
      background.setAttribute('fill', constants.exportBackground);
      clone.insertBefore(background, clone.firstChild);

      return clone;
    }

    return {
      constants,
      getDiagramFontFamily,
      getThemeVariables,
      getMermaidConfig,
      getReadableTextColor,
      setSolidEdgeLabelBackground,
      stabilizeMermaidDiagrams,
      prepareSvgClone,
      replaceForeignObjectLabels,
      inlineComputedStyles,
      parseSvgNumber
    };
  }

  global.MarkTideCreateMermaidShared = createMermaidShared;
  global.MarkTideMermaidShared = createMermaidShared(global);
})(window);
