// Boundary parser + formatter for building feature properties.
// Validates the upstream GeoJSON shape so components downstream never
// touch raw `properties.*` strings — keeps mistakes (typos, missing keys)
// surfaced here instead of leaking into the UI.

export type BidetState = "yes" | "no" | "unknown";
export type AccessState = "public" | "students-staff" | "unknown";

export type BuildingProps = Readonly<{
  id: number;
  name: string;
  acronym: string;
  hasBidet: BidetState;
  bidetRaw: string;
  gender: string;
  access: AccessState;
  accessRaw: string;
}>;

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function parseBidet(raw: string): BidetState {
  const v = raw.trim().toLowerCase();
  if (v === "yes") return "yes";
  if (v === "none" || v === "no") return "no";
  return "unknown";
}

function parseAccess(raw: string): AccessState {
  const v = raw.trim().toLowerCase();
  if (v === "public") return "public";
  if (v === "students and staff" || v === "students-staff") return "students-staff";
  return "unknown";
}

export function parseBuildingProps(
  properties: unknown,
  fallbackId = 0,
): BuildingProps {
  const props = (properties ?? {}) as Record<string, unknown>;
  const idCandidate =
    typeof props.id === "number"
      ? props.id
      : typeof props.fid === "number"
        ? props.fid
        : fallbackId;
  const bidetRaw = asString(props["Has Bidet?"]);
  const accessRaw = asString(props.Access);

  return {
    id: idCandidate,
    name: asString(props.Name) || "Unnamed building",
    acronym: asString(props.Acronym),
    hasBidet: parseBidet(bidetRaw),
    bidetRaw,
    gender: asString(props.Gender) || "Unknown",
    access: parseAccess(accessRaw),
    accessRaw,
  };
}

export type BidetAccent = Readonly<{
  color: string;
  label: string;
  symbol: "check" | "cross" | "question";
}>;

export function bidetAccent(b: BuildingProps): BidetAccent {
  if (b.hasBidet === "yes") {
    return { color: "var(--color-forest-500)", label: "May Bidet", symbol: "check" };
  }
  if (b.hasBidet === "no") {
    return { color: "var(--color-maroon-500)", label: "Walang Bidet", symbol: "cross" };
  }
  return { color: "var(--color-gray-500)", label: "Unverified", symbol: "question" };
}

export function accessLabel(b: BuildingProps): string {
  if (b.access === "public") return "Public";
  if (b.access === "students-staff") return "Students & Staff";
  return b.accessRaw || "Unknown";
}
