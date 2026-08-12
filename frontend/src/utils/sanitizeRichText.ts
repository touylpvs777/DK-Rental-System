// Whitelist-based HTML sanitizer for the contract "Write Content" rich text
// editor. No sanitization library is installed and this only needs to
// support the handful of tags our own toolbar can produce (bold/italic/
// underline/lists), so a small hand-rolled allowlist walk is enough —
// every element is rebuilt bare (no attributes copied), which drops
// on*="" handlers and other attribute-based XSS vectors entirely, and any
// tag not on the list (script, img, iframe, ...) is unwrapped to its text
// content rather than kept.
const ALLOWED_TAGS = new Set(['B', 'I', 'U', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'BR', 'DIV', 'P', 'SPAN'])

function cleanNode(node: ChildNode): Node | DocumentFragment | null {
  if (node.nodeType === Node.TEXT_NODE) return node.cloneNode()
  if (node.nodeType !== Node.ELEMENT_NODE) return null

  const el = node as Element
  const cleanedChildren: Node[] = []
  el.childNodes.forEach((child) => {
    const cleaned = cleanNode(child)
    if (cleaned) cleanedChildren.push(cleaned)
  })

  if (!ALLOWED_TAGS.has(el.tagName)) {
    const frag = document.createDocumentFragment()
    frag.append(...cleanedChildren)
    return frag
  }

  const clone = document.createElement(el.tagName)
  clone.append(...cleanedChildren)
  return clone
}

export function sanitizeRichText(html: string): string {
  if (!html.trim()) return ''
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const container = document.createElement('div')
  parsed.body.childNodes.forEach((child) => {
    const cleaned = cleanNode(child)
    if (cleaned) container.append(cleaned)
  })
  return container.innerHTML
}
