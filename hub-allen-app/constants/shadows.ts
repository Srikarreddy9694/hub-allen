export const Shadows = {
  card: {
    shadowColor:   '#0B1D13',
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius:  24,
    elevation:     8,
  },
  compact: {
    shadowColor:   '#0B1D13',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius:  10,
    elevation:     3,
  },
  sheet: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: -10 },
    shadowOpacity: 0.14,
    shadowRadius:  40,
    elevation:     20,
  },
} as const;
