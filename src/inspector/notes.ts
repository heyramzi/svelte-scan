import type {
  ElementNote,
  TextNote,
  GroupNote,
  AreaNote,
  InspectorNote,
  ElementAnchor,
  TextAnchor,
  GroupAnchor,
  AreaAnchor,
  NoteSourceInfo,
  RectBox,
  MarkerFallback,
} from "./types";

let counter = 0;

export function createNoteId(): string {
  counter++;
  return `sv-${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

type NoteParams<A> = {
  anchor: A;
  source: NoteSourceInfo;
  targetLabel: string;
  targetSummary: string;
};

function baseFields(source: NoteSourceInfo, targetLabel: string, targetSummary: string) {
  const now = new Date().toISOString();
  return {
    id: createNoteId(),
    note: "",
    targetLabel,
    targetSummary,
    ...source,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildElementNote(params: NoteParams<ElementAnchor>): ElementNote {
  return {
    kind: "element",
    ...baseFields(params.source, params.targetLabel, params.targetSummary),
    anchor: params.anchor,
  };
}

export function buildTextNote(params: NoteParams<TextAnchor>): TextNote {
  return {
    kind: "text",
    ...baseFields(params.source, params.targetLabel, params.targetSummary),
    anchor: params.anchor,
  };
}

export function buildGroupNote(params: NoteParams<GroupAnchor>): GroupNote {
  return {
    kind: "group",
    ...baseFields(params.source, params.targetLabel, params.targetSummary),
    anchor: params.anchor,
  };
}

export function buildAreaNote(params: NoteParams<AreaAnchor>): AreaNote {
  return {
    kind: "area",
    ...baseFields(params.source, params.targetLabel, params.targetSummary),
    anchor: params.anchor,
  };
}

export function updateNoteText<T extends InspectorNote>(note: T, text: string): T {
  return { ...note, note: text, updatedAt: new Date().toISOString() };
}

export function buildTargetLabel(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const firstClass = element.classList[0];
  return firstClass ? `${tag}.${firstClass}` : tag;
}

export function buildTargetSummary(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const classes = element.className ? ` class="${element.className}"` : "";
  const id = element.id ? ` id="${element.id}"` : "";
  return `<${tag}${id}${classes}>`;
}

export function buildSourceFromElement(
  element: Element,
  resolveSource: (
    el: Element,
  ) => { file: string; line: number; column: number; component: string } | null,
): NoteSourceInfo {
  const source = resolveSource(element);
  if (!source) {
    return {
      componentName: null,
      tagName: element.tagName.toLowerCase(),
      filePath: "",
      shortFileName: "",
      lineNumber: null,
      columnNumber: null,
    };
  }
  return {
    componentName: source.component,
    tagName: element.tagName.toLowerCase(),
    filePath: source.file,
    shortFileName: source.component,
    lineNumber: source.line,
    columnNumber: source.column,
  };
}

export function buildFallbackMarker(rect: RectBox): MarkerFallback {
  const centerX = rect.left + rect.width / 2;
  return {
    xPercent: window.innerWidth > 0 ? (centerX / window.innerWidth) * 100 : 50,
    yAbsolute: rect.top + window.scrollY + rect.height / 2,
  };
}
