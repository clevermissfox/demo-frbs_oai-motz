import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  dangerouslyAllowBrowser: true
});

export default openai;