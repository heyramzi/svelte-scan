// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { generateSelector } from "./selector";

describe("generateSelector", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("returns id selector for element with unique id", () => {
    document.body.innerHTML = '<div id="app"><button id="submit-btn">Go</button></div>';
    const el = document.getElementById("submit-btn")!;
    const selector = generateSelector(el);

    expect(selector).toBe("#submit-btn");
    expect(document.querySelector(selector)).toBe(el);
  });

  it("returns data-testid selector when present", () => {
    document.body.innerHTML = '<div><span data-testid="user-name">Alice</span></div>';
    const el = document.querySelector('[data-testid="user-name"]')!;
    const selector = generateSelector(el);

    expect(selector).toContain("data-testid");
    expect(document.querySelector(selector)).toBe(el);
  });

  it("uses tag+class when combination is unique", () => {
    document.body.innerHTML =
      '<div><button class="btn-primary">Click</button><span>Text</span></div>';
    const el = document.querySelector(".btn-primary")!;
    const selector = generateSelector(el);

    expect(document.querySelector(selector)).toBe(el);
  });

  it("uses nth-child for elements with no distinguishing attributes", () => {
    document.body.innerHTML = "<ul><li>A</li><li>B</li><li>C</li></ul>";
    const items = document.querySelectorAll("li");
    const selector = generateSelector(items[1]);

    expect(document.querySelector(selector)).toBe(items[1]);
  });

  it("handles multi-level nested elements", () => {
    document.body.innerHTML = `
			<div><div><div><div><span>Deep</span></div></div></div></div>
		`;
    const el = document.querySelector("span")!;
    const selector = generateSelector(el);

    expect(document.querySelector(selector)).toBe(el);
  });

  it("handles elements with duplicate class names among siblings", () => {
    document.body.innerHTML = `
			<div>
				<p class="item">First</p>
				<p class="item">Second</p>
				<p class="item">Third</p>
			</div>
		`;
    const items = document.querySelectorAll(".item");
    for (let i = 0; i < items.length; i++) {
      const selector = generateSelector(items[i]);
      expect(document.querySelector(selector)).toBe(items[i]);
    }
  });

  it("handles elements with no id, class, or data attributes", () => {
    document.body.innerHTML = "<div><span>Bare</span></div>";
    const el = document.querySelector("span")!;
    const selector = generateSelector(el);

    expect(document.querySelector(selector)).toBe(el);
  });

  it("returns 'body' for the body element", () => {
    expect(generateSelector(document.body)).toBe("body");
  });

  it("returns 'html' for the documentElement", () => {
    expect(generateSelector(document.documentElement)).toBe("html");
  });

  it("handles SVG elements", () => {
    document.body.innerHTML = '<svg><circle id="dot" cx="50" cy="50" r="10"></circle></svg>';
    const el = document.getElementById("dot")!;
    const selector = generateSelector(el);

    expect(document.querySelector(selector)).toBe(el);
  });

  it("produces valid selectors for querySelector", () => {
    document.body.innerHTML = `
			<div id="root">
				<header class="top-bar">
					<nav>
						<a href="/" class="logo">Home</a>
						<a href="/about">About</a>
					</nav>
				</header>
				<main>
					<article class="post">
						<h2>Title</h2>
						<p>Content</p>
					</article>
				</main>
			</div>
		`;
    const allElements = document.querySelectorAll("*");
    for (const el of allElements) {
      if (el === document.documentElement || el === document.head) continue;
      const selector = generateSelector(el);
      // Should not throw
      const match = document.querySelector(selector);
      expect(match).toBe(el);
    }
  });
});
