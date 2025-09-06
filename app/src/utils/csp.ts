// CSP nonce生成とメタタグ更新
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

export function updateCSPWithNonce(nonce: string): void {
  const metaTag = document.querySelector('meta[http-equiv="Content-Security-Policy"]') as HTMLMetaElement;
  if (metaTag) {
    const currentCSP = metaTag.content;
    const updatedCSP = currentCSP
      .replace(/script-src[^;]*/, `script-src 'self' 'nonce-${nonce}'`)
      .replace(/style-src[^;]*/, `style-src 'self' 'nonce-${nonce}'`);
    metaTag.content = updatedCSP;
  }
}

export function addNonceToInlineElements(): void {
  const nonce = generateNonce();
  
  // インラインスクリプトにnonceを追加
  const inlineScripts = document.querySelectorAll('script:not([src])');
  inlineScripts.forEach(script => {
    script.setAttribute('nonce', nonce);
  });
  
  // インラインスタイルにnonceを追加
  const inlineStyles = document.querySelectorAll('style');
  inlineStyles.forEach(style => {
    style.setAttribute('nonce', nonce);
  });
  
  updateCSPWithNonce(nonce);
}
