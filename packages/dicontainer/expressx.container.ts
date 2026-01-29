export {
  // Type exports
  DependencyContainer,
  InjectionToken,
  Provider,
  FactoryProvider,
  ValueProvider,
  TokenProvider,
  ClassProvider,
  Disposable,
  // Note: Lifecycle is both a value and a type, so we export it once above
  Lifecycle,
  // ============================================
  // The Container & Core Logic - Re-export
  // ============================================
  container as ExpressXContainer,
  instanceCachingFactory,
  instancePerContainerCachingFactory,
  predicateAwareClassFactory
} from 'tsyringe';





