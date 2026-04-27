// Pure geometry helpers: bbox + centroid for GeoJSON Features and
// FeatureCollections. Extracted from the original recursive coord-walk
// in components/Map.tsx so that "fly to feature" (search) reuses the
// same code as "fit all" (initial load).

export type Bbox = readonly [readonly [number, number], readonly [number, number]];
export type LngLat = readonly [number, number];

function visit(coords: unknown, agg: { minX: number; minY: number; maxX: number; maxY: number }): void {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === "number" && typeof coords[1] === "number") {
    const x = coords[0] as number;
    const y = coords[1] as number;
    if (x < agg.minX) agg.minX = x;
    if (x > agg.maxX) agg.maxX = x;
    if (y < agg.minY) agg.minY = y;
    if (y > agg.maxY) agg.maxY = y;
    return;
  }
  for (const c of coords) visit(c, agg);
}

function readGeometry(feature: GeoJSON.Feature): unknown {
  return feature.geometry && (feature.geometry as GeoJSON.Geometry & { coordinates?: unknown }).coordinates;
}

export function bboxOfFeature(feature: GeoJSON.Feature): Bbox | null {
  const agg = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  visit(readGeometry(feature), agg);
  if (!Number.isFinite(agg.minX)) return null;
  return [
    [agg.minX, agg.minY],
    [agg.maxX, agg.maxY],
  ] as const;
}

export function bboxOfFeatures(features: readonly GeoJSON.Feature[]): Bbox | null {
  const agg = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const f of features) visit(readGeometry(f), agg);
  if (!Number.isFinite(agg.minX)) return null;
  return [
    [agg.minX, agg.minY],
    [agg.maxX, agg.maxY],
  ] as const;
}

// Naive centroid via bbox midpoint. Adequate for the small footprints in
// this dataset; a true polygon centroid is unnecessary for a "fly to" cue.
export function centroidOfFeature(feature: GeoJSON.Feature): LngLat | null {
  const bbox = bboxOfFeature(feature);
  if (!bbox) return null;
  const [[minX, minY], [maxX, maxY]] = bbox;
  return [(minX + maxX) / 2, (minY + maxY) / 2] as const;
}
