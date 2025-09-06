// フォーカス管理ユーティリティ（アクセシビリティ強化版）

// フォーカス可能な要素のセレクタ（より包括的）
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
  'audio[controls]',
  'video[controls]',
  'summary',
  'details[open]',
].join(', ');

// 現在のフォーカス要素を保存
let savedFocusElement: Element | null = null;
let focusStack: Element[] = [];

export function saveFocus(): Element | null {
  const activeElement = document.activeElement;
  if (activeElement && activeElement !== document.body) {
    savedFocusElement = activeElement;
    focusStack.push(activeElement);
    return activeElement;
  }
  return null;
}

export function restoreFocus(fallbackElement?: Element | null): void {
  // 指定された要素を優先
  if (fallbackElement && isElementVisible(fallbackElement as HTMLElement)) {
    (fallbackElement as HTMLElement).focus();
    return;
  }

  // スタックから最新の要素を復元
  while (focusStack.length > 0) {
    const element = focusStack.pop();
    if (element && isElementVisible(element as HTMLElement)) {
      (element as HTMLElement).focus();
      return;
    }
  }

  // 保存された要素を復元
  if (savedFocusElement && isElementVisible(savedFocusElement as HTMLElement)) {
    (savedFocusElement as HTMLElement).focus();
    return;
  }

  // フォールバック: 最初のフォーカス可能要素
  const firstFocusable = document.querySelector(FOCUSABLE_SELECTORS) as HTMLElement;
  if (firstFocusable) {
    firstFocusable.focus();
  }
}

export function clearFocusStack(): void {
  focusStack = [];
  savedFocusElement = null;
}

// 要素が表示されているかチェック
function isElementVisible(element: HTMLElement): boolean {
  if (!element || !element.offsetParent) return false;
  
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         element.tabIndex >= 0;
}

// フォーカス可能な要素を取得（改善版）
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS)) as HTMLElement[];
  return elements.filter(element => isElementVisible(element));
}

// 背景のフォーカスを無効化（改善版）
export function disableBackgroundFocus(modalContainer: HTMLElement): void {
  const allFocusable = document.querySelectorAll(FOCUSABLE_SELECTORS);
  
  allFocusable.forEach(element => {
    const htmlElement = element as HTMLElement;
    
    // モーダル内の要素は除外
    if (modalContainer.contains(htmlElement)) return;
    
    // 既にtabIndex属性がある場合は保存
    if (htmlElement.hasAttribute('tabindex')) {
      htmlElement.setAttribute('data-original-tabindex', htmlElement.getAttribute('tabindex') || '0');
    } else {
      htmlElement.setAttribute('data-original-tabindex', 'none');
    }
    
    // フォーカス無効化
    htmlElement.setAttribute('tabindex', '-1');
    htmlElement.setAttribute('aria-hidden', 'true');
  });
}

// 背景のフォーカスを復元（改善版）
export function restoreBackgroundFocus(): void {
  const disabledElements = document.querySelectorAll('[data-original-tabindex]');
  
  disabledElements.forEach(element => {
    const htmlElement = element as HTMLElement;
    const originalTabIndex = htmlElement.getAttribute('data-original-tabindex');
    
    // 元のtabIndexを復元
    if (originalTabIndex === 'none') {
      htmlElement.removeAttribute('tabindex');
    } else {
      htmlElement.setAttribute('tabindex', originalTabIndex || '0');
    }
    
    // 属性をクリーンアップ
    htmlElement.removeAttribute('data-original-tabindex');
    htmlElement.removeAttribute('aria-hidden');
  });
}

// フォーカストラップの作成
export function createFocusTrap(container: HTMLElement): {
  activate: () => void;
  deactivate: () => void;
} {
  let isActive = false;
  let focusableElements: HTMLElement[] = [];

  const updateFocusableElements = () => {
    focusableElements = getFocusableElements(container);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isActive || event.key !== 'Tab') return;

    updateFocusableElements();
    
    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey) {
      // Shift+Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  const activate = () => {
    if (isActive) return;
    
    isActive = true;
    updateFocusableElements();
    document.addEventListener('keydown', handleKeyDown);
    
    // 最初の要素にフォーカス
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  };

  const deactivate = () => {
    if (!isActive) return;
    
    isActive = false;
    document.removeEventListener('keydown', handleKeyDown);
  };

  return { activate, deactivate };
}
