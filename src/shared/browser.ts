/** True when code runs in a visible browser tab (not during SSR). */
export function isBrowserTabVisible(): boolean {
  return typeof document !== "undefined" && !document.hidden;
}
