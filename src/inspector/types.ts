export type SourceInfo = {
  file: string;
  line: number;
  column: number;
  component: string;
};

export type SelectedElement = {
  element: Element;
  selector: string;
  source: SourceInfo | null;
  rect: DOMRect;
  tagName: string;
  classes: string[];
  id: string | null;
  attributes: Record<string, string>;
};

export type HoverInfo = {
  element: Element;
  rect: DOMRect;
  selector: string;
  source: SourceInfo | null;
  tagName: string;
  dimensions: { width: number; height: number };
};

// --- Annotation types ---

export type OutputMode = "compact" | "standard" | "detailed" | "forensic";

export type NoteKind = "element" | "text" | "group" | "area";

export type RectBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type NoteSourceInfo = {
  componentName: string | null;
  tagName: string;
  filePath: string;
  shortFileName: string;
  lineNumber: number | null;
  columnNumber: number | null;
};

// --- Anchors ---

export type ElementAnchor = {
  domPath: string;
  relativeX: number;
  relativeY: number;
  viewportX: number;
  viewportY: number;
};

export type MarkerFallback = {
  xPercent: number;
  yAbsolute: number;
};

export type TextAnchor = {
  commonAncestorPath: string;
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
  startOffset: number;
  endOffset: number;
  fallbackMarker: MarkerFallback;
};

export type GroupAnchor = {
  selectedDomPaths: string[];
  anchorDomPath: string;
  bounds: RectBox;
  fallbackMarker: MarkerFallback;
};

export type AreaAnchor = {
  bounds: RectBox;
  fallbackMarker: MarkerFallback;
};

export type NoteAnchor = ElementAnchor | TextAnchor | GroupAnchor | AreaAnchor;

// --- Notes ---

type NoteBase = NoteSourceInfo & {
  id: string;
  kind: NoteKind;
  note: string;
  targetSummary: string;
  targetLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type ElementNote = NoteBase & { kind: "element"; anchor: ElementAnchor };
export type TextNote = NoteBase & { kind: "text"; anchor: TextAnchor };
export type GroupNote = NoteBase & { kind: "group"; anchor: GroupAnchor };
export type AreaNote = NoteBase & { kind: "area"; anchor: AreaAnchor };

export type InspectorNote = ElementNote | TextNote | GroupNote | AreaNote;

// --- Composer ---

export type ComposerState = NoteSourceInfo & {
  noteId: string | null;
  noteKind: NoteKind;
  initialValue: string;
  targetSummary: string;
  targetLabel: string;
  placeholder: string;
  accentColor: string;
  markerLeft: number;
  markerTop: number;
  outlineRects: RectBox[];
  highlightRects: RectBox[];
  selectedText: string | null;
  anchor: NoteAnchor;
};

// --- Settings ---

export type InspectorSettings = {
  markerColor: string;
  blockPageInteractions: boolean;
  outputMode: OutputMode;
  pauseAnimations: boolean;
  clearOnCopy: boolean;
  includeComponentContext: boolean;
  includeComputedStyles: boolean;
};

// --- Export payload ---

export type AnnotationSnapshot = {
  id: string;
  kind: NoteKind;
  comment: string;
  targetSummary: string;
  targetLabel: string;
  elementPath: string | null;
  timestamp: string;
  source: NoteSourceInfo;
  element: {
    selector: string | null;
    fullDomPath: string | null;
    cssClasses: string[];
    components: { filtered: string[]; smart: string[]; all: string[] };
    boundingBox: RectBox | null;
    position: { x: number; y: number; xPercent: number; yAbsolute: number } | null;
    selectedText: string | null;
    nearbyText: string | null;
    accessibility: string | null;
    computedStyles: Record<string, string> | null;
  };
  page: {
    title: string;
    pathname: string;
    url: string;
    viewport: { width: number; height: number };
    userAgent: string;
    devicePixelRatio: number;
    timestamp: string;
  };
};

export type ExportPayload = {
  title: string;
  outputMode: OutputMode;
  url: string;
  viewport: { width: number; height: number };
  userAgent: string;
  devicePixelRatio: number;
  timestamp: string;
  annotations: AnnotationSnapshot[];
};

// --- Inspector toolbar state ---

export type InspectorPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "mid-left"
  | "mid-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type DragSelectionState = {
  left: number;
  top: number;
  width: number;
  height: number;
  highlightRects: RectBox[];
};

export type GroupSelectionPreview = {
  rects: RectBox[];
};
