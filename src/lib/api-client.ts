/**
 * API client for communicating with the Llamenos server.
 *
 * Handles Schnorr signature authentication (BIP-340) on every request,
 * following the protocol spec at ../llamenos/docs/protocol/PROTOCOL.md.
 *
 * All crypto operations will be delegated to llamenos-core via UniFFI bindings.
 */

const DEFAULT_BASE_URL = "https://app.llamenos.org";

export interface ApiClientConfig {
  baseUrl: string;
}

export function createApiClient(config?: Partial<ApiClientConfig>) {
  const baseUrl = config?.baseUrl ?? DEFAULT_BASE_URL;

  return {
    baseUrl,
    // TODO: Implement authenticated fetch using llamenos-core Schnorr signing
  };
}
