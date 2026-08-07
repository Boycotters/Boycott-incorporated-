export interface LocalService {
  id: string;
  name: string;
  category: "Food" | "Transport" | "Beauty" | "Fitness" | "Shopping" | "Entertainment" | "Health" | "Home";
  city: string;
  perk: string;
  blurb: string;
  emoji: string;
}

/** Curated Zambian lifestyle partners shown alongside marketplace offers. */
export const LOCAL_SERVICES: LocalService[] = [
  { id: "ls-1", name: "Hungry Lion", category: "Food", city: "Lusaka", perk: "10% off combos", blurb: "Chicken combos at Manda Hill and Kabwata branches.", emoji: "🍗" },
  { id: "ls-2", name: "Debonairs Pizza", category: "Food", city: "Lusaka", perk: "Free upsize", blurb: "Triple-decker deals for point redeemers.", emoji: "🍕" },
  { id: "ls-3", name: "Chicken Inn", category: "Food", city: "Kitwe", perk: "Buy 1 get fries", blurb: "Copperbelt branches, weekdays only.", emoji: "🍟" },
  { id: "ls-4", name: "Mika Foods", category: "Food", city: "Ndola", perk: "K20 off K150+", blurb: "Family platters and takeaway specials.", emoji: "🍲" },
  { id: "ls-5", name: "Yango Rides", category: "Transport", city: "Lusaka", perk: "K15 off first ride", blurb: "Cashless rides across Lusaka and Kitwe.", emoji: "🚗" },
  { id: "ls-6", name: "Ulendo Shuttle", category: "Transport", city: "Livingstone", perk: "5% cashback", blurb: "Intercity shuttle bookings.", emoji: "🚌" },
  { id: "ls-7", name: "Glow Beauty Bar", category: "Beauty", city: "Lusaka", perk: "Free treatment add-on", blurb: "Braiding, nails and skincare in Woodlands.", emoji: "💅" },
  { id: "ls-8", name: "Barbershop 260", category: "Beauty", city: "Kabwe", perk: "K10 off cuts", blurb: "Fades and lineups, walk-ins welcome.", emoji: "💈" },
  { id: "ls-9", name: "Pulse Fitness", category: "Fitness", city: "Lusaka", perk: "Free day pass", blurb: "Gym floor, classes and sauna access.", emoji: "🏋️" },
  { id: "ls-10", name: "Zambeef Butchery", category: "Shopping", city: "Nationwide", perk: "Points on meat packs", blurb: "Braai packs and freezer specials.", emoji: "🥩" },
  { id: "ls-11", name: "Shoprite", category: "Shopping", city: "Nationwide", perk: "Voucher redemption", blurb: "Groceries redeemable straight from points.", emoji: "🛒" },
  { id: "ls-12", name: "Ster-Kinekor Manda Hill", category: "Entertainment", city: "Lusaka", perk: "2-for-1 Tuesdays", blurb: "Cinema tickets for streak holders.", emoji: "🎬" },
  { id: "ls-13", name: "Lusaka Playhouse", category: "Entertainment", city: "Lusaka", perk: "Member pricing", blurb: "Live theatre and comedy nights.", emoji: "🎭" },
  { id: "ls-14", name: "Link Pharmacy", category: "Health", city: "Nationwide", perk: "Free BP check", blurb: "Wellness checks and prescription pickup.", emoji: "💊" },
  { id: "ls-15", name: "CFB Home", category: "Home", city: "Lusaka", perk: "Delivery waived", blurb: "Home essentials and hardware.", emoji: "🏠" },
  { id: "ls-16", name: "Mr Price", category: "Shopping", city: "Nationwide", perk: "K25 off K200+", blurb: "Fashion and homeware drops.", emoji: "👕" },
  { id: "ls-17", name: "Sugarbush Café", category: "Food", city: "Lusaka", perk: "Free coffee refill", blurb: "Brunch spot in Kabulonga.", emoji: "☕" },
  { id: "ls-18", name: "Kalahari Wellness", category: "Health", city: "Ndola", perk: "15% off massages", blurb: "Recovery and relaxation sessions.", emoji: "🧖" },
];

export const LIFESTYLE_CATEGORIES = [
  "All",
  "Marketplace",
  "Food",
  "Transport",
  "Beauty",
  "Fitness",
  "Shopping",
  "Entertainment",
  "Health",
  "Home",
] as const;
