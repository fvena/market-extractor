interface AddressInfo {
  city: string;
  country: string;
  province?: string;
}

export function extractCityAndCountryBme(address?: string): AddressInfo {
  if (!address) {
    return {
      city: "",
      country: "",
    };
  }

  const result: AddressInfo = {
    city: "",
    country: "España",
  };

  // Detectar países extranjeros
  const foreignCountries: Record<string, string> = {
    AMSTERDAM: "Países Bajos",
    ITALIA: "Italia",
    LEIDEN: "Países Bajos",
    LONDON: "Reino Unido",
    LUXEMBOURG: "Luxemburgo",
    LUXEMBURGO: "Luxemburgo",
    MEXICO: "México",
    "PAISES BAJOS": "Países Bajos",
    SOFIA: "Bulgaria",
  };

  // Comprobar si es dirección extranjera
  const upperAddress = address.toUpperCase();
  for (const [key, country] of Object.entries(foreignCountries)) {
    if (upperAddress.includes(key)) {
      result.country = country;
      break;
    }
  }

  // Normalizar: quitar coma antes de paréntesis
  const normalizedAddress = address.replace(/,\s*\(/, " (");

  // PATRÓN 1: código postal + ciudad (+ provincia entre paréntesis)
  // Ej: "28760 TRES CANTOS (MADRID)"
  const regex = /\b(\d{5})\s+([A-ZÁÉÍÓÚÑÜÀÈÌÒÙÇ][A-ZÁÉÍÓÚÑÜÀÈÌÒÙÇ\s\-.']+?)(?:\s*\(([^)]+)\))?$/i;
  let match = regex.exec(normalizedAddress);

  if (match?.[2]) {
    const rawCity = match[2].trim().replace(/[-,]$/, "").trim();
    const rawProvince = match[3]?.trim();

    result.city = rawCity;
    result.province = rawProvince;
  }

  // PATRÓN 2: código postal + ciudad, provincia (con coma)
  // Ej: "28108 ALCOBENDAS, MADRID" o "30510 YECLA, MURCIA"
  if (!result.city) {
    const regex =
      /\b(\d{5})\s+([A-ZÁÉÍÓÚÑÜÀÈÌÒÙÇ][A-ZÁÉÍÓÚÑÜÀÈÌÒÙÇ\s\-.]+?),\s*([A-ZÁÉÍÓÚÑÜÀÈÌÒÙÇ][A-ZÁÉÍÓÚÑÜÀÈÌÒÙÇ\s]+)$/i;
    match = regex.exec(normalizedAddress);

    if (match?.[2]) {
      result.city = match[2].trim();
      result.province = match[3]?.trim();
    }
  }

  // PATRÓN 3: sin código postal, solo "CIUDAD (PROVINCIA)" al final
  // Ej: "ARCA 2, VITORIA (ALAVA)"
  if (!result.city) {
    const regex = /,\s*([A-ZÁÉÍÓÚÑÜÀÈÌÒÙÇ][A-ZÁÉÍÓÚÑÜÀÈÌÒÙÇ\s-]+?)\s*\(([^)]+)\)\s*$/i;
    match = regex.exec(normalizedAddress);

    if (match?.[1]) {
      result.city = match[1].trim();
      result.province = match[2]?.trim();
    }
  }

  // PATRÓN 4: sin código postal, solo ciudad al final después de coma
  // Ej: "PASEO DE LA CASTELLANA 36, MADRID"
  if (!result.city) {
    const regex = /,\s+([A-ZÁÉÍÓÚÑÜÀÈÌÒÙÇ][A-ZÁÉÍÓÚÑÜÀÈÌÒÙÇ\s]+?)$/i;
    match = regex.exec(normalizedAddress);

    if (match?.[1]) {
      const candidate = match[1].trim();
      // Verificar que no sea parte de la dirección (ej: "S/N")
      if (!/^S\/N$/i.test(candidate) && candidate.length > 2) {
        result.city = candidate;
      }
    }
  }

  // PATRÓN 5: sin código postal, "CIUDAD PROVINCIA" al final (sin coma ni paréntesis)
  // Ej: "AVDA. VíA AUGUSTA 15, SAN CUGAT DEL VALLéS BARCELONA"
  if (!result.city) {
    const knownProvinces = [
      "MADRID",
      "BARCELONA",
      "VALENCIA",
      "SEVILLA",
      "ALICANTE",
      "MURCIA",
      "MALAGA",
      "VIZCAYA",
      "GUIPUZCOA",
      "NAVARRA",
    ];
    for (const prov of knownProvinces) {
      const regex = new RegExp(
        `,\\s*([A-ZÁÉÍÓÚÑÜÀÈÌÒÙÇ][A-ZÁÉÍÓÚÑÜÀÈÌÒÙÇ\\s\\-\\']+?)\\s+${prov}\\s*$`,
        "i",
      );
      match = regex.exec(normalizedAddress);

      if (match?.[1]) {
        result.city = match[1].trim();
        result.province = prov;
        break;
      }
    }
  }

  // PATRÓN 6: direcciones extranjeras con formato especial
  // Ej: "VIALE EUROPA S/N, COLOGNO MONZESE, ITALIA"
  if (!result.city && result.country !== "España") {
    const regex = /,\s*([A-ZÁÉÍÓÚÑÜÀÈÌÒÙÇ][A-ZÁÉÍÓÚÑÜÀÈÌÒÙÇ\s-]+?),\s*[A-Z]/i;
    match = regex.exec(normalizedAddress);

    if (match?.[1]) {
      result.city = match[1].trim();
    }
  }

  return result;
}
