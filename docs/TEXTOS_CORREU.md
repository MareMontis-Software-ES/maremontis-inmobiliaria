# Textos del correu al propietari — per revisar

Es carreguen a **Configuració → Textos de correu** marcats «Pendent de revisar». En obrir-ne un i gravar-lo amb «Revisat» marcat, deixa d'estar pendent.
Mentre un text estigui pendent, en preparar el correu de la revisió surt un avís per llegir-lo abans d'enviar-lo.

Variables: `{{finca}}` adreça, `{{data}}` data de la revisió, `{{client}}` nom del client, `{{incidencies}}` llista d'elements a revisar.

Base (ja existent, del PDF pàg. 18):

**Anglès · Revisió feta** — Assumpte: `Revision house {{finca}}`

```
Revision {{data}}

Dear client,
We can inform you that we have checked your property – all is fine.
Best regards,
Administration and service department
```

## Revisió feta (tot correcte)

### Català

Assumpte: `Revisió casa {{finca}}`

```
Revisió {{data}}

Benvolgut client, benvolguda clienta,
Us informem que hem revisat la vostra propietat i tot està correcte.
Salutacions cordials,
Departament d'administració i serveis
```

### Castellà

Assumpte: `Revisión casa {{finca}}`

```
Revisión {{data}}

Estimado/a cliente/a:
Le informamos de que hemos revisado su propiedad y todo está correcto.
Un cordial saludo,
Departamento de administración y servicios
```

### Francès

Assumpte: `Révision maison {{finca}}`

```
Révision du {{data}}

Chère cliente, cher client,
Nous vous informons que nous avons contrôlé votre propriété : tout est en ordre.
Bien cordialement,
Département administration et services
```

### Alemany

Assumpte: `Kontrolle Haus {{finca}}`

```
Kontrolle vom {{data}}

Sehr geehrte Kundin, sehr geehrter Kunde,
wir möchten Ihnen mitteilen, dass wir Ihre Immobilie kontrolliert haben – alles ist in Ordnung.
Mit freundlichen Grüßen
Abteilung Verwaltung und Service
```

### Neerlandès

Assumpte: `Controle woning {{finca}}`

```
Controle {{data}}

Geachte klant,
Wij laten u weten dat wij uw woning hebben gecontroleerd – alles is in orde.
Met vriendelijke groet,
Afdeling administratie en service
```

## Revisió amb incidències

### Català

Assumpte: `Revisió casa {{finca}}`

```
Revisió {{data}}

Benvolgut client, benvolguda clienta,
Hem revisat la vostra propietat i hem trobat els punts següents que cal atendre:

{{incidencies}}

Ens posarem en contacte amb vosaltres per organitzar els treballs necessaris. Per a qualsevol dubte, no dubteu a contactar-nos.
Salutacions cordials,
Departament d'administració i serveis
```

### Castellà

Assumpte: `Revisión casa {{finca}}`

```
Revisión {{data}}

Estimado/a cliente/a:
Hemos revisado su propiedad y hemos encontrado los siguientes puntos que requieren atención:

{{incidencies}}

Nos pondremos en contacto con usted para organizar los trabajos necesarios. Si tiene cualquier duda, no dude en contactarnos.
Un cordial saludo,
Departamento de administración y servicios
```

### Anglès

Assumpte: `Revision house {{finca}}`

```
Revision {{data}}

Dear client,
We have checked your property and found the following points that need attention:

{{incidencies}}

We will contact you to arrange the necessary work. If you have any questions, please do not hesitate to contact us.
Best regards,
Administration and service department
```

### Francès

Assumpte: `Révision maison {{finca}}`

```
Révision du {{data}}

Chère cliente, cher client,
Nous avons contrôlé votre propriété et constaté les points suivants qui nécessitent une intervention :

{{incidencies}}

Nous vous contacterons pour organiser les travaux nécessaires. Pour toute question, n'hésitez pas à nous contacter.
Bien cordialement,
Département administration et services
```

### Alemany

Assumpte: `Kontrolle Haus {{finca}}`

```
Kontrolle vom {{data}}

Sehr geehrte Kundin, sehr geehrter Kunde,
wir haben Ihre Immobilie kontrolliert und folgende Punkte festgestellt, die Aufmerksamkeit erfordern:

{{incidencies}}

Wir werden uns mit Ihnen in Verbindung setzen, um die notwendigen Arbeiten zu vereinbaren. Bei Fragen stehen wir Ihnen gerne zur Verfügung.
Mit freundlichen Grüßen
Abteilung Verwaltung und Service
```

### Neerlandès

Assumpte: `Controle woning {{finca}}`

```
Controle {{data}}

Geachte klant,
Wij hebben uw woning gecontroleerd en de volgende punten vastgesteld die aandacht vragen:

{{incidencies}}

Wij nemen contact met u op om de nodige werkzaamheden in te plannen. Heeft u vragen, neem dan gerust contact met ons op.
Met vriendelijke groet,
Afdeling administratie en service
```


## Noms dels elements a la llista {{incidencies}}

Les observacions escrites a la revisió no es tradueixen.

| Català | Castellà | Anglès | Francès | Alemany | Neerlandès |
|---|---|---|---|---|---|
| Alarma | Alarma | Alarm | Alarme | Alarmanlage | Alarm |
| Calefacció / A.C. | Calefacción / A.A. | Heating / air conditioning | Chauffage / climatisation | Heizung / Klimaanlage | Verwarming / airco |
| Pintura parets | Pintura paredes | Wall paint | Peinture des murs | Wandanstrich | Verf muren |
| Esquerdes | Grietas | Cracks | Fissures | Risse | Scheuren |
| Humitats | Humedades | Damp | Humidité | Feuchtigkeit | Vocht |
| Pintura fusteria | Pintura carpintería | Woodwork paint | Peinture des menuiseries | Anstrich Holzwerk | Verf houtwerk |
| Pintura ferro | Pintura hierro | Ironwork paint | Peinture des ferronneries | Anstrich Metall | Verf ijzerwerk |
| Porticons | Contraventanas | Shutters | Volets | Fensterläden | Luiken |
| Teulada | Tejado | Roof | Toiture | Dach | Dak |
| Desguassos terrat | Desagües terraza | Roof terrace drains | Évacuations de la terrasse | Abflüsse Dachterrasse | Afvoeren dakterras |
| Mobles exterior | Muebles exterior | Outdoor furniture | Mobilier extérieur | Gartenmöbel | Tuinmeubelen |
| Tanca exterior | Valla exterior | Outside fence | Clôture extérieure | Außenzaun | Buitenomheining |
| Tendals | Toldos | Awnings | Stores bannes | Markisen | Zonneschermen |
| Vidres / finestres | Cristales / ventanas | Glass / windows | Vitres / fenêtres | Glas / Fenster | Ramen / glas |
| Mosquiteres | Mosquiteras | Mosquito nets | Moustiquaires | Fliegengitter | Horren |
| Persianes | Persianas | Blinds | Persiennes | Rollläden | Rolluiken |
| Piscina | Piscina | Swimming pool | Piscine | Schwimmbad | Zwembad |
| Jardí | Jardín | Garden | Jardin | Garten | Tuin |
| Gas-oil | Gasoil | Heating oil | Fioul | Heizöl | Stookolie |
| Descalcificador | Descalcificador | Water softener | Adoucisseur d'eau | Wasserenthärter | Waterontharder |
| Deshumidificador (Humidry) | Deshumidificador (Humidry) | Dehumidifier (Humidry) | Déshumidificateur (Humidry) | Luftentfeuchter (Humidry) | Ontvochtiger (Humidry) |
| Mobles interiors | Muebles interiores | Indoor furniture | Mobilier intérieur | Innenmöbel | Binnenmeubelen |
| Electrodomèstics | Electrodomésticos | Household appliances | Électroménager | Haushaltsgeräte | Huishoudtoestellen |
| Cuina | Cocina | Kitchen | Cuisine | Küche | Keuken |
| Banys | Baños | Bathrooms | Salles de bains | Badezimmer | Badkamers |
| Telèfon / internet | Teléfono / internet | Telephone / internet | Téléphone / internet | Telefon / Internet | Telefoon / internet |
| Neteja de la casa | Limpieza de la casa | House cleaning | Ménage de la maison | Hausreinigung | Schoonmaak van het huis |
| Claus | Llaves | Keys | Clés | Schlüssel | Sleutels |
| Termo | Termo | Water heater | Chauffe-eau | Warmwasserspeicher | Boiler |
| Ampolles butà | Bombonas de butano | Butane bottles | Bouteilles de butane | Butanflaschen | Butaanflessen |
| Goma gas | Goma del gas | Gas hose | Tuyau de gaz | Gasschlauch | Gasslang |
