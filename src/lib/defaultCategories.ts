// Default category tree, seeded once on first setup. After seeding, both users
// can add / rename / remove categories freely in Settings, so this is only a
// starting point, not a fixed structure. Icons are Phosphor icon names.

export interface SeedCategory {
  name: string
  icon: string
  children: { name: string; icon: string }[]
}

export const DEFAULT_CATEGORIES: SeedCategory[] = [
  {
    name: 'Uncategorized',
    icon: 'Folder',
    children: [{ name: 'General', icon: 'Circle' }], // default category for new expenses
  },
  {
    name: 'Food and Drinks',
    icon: 'ForkKnife',
    children: [
      { name: 'Groceries', icon: 'ShoppingCart' },
      { name: 'Dining Out', icon: 'ForkKnife' },
      { name: 'Drinks', icon: 'Wine' },
      { name: 'Other', icon: 'DotsThreeOutline' },
    ],
  },
  {
    name: 'Home',
    icon: 'House',
    children: [
      { name: 'Household supplies', icon: 'Broom' },
      { name: 'Furniture', icon: 'Armchair' },
      { name: 'Electronics', icon: 'Television' },
      { name: 'Maintenance', icon: 'Wrench' },
      { name: 'Services', icon: 'Handshake' },
      { name: 'Condominium', icon: 'Buildings' },
      { name: 'Other', icon: 'DotsThreeOutline' },
    ],
  },
  {
    name: 'Pets',
    icon: 'PawPrint',
    children: [
      { name: 'Food', icon: 'BowlFood' },
      { name: 'Vet', icon: 'Stethoscope' },
      { name: 'Toys', icon: 'Bone' },
      { name: 'Spa', icon: 'Sparkle' },
      { name: 'Insurance', icon: 'ShieldCheck' },
      { name: 'Other', icon: 'DotsThreeOutline' },
    ],
  },
  {
    name: 'Utilities',
    icon: 'Lightning',
    children: [
      { name: 'Electricity', icon: 'Lightning' },
      { name: 'Water', icon: 'Drop' },
      { name: 'Telecommunications', icon: 'WifiHigh' },
      { name: 'Cleaning', icon: 'Broom' },
      { name: 'Other', icon: 'DotsThreeOutline' },
    ],
  },
  {
    name: 'Life',
    icon: 'Heart',
    children: [
      { name: 'Education', icon: 'GraduationCap' },
      { name: 'Hobbies', icon: 'PaintBrush' },
      { name: 'Clothing', icon: 'TShirt' },
      { name: 'Gifts', icon: 'Gift' },
      { name: 'Insurance', icon: 'ShieldCheck' },
      { name: 'Medical Expenses', icon: 'FirstAid' },
      { name: 'Taxes', icon: 'Receipt' },
      { name: 'Holidays', icon: 'Island' },
      { name: 'Other', icon: 'DotsThreeOutline' },
    ],
  },
  {
    name: 'Entertainment',
    icon: 'FilmSlate',
    children: [
      { name: 'Concerts', icon: 'MusicNotes' },
      { name: 'Events', icon: 'Ticket' },
      { name: 'Movies', icon: 'FilmSlate' },
      { name: 'Streaming Services', icon: 'MonitorPlay' },
      { name: 'Other', icon: 'DotsThreeOutline' },
    ],
  },
  {
    name: 'Transportation',
    icon: 'Car',
    children: [
      { name: 'Fuel', icon: 'GasPump' },
      { name: 'Taxi', icon: 'Taxi' },
      { name: 'Bus/Train', icon: 'Train' },
      { name: 'Plane', icon: 'Airplane' },
      { name: 'Parking', icon: 'Car' },
      { name: 'Other', icon: 'DotsThreeOutline' },
    ],
  },
]
