// Noms dels elements de la revisió en l'idioma del propietari, per a la llista
// {{incidencies}} del correu. El català surt de les definicions de data/cases.ts.
// Traduccions pendents de revisar per l'oficina (veure docs/TEXTOS_CORREU.md).
export type MailLang = "ca" | "es" | "en" | "fr" | "de" | "nl";
type Tr = Record<Exclude<MailLang, "ca">, string>;

export const ITEM_I18N: Record<string, Tr> = {
  water:            { es: "Agua", en: "Water", fr: "Eau", de: "Wasser", nl: "Water" },
  power:            { es: "Luz", en: "Electricity", fr: "Électricité", de: "Strom", nl: "Elektriciteit" },
  gas:              { es: "Gas", en: "Gas", fr: "Gaz", de: "Gas", nl: "Gas" },
  alarm:            { es: "Alarma", en: "Alarm", fr: "Alarme", de: "Alarmanlage", nl: "Alarm" },
  heating:          { es: "Calefacción / A.A.", en: "Heating / air conditioning", fr: "Chauffage / climatisation", de: "Heizung / Klimaanlage", nl: "Verwarming / airco" },
  pintura_parets:   { es: "Pintura paredes", en: "Wall paint", fr: "Peinture des murs", de: "Wandanstrich", nl: "Verf muren" },
  esquerdes:        { es: "Grietas", en: "Cracks", fr: "Fissures", de: "Risse", nl: "Scheuren" },
  humitats:         { es: "Humedades", en: "Damp", fr: "Humidité", de: "Feuchtigkeit", nl: "Vocht" },
  pintura_fusteria: { es: "Pintura carpintería", en: "Woodwork paint", fr: "Peinture des menuiseries", de: "Anstrich Holzwerk", nl: "Verf houtwerk" },
  pintura_ferro:    { es: "Pintura hierro", en: "Ironwork paint", fr: "Peinture des ferronneries", de: "Anstrich Metall", nl: "Verf ijzerwerk" },
  porticons:        { es: "Contraventanas", en: "Shutters", fr: "Volets", de: "Fensterläden", nl: "Luiken" },
  teulada:          { es: "Tejado", en: "Roof", fr: "Toiture", de: "Dach", nl: "Dak" },
  desguassos:       { es: "Desagües terraza", en: "Roof terrace drains", fr: "Évacuations de la terrasse", de: "Abflüsse Dachterrasse", nl: "Afvoeren dakterras" },
  mobles_exterior:  { es: "Muebles exterior", en: "Outdoor furniture", fr: "Mobilier extérieur", de: "Gartenmöbel", nl: "Tuinmeubelen" },
  tanca_exterior:   { es: "Valla exterior", en: "Outside fence", fr: "Clôture extérieure", de: "Außenzaun", nl: "Buitenomheining" },
  tendals:          { es: "Toldos", en: "Awnings", fr: "Stores bannes", de: "Markisen", nl: "Zonneschermen" },
  vidres:           { es: "Cristales / ventanas", en: "Glass / windows", fr: "Vitres / fenêtres", de: "Glas / Fenster", nl: "Ramen / glas" },
  mosquiteres:      { es: "Mosquiteras", en: "Mosquito nets", fr: "Moustiquaires", de: "Fliegengitter", nl: "Horren" },
  persianes:        { es: "Persianas", en: "Blinds", fr: "Persiennes", de: "Rollläden", nl: "Rolluiken" },
  piscina:          { es: "Piscina", en: "Swimming pool", fr: "Piscine", de: "Schwimmbad", nl: "Zwembad" },
  jardi:            { es: "Jardín", en: "Garden", fr: "Jardin", de: "Garten", nl: "Tuin" },
  gasoil:           { es: "Gasoil", en: "Heating oil", fr: "Fioul", de: "Heizöl", nl: "Stookolie" },
  descalcificador:  { es: "Descalcificador", en: "Water softener", fr: "Adoucisseur d'eau", de: "Wasserenthärter", nl: "Waterontharder" },
  humidry:          { es: "Deshumidificador (Humidry)", en: "Dehumidifier (Humidry)", fr: "Déshumidificateur (Humidry)", de: "Luftentfeuchter (Humidry)", nl: "Ontvochtiger (Humidry)" },
  mobles_interiors: { es: "Muebles interiores", en: "Indoor furniture", fr: "Mobilier intérieur", de: "Innenmöbel", nl: "Binnenmeubelen" },
  electrodomestics: { es: "Electrodomésticos", en: "Household appliances", fr: "Électroménager", de: "Haushaltsgeräte", nl: "Huishoudtoestellen" },
  cuina:            { es: "Cocina", en: "Kitchen", fr: "Cuisine", de: "Küche", nl: "Keuken" },
  banys:            { es: "Baños", en: "Bathrooms", fr: "Salles de bains", de: "Badezimmer", nl: "Badkamers" },
  telefon_internet: { es: "Teléfono / internet", en: "Telephone / internet", fr: "Téléphone / internet", de: "Telefon / Internet", nl: "Telefoon / internet" },
  neteja:           { es: "Limpieza de la casa", en: "House cleaning", fr: "Ménage de la maison", de: "Hausreinigung", nl: "Schoonmaak van het huis" },
  claus:            { es: "Llaves", en: "Keys", fr: "Clés", de: "Schlüssel", nl: "Sleutels" },
  termo:            { es: "Termo", en: "Water heater", fr: "Chauffe-eau", de: "Warmwasserspeicher", nl: "Boiler" },
  ampolles_buta:    { es: "Bombonas de butano", en: "Butane bottles", fr: "Bouteilles de butane", de: "Butanflaschen", nl: "Butaanflessen" },
  goma_gas:         { es: "Goma del gas", en: "Gas hose", fr: "Tuyau de gaz", de: "Gasschlauch", nl: "Gasslang" },
};

export const WORD_I18N: Record<"inside" | "outside" | "and" | "bad" | "order" | "salt" | "expires", Record<MailLang, string>> = {
  inside:  { ca: "dins", es: "dentro", en: "inside", fr: "intérieur", de: "innen", nl: "binnen" },
  outside: { ca: "fora", es: "fuera", en: "outside", fr: "extérieur", de: "außen", nl: "buiten" },
  and:     { ca: "i", es: "y", en: "and", fr: "et", de: "und", nl: "en" },
  bad:     { ca: "Mal estat", es: "Mal estado", en: "Poor condition", fr: "Mauvais état", de: "Schlechter Zustand", nl: "Slechte staat" },
  order:   { ca: "CAL ENCARREGAR", es: "HAY QUE PEDIR", en: "NEEDS TO BE ORDERED", fr: "À COMMANDER", de: "MUSS BESTELLT WERDEN", nl: "MOET BESTELD WORDEN" },
  salt:    { ca: "FALTA SAL", es: "FALTA SAL", en: "SALT NEEDED", fr: "MANQUE DE SEL", de: "SALZ FEHLT", nl: "ZOUT NODIG" },
  expires: { ca: "caduca", es: "caduca", en: "expires", fr: "expire", de: "läuft ab", nl: "verloopt" },
};

export function mailLang(language: string): MailLang {
  return (["ca", "es", "en", "fr", "de", "nl"] as const).find(l => l === language) || "en";
}
