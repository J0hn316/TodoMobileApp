import * as Haptics from 'expo-haptics';
import type { JSX, ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import Snackbar, { type SnackbarItem } from '../components/Snackbar';

type EnqueueInput = Omit<SnackbarItem, 'id'>;

type SnackbarCtx = {
  enqueue: (snack: EnqueueInput) => void;
  clear: () => void;
};

const Ctx = createContext<SnackbarCtx | null>(null);

export const SnackbarProvider = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const queueRef = useRef<SnackbarItem[]>([]);
  const [current, setCurrent] = useState<SnackbarItem | null>(null);

  const showNext = useCallback((): void => {
    const next = queueRef.current.shift() ?? null;
    setCurrent(next);
  }, []);

  const enqueue = useCallback(
    (snack: EnqueueInput): void => {
      const item: SnackbarItem = {
        id: Math.random().toString(36).slice(2),
        durationMs: 3000,
        ...snack,
      };
      queueRef.current.push(item);

      // Haptics per kind
      if (item.kind === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
          () => {}
        );
      } else if (item.kind === 'success') {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        ).catch(() => {});
      }

      if (!current) {
        showNext();
      }
    },
    [current, showNext]
  );

  const clear = useCallback(() => {
    queueRef.current = [];
    setCurrent(null);
  }, []);

  const onClose = useCallback(() => {
    setCurrent(null);
    setTimeout(showNext, 80);
  }, [showNext]);

  const value = useMemo(() => ({ enqueue, clear }), [enqueue, clear]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {current ? <Snackbar item={current} onClose={onClose} /> : null}
    </Ctx.Provider>
  );
};

export const useSnackbar = (): SnackbarCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSnackbar must be used within SnackbarProvider');
  return ctx;
};
