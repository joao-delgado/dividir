// Placeholder swatch palette for category color tags.
//
// These 10 pastels are just a starting point so seeded categories aren't all
// one color. João: replace these with your own chosen palette whenever you
// like. This same array is the fixed swatch grid the category color picker
// will offer later (no free-form color picker, by design).
export const CATEGORY_SWATCHES = [
  
  '#FDCFE8', // pink
  '#FFD6A5', // peach
  '#FFF87B', // butter
  '#CAFFBF', // mint
  '#B5EAD7', // seafoam
  '#9BF6FF', // aqua
  '#A0C4FF', // periwinkle
  '#BDB2FF', // lavender
  '#FFC6FF', // orchid
  '#FFB5A7', // coral

] as const

/** Picks a random swatch. Used when seeding default categories. */
export function randomSwatch(): string {
  return CATEGORY_SWATCHES[Math.floor(Math.random() * CATEGORY_SWATCHES.length)]
}
