export function isInputField() {
  return (
    document.activeElement?.getAttribute('contenteditable') ||
    document.activeElement?.tagName === 'INPUT' ||
    document.activeElement?.tagName === 'TEXTAREA'
  );
}
