import { ROW_HEIGHT } from './layout';

type ItemLayout = { size: number; span?: number };

/**
 * Applies a fixed row height + span override for FlashList items.
 * This avoids TypeScript complaints about layout.size not existing.
 */
const applyRowLayout = (layout: ItemLayout) => {
  layout.size = ROW_HEIGHT;
};

export default applyRowLayout;
