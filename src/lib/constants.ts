// Llistes de valors per als desplegables. Es poden ampliar sense tocar res més.

export const TITLES = ["Sr.", "Sra.", "Sr. i Sra.", "Empresa"];

// PDF: «1r camp → Desplegable Tipus (C., Pg., etc.)»
export const STREET_TYPES = ["C.", "Av.", "Pg.", "Pl.", "Ctra.", "Cm.", "Urb.", "Rbla.", "Ptge.", "Rda.", "Trav.", "Rue", "Avenue", "Street", "Road", "Altres"];

export const PHONE_TYPES: [string, string][] = [["mobil", "Mòbil"], ["fix", "Fix"], ["feina", "Feina"], ["fax", "Fax"], ["altre", "Altre"]];
export const EMAIL_TYPES: [string, string][] = [["particular", "Particular"], ["feina", "Feina"], ["altre", "Altre"]];

// Idioma del client: decideix l'idioma dels correus que rep (PDF pàg. 18)
export const LANGUAGES: [string, string][] = [
  ["ca", "Català"], ["es", "Castellà"], ["en", "Anglès"], ["fr", "Francès"], ["de", "Alemany"],
  ["nl", "Neerlandès"], ["it", "Italià"], ["pt", "Portuguès"], ["sv", "Suec"], ["no", "Noruec"],
  ["da", "Danès"], ["ru", "Rus"],
];

// País → codi ISO i prefix telefònic. El text del país és lliure; això només omple automàticament.
export const COUNTRIES: { name: string; code: string; prefix: string }[] = [
  { name: "Espanya", code: "ES", prefix: "+34" }, { name: "França", code: "FR", prefix: "+33" },
  { name: "Regne Unit", code: "GB", prefix: "+44" }, { name: "Alemanya", code: "DE", prefix: "+49" },
  { name: "Països Baixos", code: "NL", prefix: "+31" }, { name: "Bèlgica", code: "BE", prefix: "+32" },
  { name: "Suïssa", code: "CH", prefix: "+41" }, { name: "Itàlia", code: "IT", prefix: "+39" },
  { name: "Portugal", code: "PT", prefix: "+351" }, { name: "Andorra", code: "AD", prefix: "+376" },
  { name: "Irlanda", code: "IE", prefix: "+353" }, { name: "Suècia", code: "SE", prefix: "+46" },
  { name: "Noruega", code: "NO", prefix: "+47" }, { name: "Dinamarca", code: "DK", prefix: "+45" },
  { name: "Àustria", code: "AT", prefix: "+43" }, { name: "Luxemburg", code: "LU", prefix: "+352" },
  { name: "Estats Units", code: "US", prefix: "+1" }, { name: "Rússia", code: "RU", prefix: "+7" },
];

// Poblacions habituals per autocompletar CP i província (es pot escriure qualsevol altra)
export const TOWNS: { town: string; postalCode: string; province: string; country: string }[] = [
  { town: "Torroella de Montgrí", postalCode: "17257", province: "Girona", country: "Espanya" },
  { town: "L'Estartit", postalCode: "17258", province: "Girona", country: "Espanya" },
  { town: "Pals", postalCode: "17256", province: "Girona", country: "Espanya" },
  { town: "Begur", postalCode: "17255", province: "Girona", country: "Espanya" },
  { town: "Palafrugell", postalCode: "17200", province: "Girona", country: "Espanya" },
  { town: "Palamós", postalCode: "17230", province: "Girona", country: "Espanya" },
  { town: "Calonge", postalCode: "17251", province: "Girona", country: "Espanya" },
  { town: "La Bisbal d'Empordà", postalCode: "17100", province: "Girona", country: "Espanya" },
  { town: "Figueres", postalCode: "17600", province: "Girona", country: "Espanya" },
  { town: "Roses", postalCode: "17480", province: "Girona", country: "Espanya" },
  { town: "Girona", postalCode: "17001", province: "Girona", country: "Espanya" },
  { town: "Barcelona", postalCode: "08001", province: "Barcelona", country: "Espanya" },
];
