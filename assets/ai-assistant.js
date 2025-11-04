(() => {
  const STORAGE_KEYS = {
    provider: 'aiProvider',
    model: 'aiModel',
    messages: 'aiAssistantMessages.v2',
  };
  const MAX_MESSAGES = 20;

  function loadMessages() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.messages);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((msg) => msg && typeof msg.role === 'string' && typeof msg.content === 'string')
        .map((msg) => ({ role: msg.role, content: msg.content }))
        .slice(-MAX_MESSAGES);
    } catch {
      return [];
    }
  }

  const STATE = {
    provider: localStorage.getItem(STORAGE_KEYS.provider) || '',
    model: localStorage.getItem(STORAGE_KEYS.model) || '',
    messages: loadMessages(),
    busy: false,
    serverHealthy: false,
    providers: {},
    configLoaded: false,
    status: 'loading',
    statusMessage: 'جار التحقق من الخادم...',
  };

  function saveMessages() {
    if (!STATE.messages.length) {
      localStorage.removeItem(STORAGE_KEYS.messages);
      return;
    }
    localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(STATE.messages.slice(-MAX_MESSAGES)));
  }

  function savePreferences() {
    if (STATE.provider) {
      localStorage.setItem(STORAGE_KEYS.provider, STATE.provider);
    }
    if (STATE.model) {
      localStorage.setItem(STORAGE_KEYS.model, STATE.model);
    }
  }

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
      .ai-title { font-weight: 700; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .ai-status-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 0.75rem; padding: 4px 8px; border-radius: 999px; background: rgba(255,255,255,0.18); color: #fff; font-weight: 600; }
      .ai-status-chip.ok { background: rgba(34,197,94,0.3); }
      .ai-status-chip.error { background: rgba(248,113,113,0.35); }
      .ai-status-chip.loading { background: rgba(250,204,21,0.35); }
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
      .ai-card { width: min(540px, 96vw); background: #fff; border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,.25); padding: 18px; direction: rtl; max-height: 90vh; overflow: auto; }
      .ai-card h3 { margin: 0 0 10px; display:flex; align-items:center; gap:8px; }
      .ai-field { display: grid; gap: 6px; margin: 10px 0; }
      .ai-select { padding: 10px 12px; border: 1px solid #e5e7f0; border-radius: 10px; outline: none; font-family: inherit; }
      .ai-select:disabled { background: #f5f6fb; color: #9aa0b5; cursor: not-allowed; }
      .ai-row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
      .ai-btn-sec { background: #f1f3f9; border: none; padding: 8px 12px; border-radius: 10px; cursor: pointer; }
      .ai-btn { background: linear-gradient(135deg, var(--ai-accent), var(--ai-accent2)); color: #fff; border: none; padding: 8px 12px; border-radius: 10px; cursor: pointer; }
      .ai-code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; background: #0b1021; color: #e6e8f2; border-radius: 10px; padding: 10px; overflow: auto; }
      .ai-msg .ai-copy { display: inline-flex; gap: 6px; align-items:center; margin-top: 6px; font-size: 12px; background: #f1f3f9; border: none; border-radius: 8px; padding: 6px 8px; cursor: pointer; }
      .ai-status-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; padding: 6px 12px; border-radius: 999px; font-weight: 600; width: fit-content; }
      .ai-status-pill.ok { background: #dcfce7; color: #166534; }
      .ai-status-pill.error { background: #fee2e2; color: #b91c1c; }
      .ai-status-pill.loading { background: #fef3c7; color: #92400e; }
      .ai-hint { font-size: 12px; color: #4d5464; line-height: 1.7; background: #f8f9fc; border: 1px solid #e5e7f0; border-radius: 12px; padding: 12px 14px; }
      .ai-hint code { background: #0f172a; color: #e2e8f0; padding: 2px 6px; border-radius: 6px; font-size: 11px; display: inline-block; }
      .ai-hint pre { margin: 8px 0 0; background: #0b1021; color: #e6e8f2; padding: 10px; border-radius: 10px; overflow: auto; }
      .ai-hint strong { color: #1f2a6b; }
      @media (max-width: 520px) { .ai-panel { bottom: 80px; right: 10px; width: calc(100vw - 20px); height: 70vh; } }
    `;
    document.head.appendChild(style);
  }

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
      <div class="ai-title">
        🤖 المساعد الذكي <span style="opacity:.9;font-weight:400">— مبرمج محترف</span>
        <span class="ai-status-chip loading" id="aiStatusChip">جار التحقق…</span>
      </div>
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
          <label>حالة الخادم</label>
          <div class="ai-status-pill loading" id="aiStatusPill">جار التحقق…</div>
        </div>
        <div class="ai-field">
          <label>المزوّد</label>
          <select class="ai-select" id="aiProvider" disabled></select>
        </div>
        <div class="ai-field">
          <label>الموديل</label>
          <select class="ai-select" id="aiModel" disabled></select>
        </div>
        <div class="ai-hint" id="aiSettingsHint">
          لتفعيل المساعد، شغّل الخادم المضمَّن بالأوامر <code>npm install</code> ثم <code>npm start</code> داخل الجذر. ضع مفاتيحك في ملف <code>.env</code> في الخادم.
        </div>
        <div class="ai-row">
          <button class="ai-btn-sec" data-action="settings-cancel">إغلاق</button>
          <button class="ai-btn" data-action="settings-refresh">تحديث الحالة</button>
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
    statusPill: panel.querySelector('#aiStatusPill'),
    statusChip: panel.querySelector('#aiStatusChip'),
    settingsHint: panel.querySelector('#aiSettingsHint'),
  };

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderContent(content) {
    const parts = content.split(/```([\s\S]*?)```/g);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        const text = parts[i].trim();
        if (text) {
          const p = document.createElement('div');
          p.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
          frag.appendChild(p);
        }
      } else {
        const codeEl = document.createElement('pre');
        codeEl.className = 'ai-code';
        const code = document.createElement('code');
        code.textContent = parts[i].replace(/^\n|\n$/g, '');
        codeEl.appendChild(code);
        const copy = document.createElement('button');
        copy.className = 'ai-copy';
        copy.textContent = 'نسخ الكود';
        copy.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(code.textContent);
            copy.textContent = 'تم النسخ ✓';
            setTimeout(() => (copy.textContent = 'نسخ الكود'), 1500);
          } catch {}
        });
        const wrap = document.createElement('div');
        wrap.appendChild(codeEl);
        wrap.appendChild(copy);
        frag.appendChild(wrap);
      }
    }
    return frag;
  }

  function appendMessage(role, content, options = {}) {
    const msg = document.createElement('div');
    msg.className = `ai-msg ${role === 'user' ? 'ai-user' : 'ai-bot'}`;
    msg.appendChild(renderContent(content));
    els.messages.appendChild(msg);
    els.messages.scrollTop = els.messages.scrollHeight;

    if (options.persist) {
      STATE.messages.push({ role, content: content.trim() });
      if (STATE.messages.length > MAX_MESSAGES) {
        STATE.messages = STATE.messages.slice(-MAX_MESSAGES);
      }
      saveMessages();
    }
  }

  function clearConversation() {
    STATE.messages = [];
    saveMessages();
    renderConversation();
  }

  function renderConversation() {
    els.messages.innerHTML = '';
    if (STATE.messages.length) {
      STATE.messages.forEach((msg) => appendMessage(msg.role, msg.content));
    } else {
      appendMessage(
        'assistant',
        'مرحباً! أنا مساعد برمجي ذكي من قسم التقنية. اكتب استفسارك وسأساعدك بخطوات واضحة وأمثلة. لتفعيل الاتصال بالخادم، اطلع على تلميحات زر ⚙️.',
      );
    }
  }

  function setBusy(busy) {
    STATE.busy = busy;
    els.send.disabled = busy;
    els.input.disabled = busy;
    els.send.textContent = busy ? 'جاري المعالجة…' : 'إرسال';
  }

  function updateStatusUI() {
    const status = STATE.status;
    const message = STATE.statusMessage;
    const providersAvailable = Object.keys(STATE.providers).length;

    const chip = els.statusChip;
    const pill = els.statusPill;

    chip.textContent = message;
    chip.classList.remove('ok', 'error', 'loading');
    pill.textContent = message;
    pill.classList.remove('ok', 'error', 'loading');

    switch (status) {
      case 'ok':
        chip.classList.add('ok');
        pill.classList.add('ok');
        break;
      case 'error':
        chip.classList.add('error');
        pill.classList.add('error');
        break;
      default:
        chip.classList.add('loading');
        pill.classList.add('loading');
        break;
    }

    const baseHint = `يمكنك تشغيل الخادم المحلي بالأوامر <code>npm install</code> ثم <code>npm start</code> داخل جذر المشروع. ضع مفاتيحك في ملف <code>.env</code> بالشكل التالي:\n<pre>OPENAI_API_KEY=sk-...\nOPENAI_DEFAULT_MODEL=gpt-4o-mini</pre>`;

    if (!providersAvailable) {
      els.settingsHint.innerHTML = `<strong>الخادم غير متصل.</strong> ${baseHint}`;
    } else {
      const selectedProvider = STATE.provider && STATE.providers[STATE.provider];
      const providerName = selectedProvider ? selectedProvider.name : 'المزوّد';
      els.settingsHint.innerHTML = `<strong>الخادم متصل.</strong> اختر المزوّد المناسب (${providerName}) والموديل للحصول على أفضل إجابات. ${providersAvailable > 1 ? 'يمكنك التنقل بين المزودين من القائمة.' : ''}`;
    }
  }

  function populateProviderOptions() {
    const providers = STATE.providers;
    const names = Object.keys(providers);
    els.provider.innerHTML = names
      .map((name) => `<option value="${name}">${providers[name].name || name}</option>`)
      .join('');
    els.provider.disabled = !names.length;

    if (!names.length) {
      STATE.provider = '';
      els.model.innerHTML = '';
      els.model.disabled = true;
      return;
    }

    if (!STATE.provider || !providers[STATE.provider]) {
      STATE.provider = names[0];
    }
    els.provider.value = STATE.provider;
  }

  function populateModelOptions() {
    const providerInfo = STATE.provider ? STATE.providers[STATE.provider] : null;
    const models = providerInfo?.models || [];
    els.model.innerHTML = models.map((m) => `<option value="${m}">${m}</option>`).join('');
    els.model.disabled = !models.length;

    if (!models.length) {
      STATE.model = '';
      return;
    }

    if (!STATE.model || !models.includes(STATE.model)) {
      STATE.model = providerInfo?.defaultModel || models[0];
    }
    els.model.value = STATE.model;
  }

  function syncSettingsUI() {
    populateProviderOptions();
    populateModelOptions();
    savePreferences();
    updateStatusUI();
  }

  async function fetchConfig({ showLoader = true } = {}) {
    if (showLoader) {
      STATE.status = 'loading';
      STATE.statusMessage = 'جار التحقق من الخادم...';
      updateStatusUI();
    }

    try {
      const res = await fetch('/api/assistant/status', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      STATE.providers = data.providers || {};
      STATE.configLoaded = true;
      if (Object.keys(STATE.providers).length) {
        STATE.serverHealthy = true;
        STATE.status = 'ok';
        STATE.statusMessage = 'الخادم متصل';
        if (!STATE.provider || !STATE.providers[STATE.provider]) {
          STATE.provider = data.defaultProvider && STATE.providers[data.defaultProvider]
            ? data.defaultProvider
            : Object.keys(STATE.providers)[0];
        }
        const providerInfo = STATE.providers[STATE.provider];
        if (providerInfo) {
          const models = providerInfo.models || [];
          if (!STATE.model || !models.includes(STATE.model)) {
            STATE.model = providerInfo.defaultModel || models[0] || '';
          }
        }
      } else {
        STATE.serverHealthy = false;
        STATE.status = 'error';
        STATE.statusMessage = 'لم يتم إعداد المزود بعد';
      }
      syncSettingsUI();
    } catch (error) {
      STATE.providers = {};
      STATE.serverHealthy = false;
      STATE.status = 'error';
      STATE.statusMessage = 'تعذّر الاتصال بالخادم';
      updateStatusUI();
      console.warn('Assistant config fetch failed:', error);
    }
  }

  function buildHistory() {
    const systemPrompt = {
      role: 'system',
      content:
        'أنت مساعد برمجي محترف يتحدث العربية بطلاقة. قدّم حلولاً عملية قابلة للتنفيذ مع شيفرة مختصرة واضحة. التزم بالخطوات المهيكلة واذكر التحذيرات الأمنية أو الأداء عند الحاجة. لا تكشف أي مفاتيح أو بيانات حساسة.',
    };
    return [systemPrompt, ...STATE.messages.slice(-MAX_MESSAGES)];
  }

  async function sendMessage() {
    if (STATE.busy) return;
    const text = els.input.value.trim();
    if (!text) return;

    if (!STATE.serverHealthy) {
      appendMessage(
        'assistant',
        'لا يمكن الوصول للخادم حالياً. تأكد من تشغيله عبر <code>npm start</code> ثم جرّب مجدداً (زر ⚙️ يحتوي التعليمات).',
      );
      fetchConfig({ showLoader: true });
      return;
    }

    appendMessage('user', text, { persist: true });
    els.input.value = '';

    setBusy(true);
    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: STATE.provider,
          model: STATE.model,
          messages: buildHistory(),
          extras: { temperature: 0.2 },
        }),
      });

      if (!response.ok) {
        const textErr = await response.text();
        appendMessage('assistant', 'حدث خطأ أثناء التواصل مع الخادم. راجع السجلات أو إعدادات المزود.', { persist: false });
        if (response.status === 503) {
          STATE.serverHealthy = false;
          STATE.status = 'error';
          STATE.statusMessage = 'الخادم جاهز لكن المزوّد مفقود';
          updateStatusUI();
        }
        console.error('Assistant response error:', textErr);
        return;
      }

      const data = await response.json();
      if (!data || !data.reply) {
        appendMessage('assistant', 'الخادم لم يرجع إجابة مفهومة.', { persist: false });
        return;
      }

      appendMessage('assistant', data.reply, { persist: true });
    } catch (error) {
      appendMessage('assistant', 'انقطع الاتصال بالخادم. تحقق من اتصال الإنترنت أو أعد تشغيل الخادم.', { persist: false });
      STATE.serverHealthy = false;
      STATE.status = 'error';
      STATE.statusMessage = 'الاتصال بالخادم فشل';
      updateStatusUI();
      console.error('Assistant request failed:', error);
    } finally {
      setBusy(false);
    }
  }

  function togglePanel(forceOpen) {
    const shouldOpen = forceOpen ?? !panel.classList.contains('open');
    panel.classList.toggle('open', shouldOpen);
    if (shouldOpen && !STATE.configLoaded) {
      fetchConfig({ showLoader: true });
    }
  }

  fab.addEventListener('click', () => togglePanel(true));
  panel.querySelector('[data-action="close"]').addEventListener('click', () => togglePanel(false));

  panel.querySelector('[data-action="settings"]').addEventListener('click', () => {
    els.settings.classList.add('open');
    fetchConfig({ showLoader: false });
  });

  panel.querySelector('[data-action="settings-cancel"]').addEventListener('click', () => {
    els.settings.classList.remove('open');
  });

  panel.querySelector('[data-action="settings-refresh"]').addEventListener('click', () => {
    fetchConfig({ showLoader: true });
  });

  panel.querySelector('[data-action="clear"]').addEventListener('click', clearConversation);

  els.settings.addEventListener('click', (event) => {
    if (event.target === els.settings) {
      els.settings.classList.remove('open');
    }
  });

  els.provider.addEventListener('change', () => {
    const value = els.provider.value;
    if (!value || !STATE.providers[value]) return;
    STATE.provider = value;
    populateModelOptions();
    savePreferences();
  });

  els.model.addEventListener('change', () => {
    const value = els.model.value;
    STATE.model = value;
    savePreferences();
  });

  els.send.addEventListener('click', sendMessage);

  els.input.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      sendMessage();
    }
  });

  renderConversation();
  fetchConfig({ showLoader: false });
})();
