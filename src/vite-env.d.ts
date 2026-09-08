/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Overridable so tests and local runs can point at a stub instead of the live API. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
