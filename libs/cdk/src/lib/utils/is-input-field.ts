export function isInputField() {
  return (
    document.activeElement?.hasAttribute('contenteditable') ||
    document.activeElement?.tagName === 'INPUT' ||
    document.activeElement?.tagName === 'TEXTAREA'
  );
}
