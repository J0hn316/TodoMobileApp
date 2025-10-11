import type { JSX } from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';

type FilterProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  borderColor: string;
  selectedBg?: string;
  textColor: string;
};

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const FilterChip = ({
  label,
  selected,
  onPress,
  borderColor,
  selectedBg = '#2563eb',
  textColor,
}: FilterProps): JSX.Element => {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={`${label} filter`}
      accessibilityHint={`Show ${label.toLowerCase()} todos`}
      hitSlop={8}
      style={[
        styles.root,
        {
          borderColor,
          backgroundColor: selected ? selectedBg : 'transparent',
        },
      ]}
    >
      <Text
        style={{
          color: selected ? '#fff' : textColor,
          fontWeight: selected ? '700' : '500',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export default FilterChip;
