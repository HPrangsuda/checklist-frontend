export type Language = "en" | "th";

export interface TranslationResource {
  [key: string]: string | TranslationResource;
}

export interface LanguageResources {
  [namespace: string]: TranslationResource;
}