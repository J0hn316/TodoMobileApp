import type { JSX } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedProps,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  value: number;
  color: string;
  borderColor: string;
  label: string;
};

type CountBarProps = {
  active: number;
  completed: number;
  total: number;
  colors: { text: string; border: string };
  isFetchingAny: boolean;
};

const AnimatedText = Animated.createAnimatedComponent(Text);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontVariant: ['tabular-nums'],
    overflow: 'hidden',
  },
  dot: { fontSize: 12, marginHorizontal: 4, opacity: 0.7 },
});

const AnimatedNumber = ({
  value,
  color,
  borderColor,
  label,
}: Props): JSX.Element => {
  const animatedProps = useAnimatedProps(
    () =>
      ({
        style: { opacity: withTiming(1, { duration: 180 }) },
      } as any)
  );

  return (
    <View>
      <AnimatedText
        animatedProps={animatedProps}
        style={[styles.pill, { borderColor, color }]}
      >
        {value}
      </AnimatedText>
      <Text style={{ color, opacity: 0.8, marginLeft: 6 }}>{label}</Text>
    </View>
  );
};

const CountsBar = ({
  active,
  completed,
  total,
  colors,
  isFetchingAny,
}: CountBarProps): JSX.Element => {
  return (
    <View style={styles.row}>
      <AnimatedNumber
        value={active}
        label="active"
        color={colors.text}
        borderColor={colors.border}
      />
      {/* <Text style={[styles.dot, { color: colors.text }]}>•</Text> */}
      <AnimatedNumber
        value={completed}
        label="completed"
        color={colors.text}
        borderColor={colors.border}
      />
      {/* <Text style={[styles.dot, { color: colors.text }]}>•</Text> */}
      <AnimatedNumber
        value={total}
        label="total"
        color={colors.text}
        borderColor={colors.border}
      />
      {isFetchingAny ? (
        <Text style={{ marginLeft: 8, color: colors.text, opacity: 0.7 }}>
          refreshing…
        </Text>
      ) : null}
    </View>
  );
};

export default CountsBar;
