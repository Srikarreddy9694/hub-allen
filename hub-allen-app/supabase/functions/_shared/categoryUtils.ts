export type EventCategory =
  | 'sports'
  | 'trivia'
  | 'food_drink'
  | 'live_music'
  | 'movies'
  | 'entertainment'
  | 'general';

const RULES: [string[], EventCategory][] = [
  [
    [
      'watch party', 'nhl', 'nba', 'nfl', 'mlb', 'rangers', 'cowboys',
      'mavs', 'mavericks', 'astros', 'playoff', 'spurs', 'hockey', 'basketball',
    ],
    'sports',
  ],
  [['trivia'], 'trivia'],
  [
    [
      'taco', 'mimosa', 'brunch', 'breakfast', 'bogo', 'burger',
      'happy hour', 'bloody', 'margarita', 'wing',
    ],
    'food_drink',
  ],
  [['live music', 'band', 'concert', 'acoustic', 'dj set'], 'live_music'],
  [['movie', 'film', 'outdoor movie', 'cinema'], 'movies'],
  [['karaoke', 'bingo', 'game night', 'comedy', 'dj dance'], 'entertainment'],
];

export function deriveCategory(summary: string): EventCategory {
  const s = summary.toLowerCase();
  for (const [keywords, cat] of RULES) {
    if (keywords.some((kw) => s.includes(kw))) return cat;
  }
  return 'general';
}
