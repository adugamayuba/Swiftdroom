/**
 * Form field detection via visual label scraping.
 * Works on Workday, Greenhouse, Lever, and standard HTML forms.
 */
const SwiftdroomFormDetector = (() => {
  const INPUT_SELECTORS =
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]):not([type="file"]), textarea, select, [contenteditable="true"], [role="textbox"], [role="combobox"]';

  function queryDeepRoots(root) {
    const elements = [];
    const stack = [root];

    while (stack.length) {
      const node = stack.pop();
      if (!node) continue;

      try {
        elements.push(...node.querySelectorAll(INPUT_SELECTORS));
      } catch {
        /* cross-origin or detached */
      }

      if (node.shadowRoot) stack.push(node.shadowRoot);

      try {
        const children = node.querySelectorAll ? node.querySelectorAll("*") : [];
        for (const child of children) {
          if (child.shadowRoot) stack.push(child.shadowRoot);
        }
      } catch {
        /* ignore */
      }
    }

    return elements;
  }

  function isUsableLabel(text) {
    if (!text || text.length > 120) return false;
    if (/https?:\/\//.test(text)) return false;
    if ((text.match(/\n/g) || []).length > 2) return false;
    return true;
  }

  function getLabelText(element) {
    if (element.id) {
      const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (label) {
        const text = cleanText(label.textContent);
        if (isUsableLabel(text)) return text;
      }
    }

    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel) {
      const text = cleanText(ariaLabel);
      if (isUsableLabel(text)) return text;
    }

    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy) {
      const parts = labelledBy.split(/\s+/).map((id) => {
        const el = document.getElementById(id);
        return el ? el.textContent : "";
      });
      const text = parts.join(" ").trim();
      if (text && isUsableLabel(text)) return cleanText(text);
    }

    const placeholder = element.getAttribute("placeholder");
    if (placeholder) {
      const text = cleanText(placeholder);
      if (isUsableLabel(text)) return text;
    }

    const parentLabel = element.closest("label");
    if (parentLabel) return cleanText(parentLabel.textContent);

    let node = element.parentElement;
    for (let i = 0; i < 8 && node; i++) {
      const labelEl = node.querySelector(
        "label, legend, .label, [class*='label'], [class*='Label'], [data-automation-id*='label']"
      );
      if (labelEl && !labelEl.contains(element)) {
        const text = cleanText(labelEl.textContent);
        if (isUsableLabel(text)) return text;
      }

      const prev = node.previousElementSibling;
      if (prev) {
        const text = cleanText(prev.textContent);
        if (isUsableLabel(text) && !text.includes("\n\n")) return text;
      }

      node = node.parentElement;
    }

    const name =
      element.getAttribute("name") ||
      element.getAttribute("id") ||
      element.getAttribute("data-automation-id") ||
      element.getAttribute("data-testid") ||
      "";
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
    if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") {
      return false;
    }
    if (el.getAttribute("aria-hidden") === "true") return false;
    return true;
  }

  function assignFieldId(element) {
    if (!element.dataset.swiftdroomId) {
      element.dataset.swiftdroomId = "sd-" + Math.random().toString(36).slice(2, 11);
    }
    return element.dataset.swiftdroomId;
  }

  function normalizeLabelKey(label) {
    return (label || "").toLowerCase().replace(/\*/g, "").replace(/\s+/g, " ").trim();
  }

  function findFieldByLabel(labelHint) {
    const target = normalizeLabelKey(labelHint);
    if (!target) return null;

    const elements = queryDeepRoots(document).filter(isVisible);
    let best = null;
    let bestScore = 0;

    for (const element of elements) {
      const label = normalizeLabelKey(getLabelText(element));
      if (!label) continue;

      let score = 0;
      if (label === target) score = 100;
      else if (label.includes(target) || target.includes(label)) score = 70;
      else {
        const targetWords = target.split(/\s+/).filter((w) => w.length > 2);
        const overlap = targetWords.filter((w) => label.includes(w)).length;
        if (overlap) score = 30 + overlap * 10;
      }

      if (score > bestScore) {
        bestScore = score;
        best = element;
      }
    }

    if (best && bestScore >= 40) {
      assignFieldId(best);
      return best;
    }
    return null;
  }

  function detectFields() {
    const elements = queryDeepRoots(document).filter(isVisible);
    const seen = new Set();

    return elements
      .map((element) => {
        const id = assignFieldId(element);
        if (seen.has(id)) return null;
        seen.add(id);

        const label = getLabelText(element);
        const tag = element.tagName.toLowerCase();
        const type = element.getAttribute("type") || tag;
        const role = element.getAttribute("role") || "";
        const isSelect = tag === "select";
        const isCombobox = role === "combobox" || role === "listbox";
        const isTextarea = tag === "textarea" || element.isContentEditable;
        const isLongForm =
          !isSelect &&
          !isCombobox &&
          (isTextarea ||
            (tag === "input" &&
              ["text", "search"].includes(type) &&
              (element.maxLength > 500 || !element.maxLength)));

        const field = {
          id,
          label,
          tag,
          type,
          role,
          isSelect,
          isCombobox,
          isLongForm,
          value: getElementValue(element),
          options: [],
        };

        if (isSelect) {
          field.options = getSelectOptions(element);
        }

        return field;
      })
      .filter(Boolean);
  }

  function getElementValue(element) {
    if (element.isContentEditable) return element.textContent || "";
    return element.value || "";
  }

  function setNativeValue(element, value) {
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
  }

  function getSelectOptions(element) {
    return Array.from(element.options || [])
      .filter((opt) => opt.value && opt.value !== "")
      .map((opt) => ({
        value: opt.value,
        text: cleanText(opt.textContent || opt.label || opt.value),
      }));
  }

  function scoreOptionMatch(target, text, val) {
    if (!target) return 0;
    if (text === target || val === target) return 100;
    if (text.startsWith(target) || target.startsWith(text)) return 80;
    if (val.includes(target) || target.includes(val)) return 70;
    if (text.includes(target) || target.includes(text)) return 60;
    const targetWords = target.split(/\s+/).filter(Boolean);
    const textWords = text.split(/\s+/).filter(Boolean);
    const overlap = targetWords.filter((w) => textWords.some((tw) => tw.includes(w) || w.includes(tw)));
    return overlap.length ? 40 + overlap.length * 5 : 0;
  }

  function setSelectValue(element, value) {
    const target = (value || "").toLowerCase().trim();
    if (!target) return false;

    let best = null;
    let bestScore = 0;

    for (const opt of element.options) {
      const text = cleanText(opt.textContent || opt.label || "").toLowerCase();
      const val = (opt.value || "").toLowerCase();
      const score = scoreOptionMatch(target, text, val);
      if (score > bestScore) {
        bestScore = score;
        best = opt;
      }
    }

    if (best && bestScore >= 40) {
      element.value = best.value;
      return true;
    }

    return false;
  }

  function findVisibleListboxOptions() {
    const listboxes = Array.from(document.querySelectorAll('[role="listbox"]')).filter(isVisible);
    const options = [];
    for (const listbox of listboxes) {
      for (const opt of listbox.querySelectorAll('[role="option"]')) {
        if (!isVisible(opt)) continue;
        options.push(opt);
      }
    }
    return options;
  }

  function setComboboxValue(element, value) {
    const target = (value || "").trim();
    if (!target) return false;

    element.focus();
    element.click();

    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
      setNativeValue(element, target);
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }

    const targetLower = target.toLowerCase();
    const options = findVisibleListboxOptions();
    let best = null;
    let bestScore = 0;

    for (const opt of options) {
      const text = cleanText(opt.textContent || "").toLowerCase();
      const score = scoreOptionMatch(targetLower, text, text);
      if (score > bestScore) {
        bestScore = score;
        best = opt;
      }
    }

    if (best && bestScore >= 40) {
      best.click();
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    element.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
    return Boolean(element.value || element.textContent);
  }

  function setElementValue(element, value) {
    element.focus();

    if (element.isContentEditable) {
      element.textContent = value;
      element.dispatchEvent(new InputEvent("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    if (element.tagName === "SELECT") {
      const ok = setSelectValue(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return ok;
    }

    if (element.getAttribute("role") === "combobox") {
      return setComboboxValue(element, value);
    }

    setNativeValue(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function isDropdownField(element) {
    if (!element) return false;
    return (
      element.tagName === "SELECT" || element.getAttribute("role") === "combobox"
    );
  }

  function scrollToField(fieldId) {
    const el = document.querySelector(`[data-swiftdroom-id="${fieldId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    return Boolean(el);
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
      "[class*='posting-page']",
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

  function isFieldVisible(fieldId) {
    const el = document.querySelector(`[data-swiftdroom-id="${fieldId}"]`);
    return isVisible(el);
  }

  return {
    detectFields,
    getLabelText,
    getElementValue,
    getSelectOptions,
    setElementValue,
    setSelectValue,
    isDropdownField,
    isVisible,
    isFieldVisible,
    findFieldByLabel,
    highlightField,
    clearHighlights,
    scrapeJobDescription,
    scrapePageMeta,
    getElementByFieldId(fieldId) {
      return document.querySelector(`[data-swiftdroom-id="${fieldId}"]`);
    },
    scrollToField,
  };
})();

if (typeof window !== "undefined") {
  window.SwiftdroomFormDetector = SwiftdroomFormDetector;
}
