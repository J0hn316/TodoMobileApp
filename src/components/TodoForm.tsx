import { z } from 'zod';
import { forwardRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  View,
  Text,
  Button,
  Keyboard,
  Platform,
  TextInput,
  StyleSheet,
} from 'react-native';

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
  defaultValues?: TodoFormValues;
  onSubmit: (values: TodoFormValues) => void;
  onCancel?: () => void;
  // minimal color contract pulled from theme
  colors: { text: string; border: string; background?: string; card?: string };
};

const styles = StyleSheet.create({
  field: { marginTop: 8 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12 },
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
  error: { color: '#ef4444', marginTop: 6, fontSize: 13 },
});

const TodoForm = forwardRef<TextInput, Props>(function TodoForm(
  { mode, defaultValues, onSubmit, onCancel, colors }: Props,
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
              returnKeyType="done"
              underlineColorAndroid="transparent"
              maxLength={80}
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
          {onCancel && <Button title="Cancel" onPress={onCancel} />}
          {onCancel && <View style={{ width: 8 }} />}
          <Button
            title={mode === 'add' ? 'Add' : 'Save'}
            onPress={handleSubmit((vals) => {
              Keyboard.dismiss();
              onSubmit(vals);
            })}
            disabled={!canSubmit}
          />
        </View>
      </View>
    </>
  );
});

export default TodoForm;
