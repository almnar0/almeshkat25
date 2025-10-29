(() => {
  const STATE = {
    provider: localStorage.getItem('aiProvider') || 'openrouter',
    apiKey: localStorage.getItem('aiApiKey') || '',
    model: localStorage.getItem('aiModel') || 'gpt-4o-mini',
    messages: [],
    busy: false,
  };

  const PROVIDERS = {
    openrouter: {
      name: 'OpenRouter',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      models: ['gpt-4o-mini', 'meta-llama/llama-3.1-8b-instruct:free'],
      headers: (key) => ({
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      }),
      body: (messages, model) => ({
        model,
        messages,
      }),
      mapResponse: (json) => json?.choices?.[0]?.message?.content || '',
    },
    openai: {
      name: 'OpenAI',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      models: ['gpt-4o-mini', 'gpt-4o-mini-2024-07-18'],
      headers: (key) => ({
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      }),
      body: (messages, model) => ({
        model,
        messages,
      }),
      mapResponse: (json) => json?.choices?.[0]?.message?.content || '',
    },
  };

  // Inject styles once
  if (!document.getElementById('ai-assistant-styles')) {
    const style = document.createElement('style');
    style.id = 'ai-assistant-styles';
    style.textContent = `
      :root { --ai-accent: #667eea; --ai-accent2: #764ba2; --ai-bg: #ffffff; --ai-text: #222; }
      .ai-fab { position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer; z-index: 2147483000; color: #fff; background: linear-gradient(135deg, var(--ai-accent), var(--ai-accent2)); box-shadow: 0 10px 25px rgba(102,126,234,.4); display:flex; align-items:center; justify-content:center; font-size: 24px; }
      .ai-fab:hover { transform: translateY(-1px); box-shadow: 0 14px 30px rgba(118,75,162,.35); }
      .ai-panel { position: fixed; bottom: 90px; right: 20px; width: min(420px, calc(100vw - 32px)); height: min(70vh, 640px); background: var(--ai-bg); color: var(--ai-text); border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,.25); overflow: hidden; display: none; z-index: 2147483000; direction: rtl; }
      .ai-panel.open { display: flex; flex-direction: column; }
      .ai-header { background: linear-gradient(135deg, var(--ai-accent), var(--ai-accent2)); color: #fff; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; }
      .ai-title { font-weight: 700; display: flex; gap: 8px; align-items: center; }
      .ai-actions { display: flex; gap: 6px; }
      .ai-icon-btn { background: rgba(255,255,255,.15); border: none; color: #fff; padding: 8px; border-radius: 10px; cursor: pointer; }
      .ai-icon-btn:hover { background: rgba(255,255,255,.25); }
      .ai-body { flex: 1; display: flex; flex-direction: column; }
      .ai-messages { flex: 1; padding: 12px; overflow: auto; background: #f7f8fb; }
      .ai-msg { max-width: 90%; margin: 8px 0; padding: 10px 12px; border-radius: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
      .ai-user { background: #e8edff; margin-left: auto; border-bottom-left-radius: 4px; }
      .ai-bot { background: #fff; margin-right: auto; border-bottom-right-radius: 4px; box-shadow: 0 1px 0 rgba(0,0,0,0.03); }
      .ai-footer { border-top: 1px solid #eef0f6; padding: 10px; background: #fff; }
      .ai-input-wrap { display: flex; gap: 8px; align-items: flex-end; }
      .ai-input { flex: 1; min-height: 44px; max-height: 120px; border-radius: 12px; border: 1px solid #e5e7f0; padding: 10px 12px; outline: none; resize: vertical; font-family: inherit; }
      .ai-send { background: linear-gradient(135deg, var(--ai-accent), var(--ai-accent2)); color: #fff; border: none; padding: 10px 14px; border-radius: 12px; cursor: pointer; font-weight: 700; min-width: 90px; }
      .ai-send[disabled] { opacity: .6; cursor: not-allowed; }
      .ai-settings { position: absolute; inset: 0; background: rgba(0,0,0,.4); display: none; align-items: center; justify-content: center; padding: 16px; }
      .ai-settings.open { display: flex; }
      .ai-card { width: min(520px, 96vw); background: #fff; border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,.25); padding: 18px; direction: rtl; }
      .ai-card h3 { margin: 0 0 10px; }
      .ai-field { display: grid; gap: 6px; margin: 10px 0; }
      .ai-input-text, .ai-select { padding: 10px 12px; border: 1px solid #e5e7f0; border-radius: 10px; outline: none; font-family: inherit; }
      .ai-row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px; }
      .ai-btn-sec { background: #f1f3f9; border: none; padding: 8px 12px; border-radius: 10px; cursor: pointer; }
      .ai-btn { background: linear-gradient(135deg, var(--ai-accent), var(--ai-accent2)); color: #fff; border: none; padding: 8px 12px; border-radius: 10px; cursor: pointer; }
      .ai-code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; background: #0b1021; color: #e6e8f2; border-radius: 10px; padding: 10px; overflow: auto; }
      .ai-msg .ai-copy { display: inline-flex; gap: 6px; align-items:center; margin-top: 6px; font-size: 12px; background: #f1f3f9; border: none; border-radius: 8px; padding: 6px 8px; cursor: pointer; }
      @media (max-width: 520px) { .ai-panel { bottom: 80px; right: 10px; width: calc(100vw - 20px); height: 70vh; } }
    `;
    document.head.appendChild(style);
  }

  // Create FAB and Panel
  const fab = document.createElement('button');
  fab.className = 'ai-fab';
  fab.title = 'المساعد الذكي';
  fab.setAttribute('aria-label', 'المساعد الذكي');
  fab.innerHTML = '🤖';

  const panel = document.createElement('div');
  panel.className = 'ai-panel';
  panel.setAttribute('dir', 'rtl');

  panel.innerHTML = `
    <div class="ai-header">
      <div class="ai-title">🤖 المساعد الذكي <span style="opacity:.9;font-weight:400">— مبرمج محترف</span></div>
      <div class="ai-actions">
        <button class="ai-icon-btn" data-action="settings" title="الإعدادات">⚙️</button>
        <button class="ai-icon-btn" data-action="clear" title="محادثة جديدة">🧹</button>
        <button class="ai-icon-btn" data-action="close" title="إغلاق">✖</button>
      </div>
    </div>
    <div class="ai-body">
      <div class="ai-messages" id="aiMessages"></div>
      <div class="ai-footer">
        <div class="ai-input-wrap">
          <textarea class="ai-input" id="aiInput" rows="2" placeholder="اكتب سؤالك البرمجي بالعربية... (Ctrl/⌘+Enter للإرسال)"></textarea>
          <button class="ai-send" id="aiSend">إرسال</button>
        </div>
      </div>
    </div>
    <div class="ai-settings" id="aiSettings">
      <div class="ai-card">
        <h3>⚙️ إعدادات المساعد</h3>
        <div class="ai-field">
          <label>المزوّد</label>
          <select class="ai-select" id="aiProvider">
            <option value="openrouter">OpenRouter</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>
        <div class="ai-field">
          <label>الموديل</label>
          <select class="ai-select" id="aiModel"></select>
        </div>
        <div class="ai-field">
          <label>مفتاح API (يُحفظ محلياً على جهازك)</label>
          <input type="password" class="ai-input-text" id="aiApiKey" placeholder="ألصق المفتاح هنا" />
        </div>
        <div style="font-size:12px; color:#666; line-height:1.6;">
          لن يتم إرسال مفتاحك لأي جهة سوى مباشرةً إلى مزوّد الذكاء الاصطناعي الذي تختاره. يُخزّن المفتاح في المتصفح فقط.
        </div>
        <div class="ai-row">
          <button class="ai-btn-sec" data-action="settings-cancel">إلغاء</button>
          <button class="ai-btn" data-action="settings-save">حفظ</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  const els = {
    messages: panel.querySelector('#aiMessages'),
    input: panel.querySelector('#aiInput'),
    send: panel.querySelector('#aiSend'),
    settings: panel.querySelector('#aiSettings'),
    provider: panel.querySelector('#aiProvider'),
    model: panel.querySelector('#aiModel'),
    apiKey: panel.querySelector('#aiApiKey'),
  };

  // Initialize settings UI
  function refreshModels() {
    const prov = PROVIDERS[STATE.provider];
    els.model.innerHTML = prov.models.map(m => `<option value="${m}">${m}</option>`).join('');
    if (prov.models.includes(STATE.model)) {
      els.model.value = STATE.model;
    }
  }
  els.provider.value = STATE.provider;
  refreshModels();
  els.apiKey.value = STATE.apiKey;

  // Toggle panel
  function togglePanel(open) {
    panel.classList.toggle('open', open ?? !panel.classList.contains('open'));
  }
  fab.addEventListener('click', () => togglePanel(true));
  panel.querySelector('[data-action="close"]').addEventListener('click', () => togglePanel(false));

  // Settings open/close
  panel.querySelector('[data-action="settings"]').addEventListener('click', () => {
    els.provider.value = STATE.provider;
    refreshModels();
    els.apiKey.value = STATE.apiKey;
    els.settings.classList.add('open');
  });
  panel.querySelector('[data-action="clear"]').addEventListener('click', () => {
    STATE.messages = [];
    els.messages.innerHTML = '';
    greet();
  });
  els.settings.addEventListener('click', (e) => {
    if (e.target === els.settings) els.settings.classList.remove('open');
  });
  panel.querySelector('[data-action="settings-cancel"]').addEventListener('click', () => {
    els.settings.classList.remove('open');
  });
  panel.querySelector('[data-action="settings-save"]').addEventListener('click', () => {
    STATE.provider = els.provider.value;
    STATE.model = els.model.value;
    STATE.apiKey = els.apiKey.value.trim();
    localStorage.setItem('aiProvider', STATE.provider);
    localStorage.setItem('aiModel', STATE.model);
    localStorage.setItem('aiApiKey', STATE.apiKey);
    els.settings.classList.remove('open');
  });
  els.provider.addEventListener('change', () => {
    STATE.provider = els.provider.value;
    refreshModels();
  });

  // Rendering helpers
  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderContent(content) {
    // Split by triple backticks to handle code blocks
    const parts = content.split(/```([\s\S]*?)```/g);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // normal text
        const text = parts[i].trim();
        if (text) {
          const p = document.createElement('div');
          p.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
          frag.appendChild(p);
        }
      } else {
        // code block
        const codeEl = document.createElement('pre');
        codeEl.className = 'ai-code';
        const code = document.createElement('code');
        code.textContent = parts[i].replace(/^\n|\n$/g, '');
        codeEl.appendChild(code);
        const copy = document.createElement('button');
        copy.className = 'ai-copy';
        copy.textContent = 'نسخ الكود';
        copy.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(code.textContent); copy.textContent = 'تم النسخ ✓'; setTimeout(() => copy.textContent = 'نسخ الكود', 1500); } catch {}
        });
        const wrap = document.createElement('div');
        wrap.appendChild(codeEl);
        wrap.appendChild(copy);
        frag.appendChild(wrap);
      }
    }
    return frag;
  }

  function appendMessage(role, content) {
    const msg = document.createElement('div');
    msg.className = `ai-msg ${role === 'user' ? 'ai-user' : 'ai-bot'}`;
    msg.appendChild(renderContent(content));
    els.messages.appendChild(msg);
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function setBusy(b) {
    STATE.busy = b;
    els.send.disabled = b;
    els.input.disabled = b;
    els.send.textContent = b ? 'جاري المعالجة…' : 'إرسال';
  }

  async function sendMessage() {
    if (STATE.busy) return;
    const text = els.input.value.trim();
    if (!text) return;

    if (!STATE.apiKey) {
      appendMessage('assistant', 'الرجاء إضافة مفتاح API من الإعدادات أولاً (زر ⚙️).');
      return;
    }

    appendMessage('user', text);
    els.input.value = '';

    // Build message history with system prompt
    const systemPrompt = {
      role: 'system',
      content: 'أنت مساعد برمجي محترف يتحدث العربية بطلاقة. قدّم حلولاً عملية وقابلة للتنفيذ، واشرح بإيجاز. عند كتابة الشيفرة، استخدم كتل تعليمية واضحة (Markdown) وركّز على الجودة والقابلية للصيانة. لا تكشف مفاتيح أو أسرار. '
    };

    const history = [systemPrompt, ...STATE.messages, { role: 'user', content: text }]
      .slice(-18); // cap basic history

    // Optimistic state
    STATE.messages.push({ role: 'user', content: text });

    const prov = PROVIDERS[STATE.provider];
    setBusy(true);
    try {
      const res = await fetch(prov.endpoint, {
        method: 'POST',
        headers: prov.headers(STATE.apiKey),
        body: JSON.stringify(prov.body(history, STATE.model)),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const answer = prov.mapResponse(json) || 'تعذّر توليد استجابة.';
      STATE.messages.push({ role: 'assistant', content: answer });
      appendMessage('assistant', answer);
    } catch (err) {
      appendMessage('assistant', 'حدث خطأ في الاتصال بالمزوّد. تحقّق من المفتاح والاتصال بالإنترنت.');
    } finally {
      setBusy(false);
    }
  }

  els.send.addEventListener('click', sendMessage);
  els.input.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  });

  function greet() {
    appendMessage('assistant', 'مرحباً! أنا مساعد برمجي ذكي. اسألني عن إصلاح أخطاء، كتابة شيفرة، تحسين الأداء، أو شرح أي مفهوم برمجي.');
  }

  // First-time greeting
  greet();
})();
