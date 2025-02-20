export function getActitveElement() {
  if (document.activeElement?.shadowRoot) {
    return document.activeElement.shadowRoot.activeElement;
  }

  return document.activeElement;
}

export function isInputField() {
  const activeElement = getActitveElement();

  return (
    activeElement?.hasAttribute('contenteditable') ||
    activeElement?.tagName === 'INPUT' ||
    activeElement?.tagName === 'TEXTAREA'
  );
}
