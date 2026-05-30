/**
 * Form field detection via visual label scraping.
 * Works on Workday, Greenhouse, Lever, and standard HTML forms.
 */
const SwiftdroomFormDetector = (() => {
  const INPUT_SELECTORS =
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable="true"], [role="textbox"], [role="combobox"]';

  function getLabelText(element) {
    if (element.id) {
      const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (label) return cleanText(label.textContent);
    }

    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel) return cleanText(ariaLabel);

    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy) {
      const parts = labelledBy.split(/\s+/).map((id) => {
        const el = document.getElementById(id);
        return el ? el.textContent : "";
      });
      const text = parts.join(" ").trim();
      if (text) return cleanText(text);
    }

    const placeholder = element.getAttribute("placeholder");
    if (placeholder) return cleanText(placeholder);

    const parentLabel = element.closest("label");
    if (parentLabel) return cleanText(parentLabel.textContent);

    let node = element.parentElement;
    for (let i = 0; i < 6 && node; i++) {
      const labelEl = node.querySelector("label, legend, .label, [class*='label'], [class*='Label']");
      if (labelEl && !labelEl.contains(element)) {
        const text = cleanText(labelEl.textContent);
        if (text && text.length < 200) return text;
      }

      const prev = node.previousElementSibling;
      if (prev) {
        const text = cleanText(prev.textContent);
        if (text && text.length < 200 && !text.includes("\n\n")) return text;
      }

      node = node.parentElement;
    }

    const name = element.getAttribute("name") || element.getAttribute("data-automation-id") || "";
    return cleanText(name.replace(/[-_]/g, " "));
  }

  function cleanText(text) {
    return (text || "")
      .replace(/\*/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none";
  }

  function assignFieldId(element) {
    if (!element.dataset.swiftdroomId) {
      element.dataset.swiftdroomId = "sd-" + Math.random().toString(36).slice(2, 11);
    }
    return element.dataset.swiftdroomId;
  }

  function detectFields() {
    const elements = Array.from(document.querySelectorAll(INPUT_SELECTORS)).filter(isVisible);
    const seen = new Set();

    return elements
      .map((element) => {
        const id = assignFieldId(element);
        if (seen.has(id)) return null;
        seen.add(id);

        const label = getLabelText(element);
        const tag = element.tagName.toLowerCase();
        const type = element.getAttribute("type") || tag;
        const isTextarea = tag === "textarea" || element.isContentEditable;
        const isLongForm =
          isTextarea ||
          (tag === "input" && ["text", "search"].includes(type) && (element.maxLength > 500 || !element.maxLength));

        return {
          id,
          label,
          tag,
          type,
          isLongForm,
          value: getElementValue(element),
          rect: element.getBoundingClientRect(),
        };
      })
      .filter(Boolean);
  }

  function getElementValue(element) {
    if (element.isContentEditable) return element.textContent || "";
    return element.value || "";
  }

  function setElementValue(element, value) {
    element.focus();

    if (element.isContentEditable) {
      element.textContent = value;
      element.dispatchEvent(new InputEvent("input", { bubbles: true }));
      return;
    }

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set;
    const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value"
    )?.set;

    if (element.tagName === "TEXTAREA" && nativeTextareaValueSetter) {
      nativeTextareaValueSetter.call(element, value);
    } else if (nativeInputValueSetter) {
      nativeInputValueSetter.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function highlightField(fieldId, color) {
    const el = document.querySelector(`[data-swiftdroom-id="${fieldId}"]`);
    if (!el) return;
    el.style.outline = `2px solid ${color}`;
    el.style.outlineOffset = "2px";
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clearHighlights() {
    document.querySelectorAll("[data-swiftdroom-id]").forEach((el) => {
      el.style.outline = "";
      el.style.outlineOffset = "";
    });
  }

  function scrapeJobDescription() {
    const selectors = [
      "[class*='job-description']",
      "[class*='JobDescription']",
      "[data-automation-id='jobPostingDescription']",
      "#content",
      "main",
      "[role='main']",
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent && el.textContent.length > 200) {
        return el.textContent.slice(0, 8000).trim();
      }
    }

    return document.body.innerText.slice(0, 8000).trim();
  }

  function scrapePageMeta() {
    const title = document.title || "";
    const ogSite = document.querySelector('meta[property="og:site_name"]')?.content || "";

    let company = ogSite;
    let role = title;

    const titleParts = title.split(/\s[-|–—]\s/);
    if (titleParts.length >= 2) {
      role = titleParts[0].trim();
      company = titleParts[titleParts.length - 1].trim();
    }

    return { company, role, title };
  }

  return {
    detectFields,
    getLabelText,
    setElementValue,
    highlightField,
    clearHighlights,
    scrapeJobDescription,
    scrapePageMeta,
    getElementByFieldId(fieldId) {
      return document.querySelector(`[data-swiftdroom-id="${fieldId}"]`);
    },
  };
})();

if (typeof window !== "undefined") {
  window.SwiftdroomFormDetector = SwiftdroomFormDetector;
}
