// Preserve scroll through full DOM replacement, including inside archive dialogs.
export function rememberEditorScroll(element: HTMLElement): () => void {
  const positions: Array<{node: Element; top: number; left: number}> = [];
  let node: Node | null = element;
  while (node) {
    if (node instanceof Element) positions.push({node,top:node.scrollTop,left:node.scrollLeft});
    node = node.parentNode || (node instanceof ShadowRoot ? node.host : null);
  }
  const page = element.ownerDocument.scrollingElement;
  if (page && !positions.some(p => p.node === page)) positions.push({node:page,top:page.scrollTop,left:page.scrollLeft});
  return () => { for (const p of positions) { p.node.scrollTop=p.top;p.node.scrollLeft=p.left; } };
}
export function disableContactAutofill(root: ParentNode): void {
  root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input,textarea').forEach(field => {
    field.setAttribute('autocomplete','off');
    field.setAttribute('data-1p-ignore','');
    field.setAttribute('data-lpignore','true');
    field.setAttribute('data-form-type','other');
  });
}
