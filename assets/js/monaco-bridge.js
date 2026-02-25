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

        event.preventDefault();
        monacoEditor.focus();

        if (deltaY !== 0) {
          monacoEditor.setScrollTop(monacoEditor.getScrollTop() + deltaY);
        }
        if (deltaX !== 0) {
          monacoEditor.setScrollLeft(monacoEditor.getScrollLeft() + deltaX);
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
