let ID_COUNTER = 0;

export function generateWidgetId(prefix: string): string {
  const id = `${prefix}-${ID_COUNTER}`;
  ID_COUNTER += 1;
  return id;
}

export type Intent = 'info' | 'success' | 'warning' | 'danger';
