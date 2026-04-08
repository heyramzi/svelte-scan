import type { InspectorSettings, InspectorPosition } from "./types";

// Brand colors from UpSys design system (deterministic, not user-customizable)
export const MARKER_COLOR = "#878af8"; // --brand-indigo-light (indigo-400)

export const DEFAULT_SETTINGS: InspectorSettings = {
  markerColor: MARKER_COLOR,
  blockPageInteractions: false,
  outputMode: "standard",
  pauseAnimations: false,
  clearOnCopy: false,
  includeComponentContext: false,
  includeComputedStyles: false,
};

export const DEFAULT_INSPECTOR_POSITION: InspectorPosition = "bottom-left";
export const STORAGE_PREFIX = "svibe-inspector";
export const COLLAPSED_TOOLBAR_SIZE = 48;
export const EXPANDED_TOOLBAR_WIDTH = 300;
export const COMPOSER_WIDTH = 280;
export const COMPOSER_HEIGHT = 200;
export const DELETE_ALL_DELAY_MS = 3000;

export const OUTPUT_MODE_OPTIONS: { value: InspectorSettings["outputMode"]; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "standard", label: "Standard" },
  { value: "detailed", label: "Detailed" },
  { value: "forensic", label: "Forensic" },
];

export const POSITION_GRID: (InspectorPosition | null)[][] = [
  ["top-left", "top-center", "top-right"],
  ["mid-left", null, "mid-right"],
  ["bottom-left", "bottom-center", "bottom-right"],
];

export const POSITION_LABELS: Record<InspectorPosition, string> = {
  "top-left": "Top Left",
  "top-center": "Top Center",
  "top-right": "Top Right",
  "mid-left": "Middle Left",
  "mid-right": "Middle Right",
  "bottom-left": "Bottom Left",
  "bottom-center": "Bottom Center",
  "bottom-right": "Bottom Right",
};
