import { PII_PATTERNS } from "../lib/pii-patterns";

function matchesOf(type: string, text: string): string[] {
  const results: string[] = [];
  for (const pattern of PII_PATTERNS.filter((p) => p.type === type)) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    for (const m of text.matchAll(regex)) {
      if (pattern.validate && !pattern.validate(m[0])) continue;
      results.push(m[0]);
    }
  }
  return results;
}

describe("email pattern", () => {
  it("détecte une adresse email simple", () => {
    expect(matchesOf("email", "Contact : jean.dupont@example.fr pour toute question."))
      .toEqual(["jean.dupont@example.fr"]);
  });

  it("ignore une chaîne sans arobase", () => {
    expect(matchesOf("email", "jean.dupont[at]example.fr")).toEqual([]);
  });
});

describe("phone pattern (FR)", () => {
  it("détecte un numéro au format espacé", () => {
    expect(matchesOf("phone", "Tél : 06 12 34 56 78")).toContain("06 12 34 56 78");
  });

  it("détecte un numéro au format international +33", () => {
    const matches = matchesOf("phone", "Joignable au +33 6 12 34 56 78 en journée.");
    expect(matches.length).toBeGreaterThan(0);
  });

  it("détecte un numéro sans séparateur", () => {
    expect(matchesOf("phone", "0612345678")).toContain("0612345678");
  });
});

describe("IBAN pattern", () => {
  it("détecte et valide un IBAN français correct", () => {
    // IBAN de test valide (clé MOD 97-10 correcte)
    const iban = "FR7630006000011234567890189";
    expect(matchesOf("iban", `RIB : ${iban}`)).toContain(iban);
  });

  it("rejette une chaîne ressemblant à un IBAN mais à la clé invalide", () => {
    const invalidIban = "FR0000000000000000000000000";
    expect(matchesOf("iban", invalidIban)).toEqual([]);
  });
});

describe("NIR (sécurité sociale) pattern", () => {
  it("détecte un NIR au format espacé", () => {
    const nir = "1 85 05 78 006 084 36";
    expect(matchesOf("nir", nir).length).toBeGreaterThan(0);
  });

  it("détecte un NIR sans espaces", () => {
    const nir = "185057800608436";
    expect(matchesOf("nir", nir).length).toBeGreaterThan(0);
  });
});

describe("date patterns", () => {
  it("détecte une date numérique jj/mm/aaaa", () => {
    expect(matchesOf("date_naissance", "Né le 12/03/1990.").some((m) => m.includes("12/03/1990"))).toBe(true);
  });

  it("détecte une date littérale en français", () => {
    expect(
      matchesOf("date_naissance", "Née le 5 janvier 1985 à Lyon.").some((m) =>
        m.toLowerCase().includes("janvier 1985")
      )
    ).toBe(true);
  });
});
