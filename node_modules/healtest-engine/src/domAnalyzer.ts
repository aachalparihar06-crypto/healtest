import type { Page } from 'playwright';
import type { InspectedElement, ExtractedButton } from '../../shared/types';

export { InspectedElement, ExtractedButton };

const EXTRACTOR_SCRIPT = `
(currentFrameUrl) => {
  const candidates = [];
  const selector = 'button, a, input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="status"], [role="heading"], [role="checkbox"], [role="radio"], [role="combobox"], [role="tab"], h1, h2, h3, h4, h5, h6, [data-action], [data-testid], [data-test], [tabindex="0"]';
  const elements = document.querySelectorAll(selector);

  // Helper 1: compute accessible name
  const getAccessibleName = (el, role, tagName, type) => {
    const ariaLabelledBy = el.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const ids = ariaLabelledBy.trim().split(/\\s+/);
      const texts = ids
        .map((id) => {
          const target = document.getElementById(id);
          return target ? (target.innerText || target.textContent || '').trim() : '';
        })
        .filter(Boolean);
      if (texts.length > 0) return texts.join(' ');
    }

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) {
      return ariaLabel.trim();
    }

    if (tagName === 'input') {
      if (type === 'submit') return (el.value && el.value.trim()) || 'Submit';
      if (type === 'reset') return (el.value && el.value.trim()) || 'Reset';
      if (type === 'button') return (el.value && el.value.trim()) || '';
      if (type === 'image') return el.alt ? el.alt.trim() : (el.title ? el.title.trim() : 'Submit');
    }

    if (el.labels && el.labels.length > 0) {
      const labelText = el.labels[0].innerText ? el.labels[0].innerText.trim() : '';
      if (labelText) return labelText;
    }
    if (el.id) {
      try {
        const labelEl = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (labelEl) {
          const labelText = labelEl.innerText ? labelEl.innerText.trim() : '';
          if (labelText) return labelText;
        }
      } catch (e) {}
    }

    const clone = el.cloneNode(true);
    const nonText = clone.querySelectorAll('script, style, noscript');
    for (let i = 0; i < nonText.length; i++) nonText[i].remove();
    const directText = (clone.innerText || clone.textContent || '').trim().replace(/\\s+/g, ' ');
    if (directText) return directText;

    const img = el.querySelector('img[alt]');
    if (img && img.alt && img.alt.trim()) return img.alt.trim();

    const svgTitle = el.querySelector('svg title');
    if (svgTitle && svgTitle.textContent && svgTitle.textContent.trim()) return svgTitle.textContent.trim();

    if (el.title && el.title.trim()) return el.title.trim();

    if (el.value && typeof el.value === 'string' && el.value.trim()) return el.value.trim();

    return '';
  };

  // Helper 2: compute selector
  const getSelector = (el, tagName, role, accessibleName) => {
    let pwSelector = '';
    if (role && accessibleName) {
      pwSelector = 'role=' + role + '[name="' + accessibleName.replace(/"/g, '\\\\"') + '"]';
    } else if (tagName === 'button' && accessibleName) {
      pwSelector = 'role=button[name="' + accessibleName.replace(/"/g, '\\\\"') + '"]';
    }

    if (el.id && el.id.trim()) {
      try {
        const escaped = CSS.escape(el.id.trim());
        if (document.querySelectorAll('#' + escaped).length === 1) {
          const sel = '#' + el.id.trim();
          return { selector: sel, cssSelector: sel, playwrightSelector: pwSelector || sel };
        }
      } catch (e) {}
    }

    const testId = el.getAttribute('data-testid') || el.getAttribute('data-test');
    if (testId) {
      const attrName = el.hasAttribute('data-testid') ? 'data-testid' : 'data-test';
      try {
        const sel = '[' + attrName + '="' + CSS.escape(testId) + '"]';
        if (document.querySelectorAll(sel).length === 1) {
          return { selector: sel, cssSelector: sel, playwrightSelector: pwSelector || sel };
        }
      } catch (e) {}
    }

    const name = el.getAttribute('name');
    if (name) {
      try {
        const sel = tagName + '[name="' + CSS.escape(name) + '"]';
        if (document.querySelectorAll(sel).length === 1) {
          return { selector: sel, cssSelector: sel, playwrightSelector: pwSelector || sel };
        }
      } catch (e) {}
    }

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) {
      try {
        const sel = tagName + '[aria-label="' + CSS.escape(ariaLabel) + '"]';
        if (document.querySelectorAll(sel).length === 1) {
          return { selector: sel, cssSelector: sel, playwrightSelector: pwSelector || sel };
        }
      } catch (e) {}
    }

    if (el.className && typeof el.className === 'string') {
      const classList = el.className.trim().split(/\\s+/).filter(c => !c.includes(':') && !c.includes('/') && !c.includes('['));
      for (let i = 0; i < classList.length; i++) {
        try {
          const sel = tagName + '.' + CSS.escape(classList[i]);
          if (document.querySelectorAll(sel).length === 1) {
            return { selector: sel, cssSelector: sel, playwrightSelector: pwSelector || sel };
          }
        } catch (e) {}
      }
    }

    let path = tagName;
    if (el.parentElement) {
      const parentTag = el.parentElement.tagName.toLowerCase();
      const index = Array.from(el.parentElement.children).indexOf(el) + 1;
      path = parentTag + ' > ' + tagName + ':nth-child(' + index + ')';
    }

    return { selector: path, cssSelector: path, playwrightSelector: pwSelector || path };
  };

  elements.forEach((el) => {
    const style = window.getComputedStyle(el);
    const hasDimensions = el.offsetWidth > 0 && el.offsetHeight > 0;
    const rects = el.getClientRects();
    const isVisible = style.display !== 'none' && 
                      style.visibility !== 'hidden' && 
                      style.opacity !== '0' && 
                      (hasDimensions || rects.length > 0);

    if (!isVisible) return;

    const tagName = el.tagName.toLowerCase();
    const type = el.getAttribute('type') ? el.getAttribute('type').toLowerCase() : null;
    const explicitRole = el.getAttribute('role');

    let role = explicitRole;
    if (!role) {
      if (tagName === 'button' || (tagName === 'input' && (type === 'submit' || type === 'button' || type === 'reset' || type === 'image'))) {
        role = 'button';
      } else if (tagName === 'a') {
        role = 'link';
      } else if (tagName === 'select') {
        role = 'combobox';
      } else if (tagName === 'textarea' || (tagName === 'input' && (!type || type === 'text' || type === 'email' || type === 'password' || type === 'search' || type === 'tel' || type === 'url' || type === 'number'))) {
        role = 'textbox';
      } else if (tagName === 'input' && type === 'checkbox') {
        role = 'checkbox';
      } else if (tagName === 'input' && type === 'radio') {
        role = 'radio';
      } else if (/^h[1-6]$/.test(tagName)) {
        role = 'heading';
      }
    }

    const isNativeDisabled = el.disabled === true;
    const isAriaDisabled = el.getAttribute('aria-disabled') === 'true';
    const hasDisabledClass = el.classList.contains('disabled');
    const hasPointerEventsNone = style.pointerEvents === 'none';
    const isEnabled = !isNativeDisabled && !isAriaDisabled && !hasDisabledClass && !hasPointerEventsNone;

    const accessibleName = getAccessibleName(el, role, tagName, type);

    let associatedLabel = '';
    if (el.labels && el.labels.length > 0) {
      associatedLabel = el.labels[0].innerText ? el.labels[0].innerText.trim() : '';
    } else if (el.id) {
      try {
        const labelEl = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (labelEl) associatedLabel = labelEl.innerText ? labelEl.innerText.trim() : '';
      } catch (e) {}
    }
    if (!associatedLabel) {
      const parentLabel = el.closest('label');
      if (parentLabel) associatedLabel = parentLabel.innerText ? parentLabel.innerText.trim() : '';
    }

    const rawValue = el.value || '';
    const rawInnerText = el.innerText ? el.innerText.trim() : (el.textContent ? el.textContent.trim() : '');
    const innerText = rawInnerText || ((role === 'button' || tagName === 'button') && rawValue ? rawValue.trim() : '') || accessibleName;

    const ariaLabel = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || null;
    const placeholder = el.getAttribute('placeholder') || null;
    const id = el.id || null;
    const name = el.getAttribute('name') || null;
    const classes = el.className || '';

    const selInfo = getSelector(el, tagName, role, accessibleName);

    const attributes = {};
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      if (attr.name && attr.value) {
        attributes[attr.name] = attr.value.slice(0, 150);
      }
    }

    const bestLabel = accessibleName || ariaLabel || associatedLabel || innerText || placeholder || id || tagName;

    let suggestedAction = '';
    if (role === 'button' || tagName === 'button' || role === 'link' || tagName === 'a' || role === 'tab' || role === 'checkbox' || role === 'radio') {
      suggestedAction = 'click "' + bestLabel + '"';
    } else if (role === 'textbox' || tagName === 'textarea' || tagName === 'input') {
      suggestedAction = 'enter "Test Value" into "' + bestLabel + '"';
    } else if (role === 'combobox' || tagName === 'select') {
      suggestedAction = 'select option in "' + bestLabel + '"';
    } else if (role === 'status' || role === 'heading' || /^h[1-6]$/.test(tagName)) {
      suggestedAction = 'verify "' + bestLabel + '" is visible';
    } else {
      suggestedAction = 'click "' + bestLabel + '"';
    }

    candidates.push({
      tagName,
      role,
      innerText,
      accessibleName,
      selector: selInfo.selector,
      cssSelector: selInfo.cssSelector,
      playwrightSelector: selInfo.playwrightSelector,
      ariaLabel,
      placeholder,
      id,
      name,
      type,
      classes: typeof classes === 'string' ? classes : '',
      outerHtml: el.outerHTML.slice(0, 350),
      isVisible,
      isEnabled,
      label: associatedLabel || null,
      attributes,
      frameUrl: currentFrameUrl,
      suggestedAction,
    });
  });

  return candidates;
}
`;

/**
 * Inspects the live browser DOM across all attached frames to discover interactive candidate elements,
 * with specialized, high-accuracy extraction for interactive buttons (accessible name, role, text, selector, enabled state).
 */
export async function inspectInteractiveDom(page: Page): Promise<InspectedElement[]> {
  const allCandidates: InspectedElement[] = [];
  const frames = page.frames();

  for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
    const frame = frames[frameIndex];
    try {
      if (frame.isDetached()) continue;
      const frameUrl = frame.url() || null;

      // Execute via raw evaluated script IIFE string to prevent esbuild / tsx __name injection into browser context
      const frameCandidates = await frame.evaluate('(' + EXTRACTOR_SCRIPT + ')(' + JSON.stringify(frameUrl) + ')');

      if (Array.isArray(frameCandidates)) {
        allCandidates.push(...frameCandidates);
      }
    } catch (frameErr) {
      console.error('[domAnalyzer] Frame evaluate error:', frameErr);
    }
  }

  return allCandidates;
}

/**
 * Extracts and filters all real interactive buttons from inspected elements.
 */
export function filterButtons(elements: InspectedElement[]): ExtractedButton[] {
  return elements
    .filter((e) => {
      const isButtonRole = e.role === 'button';
      const isButtonTag = e.tagName === 'button';
      const isButtonInput = e.tagName === 'input' && (e.type === 'submit' || e.type === 'button' || e.type === 'reset' || e.type === 'image');
      return (isButtonRole || isButtonTag || isButtonInput) && e.isVisible;
    })
    .map((e) => ({
      accessibleName: e.accessibleName || e.innerText || e.ariaLabel || e.name || e.id || e.tagName,
      role: e.role || 'button',
      text: e.innerText || e.accessibleName || '',
      selector: e.selector || e.cssSelector || (e.id ? `#${e.id}` : e.tagName),
      cssSelector: e.cssSelector || e.selector || (e.id ? `#${e.id}` : e.tagName),
      playwrightSelector: e.playwrightSelector || `role=button[name="${(e.accessibleName || e.innerText || '').replace(/"/g, '\\"')}"]`,
      isEnabled: e.isEnabled,
      tagName: e.tagName,
      type: e.type,
      id: e.id,
      name: e.name,
      classes: e.classes,
      outerHtml: e.outerHtml,
      isVisible: e.isVisible,
      frameUrl: e.frameUrl,
      ariaLabel: e.ariaLabel,
      attributes: e.attributes,
    }));
}
