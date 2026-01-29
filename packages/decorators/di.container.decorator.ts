import 'reflect-metadata';
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
} from 'tsyringe';
import { Lifecycle, ExpressXContainer, DependencyContainer } from '../dicontainer';

//
// ─────────────────────────────────────────────
//  EXPRESSX SCOPES (Framework-level abstraction)
// ─────────────────────────────────────────────
//

export enum Scope {
  SINGLETON = 'SINGLETON',
  TRANSIENT = 'TRANSIENT',
  CONTAINER = 'CONTAINER',
  RESOLUTION = 'RESOLUTION',
}

function mapScope(scope: Scope): Lifecycle.ResolutionScoped | Lifecycle.ContainerScoped | undefined {
  switch (scope) {
    case Scope.CONTAINER:
      return Lifecycle.ContainerScoped;
    case Scope.RESOLUTION:
      return Lifecycle.ResolutionScoped;
    default:
      return undefined;
  }
}

//
// ─────────────────────────────────────────────
//  CLASS DECORATORS
// ─────────────────────────────────────────────
//

export function Injectable(scope: Scope = Scope.TRANSIENT): ClassDecorator {
  return (target: any) => {
    // Always make it injectable first
    injectable()(target);

    // Apply scope-specific behavior
    if (scope === Scope.SINGLETON) {
      singleton()(target);
    } else if (scope === Scope.CONTAINER || scope === Scope.RESOLUTION) {
      const lifecycle = mapScope(scope);
      if (lifecycle) {
        scoped(lifecycle)(target);
      }
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

export function Scoped(scope: Scope.CONTAINER | Scope.RESOLUTION): ClassDecorator {
  return (target: any) => {
    injectable()(target);
    const lifecycle = mapScope(scope);
    if (lifecycle) {
      scoped(lifecycle)(target);
    }
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

interface RegistrationOptions {
  lifecycle?: Lifecycle;
}

type RegistryProvider<T = any> = {
  token: InjectionToken<T>;
  useClass?: new (...args: any[]) => T;
  useValue?: T;
  useFactory?: (dependencyContainer: DependencyContainer) => T;
  options?: RegistrationOptions;
};

export function Registry(providers: RegistryProvider[]): ClassDecorator {
  return (target: any) => {
    return registry(providers as any)(target);
  };
}

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
