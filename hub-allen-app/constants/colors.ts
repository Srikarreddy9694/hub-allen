export const Colors = {
  // Brand core
  hubDark:      '#0B1D13',
  hubGreen:     '#1A3622',
  hubGold:      '#C8962A',
  hubGoldLight: '#F0DFA8',
  hubGoldTint:  '#F5E9C8',

  // Backgrounds
  cream:        '#F5EFE4',
  creamDark:    '#EDE5D0',
  white:        '#FFFFFF',

  // Text
  textDark:     '#0F1C14',
  textMid:      '#4A5E4F',
  textLight:    '#8E9E90',

  // Borders & dividers
  border:       '#D9D0BC',

  // Semantic (category badges)
  sportsGreen:  '#E8F2EC',
  sportsText:   '#1A4A28',
  goldBadgeBg:  '#F0DFA8',
  goldBadgeTxt: '#7A5A08',

  // Category card gradients (use as LinearGradient colors)
  gradSports:   ['#0D2B1A', '#1F5C36'] as [string, string],
  gradDJ:       ['#1A0A3A', '#4A2080'] as [string, string],
  gradMovie:    ['#0A1A30', '#1A4060'] as [string, string],
  gradMusic:    ['#1A2A0A', '#3A6010'] as [string, string],
  gradTrivia:   ['#2A1A0A', '#6A4020'] as [string, string],
  gradTaco:     ['#7A3A10', '#C87830'] as [string, string],
} as const;
