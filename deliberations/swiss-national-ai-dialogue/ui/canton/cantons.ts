export interface CantonData {
  id: string;
  name: string;
  nameFr: string;
  nameIt: string;
  nameEn: string;
}

export const cantonData: CantonData[] = [
  { id: "ZH", name: "Zürich", nameFr: "Zurich", nameIt: "Zurigo", nameEn: "Zurich" },
  { id: "BE", name: "Bern", nameFr: "Berne", nameIt: "Berna", nameEn: "Bern" },
  { id: "LU", name: "Luzern", nameFr: "Lucerne", nameIt: "Lucerna", nameEn: "Lucerne" },
  { id: "UR", name: "Uri", nameFr: "Uri", nameIt: "Uri", nameEn: "Uri" },
  { id: "SZ", name: "Schwyz", nameFr: "Schwyz", nameIt: "Svitto", nameEn: "Schwyz" },
  { id: "OW", name: "Obwalden", nameFr: "Obwald", nameIt: "Obvaldo", nameEn: "Obwalden" },
  { id: "NW", name: "Nidwalden", nameFr: "Nidwald", nameIt: "Nidvaldo", nameEn: "Nidwalden" },
  { id: "GL", name: "Glarus", nameFr: "Glaris", nameIt: "Glarona", nameEn: "Glarus" },
  { id: "ZG", name: "Zug", nameFr: "Zoug", nameIt: "Zugo", nameEn: "Zug" },
  { id: "FR", name: "Freiburg", nameFr: "Fribourg", nameIt: "Friburgo", nameEn: "Fribourg" },
  { id: "SO", name: "Solothurn", nameFr: "Soleure", nameIt: "Soletta", nameEn: "Solothurn" },
  {
    id: "BS",
    name: "Basel-Stadt",
    nameFr: "Bâle-Ville",
    nameIt: "Basilea Città",
    nameEn: "Basel-City",
  },
  {
    id: "BL",
    name: "Basel-Landschaft",
    nameFr: "Bâle-Campagne",
    nameIt: "Basilea Campagna",
    nameEn: "Basel-Country",
  },
  {
    id: "SH",
    name: "Schaffhausen",
    nameFr: "Schaffhouse",
    nameIt: "Sciaffusa",
    nameEn: "Schaffhausen",
  },
  {
    id: "AR",
    name: "Appenzell Ausserrhoden",
    nameFr: "Appenzell Rh.-Ext.",
    nameIt: "Appenzello Esterno",
    nameEn: "Appenzell Outer Rhodes",
  },
  {
    id: "AI",
    name: "Appenzell Innerrhoden",
    nameFr: "Appenzell Rh.-Int.",
    nameIt: "Appenzello Interno",
    nameEn: "Appenzell Inner Rhodes",
  },
  { id: "SG", name: "St. Gallen", nameFr: "Saint-Gall", nameIt: "San Gallo", nameEn: "St. Gallen" },
  {
    id: "GR",
    name: "Graubünden",
    nameFr: "Grisons",
    nameIt: "Grigioni",
    nameEn: "Grisons",
  },
  { id: "AG", name: "Aargau", nameFr: "Argovie", nameIt: "Argovia", nameEn: "Aargau" },
  { id: "TG", name: "Thurgau", nameFr: "Thurgovie", nameIt: "Turgovia", nameEn: "Thurgau" },
  { id: "TI", name: "Ticino", nameFr: "Tessin", nameIt: "Ticino", nameEn: "Ticino" },
  { id: "VD", name: "Waadt", nameFr: "Vaud", nameIt: "Vaud", nameEn: "Vaud" },
  { id: "VS", name: "Wallis", nameFr: "Valais", nameIt: "Vallese", nameEn: "Valais" },
  { id: "NE", name: "Neuenburg", nameFr: "Neuchâtel", nameIt: "Neuchâtel", nameEn: "Neuchâtel" },
  { id: "GE", name: "Genf", nameFr: "Genève", nameIt: "Ginevra", nameEn: "Geneva" },
  { id: "JU", name: "Jura", nameFr: "Jura", nameIt: "Giura", nameEn: "Jura" },
];

export const NON_CH_CANTON = "non-ch";

export function getCantonById(id: string): CantonData | undefined {
  return cantonData.find((c) => c.id === id);
}

export function cantonName(canton: CantonData, locale: string): string {
  switch (locale) {
    case "fr":
      return canton.nameFr;
    case "it":
      return canton.nameIt;
    case "en":
      return canton.nameEn;
    default:
      return canton.name;
  }
}
