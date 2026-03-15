import { getAppEnv, resetAppEnvForTests } from '../src/config/env';

describe('environment validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_ANALYSIS_MODEL;
    delete process.env.OPENAI_PRODUCT_SEARCH_MODEL;
    delete process.env.OPENAI_TRANSCRIPTION_MODEL;
    delete process.env.SKIP_OPENAI_API_KEY_CHECK;
    resetAppEnvForTests();
  });

  afterAll(() => {
    process.env = originalEnv;
    resetAppEnvForTests();
  });

  it('throws a clear startup error when OpenAI env vars are missing', () => {
    expect(() => getAppEnv()).toThrow(
      'SnapMend cannot start because required environment variables are missing:',
    );
  });

  it('returns validated env when all required variables exist', () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_ANALYSIS_MODEL = 'analysis-model';
    process.env.OPENAI_PRODUCT_SEARCH_MODEL = 'search-model';
    process.env.OPENAI_TRANSCRIPTION_MODEL = 'transcription-model';

    expect(getAppEnv()).toMatchObject({
      OPENAI_API_KEY: 'test-key',
      OPENAI_ANALYSIS_MODEL: 'analysis-model',
      OPENAI_PRODUCT_SEARCH_MODEL: 'search-model',
      OPENAI_TRANSCRIPTION_MODEL: 'transcription-model',
      SKIP_OPENAI_API_KEY_CHECK: false,
      PORT: 3000,
    });
  });

  it('allows startup without OPENAI_API_KEY when the skip flag is true', () => {
    process.env.SKIP_OPENAI_API_KEY_CHECK = 'true';
    process.env.OPENAI_ANALYSIS_MODEL = 'analysis-model';
    process.env.OPENAI_PRODUCT_SEARCH_MODEL = 'search-model';
    process.env.OPENAI_TRANSCRIPTION_MODEL = 'transcription-model';

    expect(getAppEnv()).toMatchObject({
      OPENAI_API_KEY: '',
      OPENAI_ANALYSIS_MODEL: 'analysis-model',
      OPENAI_PRODUCT_SEARCH_MODEL: 'search-model',
      OPENAI_TRANSCRIPTION_MODEL: 'transcription-model',
      SKIP_OPENAI_API_KEY_CHECK: true,
      PORT: 3000,
    });
  });
});
