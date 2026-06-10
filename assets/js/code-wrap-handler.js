// Preview-only: wrap / unwrap long lines in fenced code blocks (Grok-style control).
(function () {
  const DEBOUNCE_MS = 64;
  let debounceId = null;
  let resizeObserver = null;

  function preHasHorizontalOverflow(pre) {
    return Math.ceil(pre.scrollWidth) > Math.floor(pre.clientWidth) + 1;
  }

  function updateBlock(block) {
    const pre = block.querySelector(":scope > pre");
    const btn = block.querySelector(".wrap-code-btn");
    if (!pre || !btn) return;

    const wrapped = block.classList.contains("is-wrapped");
    const show = wrapped || preHasHorizontalOverflow(pre);

    if (show) {
      btn.classList.add("wrap-code-btn--show");
      btn.setAttribute("aria-hidden", "false");
      btn.removeAttribute("tabindex");
    } else {
      btn.classList.remove("wrap-code-btn--show");
      btn.setAttribute("aria-hidden", "true");
      btn.setAttribute("tabindex", "-1");
    }

    btn.setAttribute("aria-pressed", wrapped ? "true" : "false");
    const unwrapLabel = "Unwrap lines";
    const wrapLabel = "Wrap long lines";
    const tip = wrapped ? unwrapLabel : wrapLabel;
    btn.setAttribute("title", tip);
    btn.setAttribute("aria-label", tip);
    btn.setAttribute("data-marktide-tip", tip);
  }

  function refresh(root) {
    const el = root && root.nodeType ? root : document.getElementById("markdown-preview");
    if (!el) return;
    el.querySelectorAll(".enhanced-code-block").forEach(updateBlock);
  }

  function scheduleRefresh(root) {
    if (debounceId) clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      debounceId = null;
      requestAnimationFrame(() => refresh(root));
    }, DEBOUNCE_MS);
  }

  function onWrapClick(event) {
    const btn = event.target.closest(".wrap-code-btn");
    if (!btn) return;
    const preview = document.getElementById("markdown-preview");
    if (!preview || !preview.contains(btn)) return;

    event.preventDefault();
    event.stopPropagation();

    const block = btn.closest(".enhanced-code-block");
    if (!block) return;

    block.classList.toggle("is-wrapped");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => refresh(preview));
    });
  }

  function init() {
    document.addEventListener("click", onWrapClick);

    const preview = document.getElementById("markdown-preview");
    if (preview && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => scheduleRefresh(preview));
      resizeObserver.observe(preview);
    }

    window.addEventListener("resize", () => {
      scheduleRefresh(document.getElementById("markdown-preview"));
    });
  }

  window.MarkTideCodeWrap = {
    refresh,
    scheduleRefresh,
    init,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
