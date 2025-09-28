import React from 'react';
// Import the whole module so we can handle both export shapes.
import * as FL from '@shopify/flash-list';

// Pick the named export if available, otherwise fall back to default.
// Type it as a generic React component so JSX accepts it.
const FlashList = ((FL as any).FlashList ??
  (FL as any).default) as React.ForwardRefExoticComponent<any>;

export default FlashList;
