const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

let fetchFn = global.fetch;
if (!fetchFn) {
  fetchFn = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
}

app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    envKey: 'OPENAI_API_KEY',
    defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
    models: (process.env.OPENAI_MODELS && process.env.OPENAI_MODELS.split(',').map((m) => m.trim()).filter(Boolean)) || [
      'gpt-4o-mini',
      'gpt-4o-mini-2024-07-18',
      'gpt-4.1-mini',
    ],
    headers(key) {
      return {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      };
    },
    body(messages, model, extras = {}) {
      return {
        model: model || this.defaultModel,
        messages,
        ...extras,
      };
    },
    mapResponse(json) {
      return json?.choices?.[0]?.message?.content?.trim();
    },
  },
  openrouter: {
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    envKey: 'OPENROUTER_API_KEY',
    defaultModel: process.env.OPENROUTER_DEFAULT_MODEL || 'gpt-4o-mini',
    models: (process.env.OPENROUTER_MODELS && process.env.OPENROUTER_MODELS.split(',').map((m) => m.trim()).filter(Boolean)) || [
      'gpt-4o-mini',
      'meta-llama/llama-3.1-8b-instruct:free',
    ],
    headers(key) {
      const headers = {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE || 'https://mishkat-tech.local',
        'X-Title': process.env.OPENROUTER_TITLE || 'Mishkat Tech Assistant',
      };
      return headers;
    },
    body(messages, model, extras = {}) {
      return {
        model: model || this.defaultModel,
        messages,
        ...extras,
      };
    },
    mapResponse(json) {
      return json?.choices?.[0]?.message?.content?.trim();
    },
  },
};

function getProviderConfig(name) {
  const provider = PROVIDERS[name];
  if (!provider) return null;
  const key = process.env[provider.envKey];
  if (!key) return null;
  return { ...provider, key };
}

function listAvailableProviders() {
  return Object.entries(PROVIDERS).reduce((acc, [name, cfg]) => {
    if (process.env[cfg.envKey]) {
        acc[name] = {
          name: cfg.name,
          defaultModel: cfg.defaultModel,
          models: cfg.models,
        };
    }
    return acc;
  }, {});
}

function normalizeMessages(messages = []) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((msg) => msg && typeof msg === 'object' && typeof msg.content === 'string')
    .map((msg) => ({
      role: ['system', 'user', 'assistant', 'tool', 'developer'].includes(msg.role) ? msg.role : 'user',
      content: msg.content.trim().slice(0, 4000),
    }))
    .slice(-20);
}

const defaultProviderName = process.env.AI_DEFAULT_PROVIDER;

app.get('/api/assistant/status', (req, res) => {
  const providers = listAvailableProviders();
  const providerNames = Object.keys(providers);
  res.json({
    providers,
    defaultProvider:
      (defaultProviderName && providers[defaultProviderName] && defaultProviderName) || providerNames[0] || null,
  });
});

app.post('/api/assistant/chat', async (req, res) => {
  try {
    const { provider: requestedProvider, model, messages, extras } = req.body || {};
    const normalizedMessages = normalizeMessages(messages);
    if (!normalizedMessages.length) {
      return res.status(400).json({ error: 'messages_required' });
    }

    const providers = listAvailableProviders();
    const fallbackProvider =
      (defaultProviderName && providers[defaultProviderName] && defaultProviderName) || Object.keys(providers)[0];
    const providerName = requestedProvider && providers[requestedProvider] ? requestedProvider : fallbackProvider;

    if (!providerName) {
      return res.status(503).json({ error: 'provider_not_configured' });
    }

    const provider = getProviderConfig(providerName);
    if (!provider) {
      return res.status(503).json({ error: 'provider_not_configured' });
    }

    const response = await fetchFn(provider.endpoint, {
      method: 'POST',
      headers: provider.headers(provider.key),
      body: JSON.stringify(provider.body(normalizedMessages, model, extras)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI provider error:', response.status, errorText);
      return res.status(response.status).json({ error: 'provider_error', details: errorText });
    }

    const json = await response.json();
    const reply = provider.mapResponse(json);
    if (!reply) {
      return res.status(502).json({ error: 'empty_response' });
    }

    res.json({ reply, provider: providerName });
  } catch (error) {
    console.error('Assistant request failed:', error);
    res.status(500).json({ error: 'assistant_failed' });
  }
});

const rootDir = path.join(__dirname);
app.use(express.static(rootDir));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'not_found' });
  }
  return res.sendFile(path.join(rootDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Mishkat Tech site running on http://localhost:${PORT}`);
});
