import type { ShippingProviderAdapter } from "./types";

const providers = new Map<string, ShippingProviderAdapter>();

export function registerShippingProvider(provider: ShippingProviderAdapter) {
  providers.set(provider.code, provider);
}

export function getShippingProvider(code: string) {
  return providers.get(code);
}

export function getShippingProviders() {
  return Array.from(providers.values());
}

export function hasShippingProvider(code: string) {
  return providers.has(code);
}
