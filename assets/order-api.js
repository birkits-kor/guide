(function () {
  'use strict';
  const endpoint = 'https://script.google.com/macros/s/AKfycby-H6xpkyg4fSIQAG5cHzU4qycg5wpo1eZYB3vT0cKJDA1LKfVmJycW4bliHVx0TKMLfw/exec';
  async function request(action, data = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 55000);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...data, action }), signal: controller.signal, credentials: 'omit', redirect: 'follow' });
      if (!response.ok) throw new Error('연결이 원활하지 않습니다. 잠시 후 다시 눌러 주세요.');
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || '처리를 완료하지 못했습니다. 다시 시도해 주세요.');
      return result;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('접수 확인에 시간이 걸리고 있습니다. 같은 화면에서 다시 눌러 주세요.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  function randomId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return [...crypto.getRandomValues(new Uint8Array(20))].map(n => n.toString(16).padStart(2, '0')).join('');
  }
  async function copy(value) {
    try { await navigator.clipboard.writeText(value); return true; } catch (_) {}
    const area = document.createElement('textarea');
    area.value = value; area.readOnly = true;
    Object.assign(area.style, { position: 'fixed', left: '0', top: '0', opacity: '0', pointerEvents: 'none' });
    document.body.appendChild(area); area.focus(); area.select(); area.setSelectionRange(0, value.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) {}
    area.remove(); return ok;
  }
  window.BirkitsOrderApi = { request, randomId, copy };
})();
