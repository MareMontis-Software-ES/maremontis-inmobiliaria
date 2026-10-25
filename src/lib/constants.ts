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

// Oficines on es pot guardar la clau d'una finca
export const KEY_OFFICES = ["Torroella de Montgrí", "L'Estartit", "L'Escala", "Pals"];

// Nacionalitats per al desplegable de l'alta de client
export const NATIONALITIES = [
  "Espanyola", "Francesa", "Britànica", "Alemanya", "Neerlandesa", "Belga", "Suïssa", "Italiana", "Portuguesa",
  "Andorrana", "Irlandesa", "Sueca", "Noruega", "Danesa", "Finlandesa", "Austríaca", "Luxemburguesa", "Polonesa",
  "Txeca", "Hongaresa", "Romanesa", "Búlgara", "Grega", "Russa", "Ucraïnesa", "Nord-americana", "Canadenca",
  "Mexicana", "Argentina", "Brasilera", "Colombiana", "Xilena", "Marroquina", "Xinesa", "Japonesa", "Australiana", "Altres",
];

// Províncies d'Espanya (si el país no és Espanya es pot escriure qualsevol altra)
export const PROVINCES = [
  "Girona", "Barcelona", "Lleida", "Tarragona", "A Coruña", "Àlaba", "Albacete", "Alacant", "Almeria", "Astúries", "Àvila",
  "Badajoz", "Balears", "Burgos", "Càceres", "Cadis", "Cantàbria", "Castelló", "Ceuta", "Ciudad Real", "Còrdova", "Conca",
  "Granada", "Guadalajara", "Guipúscoa", "Huelva", "Osca", "Jaén", "La Rioja", "Las Palmas", "Lleó", "Lugo", "Madrid",
  "Màlaga", "Melilla", "Múrcia", "Navarra", "Ourense", "Palència", "Pontevedra", "Salamanca", "Santa Cruz de Tenerife",
  "Segòvia", "Sevilla", "Sòria", "Terol", "Toledo", "València", "Valladolid", "Biscaia", "Zamora", "Saragossa",
];

// Més poblacions de l'Empordà i rodalia (per autocompletar el codi postal)
TOWNS.push(
  { town: "L'Escala", postalCode: "17130", province: "Girona", country: "Espanya" },
  { town: "Sant Pere Pescador", postalCode: "17470", province: "Girona", country: "Espanya" },
  { town: "Empuriabrava", postalCode: "17487", province: "Girona", country: "Espanya" },
  { town: "Castelló d'Empúries", postalCode: "17486", province: "Girona", country: "Espanya" },
  { town: "Cadaqués", postalCode: "17488", province: "Girona", country: "Espanya" },
  { town: "Llançà", postalCode: "17490", province: "Girona", country: "Espanya" },
  { town: "Ullà", postalCode: "17257", province: "Girona", country: "Espanya" },
  { town: "Bellcaire d'Empordà", postalCode: "17141", province: "Girona", country: "Espanya" },
  { town: "Verges", postalCode: "17142", province: "Girona", country: "Espanya" },
  { town: "Gualta", postalCode: "17257", province: "Girona", country: "Espanya" },
  { town: "Fontanilles", postalCode: "17257", province: "Girona", country: "Espanya" },
  { town: "Regencós", postalCode: "17214", province: "Girona", country: "Espanya" },
  { town: "Mont-ras", postalCode: "17253", province: "Girona", country: "Espanya" },
  { town: "Sant Feliu de Guíxols", postalCode: "17220", province: "Girona", country: "Espanya" },
  { town: "Platja d'Aro", postalCode: "17250", province: "Girona", country: "Espanya" },
  { town: "Tossa de Mar", postalCode: "17320", province: "Girona", country: "Espanya" },
  { town: "Lloret de Mar", postalCode: "17310", province: "Girona", country: "Espanya" },
  { town: "Blanes", postalCode: "17300", province: "Girona", country: "Espanya" },
  { town: "Olot", postalCode: "17800", province: "Girona", country: "Espanya" },
  { town: "Banyoles", postalCode: "17820", province: "Girona", country: "Espanya" },
  { town: "Madrid", postalCode: "28001", province: "Madrid", country: "Espanya" },
);

// Més països (el codi i el prefix s'omplen sols en triar-lo)
COUNTRIES.push(
  { name: "Finlàndia", code: "FI", prefix: "+358" }, { name: "Polònia", code: "PL", prefix: "+48" },
  { name: "República Txeca", code: "CZ", prefix: "+420" }, { name: "Hongria", code: "HU", prefix: "+36" },
  { name: "Romania", code: "RO", prefix: "+40" }, { name: "Grècia", code: "GR", prefix: "+30" },
  { name: "Ucraïna", code: "UA", prefix: "+380" }, { name: "Canadà", code: "CA", prefix: "+1" },
  { name: "Mèxic", code: "MX", prefix: "+52" }, { name: "Argentina", code: "AR", prefix: "+54" },
  { name: "Brasil", code: "BR", prefix: "+55" }, { name: "Marroc", code: "MA", prefix: "+212" },
  { name: "Mònaco", code: "MC", prefix: "+377" }, { name: "Austràlia", code: "AU", prefix: "+61" },
);
