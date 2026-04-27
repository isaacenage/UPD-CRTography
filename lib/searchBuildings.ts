import { parseBuildingProps, type BuildingProps } from "@/lib/buildingFormat";

// Lightweight in-memory search for the 65-feature dataset. Sub-millisecond
// at this size — pulling in fuse.js / minisearch would be ~25 KB gzipped
// of dependency weight for a search that runs against a constant set.

export type SearchHit = Readonly<{
  feature: GeoJSON.Feature;
  building: BuildingProps;
  score: number;
  matchedField: "acronym" | "name" | "fuzzy-acronym";
}>;

const MAX_RESULTS = 8;

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(n + 1);
  let cur = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function searchBuildings(
  features: readonly GeoJSON.Feature[],
  query: string,
  limit: number = MAX_RESULTS,
): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = tokenize(q);
  if (!tokens.length) return [];

  const hits: SearchHit[] = [];

  for (const feature of features) {
    const featureId =
      typeof feature.id === "number"
        ? feature.id
        : typeof (feature.properties as Record<string, unknown> | null)?.id === "number"
          ? ((feature.properties as Record<string, unknown>).id as number)
          : 0;
    const building = parseBuildingProps(feature.properties, featureId);
    const acronym = building.acronym.toLowerCase();
    const name = building.name.toLowerCase();
    const nameWords = tokenize(name);

    let score = 0;
    let matched: SearchHit["matchedField"] = "name";

    if (acronym && acronym === q) {
      score = 100;
      matched = "acronym";
    } else if (acronym && acronym.startsWith(q)) {
      score = 80;
      matched = "acronym";
    } else {
      let nameWordHits = 0;
      for (const t of tokens) {
        if (nameWords.some((w) => w.startsWith(t))) {
          nameWordHits += 1;
        }
      }
      if (nameWordHits > 0) {
        score = 30 + nameWordHits * 15;
        matched = "name";
      } else if (name.includes(q)) {
        score = 20;
        matched = "name";
      } else if (acronym && q.length >= 2 && q.length <= 6) {
        const dist = levenshtein(acronym, q);
        if (dist <= 2) {
          score = 12 - dist * 3;
          matched = "fuzzy-acronym";
        }
      }
    }

    if (score > 0) {
      hits.push({ feature, building, score, matchedField: matched });
    }
  }

  hits.sort((a, b) => b.score - a.score || a.building.name.localeCompare(b.building.name));
  return hits.slice(0, limit);
}
