import { Platform } from 'react-native';

export const ROW_HEIGHT = 72;

export const SPACING = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  android: {
    elevation: 2,
  },
  default: {},
});
