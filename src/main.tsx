import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Patch: Google Translate injects <font> elements into text nodes, causing
// React's removeChild/insertBefore to fail when it can't find the original node.
// This silently ignores those mismatched operations instead of crashing React.
;(function patchForGoogleTranslate() {
  const { removeChild, insertBefore } = Node.prototype
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) return child
    return removeChild.call(this, child) as T
  }
  Node.prototype.insertBefore = function <T extends Node>(node: T, ref: Node | null): T {
    if (ref && ref.parentNode !== this) return node
    return insertBefore.call(this, node, ref) as T
  }
})()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
