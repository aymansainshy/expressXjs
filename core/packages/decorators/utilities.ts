export type ClassConstructor<T = object> = new (...args: any[]) => T;

export interface PrioritizedClass<T = object> {
  cls: ClassConstructor<T>;
  priority: number;
}

export function pushManyWithPriority<T>(
  target: object,
  key: string | symbol,
  metadataKey: symbol,
  components: PrioritizedClass<T>[],
): void {
  const existing = (Reflect.getMetadata(metadataKey, target, key) || []) as PrioritizedClass<T>[];
  Reflect.defineMetadata(metadataKey, [...components, ...existing], target, key);
}

export function parseArgs<T>(args: unknown[], defaultPriority: number): PrioritizedClass<T>[] {
  if (!args.length) {
    throw new Error('At least one pipeline component is required.');
  }

  const last = args[args.length - 1];
  const priority = typeof last === 'number' ? last : defaultPriority;
  const classes = typeof last === 'number' ? args.slice(0, -1) : args;

  if (!Number.isFinite(priority)) {
    throw new Error(`Pipeline priority must be a finite number. Received: ${String(priority)}`);
  }
  if (!classes.length || classes.some((component) => typeof component !== 'function')) {
    throw new Error('Pipeline decorators accept component classes followed by an optional numeric priority.');
  }

  return classes.map((cls) => ({
    cls: cls as ClassConstructor<T>,
    priority,
  }));
}
