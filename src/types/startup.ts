/**
 * Startup data for prospecting workflow
 */
export interface StartupData {
  name: string;
  url: string;
}

/**
 * Input method for startup data
 */
export type StartupInputMethod = 'manual' | 'csv';
