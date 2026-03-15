import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export type AppEnv = {
  PORT: number;
  OPENAI_API_KEY: string;
  OPENAI_ANALYSIS_MODEL: string;
  OPENAI_PRODUCT_SEARCH_MODEL: string;
  OPENAI_TRANSCRIPTION_MODEL: string;
};

let cachedEnv: AppEnv | null = null;

function loadDotenvFiles(): void {
  const candidatePaths = [
    join(process.cwd(), '.env'),
    join(process.cwd(), '..', '.env'),
  ];

  for (const path of candidatePaths) {
    if (existsSync(path)) {
      loadDotenv({ path, override: false });
    }
  }
}

export function getAppEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  loadDotenvFiles();

  const missing: string[] = [];

  if (!process.env.OPENAI_API_KEY?.trim()) {
    missing.push(
      'OPENAI_API_KEY is required so the backend can authenticate with OpenAI.',
    );
  }

  if (!process.env.OPENAI_ANALYSIS_MODEL?.trim()) {
    missing.push(
      'OPENAI_ANALYSIS_MODEL is required so the backend knows which model should analyze repair requests.',
    );
  }

  if (!process.env.OPENAI_TRANSCRIPTION_MODEL?.trim()) {
    missing.push(
      'OPENAI_TRANSCRIPTION_MODEL is required so uploaded voice messages can be transcribed.',
    );
  }

  if (!process.env.OPENAI_PRODUCT_SEARCH_MODEL?.trim()) {
    missing.push(
      'OPENAI_PRODUCT_SEARCH_MODEL is required so SnapMend can search the web for product suggestions.',
    );
  }

  if (missing.length > 0) {
    throw new Error(
      `SnapMend cannot start because required environment variables are missing:\n- ${missing.join(
        '\n- ',
      )}`,
    );
  }

  cachedEnv = {
    PORT: Number.parseInt(process.env.PORT ?? '3000', 10),
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    OPENAI_ANALYSIS_MODEL: process.env.OPENAI_ANALYSIS_MODEL!,
    OPENAI_PRODUCT_SEARCH_MODEL: process.env.OPENAI_PRODUCT_SEARCH_MODEL!,
    OPENAI_TRANSCRIPTION_MODEL: process.env.OPENAI_TRANSCRIPTION_MODEL!,
  };

  return cachedEnv;
}

export function resetAppEnvForTests(): void {
  cachedEnv = null;
}
