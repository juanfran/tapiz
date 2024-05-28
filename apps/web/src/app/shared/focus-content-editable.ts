export const focustContentEditable = (el: HTMLElement) => {
  requestAnimationFrame(() => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();

    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }

    el.focus();
  });
};
