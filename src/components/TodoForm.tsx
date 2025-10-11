import { z } from 'zod';
import { forwardRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  View,
  Text,
  Pressable,
  Keyboard,
  Platform,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import { SPACING } from '../theme/layout';
const schema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(60, 'Keep titles under 60 characters.'),
});

export type TodoFormValues = z.infer<typeof schema>;

type Props = {
  mode: 'add' | 'edit';
  defaultValues?: Partial<TodoFormValues>;
  onSubmit: (values: TodoFormValues) => void;
  onCancel?: () => void;
  loading?: boolean;
  submitLabel?: string;
  colors: {
    text: string;
    border: string;
    background?: string;
    card?: string;
    primary?: string;
  };
};

const styles = StyleSheet.create({
  field: { marginTop: 8 },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  error: { color: '#ef4444', marginTop: SPACING.xs, fontSize: 13 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    lineHeight: 20,
    textAlignVertical: 'center',
    backgroundColor: 'transparent',
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
  },
  btn: {
    minWidth: 96,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontWeight: '700',
  },
  btnGhost: {
    height: 40,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
});

const TodoForm = forwardRef<TextInput, Props>(function TodoForm(
  {
    mode,
    defaultValues,
    onSubmit,
    onCancel,
    colors,
    loading,
    submitLabel,
  }: Props,
  ref
) {
  const {
    reset,
    watch,
    control,
    setFocus,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<TodoFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { title: '' },
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  });

  // Show the current title when edit modal opens or switches items
  useEffect(() => {
    if (defaultValues) reset(defaultValues);
  }, [defaultValues, reset]);

  // Focus the input shortly after mount
  useEffect(() => {
    // autofocus title when mounted
    const t = setTimeout(() => setFocus('title'), 50);
    return () => clearTimeout(t);
  }, [setFocus]);

  // After successful ADD, clear the field
  useEffect(() => {
    if (mode === 'add' && isSubmitSuccessful) reset({ title: '' });
  }, [isSubmitSuccessful, mode, reset]);

  const titleValue = watch('title') ?? '';
  const canSubmit = titleValue.trim().length > 0 && !isSubmitting;

  const handlePress = handleSubmit((vals) => {
    Keyboard.dismiss();
    onSubmit(vals);
  });

  const primaryBg = colors?.primary ?? '#2563eb';
  const disabled = !canSubmit || !!loading;

  return (
    <>
      <View style={styles.field}>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              ref={ref}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={mode === 'add' ? 'New todo...' : 'Todo title'}
              placeholderTextColor="#9ca3af"
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
              ]}
              autoCapitalize="sentences"
              autoCorrect
              returnKeyType="done"
              underlineColorAndroid="transparent"
              maxLength={60}
              onSubmitEditing={handleSubmit(onSubmit)}
            />
          )}
        />

        {!!errors.title && (
          <Text style={styles.error}>{errors.title.message}</Text>
        )}

        <View
          style={[
            styles.row,
            { justifyContent: onCancel ? 'flex-end' : 'flex-start' },
          ]}
        >
          {onCancel && (
            <Pressable
              onPress={onCancel}
              hitSlop={8}
              style={[styles.btnGhost, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                Cancel
              </Text>
            </Pressable>
          )}

          {onCancel && <View style={{ width: 8 }} />}

          <Pressable
            onPress={disabled ? undefined : handlePress}
            hitSlop={8}
            android_ripple={
              Platform.OS === 'android' ? { color: '#00000014' } : undefined
            }
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            style={[
              styles.btn,
              {
                backgroundColor: disabled ? '#9ca3af' : primaryBg,
                opacity: loading ? 0.85 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.btnText, { color: '#fff' }]}>
                {submitLabel ?? (mode === 'add' ? 'Add' : 'Save')}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </>
  );
});

export default TodoForm;
