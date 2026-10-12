import type { Page } from 'playwright';
import type { InspectedElement } from '../../shared/types';

export { InspectedElement };

/**
 * Inspects the live browser DOM across all attached frames to discover interactive and semantic candidate elements.
 * Runs inside browser frame contexts to extract accessibility properties, attributes,
 * and synthesized test actions.
 */
export async function inspectInteractiveDom(page: Page): Promise<InspectedElement[]> {
  const allCandidates: InspectedElement[] = [];
  const frames = page.frames();

  for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
    const frame = frames[frameIndex];
    try {
      if (frame.isDetached()) continue;
      const frameUrl = frame.url() || null;

      const frameCandidates = await frame.evaluate((currentFrameUrl) => {
        const candidates: InspectedElement[] = [];

        // Query all interactive and semantic elements
        const selector = 'button, a, input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="status"], [role="heading"], [role="checkbox"], [role="radio"], [role="combobox"], [role="tab"], h1, h2, h3, h4, h5, h6, [data-action], [data-testid], [data-test], [tabindex="0"]';
        const elements = document.querySelectorAll(selector);

        elements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          // Check visibility
          const style = window.getComputedStyle(htmlEl);
          const isVisible = style.display !== 'none' && 
                            style.visibility !== 'hidden' && 
                            style.opacity !== '0' && 
                            htmlEl.offsetWidth > 0 && 
                            htmlEl.offsetHeight > 0;

          if (!isVisible) return;

          const isEnabled = !(htmlEl as HTMLButtonElement).disabled;
          const tagName = htmlEl.tagName.toLowerCase();
          const type = htmlEl.getAttribute('type')?.toLowerCase() || null;
          const explicitRole = htmlEl.getAttribute('role');

          // Accurate WAI-ARIA implicit role determination
          let role = explicitRole;
          if (!role) {
            if (tagName === 'button' || (tagName === 'input' && (type === 'submit' || type === 'button' || type === 'reset'))) {
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

          // Associated label detection
          let associatedLabel = '';
          const inputEl = htmlEl as HTMLInputElement;
          if (inputEl.labels && inputEl.labels.length > 0) {
            associatedLabel = inputEl.labels[0].innerText?.trim() || '';
          } else if (htmlEl.id) {
            try {
              const labelEl = document.querySelector(`label[for="${CSS.escape(htmlEl.id)}"]`);
              if (labelEl) associatedLabel = (labelEl as HTMLElement).innerText?.trim() || '';
            } catch { /* ignore selector escape errors */ }
          }
          if (!associatedLabel) {
            const parentLabel = htmlEl.closest('label');
            if (parentLabel) {
              associatedLabel = parentLabel.innerText?.trim() || '';
            }
          }

          const rawValue = inputEl.value || '';
          const rawInnerText = htmlEl.innerText ? htmlEl.innerText.trim() : (htmlEl.textContent ? htmlEl.textContent.trim() : '');
          // For submit/button inputs or elements with empty text, use value attribute
          const innerText = rawInnerText || ((role === 'button' || tagName === 'button') && rawValue ? rawValue.trim() : '');

          const ariaLabel = htmlEl.getAttribute('aria-label') || htmlEl.getAttribute('aria-labelledby') || null;
          const placeholder = htmlEl.getAttribute('placeholder') || null;
          const id = htmlEl.id || null;
          const name = htmlEl.getAttribute('name') || null;
          const classes = htmlEl.className || '';

          // Extract standard attributes map
          const attributes: Record<string, string> = {};
          for (let i = 0; i < htmlEl.attributes.length; i++) {
            const attr = htmlEl.attributes[i];
            if (attr.name && attr.value) {
              attributes[attr.name] = attr.value.slice(0, 150);
            }
          }

          // Determine human-friendly target identifier
          const bestLabel = ariaLabel || 
                            associatedLabel || 
                            innerText || 
                            placeholder || 
                            (rawValue && role === 'button' ? rawValue.trim() : '') || 
                            attributes['data-testid'] || 
                            attributes['data-test'] || 
                            name || 
                            id || 
                            tagName;

          // Synthesize natural-language test action suggestion
          let suggestedAction = '';
          if (role === 'button' || tagName === 'button' || role === 'link' || tagName === 'a' || role === 'tab' || role === 'checkbox' || role === 'radio') {
            suggestedAction = `click "${bestLabel}"`;
          } else if (role === 'textbox' || tagName === 'textarea' || tagName === 'input') {
            suggestedAction = `enter "Test Value" into "${bestLabel}"`;
          } else if (role === 'combobox' || tagName === 'select') {
            suggestedAction = `select option in "${bestLabel}"`;
          } else if (role === 'status' || role === 'heading' || /^h[1-6]$/.test(tagName)) {
            suggestedAction = `verify "${bestLabel}" is visible`;
          } else {
            suggestedAction = `click "${bestLabel}"`;
          }

          candidates.push({
            tagName,
            role,
            innerText,
            ariaLabel,
            placeholder,
            id,
            name,
            type,
            classes: typeof classes === 'string' ? classes : '',
            outerHtml: htmlEl.outerHTML.slice(0, 350),
            isVisible,
            isEnabled,
            label: associatedLabel || null,
            attributes,
            frameUrl: currentFrameUrl,
            suggestedAction,
          });
        });

        return candidates;
      }, frameUrl);

      allCandidates.push(...frameCandidates);
    } catch {
      // Ignore cross-origin frame access or detached frame errors
    }
  }

  return allCandidates;
}
