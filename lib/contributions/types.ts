// Shape of a user-contributed building entry. Devs review these on the
// admin surface and either keep them as-is, edit them, or fold them into
// the canonical `up-buildings.geojson`. The `source` discriminator lets
// the map layer know whether a feature came from the local cache (just
// submitted, may not yet be on Supabase) or from the Supabase fetch.
export type ContributionGender = "All-Gender" | "Male" | "Female";

export type ContributionAccess = "Public" | "Students and Staff";

export type ContributionStatus = "pending" | "approved" | "rejected";

export type Contribution = Readonly<{
  id: string;
  buildingName: string;
  longitude: number;
  latitude: number;
  storagePath: string | null;
  photoUrl: string | null;
  gender: ContributionGender;
  access: ContributionAccess;
  status: ContributionStatus;
  createdAt: string;
  source: "supabase" | "local";
}>;

export const CONTRIBUTION_GENDERS: readonly ContributionGender[] = [
  "All-Gender",
  "Male",
  "Female",
];

export const CONTRIBUTION_ACCESS: readonly ContributionAccess[] = [
  "Public",
  "Students and Staff",
];
