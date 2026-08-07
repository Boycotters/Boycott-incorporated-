import { formatTimeAgo } from "@/lib/utils";
import { rotate } from "@/lib/rotation";

export interface CommunityStory {
  id: string;
  name: string;
  initials: string;
  city: string;
  headline: string;
  detail: string;
  points: number;
  time: string;
  isMember: boolean;
}

const ZM_FIRST = [
  "Chanda", "Mwansa", "Bwalya", "Natasha", "Kabaso", "Mutinta", "Lushomo", "Chileshe",
  "Nchimunya", "Temwani", "Kondwani", "Musonda", "Thandiwe", "Mapalo", "Chembo",
  "Nsofwa", "Kalima", "Mubanga", "Chipo", "Lweendo", "Sikombe", "Chimwemwe",
];
const ZM_LAST = [
  "Banda", "Phiri", "Zulu", "Tembo", "Mulenga", "Sakala", "Daka", "Ngoma",
  "Mwale", "Chirwa", "Kaunda", "Simukonda", "Hamweemba", "Muyunda", "Lungu",
  "Sichone", "Kapembwa", "Nyirenda", "Mbewe", "Habeenzu",
];
const ZM_CITY = [
  "Lusaka", "Kitwe", "Ndola", "Livingstone", "Kabwe", "Chipata", "Solwezi",
  "Mufulira", "Choma", "Kasama", "Mongu", "Chingola",
];

const VERBS: Record<string, string> = {
  task_completion: "smashed a task",
  survey_completion: "finished a survey",
  video_reward: "watched an ad",
  game: "won a mini game",
  game_play: "won a mini game",
  referral_bonus: "brought in a friend",
  streak_milestone: "hit a streak milestone",
  redemption: "redeemed a reward",
  withdrawal: "cashed out",
  tier_upgrade: "levelled up their tier",
};

const FILLER_STORIES = [
  { headline: "cashed out K10 to Airtel Money", detail: "First withdrawal after two referrals", points: 150 },
  { headline: "hit a 14 day streak", detail: "Logging in before the bus every morning", points: 120 },
  { headline: "cleared the daily cap", detail: "Partner task first, then surveys — smart order", points: 200 },
  { headline: "redeemed a data bundle", detail: "Marketplace, 1GB Zamtel", points: 90 },
  { headline: "won the Basketball tournament", detail: "Top of the weekend board", points: 75 },
  { headline: "brought in 3 friends", detail: "Referral code shared in the family group", points: 150 },
  { headline: "finished all 3 surveys", detail: "Under 10 minutes total", points: 45 },
  { headline: "unlocked Gold tier", detail: "Bonus multiplier now active", points: 300 },
  { headline: "redeemed ZESCO units", detail: "Kept the lights on with points", points: 180 },
  { headline: "watched all 5 ads", detail: "Full 80% on every video", points: 25 },
];

function pick<T>(arr: T[], n: number): T {
  return arr[Math.abs(n) % arr.length];
}

function nameFor(index: number, seed: number) {
  const first = pick(ZM_FIRST, index * 7 + seed);
  const last = pick(ZM_LAST, index * 13 + seed * 3);
  return `${first} ${last}`;
}

/** Mask a real member name: "Chanda Banda" -> "Chanda B." */
export function maskName(fullName?: string | null): string | null {
  const clean = (fullName || "").trim();
  if (!clean) return null;
  const parts = clean.split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[1][0].toUpperCase()}.` : parts[0];
}

export interface RawStoryTx {
  id: string;
  type: string | null;
  description: string | null;
  points_amount: number | null;
  created_at: string | null;
  user_name?: string | null;
}

/**
 * Blends real member activity with representative Zambian community stories,
 * rotated on the shared 3-hour cadence.
 */
export function buildCommunityStories(
  txs: RawStoryTx[] | null | undefined,
  seedOffset = 0,
  limit = 24
): CommunityStory[] {
  const real: CommunityStory[] = (txs || []).map((tx, i) => {
    const masked = maskName(tx.user_name);
    const name = masked || nameFor(i, 5);
    return {
      id: `real-${tx.id}`,
      name,
      initials: name.slice(0, 2).toUpperCase(),
      city: pick(ZM_CITY, i * 5 + 2),
      headline: VERBS[tx.type || ""] || "earned points",
      detail: (tx.description || "").replace(/^Completed (task|survey): /, "").slice(0, 70),
      points: tx.points_amount || 0,
      time: formatTimeAgo(tx.created_at || new Date().toISOString()),
      isMember: !!masked,
    };
  });

  const filler: CommunityStory[] = FILLER_STORIES.map((s, i) => {
    const name = nameFor(i, seedOffset + 11);
    return {
      id: `zm-${i}`,
      name,
      initials: name.slice(0, 2).toUpperCase(),
      city: pick(ZM_CITY, i * 3),
      headline: s.headline,
      detail: s.detail,
      points: s.points,
      time: `${(i + 1) * 2}h ago`,
      isMember: false,
    };
  });

  return rotate([...real, ...filler], seedOffset).slice(0, limit);
}
