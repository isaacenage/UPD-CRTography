// Single source of truth for the brand palette in JavaScript / TypeScript
// land. CSS uses the @theme tokens in app/globals.css; this mirror is for
// MapLibre paint expressions (which only accept literal colors at runtime,
// not CSS vars) and any other context where var() can't reach.

export const COLOR = Object.freeze({
  ink: "#1A1A1A",
  paper: "#F7F4EE",

  maroon50: "#FBEDED",
  maroon100: "#F5D2D3",
  maroon300: "#D8787B",
  maroon500: "#7B1113",
  maroon600: "#6B0E10",

  forest50: "#E6F0EA",
  forest100: "#C2DCCD",
  forest500: "#014421",
  forest600: "#013A1C",

  gold300: "#F5D78A",
  gold500: "#D4A547",
  gold600: "#B8861F",

  trackOrange500: "#F47E3F",

  gray100: "#EAEAE8",
  gray200: "#D6D5D2",
  gray400: "#8A8986",
  gray500: "#66655F",
  gray700: "#3A3935",
});
