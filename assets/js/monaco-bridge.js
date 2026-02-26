// Monaco editor bridge: provides textarea-like API on #markdown-editor
(function initMarkTideMonacoBridge() {
  const host = document.getElementById("markdown-editor");
  if (!host) return;

  let monacoEditor = null;
  let monacoModel = null;
  let fallbackValue = "";
  let fallbackSelectionStart = 0;
  let fallbackSelectionEnd = 0;
  let resizeObserver = null;
  const nativeScrollTopDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollTop")
    || Object.getOwnPropertyDescriptor(Element.prototype, "scrollTop");
  const nativeScrollHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight")
    || Object.getOwnPropertyDescriptor(Element.prototype, "scrollHeight");
  const nativeClientHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight")
    || Object.getOwnPropertyDescriptor(Element.prototype, "clientHeight");

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const getModel = () => monacoModel || (monacoEditor ? monacoEditor.getModel() : null);

  const offsetToPosition = (offset) => {
    const model = getModel();
    if (!model) return { lineNumber: 1, column: 1 };
    const safeOffset = clamp(offset, 0, model.getValueLength());
    return model.getPositionAt(safeOffset);
  };

  const positionToOffset = (position) => {
    const model = getModel();
    if (!model || !position) return 0;
    return model.getOffsetAt(position);
  };

  const getSelectionOffsets = () => {
    if (!monacoEditor) {
      return [fallbackSelectionStart, fallbackSelectionEnd];
    }
    const selection = monacoEditor.getSelection();
    if (!selection) return [0, 0];

    const startOffset = positionToOffset(selection.getStartPosition());
    const endOffset = positionToOffset(selection.getEndPosition());
    return [startOffset, endOffset];
  };

  const setSelectionOffsets = (start, end) => {
    if (!monacoEditor) {
      fallbackSelectionStart = start;
      fallbackSelectionEnd = end;
      return;
    }

    const model = getModel();
    if (!model) return;
    const maxLen = model.getValueLength();
    const safeStart = clamp(start, 0, maxLen);
    const safeEnd = clamp(end, 0, maxLen);
    const startPos = offsetToPosition(safeStart);
    const endPos = offsetToPosition(safeEnd);

    monacoEditor.setSelection({
      startLineNumber: startPos.lineNumber,
      startColumn: startPos.column,
      endLineNumber: endPos.lineNumber,
      endColumn: endPos.column
    });
  };

  const defineBridgeProperty = (name, descriptor) => {
    Object.defineProperty(host, name, {
      configurable: true,
      enumerable: false,
      ...descriptor
    });
  };

  defineBridgeProperty("value", {
    get() {
      return monacoEditor ? monacoEditor.getValue() : fallbackValue;
    },
    set(nextValue) {
      const safe = typeof nextValue === "string" ? nextValue : String(nextValue ?? "");
      fallbackValue = safe;

      if (!monacoEditor) return;
      if (monacoEditor.getValue() === safe) return;
      monacoEditor.setValue(safe);
    }
  });

  defineBridgeProperty("selectionStart", {
    get() {
      return getSelectionOffsets()[0];
    },
    set(nextStart) {
      const currentEnd = getSelectionOffsets()[1];
      const safeStart = Number.isFinite(nextStart) ? nextStart : 0;
      setSelectionOffsets(safeStart, currentEnd);
    }
  });

  defineBridgeProperty("selectionEnd", {
    get() {
      return getSelectionOffsets()[1];
    },
    set(nextEnd) {
      const currentStart = getSelectionOffsets()[0];
      const safeEnd = Number.isFinite(nextEnd) ? nextEnd : currentStart;
      setSelectionOffsets(currentStart, safeEnd);
    }
  });

  defineBridgeProperty("scrollTop", {
    get() {
      if (monacoEditor) return monacoEditor.getScrollTop();
      if (nativeScrollTopDescriptor && nativeScrollTopDescriptor.get) {
        return nativeScrollTopDescriptor.get.call(host);
      }
      return 0;
    },
    set(nextTop) {
      if (monacoEditor) {
        monacoEditor.setScrollTop(Number(nextTop) || 0);
        return;
      }
      if (nativeScrollTopDescriptor && nativeScrollTopDescriptor.set) {
        nativeScrollTopDescriptor.set.call(host, Number(nextTop) || 0);
      }
    }
  });

  defineBridgeProperty("scrollHeight", {
    get() {
      if (monacoEditor) return monacoEditor.getScrollHeight();
      if (nativeScrollHeightDescriptor && nativeScrollHeightDescriptor.get) {
        return nativeScrollHeightDescriptor.get.call(host);
      }
      return 0;
    }
  });

  defineBridgeProperty("clientHeight", {
    get() {
      if (monacoEditor) return monacoEditor.getLayoutInfo().height;
      if (nativeClientHeightDescriptor && nativeClientHeightDescriptor.get) {
        return nativeClientHeightDescriptor.get.call(host);
      }
      return 0;
    }
  });

  host.setSelectionRange = (start, end) => {
    setSelectionOffsets(start, end);
  };

  const originalFocus = host.focus.bind(host);
  host.focus = () => {
    if (monacoEditor) {
      monacoEditor.focus();
      return;
    }
    originalFocus();
  };

  const getCssVar = (name, fallback) => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  };

  const defineMonacoThemeFromCss = () => {
    if (!window.monaco) return;

    const editorBg = getCssVar("--editor-bg", "#1a1a1a");
    const textColor = getCssVar("--text-color", "#ffffff");
    const accent = getCssVar("--accent-color", "#4fc3f7");
    const border = getCssVar("--border-color", "#30363d");

    window.monaco.editor.defineTheme("marktide-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": editorBg,
        "editor.foreground": textColor,
        "editorLineNumber.foreground": "#6e7681",
        "editorLineNumber.activeForeground": textColor,
        "editorCursor.foreground": accent,
        "editor.selectionBackground": "rgba(79,195,247,0.28)",
        "editor.inactiveSelectionBackground": "rgba(79,195,247,0.16)",
        "editor.selectionHighlightBackground": "rgba(79,195,247,0.2)",
        "editor.selectionHighlightBorder": "#00000000",
        "editor.wordHighlightBackground": "rgba(79,195,247,0.14)",
        "editor.wordHighlightStrongBackground": "rgba(79,195,247,0.2)",
        "editor.wordHighlightBorder": "#00000000",
        "editor.wordHighlightStrongBorder": "#00000000",
        "editor.findMatchBackground": "rgba(255,196,0,0.32)",
        "editor.findMatchHighlightBackground": "rgba(255,196,0,0.18)",
        "editor.lineHighlightBackground": "#00000000",
        "editorIndentGuide.background1": "rgba(255,255,255,0.08)",
        "editorIndentGuide.activeBackground1": "rgba(255,255,255,0.16)",
        "editorWidget.background": editorBg,
        "editorWidget.border": border,
        "scrollbarSlider.background": "rgba(79,195,247,0.35)",
        "scrollbarSlider.hoverBackground": "rgba(79,195,247,0.55)",
        "scrollbarSlider.activeBackground": "rgba(79,195,247,0.7)"
      }
    });

    window.monaco.editor.defineTheme("marktide-light", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": editorBg,
        "editor.foreground": textColor,
        "editorLineNumber.foreground": "#8a8f98",
        "editorLineNumber.activeForeground": textColor,
        "editorCursor.foreground": accent,
        "editor.selectionBackground": "rgba(79,195,247,0.28)",
        "editor.inactiveSelectionBackground": "rgba(79,195,247,0.14)",
        "editor.selectionHighlightBackground": "rgba(79,195,247,0.18)",
        "editor.selectionHighlightBorder": "#00000000",
        "editor.wordHighlightBackground": "rgba(79,195,247,0.12)",
        "editor.wordHighlightStrongBackground": "rgba(79,195,247,0.18)",
        "editor.wordHighlightBorder": "#00000000",
        "editor.wordHighlightStrongBorder": "#00000000",
        "editor.findMatchBackground": "rgba(255,196,0,0.28)",
        "editor.findMatchHighlightBackground": "rgba(255,196,0,0.16)",
        "editor.lineHighlightBackground": "#00000000",
        "editorIndentGuide.background1": "rgba(0,0,0,0.08)",
        "editorIndentGuide.activeBackground1": "rgba(0,0,0,0.14)",
        "editorWidget.background": editorBg,
        "editorWidget.border": border,
        "scrollbarSlider.background": "rgba(79,195,247,0.35)",
        "scrollbarSlider.hoverBackground": "rgba(79,195,247,0.52)",
        "scrollbarSlider.activeBackground": "rgba(79,195,247,0.66)"
      }
    });
  };

  const applyCurrentMonacoTheme = () => {
    if (!window.monaco) return;
    const active = document.documentElement.getAttribute("data-theme") === "light"
      ? "marktide-light"
      : "marktide-dark";
    window.monaco.editor.setTheme(active);
  };

  const startThemeSync = () => {
    const observer = new MutationObserver(() => {
      defineMonacoThemeFromCss();
      applyCurrentMonacoTheme();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "style"]
    });
  };

  const initMonaco = () => {
    if (!window.require || !host || host.dataset.monacoReady === "true") return;

    window.require.config({
      paths: {
        vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs"
      }
    });

    window.require(["vs/editor/editor.main"], () => {
      defineMonacoThemeFromCss();
      applyCurrentMonacoTheme();

      monacoEditor = window.monaco.editor.create(host, {
        value: fallbackValue,
        language: "markdown",
        automaticLayout: true,
        lineNumbers: "on",
        glyphMargin: false,
        folding: true,
        minimap: { enabled: false },
        scrollbar: {
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
          useShadows: false
        },
        scrollBeyondLastLine: false,
        fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", "Monaco", "Lucida Console", monospace',
        fontSize: 16,
        lineHeight: 24,
        padding: { top: 10, bottom: 50 },
        smoothScrolling: true,
        renderLineHighlight: "none",
        occurrencesHighlight: "off",
        selectionHighlight: false,
        wordWrap: "on",
        wrappingIndent: "same",
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        quickSuggestions: false,
        suggestOnTriggerCharacters: false,
        wordBasedSuggestions: "off",
        parameterHints: { enabled: false },
        inlineSuggest: { enabled: false },
        acceptSuggestionOnEnter: "off",
        tabCompletion: "off",
        snippetSuggestions: "none",
        lightbulb: { enabled: window.monaco.editor.ShowLightbulbIconMode.Off },
        multiCursorModifier: "ctrlCmd"
      });

      monacoModel = monacoEditor.getModel();
      host.dataset.monacoReady = "true";
      host.classList.add("monaco-host");

      // Force mouse-wheel to drive Monaco scrolling.
      // Capture phase is used so this still works even if inner Monaco nodes handle wheel first.
      host.addEventListener("wheel", (event) => {
        if (!monacoEditor) return;

        const deltaY = Number(event.deltaY) || 0;
        const deltaX = Number(event.deltaX) || 0;
        if (deltaY === 0 && deltaX === 0) return;
        const unit =
          event.deltaMode === 1 ? 16 :
          event.deltaMode === 2 ? window.innerHeight :
          1;
        const moveY = deltaY * unit;
        const moveX = deltaX * unit;

        event.preventDefault();
        monacoEditor.focus();

        if (moveY !== 0) {
          monacoEditor.setScrollTop(monacoEditor.getScrollTop() + moveY);
        }
        if (moveX !== 0) {
          monacoEditor.setScrollLeft(monacoEditor.getScrollLeft() + moveX);
        }
      }, { passive: false, capture: true });

      // Preserve fallback selection if core set it before Monaco loaded.
      setSelectionOffsets(fallbackSelectionStart, fallbackSelectionEnd);

      // Keep existing scroll-sync module behavior: it listens to #markdown-editor scroll events.
      monacoEditor.onDidScrollChange(() => {
        host.dispatchEvent(new Event("scroll"));
      });

      // Keep existing render pipeline behavior: it listens to #markdown-editor input events.
      monacoEditor.onDidChangeModelContent(() => {
        fallbackValue = monacoEditor.getValue();
        host.dispatchEvent(new Event("input"));
      });

      const LIST_INDENT = "    ";

      const parseListLine = (line) => {
        if (typeof line !== "string") return null;

        let m = line.match(/^(\s*)(\d+(?:\.\d+)+)\.?(?:\s+(.*))?$/);
        if (m) {
          return {
            type: "decimal",
            indent: m[1] || "",
            outline: m[2],
            text: m[3] || ""
          };
        }

        m = line.match(/^(\s*)(\d+)\.(?:\s+(.*))?$/);
        if (m) {
          return {
            type: "ordered",
            indent: m[1] || "",
            number: parseInt(m[2], 10),
            text: m[3] || ""
          };
        }

        m = line.match(/^(\s*)([-+*])(?:\s+(.*))?$/);
        if (m) {
          return {
            type: "unordered",
            indent: m[1] || "",
            marker: m[2],
            text: m[3] || ""
          };
        }

        return null;
      };

      const findParentListAtIndent = (model, fromLine, indentLength) => {
        for (let lineNumber = fromLine; lineNumber >= 1; lineNumber -= 1) {
          const line = model.getLineContent(lineNumber);
          const trimmed = line.trim();
          if (!trimmed) continue;

          const parsed = parseListLine(line);
          if (parsed && parsed.indent.length === indentLength) {
            return parsed;
          }

          const currentIndentLength = line.match(/^\s*/)[0].length;
          if (!parsed && currentIndentLength <= indentLength) {
            break;
          }
        }
        return null;
      };

      const getOutlineFromParsed = (parsed) => {
        if (!parsed) return null;
        if (parsed.type === "ordered") return String(parsed.number);
        if (parsed.type === "decimal") return parsed.outline;
        return null;
      };

      const computeNextOutline = (model, lineNumber, targetIndentLength) => {
        if (targetIndentLength <= 0) {
          let maxTop = 0;
          for (let ln = 1; ln < lineNumber; ln += 1) {
            const parsed = parseListLine(model.getLineContent(ln));
            if (!parsed || parsed.indent.length !== 0) continue;
            const outline = getOutlineFromParsed(parsed);
            if (!outline) continue;
            const top = parseInt(outline.split(".")[0], 10);
            if (Number.isFinite(top) && top > maxTop) maxTop = top;
          }
          return String(maxTop + 1);
        }

        const parentIndentLength = Math.max(0, targetIndentLength - LIST_INDENT.length);
        const parent = findParentListAtIndent(model, lineNumber - 1, parentIndentLength);
        const parentOutline = getOutlineFromParsed(parent) || "1";

        let maxChild = 0;
        for (let ln = 1; ln < lineNumber; ln += 1) {
          const parsed = parseListLine(model.getLineContent(ln));
          if (!parsed || parsed.indent.length !== targetIndentLength) continue;

          if (parsed.type === "decimal") {
            const parts = parsed.outline.split(".");
            if (parts.length < 2) continue;
            const candidateParent = parts.slice(0, -1).join(".");
            if (candidateParent !== parentOutline) continue;
            const idx = parseInt(parts[parts.length - 1], 10);
            if (Number.isFinite(idx) && idx > maxChild) maxChild = idx;
            continue;
          }

          if (parsed.type === "ordered") {
            if (parsed.number > maxChild) maxChild = parsed.number;
          }
        }

        return `${parentOutline}.${maxChild + 1}`;
      };

      const getListContinuationInsertText = (model, lineNumber, beforeCursor, afterCursor) => {
        const parsed = parseListLine(beforeCursor);
        if (!parsed) return null;

        const mergedText = `${parsed.text || ""}${afterCursor || ""}`.trim();
        const hasContent = mergedText.length > 0;

        if (!hasContent) {
          if (parsed.indent.length === 0) return "\n";

          const outdentedIndent = parsed.indent.slice(0, Math.max(0, parsed.indent.length - LIST_INDENT.length));
          const parent = findParentListAtIndent(model, lineNumber - 1, outdentedIndent.length);
          if (!parent) return `\n${outdentedIndent}`;

          if (parent.type === "unordered") {
            return `\n${outdentedIndent}${parent.marker} `;
          }

          if (parent.type === "ordered") {
            return `\n${outdentedIndent}${parent.number + 1}. `;
          }

          const nextOutline = computeNextOutline(model, lineNumber, outdentedIndent.length);
          return `\n${outdentedIndent}${nextOutline}. `;
        }

        if (parsed.type === "decimal") {
          const parts = parsed.outline.split(".");
          const lastIndex = parts.length - 1;
          const current = parseInt(parts[lastIndex], 10);
          const next = Number.isFinite(current) ? current + 1 : 1;
          parts[lastIndex] = String(next);
          return `\n${parsed.indent}${parts.join(".")}. `;
        }

        if (parsed.type === "ordered") {
          return `\n${parsed.indent}${parsed.number + 1}. `;
        }

        return `\n${parsed.indent}${parsed.marker} `;
      };

      const indentListLines = (model, selection, outdent) => {
        if (!window.monaco) return false;

        let startLine = selection.startLineNumber;
        let endLine = selection.endLineNumber;
        if (!selection.isEmpty() && selection.endColumn === 1 && endLine > startLine) {
          endLine -= 1;
        }

        const edits = [];
        for (let lineNumber = startLine; lineNumber <= endLine; lineNumber += 1) {
          const line = model.getLineContent(lineNumber);
          const parsed = parseListLine(line);
          if (!parsed) continue;

          const oldIndent = parsed.indent;
          let newIndent = oldIndent;

          if (outdent) {
            if (!oldIndent.length) continue;
            newIndent = oldIndent.slice(0, Math.max(0, oldIndent.length - LIST_INDENT.length));
          } else {
            newIndent = `${oldIndent}${LIST_INDENT}`;
          }

          if (newIndent === oldIndent) continue;

          if (parsed.type === "unordered") {
            const nextText = parsed.text ? `${newIndent}${parsed.marker} ${parsed.text}` : `${newIndent}${parsed.marker} `;
            edits.push({
              range: new window.monaco.Range(lineNumber, 1, lineNumber, line.length + 1),
              text: nextText,
              forceMoveMarkers: true
            });
            continue;
          }

          const nextOutline = computeNextOutline(model, lineNumber, newIndent.length);
          const nextText = parsed.text ? `${newIndent}${nextOutline}. ${parsed.text}` : `${newIndent}${nextOutline}. `;
          edits.push({
            range: new window.monaco.Range(lineNumber, 1, lineNumber, line.length + 1),
            text: nextText,
            forceMoveMarkers: true
          });
        }

        if (!edits.length) return false;
        monacoEditor.executeEdits("list-indent", edits);
        return true;
      };

      // Smart list behavior:
      // - Enter continues/exits list items like Word
      // - Tab/Shift+Tab indents/outdents list levels
      monacoEditor.onKeyDown((event) => {
        if (!window.monaco) return;
        const selection = monacoEditor.getSelection();
        const model = monacoEditor.getModel();
        if (!selection || !model) return;

        if (event.keyCode === window.monaco.KeyCode.Tab && !event.ctrlKey && !event.altKey && !event.metaKey) {
          const didIndent = indentListLines(model, selection, event.shiftKey);
          if (didIndent) {
            event.preventDefault();
          }
          return;
        }

        if (event.keyCode !== window.monaco.KeyCode.Enter) return;
        if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
        if (!selection.isEmpty()) return;

        const currentLine = model.getLineContent(selection.startLineNumber);
        const cursorOffset = Math.max(0, selection.startColumn - 1);
        const beforeCursor = currentLine.slice(0, cursorOffset);
        const afterCursor = currentLine.slice(cursorOffset);
        const insertText = getListContinuationInsertText(model, selection.startLineNumber, beforeCursor, afterCursor);
        if (!insertText) return;

        event.preventDefault();
        monacoEditor.executeEdits("list-smart-enter", [
          {
            range: selection,
            text: insertText,
            forceMoveMarkers: true
          }
        ]);
      });

      // Keep Monaco layout correct when view manager changes editor host dimensions.
      resizeObserver = new ResizeObserver(() => {
        if (monacoEditor) monacoEditor.layout();
      });
      resizeObserver.observe(host);

      startThemeSync();

      window.MarkTideMonaco = {
        getEditor: () => monacoEditor,
        getModel: () => monacoModel,
        refreshLayout: () => monacoEditor && monacoEditor.layout()
      };
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMonaco, { once: true });
  } else {
    initMonaco();
  }
})();
