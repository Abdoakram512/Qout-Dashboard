/**
 * Normalizes Arabic text for smart, accent-insensitive and spelling-variation-insensitive searching.
 * 
 * Handles:
 * - Alef variations: [أ, إ, آ, ٱ] -> ا
 * - Taa Marbuta / Haa: [ة, ه] -> ه
 * - Yaa / Alef Maqsura / Nabrah: [ى, ي, ئ] -> ي
 * - Waw variations: [ؤ, و] -> و
 * - Tashkeel / Diacritics removal (Fatha, Damma, Kasra, Tanween, Shadda, Sukun, Dagger Alef, etc.)
 * - Tatweel / Kashida removal: ـ -> ""
 * - Arabic-Indic digits conversion: [٠-٩] -> [0-9]
 */
export function normalizeArabic(text: string | null | undefined): string {
  if (!text) return "";
  let normalized = text.toString().trim().toLowerCase();

  // 1. Convert Arabic-Indic digits (٠-٩) to ASCII (0-9)
  const arabicIndicDigits = "٠١٢٣٤٥٦٧٨٩";
  const asciiDigits = "0123456789";
  for (let i = 0; i < arabicIndicDigits.length; i++) {
    normalized = normalized.split(arabicIndicDigits[i]).join(asciiDigits[i]);
  }

  return normalized
    // Remove diacritics / tashkeel (064B - 065F) and dagger alef (0670) and tatweel (0640)
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    // Normalize all Alef variations
    .replace(/[أإآٱ]/g, "ا")
    // Normalize Taa Marbuta -> Haa
    .replace(/ة/g, "ه")
    // Normalize Alef Maqsura / Hamza on Yaa -> Yaa
    .replace(/[ىئ]/g, "ي")
    // Normalize Waw with Hamza -> Waw
    .replace(/ؤ/g, "و")
    // Collapse multiple whitespaces
    .replace(/\s+/g, " ");
}

/**
 * Checks if search query matches target text using normalized Arabic comparison.
 */
export function arabicMatch(target: string | null | undefined, query: string): boolean {
  if (!query || !query.trim()) return true;
  if (!target) return false;
  return normalizeArabic(target).includes(normalizeArabic(query));
}
