import {
  injectable,
  inject,
  singleton,
  scoped,
  injectAll,
  injectWithTransform,
  registry,
  autoInjectable,
  InjectionToken,
  // Type exports
  DependencyContainer,
  // Note: Lifecycle is both a value and a type, so we export it once above
  Lifecycle,
  container as ExpressXContainer,
} from 'tsyringe';


//
// ─────────────────────────────────────────────
//  CLASS DECORATORS
// ─────────────────────────────────────────────
//
export function Injectable(lifecycle: Lifecycle = Lifecycle.Singleton): ClassDecorator {
  return (target: any) => {
    // Always make it injectable first
    injectable()(target);

    // Apply lifecycle scope-specific behavior
    if (lifecycle === Lifecycle.Singleton) {
      singleton()(target);
    } else if (lifecycle === Lifecycle.ContainerScoped || lifecycle === Lifecycle.ResolutionScoped) {
      scoped(lifecycle)(target);
    }
    // TRANSIENT doesn't need additional decorator - injectable() is enough
  };
}

export function Singleton(): ClassDecorator {
  return (target: any) => {
    injectable()(target);
    singleton()(target);
  };
}

export function Scoped(lifecycle: Lifecycle.ContainerScoped | Lifecycle.ResolutionScoped): ClassDecorator {
  return (target: any) => {
    injectable()(target);
    scoped(lifecycle)(target);
  };
}

export function AutoInjectable(): ClassDecorator {
  return (target: any) => {
    return autoInjectable()(target as any);
  };
}

//
// ─────────────────────────────────────────────
//  REGISTRY DECORATOR
// ─────────────────────────────────────────────
//


export interface RegistrationOptions {
  lifecycle?: Lifecycle;
}

export type RegistryProvider<T = any> = {
  token: InjectionToken<T>;
  useClass?: new (...args: any[]) => T;
  useValue?: T;
  useFactory?: (dependencyContainer: DependencyContainer) => T;
  options?: RegistrationOptions;
};

// Helper function for easier registry creation
export function createProvider<T>(
  token: InjectionToken<T>,
  implementation: new (...args: any[]) => T,
  options?: RegistrationOptions
): RegistryProvider<T> {
  return {
    token,
    useClass: implementation,
    options,
  };
}


export function Registry(providers: RegistryProvider[]): ClassDecorator {
  return (target: any) => {
    providers.forEach(p => {
      if (!p.token) {
        throw new Error('Provider must have a token');
      }
    });
    return registry(providers as any)(target);
  };
}



//
// ─────────────────────────────────────────────
//  PARAMETER DECORATORS
// ─────────────────────────────────────────────
//

export function Inject(token: InjectionToken<any>): ParameterDecorator {
  return inject(token);
}

export function InjectAll(token: InjectionToken<any>): ParameterDecorator {
  return injectAll(token);
}

//
// ─────────────────────────────────────────────
//  TRANSFORM DECORATOR
// ─────────────────────────────────────────────
//

interface Transform<I = any, O = any> {
  transform(value: I): O;
}

function createTransformToken(fn: (value: any) => any): InjectionToken<Transform> {
  const token = Symbol('ExpressXTransform');

  ExpressXContainer.register(token, {
    useValue: {
      transform: fn,
    },
  });

  return token;
}

export function InjectWithTransform<TInput = any, TOutput = any>(
  token: InjectionToken<TInput>,
  transformer: (value: TInput) => TOutput
): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    const transformToken = createTransformToken(transformer);
    injectWithTransform(token, transformToken)(target as any, propertyKey as any, parameterIndex);
  };
}


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
  // ===========================================
  instanceCachingFactory,
  instancePerContainerCachingFactory,
  predicateAwareClassFactory,
  container as ExpressXContainer,
} from 'tsyringe';