/**
 * Normalizes Arabic text for smart, accent-insensitive and spelling-variation-insensitive searching.
 * 
 * Handles:
 * - Alef variations: [أ, إ, آ, ٱ] -> ا
 * - Taa Marbuta / Haa: ة -> ه
 * - Yaa / Alef Maqsura: ى -> ي
 * - Tashkeel / Diacritics removal (Fatha, Damma, Kasra, Tanween, Shadda, Sukun)
 * - Tatweel / Kashida removal: ـ -> ""
 */
export function normalizeArabic(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toString()
    .trim()
    .toLowerCase()
    // Remove diacritics / tashkeel
    .replace(/[ً-ْٰـ]/g, "")
    // Normalize Alef
    .replace(/[أإآٱ]/g, "ا")
    // Normalize Taa Marbuta -> Haa
    .replace(/ة/g, "ه")
    // Normalize Alef Maqsura -> Yaa
    .replace(/ى/g, "ي");
}

/**
 * Checks if search query matches target text using Arabic normalization.
 */
export function arabicMatch(target: string | null | undefined, query: string): boolean {
  if (!query || !query.trim()) return true;
  if (!target) return false;
  return normalizeArabic(target).includes(normalizeArabic(query));
}
