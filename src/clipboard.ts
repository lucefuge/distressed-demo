/** Stops a delayed clipboard permission result from claiming a newer selection
 * was copied. Call invalidate whenever the product, size or dialog changes.
 * The actual Clipboard API write is injected, so this logic is testable offline.
 */
export function createClipboardGuard() {
  let generation = 0;
  let pending = false;
  return {
    invalidate() {
      generation += 1;
    },
    async copy(
      write: () => Promise<void>,
    ): Promise<"copied" | "manual" | "stale"> {
      // Clipboard writes cannot be cancelled. Refuse overlapping operations.
      if (pending) return "stale";
      pending = true;
      const request = ++generation;
      try {
        await write();
        return request === generation ? "copied" : "stale";
      } catch {
        return request === generation ? "manual" : "stale";
      } finally {
        pending = false;
      }
    },
  };
}
