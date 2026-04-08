import type { InspectorNote } from "../inspector/types";

export type RenderedMarker = {
  key: string;
  id: string;
  note: InspectorNote;
  index: number;
  left: number;
  top: number;
};

type MarkerTarget = {
  rect: DOMRect;
};

type MarkerResolver = (path: string) => MarkerTarget | null;

function getMarkerPaths(note: InspectorNote): string[] {
  switch (note.kind) {
    case "element":
      return [note.anchor.domPath];
    case "text":
      return [note.anchor.commonAncestorPath];
    case "group":
      return [...new Set(note.anchor.selectedDomPaths)];
    case "area":
      return [];
  }
}

export function buildRenderedMarkers(
  notes: InspectorNote[],
  resolveMarker: MarkerResolver,
): RenderedMarker[] {
  return notes.flatMap((note, noteIndex) =>
    getMarkerPaths(note).flatMap((path, markerIndex) => {
      const target = resolveMarker(path);
      if (!target) return [];

      return [
        {
          key: `${note.id}:${path}:${markerIndex}`,
          id: note.id,
          note,
          index: noteIndex + 1,
          left: target.rect.left + target.rect.width / 2,
          top: target.rect.top,
        },
      ];
    }),
  );
}
