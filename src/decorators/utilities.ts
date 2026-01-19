
export function pushWithPriority(target: Object, key: string | symbol, metaKey: any, cls: any, priority: number) {
  const existing = Reflect.getMetadata(metaKey, target, key) || [];
  Reflect.defineMetadata(metaKey, [{ cls, priority }, ...existing], target, key);
}

export function parseArgs(args: any[], defaultPriority: number) {
  if (!args.length) return [];
  const last = args[args.length - 1];
  let priority = defaultPriority;
  let classes = args;
  if (typeof last === "number") {
    priority = last;
    classes = args.slice(0, -1);
  }
  return classes.map((cls) => ({ cls, priority }));
}
