import type { Page } from 'playwright';

export interface InspectedElement {
  tagName: string;
  role: string | null;
  innerText: string;
  ariaLabel: string | null;
  placeholder: string | null;
  id: string | null;
  name: string | null;
  type: string | null;
  classes: string;
  outerHtml: string;
  isVisible: boolean;
  isEnabled: boolean;
}

/**
 * Inspects the live browser DOM to discover interactive and semantic candidate elements.
 * Runs inside the browser page context to extract accessibility properties and attributes.
 */
export async function inspectInteractiveDom(page: Page): Promise<InspectedElement[]> {
  return await page.evaluate(() => {
    const candidates: Array<{
      tagName: string;
      role: string | null;
      innerText: string;
      ariaLabel: string | null;
      placeholder: string | null;
      id: string | null;
      name: string | null;
      type: string | null;
      classes: string;
      outerHtml: string;
      isVisible: boolean;
      isEnabled: boolean;
    }> = [];

    // Query all interactive and semantic elements
    const selector = 'button, a, input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="status"], [role="heading"], h1, h2, h3, [data-action], [tabindex="0"]';
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

      candidates.push({
        tagName: htmlEl.tagName.toLowerCase(),
        role: htmlEl.getAttribute('role') || (htmlEl.tagName.toLowerCase() === 'button' ? 'button' : htmlEl.tagName.toLowerCase() === 'a' ? 'link' : null),
        innerText: htmlEl.innerText ? htmlEl.innerText.trim() : (htmlEl.textContent ? htmlEl.textContent.trim() : ''),
        ariaLabel: htmlEl.getAttribute('aria-label') || htmlEl.getAttribute('aria-labelledby') || null,
        placeholder: htmlEl.getAttribute('placeholder') || null,
        id: htmlEl.id || null,
        name: htmlEl.getAttribute('name') || null,
        type: htmlEl.getAttribute('type') || null,
        classes: htmlEl.className || '',
        outerHtml: htmlEl.outerHTML.slice(0, 350),
        isVisible,
        isEnabled,
      });
    });

    return candidates;
  });
}
