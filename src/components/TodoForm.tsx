import { z } from 'zod';
import { forwardRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { View, Text, Button, TextInput, StyleSheet } from 'react-native';

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
  colors: { text: string; border: string; card: string };
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 20,
    textAlignVertical: 'center',
  },
  error: { color: '#ef4444', marginTop: 6, fontSize: 13 },
});

const TodoForm = forwardRef<TextInput, Props>(function TodoForm(
  { mode, defaultValues, onSubmit, onCancel, colors },
  ref
) {
  const {
    control,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<TodoFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { title: '' },
    mode: 'onBlur',
  });

  useEffect(() => {
    // autofocus title when mounted
    const t = setTimeout(() => setFocus('title'), 50);
    return () => clearTimeout(t);
  }, [setFocus]);

  return (
    <View style={{ gap: 8 }}>
      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Todo title"
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
            maxLength={80}
            onSubmitEditing={handleSubmit(onSubmit)}
          />
        )}
      />

      {errors.title && <Text style={styles.error}>{errors.title.message}</Text>}

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
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        />
      </View>
    </View>
  );
});

export default TodoForm;
