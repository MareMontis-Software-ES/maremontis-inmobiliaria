// Tipus compartits. Als formularis tot és text (les dates en format AAAA-MM-DD).

export type Role = "admin" | "oficina" | "consulta";

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  role: Role;
  is_responsible: boolean;
}

export interface Phone { phone_type: string; country_prefix: string; phone_number: string; notes: string }
export interface Email { email_type: string; email: string }
export interface Vehicle { vehicle: string; brand: string; model: string; plate: string; itv_date: string }

export interface ClientAddress {
  street_type: string; street_name: string; street_number: string; extra: string;
  postal_code: string; municipality: string; province: string; country: string; country_code: string;
}

export interface RelatedPerson {
  id?: string;
  property_id: string;         // finca a la qual pertany ("" = sense finca assignada, dades antigues)
  relation: "conjuge" | "copropietari";
  title: string; first_name: string; last_name: string;
  birth_date: string; birth_city: string; birth_country_code: string;
  passport: string; passport_expiry: string; nie: string; dni: string;
  labels: boolean; anagram: string; ownership_percentage: string;
  street: string; postal_code: string; municipality: string; province: string; country: string;
  phones: { type: string; prefix: string; number: string }[];
  emails: { type: string; email: string }[];
}

export interface ClientRecord {
  id?: string;
  client_code: string;
  account_code: string;        // subcompte comptable, s'escriu a mà
  title: string; sex: string; initials: string;
  first_name: string; last_name: string; short_name: string;
  client_type: string;
  dni: string; nie: string; passport: string; passport_expiry: string;
  language: string; nationality: string;
  birth_date: string; birth_city: string; birth_country_code: string; anagram: string;
  resident: boolean; authorization_ok: boolean;
  responsible_id: string; documents_path: string; observations: string;
  status: "active" | "inactive";
}

export interface ClientFull {
  client: ClientRecord;
  address: ClientAddress;
  phones: Phone[];
  emails: Email[];
  related: RelatedPerson[];
  vehicles: Vehicle[];
}

/** Serveis que inclou el contracte d'una finca (PDF 2). Sense contracte assignat, tot habilitat. */
export interface ContractFeatures {
  contract: string;
  revisions: boolean; rent_210: boolean; visits: boolean; key_custody: boolean; receipts: boolean;
  /** Altres opcions del contracte, amb text lliure */
  others: string[];
}

export interface PropertyLink {
  id: string;
  admin_number: number;
  address: string;
  municipality: string;
  status: string;
  ownership_percentage: number | null;
  features: ContractFeatures;
}

export interface ClientSummary {
  id: string;
  client_code: number;
  account_code: string;
  title: string;
  first_name: string;
  last_name: string;
  dni: string;
  nie: string;
  resident: boolean;
  status: "active" | "inactive";
  phone: string;
  email: string;
  municipality: string;
  country: string;
  properties: PropertyLink[];
}

export interface Alert {
  id: string;
  client_id: string | null;
  property_id: string | null;
  alert_type: string;
  title: string;
  content: string | null;
  start_date: string;
  due_date: string | null;
  checklist: { text: string; done: boolean }[];
  completed_at: string | null;
  overdue?: boolean;
  client_name?: string;
}

export type Section =
  | "Inici" | "Clients" | "Immobles" | "Alertes" | "Claus" | "Incidències" | "Revisions"
  | "Contractes" | "Industrials" | "Impostos" | "Estadístiques" | "Configuració";
