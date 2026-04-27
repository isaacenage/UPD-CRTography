import type { FilterSpecification } from "maplibre-gl";
import type { BuildingProps } from "@/lib/buildingFormat";

// Multi-axis filter model. Backwards-compatible with the old single
// boolean (publicOnly) — see `fromLegacy`. Combines into a MapLibre
// expression for layer filters and a predicate for in-memory search.

export type BidetFilter = "all" | "yes" | "no";

export type Filters = Readonly<{
  publicOnly: boolean;
  hasBidet: BidetFilter;
}>;

export const DEFAULT_FILTERS: Filters = {
  publicOnly: false,
  hasBidet: "all",
};

export function fromLegacy(publicOnly: boolean): Filters {
  return { publicOnly, hasBidet: "all" };
}

export function isAllOff(f: Filters): boolean {
  return !f.publicOnly && f.hasBidet === "all";
}

export function setPublicOnly(f: Filters, value: boolean): Filters {
  return { ...f, publicOnly: value };
}

export function setHasBidet(f: Filters, value: BidetFilter): Filters {
  return { ...f, hasBidet: value };
}

export function toMaplibreFilter(f: Filters): FilterSpecification | null {
  const clauses: FilterSpecification[] = [];
  if (f.publicOnly) {
    clauses.push(["==", ["get", "Access"], "Public"]);
  }
  if (f.hasBidet === "yes") {
    clauses.push(["==", ["get", "Has Bidet?"], "Yes"]);
  } else if (f.hasBidet === "no") {
    clauses.push(["!=", ["get", "Has Bidet?"], "Yes"]);
  }
  if (clauses.length === 0) return null;
  if (clauses.length === 1) return clauses[0];
  return ["all", ...clauses] as FilterSpecification;
}

export function applies(props: BuildingProps, f: Filters): boolean {
  if (f.publicOnly && props.access !== "public") return false;
  if (f.hasBidet === "yes" && props.hasBidet !== "yes") return false;
  if (f.hasBidet === "no" && props.hasBidet === "yes") return false;
  return true;
}
