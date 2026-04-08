import { type Collector, type Observer } from "../core/types";
import { isIgnored, isSvibeOwned } from "../core/dom-utils";

function isElementNode(node: Node | null | undefined): node is Element {
  return Boolean(node && node.nodeType === Node.ELEMENT_NODE);
}

export function createDomObserver(collector: Collector): Observer {
  let mutationObserver: MutationObserver | null = null;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let pending: { target: Element; timestamp: number }[] = [];

  function handleMutations(mutations: MutationRecord[]): void {
    const now = Date.now();
    for (const mutation of mutations) {
      const target = isElementNode(mutation.target)
        ? mutation.target
        : mutation.target.parentElement;
      if (!target || isIgnored(target) || isSvibeOwned(target)) continue;
      pending.push({ target, timestamp: now });
    }
    if (pending.length > 0 && timerId === null) {
      timerId = setTimeout(flush, 0);
    }
  }

  function flush(): void {
    timerId = null;
    const batch = pending;
    pending = [];

    for (const { target, timestamp } of batch) {
      const rect = target.getBoundingClientRect();
      collector.emit({ type: "dom", target, rect, timestamp });
    }
  }

  function start(): void {
    if (mutationObserver) return;
    mutationObserver = new MutationObserver(handleMutations);
    mutationObserver.observe(document.body, {
      childList: true,
      attributes: true,
      characterData: true,
      subtree: true,
    });
  }

  function stop(): void {
    mutationObserver?.disconnect();
    mutationObserver = null;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    pending = [];
  }

  function destroy(): void {
    stop();
  }

  return { start, stop, destroy };
}
