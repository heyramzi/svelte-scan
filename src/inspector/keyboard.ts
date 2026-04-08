const CLAIMED_KEYS = new Set(["Escape", "c", "f", "o"]);

// Claim keyboard events during inspect mode so app handlers don't fire
export function createKeyboardClaimer() {
  let active = false;
  const claimedEvents = new WeakSet<KeyboardEvent>();
  let originalKeyDescriptor: PropertyDescriptor | undefined;

  function onKeydown(e: KeyboardEvent) {
    if (!active) return;
    if (CLAIMED_KEYS.has(e.key)) {
      claimedEvents.add(e);
    }
  }

  /** Read the real key from an event, bypassing the claimer override */
  function realKey(e: KeyboardEvent): string {
    if (originalKeyDescriptor?.get) return originalKeyDescriptor.get.call(e);
    return e.key;
  }

  function claim() {
    if (active) return;
    active = true;

    // Capture phase listener so we see events before app handlers
    document.addEventListener("keydown", onKeydown, true);

    // Override KeyboardEvent.prototype.key getter
    originalKeyDescriptor = Object.getOwnPropertyDescriptor(KeyboardEvent.prototype, "key");

    Object.defineProperty(KeyboardEvent.prototype, "key", {
      get(this: KeyboardEvent) {
        if (claimedEvents.has(this)) return "";
        return originalKeyDescriptor?.get?.call(this) ?? "";
      },
      configurable: true,
    });
  }

  function release() {
    if (!active) return;
    active = false;

    document.removeEventListener("keydown", onKeydown, true);

    // Restore original descriptor
    if (originalKeyDescriptor) {
      Object.defineProperty(KeyboardEvent.prototype, "key", originalKeyDescriptor);
      originalKeyDescriptor = undefined;
    }
  }

  function destroy() {
    if (active) release();
  }

  return { claim, release, destroy, realKey };
}
