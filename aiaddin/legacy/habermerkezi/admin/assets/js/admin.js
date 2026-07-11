/**
 * AhenkPress Admin — JavaScript
 */
const AP = {
  // ─── Toast bildirimleri
  toast(msg, type = 'info', duration = 3500) {
    const container = document.querySelector('.ap-toasts') || (() => {
      const el = document.createElement('div');
      el.className = 'ap-toasts';
      document.body.appendChild(el);
      return el;
    })();
    const t = document.createElement('div');
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    t.className = `ap-toast ${type}`;
    t.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(10px)'; t.style.transition = '.3s'; setTimeout(() => t.remove(), 300); }, duration);
  },

  // ─── AJAX yardımcısı
  async ajax(url, data = {}, method = 'POST') {
    const formData = new FormData();
    formData.append('_csrf', document.querySelector('meta[name=csrf]')?.content || '');
    for (const [k, v] of Object.entries(data)) formData.append(k, v);

    const r = await fetch(url, {
      method,
      body: method !== 'GET' ? formData : undefined,
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    return r.json();
  },

  // ─── Modal
  modal: {
    open(id) { document.getElementById(id)?.classList.remove('hidden'); },
    close(id) { document.getElementById(id)?.classList.add('hidden'); },
    closeAll() { document.querySelectorAll('.ap-modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden')); }
  },

  // ─── Tabs
  tabs(container) {
    const tabs    = container.querySelectorAll('.ap-tab[data-tab]');
    const panes   = container.querySelectorAll('.ap-tab-content[data-tab]');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        tabs.forEach(t  => t.classList.toggle('active', t.dataset.tab === target));
        panes.forEach(p => p.classList.toggle('active', p.dataset.tab === target));
        history.replaceState(null, '', `?tab=${target}`);
      });
    });
    // URL'den aktif sekmeyi oku
    const urlTab = new URLSearchParams(location.search).get('tab');
    if (urlTab) { const t = container.querySelector(`.ap-tab[data-tab="${urlTab}"]`); if (t) t.click(); }
    else if (tabs.length) tabs[0].click();
  },

  // ─── Confirm dialog
  confirm(msg) { return window.confirm(msg); },

  // ─── Onay gerektiren silme
  deleteConfirm(form, msg = 'Bu öğeyi silmek istediğinize emin misiniz?') {
    return AP.confirm(msg) ? true : (event?.preventDefault(), false);
  },

  // ─── Image upload preview
  imagePreview(input, preview) {
    const inputEl   = typeof input   === 'string' ? document.getElementById(input)   : input;
    const previewEl = typeof preview === 'string' ? document.getElementById(preview) : preview;
    if (!inputEl || !previewEl) return;
    inputEl.addEventListener('change', e => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = ev => { previewEl.src = ev.target.result; previewEl.style.display = 'block'; };
      reader.readAsDataURL(f);
    });
  },

  // ─── Drag-drop upload
  dropzone(area, input) {
    const areaEl  = typeof area  === 'string' ? document.getElementById(area)  : area;
    const inputEl = typeof input === 'string' ? document.getElementById(input) : input;
    if (!areaEl || !inputEl) return;
    areaEl.addEventListener('dragover',  e => { e.preventDefault(); areaEl.classList.add('dragover'); });
    areaEl.addEventListener('dragleave', () => areaEl.classList.remove('dragover'));
    areaEl.addEventListener('drop', e => {
      e.preventDefault(); areaEl.classList.remove('dragover');
      if (e.dataTransfer.files.length) { inputEl.files = e.dataTransfer.files; inputEl.dispatchEvent(new Event('change')); }
    });
    areaEl.addEventListener('click', () => inputEl.click());
  },

  // ─── Basit içerik editörü
  editor: {
    init(areaId) {
      const area = document.getElementById(areaId);
      if (!area) return;
      // Editör toolbar
      const toolbar = area.closest('.ap-editor-wrap')?.querySelector('.ap-editor-toolbar');
      if (!toolbar) return;
      toolbar.querySelectorAll('.ap-editor-btn[data-cmd]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          const cmd = btn.dataset.cmd;
          if (cmd === 'createLink') {
            const url = prompt('Link URL:');
            if (url) document.execCommand(cmd, false, url);
          } else if (cmd === 'insertImage') {
            const url = prompt('Görsel URL:');
            if (url) document.execCommand('insertHTML', false, `<img src="${url}" style="max-width:100%">`);
          } else {
            document.execCommand(cmd, false, null);
          }
          area.focus();
        });
      });
    },
    getValue(areaId) {
      return document.getElementById(areaId)?.innerHTML || '';
    },
    setValue(areaId, html) {
      const el = document.getElementById(areaId);
      if (el) el.innerHTML = html;
    }
  },

  // ─── Slug auto-generate
  autoSlug(titleId, slugId) {
    const title = document.getElementById(titleId);
    const slug  = document.getElementById(slugId);
    if (!title || !slug) return;
    let userEdited = slug.value !== '';
    title.addEventListener('input', () => {
      if (userEdited) return;
      slug.value = AP.slugify(title.value);
    });
    slug.addEventListener('input', () => { userEdited = slug.value !== ''; });
  },

  slugify(str) {
    const tr = {'ş':'s','ı':'i','ğ':'g','ü':'u','ö':'o','ç':'c','Ş':'s','İ':'i','Ğ':'g','Ü':'u','Ö':'o','Ç':'c'};
    return str.split('').map(c => tr[c] || c).join('').toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  },

  // ─── Tablo sıralama
  sortableTable(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    table.querySelectorAll('thead th[data-sort]').forEach(th => {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        const col  = th.dataset.sort;
        const dir  = th.dataset.dir === 'asc' ? 'desc' : 'asc';
        th.dataset.dir = dir;
        const tbody = table.querySelector('tbody');
        const rows  = [...tbody.querySelectorAll('tr')];
        rows.sort((a, b) => {
          const aVal = a.querySelector(`[data-col="${col}"]`)?.textContent || '';
          const bVal = b.querySelector(`[data-col="${col}"]`)?.textContent || '';
          return dir === 'asc' ? aVal.localeCompare(bVal, 'tr') : bVal.localeCompare(aVal, 'tr');
        });
        rows.forEach(r => tbody.appendChild(r));
      });
    });
  },

  // ─── AJAX cron tetikleyici
  async runCron(url, logEl) {
    const log = typeof logEl === 'string' ? document.getElementById(logEl) : logEl;
    const appendLog = (msg, type = 'info') => {
      if (!log) return;
      const line = document.createElement('div');
      line.className = `ap-log-line ${type}`;
      const time = new Date().toLocaleTimeString('tr-TR');
      line.innerHTML = `<span class="ap-log-time">[${time}]</span> ${msg}`;
      log.appendChild(line);
      log.scrollTop = log.scrollHeight;
    };
    appendLog('Cron çalıştırılıyor...', 'info');
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-Token': document.querySelector('meta[name=csrf]')?.content || '' } });
      const data = await r.json();
      if (data.success) {
        appendLog(`✓ Tamamlandı: ${data.message || 'Başarılı'}`, 'success');
        AP.toast('Cron tamamlandı', 'success');
      } else {
        appendLog(`✕ Hata: ${data.message || 'Bilinmeyen hata'}`, 'error');
        AP.toast('Cron hatası', 'error');
      }
    } catch (e) {
      appendLog('✕ İstek hatası: ' + e.message, 'error');
      AP.toast('İstek hatası', 'error');
    }
  },

  // ─── Toplu seçim
  bulkSelect(tableId) {
    const table  = document.getElementById(tableId);
    if (!table) return;
    const master = table.querySelector('.ap-check-all');
    const items  = () => table.querySelectorAll('.ap-check-item');
    if (master) master.addEventListener('change', () => items().forEach(c => c.checked = master.checked));
    items().forEach(c => c.addEventListener('change', () => {
      if (master) master.indeterminate = [...items()].some(x => !x.checked) && [...items()].some(x => x.checked);
    }));
    return { getSelected: () => [...items()].filter(c => c.checked).map(c => c.value) };
  },

  // ─── Char counter
  charCounter(inputId, counterId, max) {
    const input   = document.getElementById(inputId);
    const counter = document.getElementById(counterId);
    if (!input || !counter) return;
    const update = () => {
      const len = input.value.length;
      counter.textContent = `${len}/${max}`;
      counter.style.color = len > max ? 'var(--ap-red)' : 'var(--ap-text-muted)';
    };
    input.addEventListener('input', update);
    update();
  }
};

// ─── DOM Hazır
document.addEventListener('DOMContentLoaded', () => {
  // Tab'ları başlat
  document.querySelectorAll('.ap-tabs-container').forEach(c => AP.tabs(c));

  // Modal kapat
  document.querySelectorAll('.ap-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });
  });

  // Onay gerektiren butonlar
  document.querySelectorAll('[data-confirm]').forEach(btn => {
    btn.addEventListener('click', e => {
      if (!AP.confirm(btn.dataset.confirm)) e.preventDefault();
    });
  });

  // Auto slug
  if (document.getElementById('ap-title') && document.getElementById('ap-slug')) {
    AP.autoSlug('ap-title', 'ap-slug');
  }

  // Editor
  document.querySelectorAll('.ap-editor-area').forEach(area => AP.editor.init(area.id));

  // Sayfa yüklenince scrollable tablolar
  document.querySelectorAll('.ap-sortable-table').forEach(t => AP.sortableTable(t.id));
});
