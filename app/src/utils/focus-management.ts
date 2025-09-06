const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
const ORIGINAL_TABINDEX_ATTR = 'data-original-tabindex';

export function disableBackgroundFocus(dialogElement: HTMLElement): void {
  const focusableElements = document.querySelectorAll(FOCUSABLE_SELECTOR);
  
  focusableElements.forEach((element) => {
    if (!dialogElement.contains(element)) {
      const currentTabindex = element.getAttribute('tabindex') || '0';
      element.setAttribute(ORIGINAL_TABINDEX_ATTR, currentTabindex);
      element.setAttribute('tabindex', '-1');
    }
  });
}

export function restoreBackgroundFocus(): void {
  const disabledElements = document.querySelectorAll(`[${ORIGINAL_TABINDEX_ATTR}]`);
  
  disabledElements.forEach((element) => {
    const originalTabindex = element.getAttribute(ORIGINAL_TABINDEX_ATTR);
    element.removeAttribute(ORIGINAL_TABINDEX_ATTR);
    
    if (originalTabindex === '0') {
      element.removeAttribute('tabindex');
    } else {
      element.setAttribute('tabindex', originalTabindex || '0');
    }
  });
}

export function saveFocus(): Element | null {
  return document.activeElement;
}

export function restoreFocus(element: Element | null): void {
  if (element && 'focus' in element) {
    (element as HTMLElement).focus();
  }
}
