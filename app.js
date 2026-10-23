/* ============================================================
   欧阳画板 · 提示词绘画工作台
   纯前端 · 无构建 · OpenAI 兼容图片接口 + GitHub 云同步
   ============================================================ */
(() => {
'use strict';

/* ---------------- 常量 ---------------- */
const LS = {
  lib:     'pp.library.v1',
  cfg:     'pp.config.v1',
  hist:    'pp.history.v1',
  theme:   'pp.theme.v1',
  ui:      'pp.ui.v1',
  seedVer: 'pp.seedver.v1',
  dl:      'pp.dl.v1',
};

/* 内置示例库版本号。改动 seedLibrary() 内容时递增，
   用于提示老用户「示例库有更新」 */
const SEED_VERSION = 2;
const APP_VERSION = '1.10.0';

const GROUP_COLORS = ['#5b5bd6', '#d64f9e', '#0f9b8e', '#c88417', '#4a90d9', '#7a5af5', '#d9604f', '#4a9c5d'];

const SIZE_PRESETS = [
  { label: '正方形', w: 1024, h: 1024 },
  { label: '竖版 3:4', w: 896,  h: 1152 },
  { label: '横版 4:3', w: 1152, h: 896  },
  { label: '竖屏 9:16', w: 768, h: 1344 },
  { label: '宽屏 16:9', w: 1344, h: 768 },
  { label: '小图快出', w: 512,  h: 512  },
];

/* 人像摄影模板（可单独载入） */
function portraitLibrary() {
  return seedLibrary().slice(0, 8);
}

/* 内置示例词库：以「人像摄影」为默认场景，兼顾电商产品图，开箱即用 */
function seedLibrary() {
  const g = (name, color, items) => ({
    id: uid(), name, color, collapsed: false,
    items: items.map(t => ({
      id: uid(), text: t, usage: 0, lastUsed: 0, tags: [],
    })),
  });
  return [
    g('① 人像·主体', GROUP_COLORS[0], [
      'young asian woman, 25 years old, elegant and confident',
      'asian man, 30s, mature and calm expression',
      'elderly person with kind eyes, weathered face, life stories',
      'child, 8 years old, innocent bright smile',
      'professional female executive in tailored suit',
    ]),
    g('② 人像·五官特写', GROUP_COLORS[1], [
      'delicate facial features, symmetrical face, flawless skin texture',
      'expressive eyes, bright catchlight in iris, long eyelashes',
      'natural eyebrows, subtle makeup, rosy lips',
      'freckles on nose bridge, natural skin pores, realistic texture',
      'sharp jawline, high cheekbones, refined profile',
    ]),
    g('③ 人像·妆造', GROUP_COLORS[2], [
      'natural no-makeup makeup look, dewy skin, bare lips',
      'elegant evening makeup, smoky eyes, bold red lip',
      'traditional chinese hanfu, elaborate hairpin, silk fabric',
      'minimalist white shirt, clean styling, silver stud earrings',
      'tousled wavy hair, soft flyaways, windswept styling',
    ]),
    g('④ 人像·光线', GROUP_COLORS[3], [
      'soft diffused window light, gentle shadow on cheek',
      'Rembrandt lighting, dramatic triangle of light on cheek',
      'golden hour backlight, glowing hair rim, warm halo',
      'studio beauty light, butterfly lighting, even skin tone',
      'neon signage light, cyan and magenta split lighting',
    ]),
    g('⑤ 人像·镜头', GROUP_COLORS[4], [
      '85mm portrait lens, f/1.4, creamy bokeh background',
      '50mm lens, f/2.0, natural field of view, half body shot',
      'close-up headshot, shallow depth of field, eyelash level',
      'full body shot, 35mm, environmental portrait with context',
      'macro detail shot of eye and skin texture',
    ]),
    g('⑥ 画质基础', GROUP_COLORS[5], [
      'masterpiece, best quality, ultra detailed, 8k uhd',
      'sharp focus, high resolution, professional photography',
      'hyperrealistic skin detail, cinematic color grading',
      'HDR, physically based rendering, global illumination',
    ]),
    g('⑦ 氛围情绪', GROUP_COLORS[6], [
      'serene and contemplative mood, quiet atmosphere',
      'joyful candid laughter, natural unposed moment',
      'melancholic mood, soft desaturated tones, film grain',
      'confident editorial fashion mood, high fashion energy',
    ]),
    g('⑧ 背景场景', GROUP_COLORS[7] || GROUP_COLORS[0], [
      'blurred city street at dusk, bokeh streetlights',
      'minimalist studio backdrop, seamless neutral gray',
      'sunlit cafe interior, warm wooden tones, soft out of focus',
      'lush green garden, dappled light through leaves',
      'plain dark background, subject isolation, studio setting',
    ]),
    g('⑨ 产品电商', GROUP_COLORS[0], [
      'product photography, clean white background, centered composition',
      'reflective floor, subtle drop shadow, e-commerce ready',
      'floating product, dynamic splash, advertising style',
      'flat lay, top-down view, minimalist prop styling',
    ]),
    g('⑩ 色彩风格', GROUP_COLORS[2], [
      'vibrant color palette, high saturation, punchy contrast',
      'muted pastel tones, soft desaturated film look',
      'monochrome with a single accent color',
      'morandi color scheme, elegant low saturation',
      'warm teal and orange cinematic grade',
    ]),
    g('⑪ 画风切换', GROUP_COLORS[3], [
      'photorealistic, DSLR photo, ultra sharp detail',
      '3D render, octane render, blender, clay material',
      'watercolor illustration, hand painted texture',
      'flat vector illustration, minimal geometric shapes',
      'anime style, cel shading, clean lineart',
    ]),
    g('⑫ 排版留白', GROUP_COLORS[4], [
      'negative space, clean composition, room for text overlay',
      'rule of thirds, balanced layout, visual hierarchy',
      'centered symmetrical composition',
    ]),
  ];
}

/* ---------------- 工具函数 ---------------- */
let _seq = 0;
function uid() {
  _seq += 1;
  return Date.now().toString(36) + '-' + _seq.toString(36) + '-' +
         Math.random().toString(36).slice(2, 7);
}
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function toast(msg, type = '', ms = 2200) {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  $('#toastWrap').appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 220);
  }, ms);
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((res, rej) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); res(); } catch (e) { rej(e); }
    finally { ta.remove(); }
  });
}

/* 中文按 1 字 ≈ 1 token，英文按 1 词 ≈ 1.3 token 粗估 */
function estimateTokens(text) {
  if (!text.trim()) return 0;
  const cjk = (text.match(/[\u4e00-\u9fa5\u3040-\u30ff]/g) || []).length;
  const rest = text.replace(/[\u4e00-\u9fa5\u3040-\u30ff]/g, ' ');
  const words = rest.split(/[\s,，、;；]+/).filter(Boolean).length;
  return Math.round(cjk * 1.05 + words * 1.3);
}

/* 清理提示词文本：合并多余逗号与空格，去首尾标点 */
function normalizePrompt(text) {
  return String(text)
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/,{2,}/g, ',')
    .replace(/^[\s,，、;；]+/, '')
    .replace(/[\s,，、;；]+$/, '')
    .trim();
}

/* dataURI → Blob（历史归档、图生图等都需要把内联图落成二进制） */
function dataUrlToBlob(dataUrl) {
  const m = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(dataUrl || '');
  if (!m) return null;
  const mime = m[1] || 'image/png';
  try {
    const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  } catch (e) { return null; }
}

/* 400 且报错点名「某字段类型不对」时，翻转该字段类型后重试 */
function coercePayload(payload, msg) {
  const m = /struct field\s+[\w.]*?\.?(\w+)\s+of type\s+(\w+)/i.exec(msg || '');
  if (!m) return null;
  const field = m[1], want = m[2].toLowerCase();
  if (!(field in payload) || field === 'prompt' || field === 'model') return null;
  const cur = payload[field];
  const out = Object.assign({}, payload);
  if (want === 'string' && typeof cur === 'number') out[field] = String(cur);
  else if (want === 'number' && typeof cur === 'string' && String(cur).trim() !== '' && isFinite(Number(cur))) out[field] = Number(cur);
  else if (want === 'boolean') out[field] = (cur === true || cur === 'true');
  else return null;
  return out;
}

/* ---------------- 状态 ---------------- */
const state = {
  lib: [],
  cfg: {},
  history: [],
  ui: {
    theme: 'light', sort: 'manual', search: '', picked: [], chips: [],
    results: [],
    dlMode: false,        // 批量下载模式
    dlPicked: [],         // 被勾选的图片 id
  },
  undoStack: [],
  busy: false,
  matrix: {             // 矩阵组合工作台
    rows: [],           // [{ id, a, b, text, on }]
    running: false,
  },
  ai: {                 // AI 帮写（仅内存态，关掉面板再打开可恢复）
    req: '',            // 创作要求
    result: '',         // 生成结果
    level: 'l2',        // 加工等级 l1 | l2 | l3（仅内存，刷新回默认二级）
    busy: false,
    ctrl: null,         // 进行中请求的 AbortController
  },
};

function defaultCfg() {
  return {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-image-1',
    width: 1024,
    height: 1024,
    sizeString: false,
    count: 1,
    quality: '',
    style: '',
    responseFormat: '',
    negative: '',
    useNegative: false,
    mapSize: '',
    mapNegative: '',
    extraJson: '',
    debug: false,
    appendJoin: true,
    dedupe: true,
    /* 图生图 */
    refImage: null,          // { dataUrl, base64, width, height, name, size }
    i2iStrength: 0.6,
    i2iOutW: null,
    i2iOutH: null,
    i2iFollowSize: true,
    i2iFormat: 'dataurl',    // dataurl | base64
    mapImage: 'image',
    mapStrength: 'strength',
    /* 翻译 */
    trBaseUrl: '',           // 留空则用画图接口
    trApiKey: '',            // 留空则用画图 Key
    trModel: 'gpt-4o-mini',
    trAction: 'replace',
    gh: {
      owner: '', repo: '', branch: 'main', path: 'prompts.json',
      token: '', autoSync: true, autoPull: false, publicRead: false, lastSync: 0,
    },
  };
}

const store = {
  read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const v = JSON.parse(raw);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  },
  write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) {
      if (String(e).includes('Quota')) toast('本地存储已满，请清理历史记录', 'err');
      return false;
    }
  },
  remove(key) { try { localStorage.removeItem(key); } catch (e) {} },
};

/* 兼容并迁移旧版本数据结构 */
function loadAll() {
  const base = defaultCfg();

  let lib = store.read(LS.lib, null);
  if (!lib || !Array.isArray(lib)) lib = seedLibrary();
  // 兼容早期扁平格式
  lib = lib.map(gr => ({
    id: gr.id || uid(),
    name: gr.name || '未命名分组',
    color: gr.color || GROUP_COLORS[0],
    collapsed: !!gr.collapsed,
    items: (Array.isArray(gr.items) ? gr.items : []).map(it => ({
      id: it.id || uid(),
      text: it.text || it.prompt || '',
      usage: it.usage || 0,
      lastUsed: it.lastUsed || 0,
      tags: Array.isArray(it.tags) ? it.tags : [],
    })).filter(it => it.text),
  }));
  state.lib = lib;

  const cfgRaw = store.read(LS.cfg, {}) || {};
  const cfg = Object.assign(base, cfgRaw);
  // 嵌套对象要单独合并默认值，否则旧配置缺字段会变成 undefined
  cfg.gh = Object.assign(defaultCfg().gh, cfgRaw.gh || {});
  // 旧版本遗留的视频接口配置（cfg.video）已不再使用，原样忽略即可，
  // 不主动删除，避免改动用户已有配置文件的结构。
  // 旧字段迁移
  if (cfgRaw.mode && !cfgRaw.sizeString) { /* noop */ }
  state.cfg = cfg;

  state.history = [];   // 由 IndexedDB 异步载入（见 init 里的 histMigrateLS/reloadHistory）
  state.ui.theme  = store.read(LS.theme, 'light') || 'light';
  const ui = store.read(LS.ui, {}) || {};
  state.ui.sort = ui.sort || 'manual';
}

/* 持久化配置时剔除体积巨大的参考图（base64 会撑爆 localStorage 配额） */
function cfgForStorage() {
  const c = Object.assign({}, state.cfg);
  delete c.refImage;
  return c;
}

const persist = {
  lib:   debounce(() => store.write(LS.lib, state.lib), 350),
  cfg:   debounce(() => store.write(LS.cfg, cfgForStorage()), 350),
  ui:    debounce(() => store.write(LS.ui, { sort: state.ui.sort }), 350),
};

/* ---------------- 词库 CRUD ---------------- */
function findGroup(gid) { return state.lib.find(g => g.id === gid); }
function findItem(gid, iid) {
  const g = findGroup(gid);
  return g ? g.items.find(i => i.id === iid) : null;
}

function addGroup(name) {
  const g = {
    id: uid(),
    name: name || ('新分组 ' + (state.lib.length + 1)),
    color: GROUP_COLORS[state.lib.length % GROUP_COLORS.length],
    collapsed: false,
    items: [],
  };
  state.lib.push(g);
  persist.lib();
  scheduleSync('add-group');
  return g;
}

function addItem(gid, text) {
  const g = findGroup(gid);
  if (!g || !text || !text.trim()) return null;
  const it = { id: uid(), text: normalizePrompt(text), usage: 0, lastUsed: 0, tags: [] };
  g.items.unshift(it);
  persist.lib();
  scheduleSync('add-item');
  return it;
}

function deleteGroup(gid) {
  const i = state.lib.findIndex(g => g.id === gid);
  if (i < 0) return null;
  const [g] = state.lib.splice(i, 1);
  persist.lib();
  scheduleSync('del-group');
  return g;
}

/* ---------------- 语法高亮：让 {权重} 和 , 分隔符更醒目 ---------------- */
function renderPromptHTML(text) {
  return esc(text)
    .replace(/\(([^()]{1,80})\)/g, '<span class="tk-weight">($1)</span>')
    .replace(/\{([^{}]{1,80})\}/g, '<span class="tk-brace">{$1}</span>')
    .replace(/\[([^\[\]]{1,80})\]/g, '<span class="tk-bracket">[$1]</span>');
}

/* ============================================================
   核心：追加到对话框（不替换）
   ============================================================ */

/* 判断是否需要补分隔符 */
function needsJoiner(before, after) {
  if (!before) return false;
  if (!after) return false;
  const b = before.replace(/\s+$/, '');
  const a = after.replace(/^\s+/, '');
  if (!b || !a) return false;
  // 末尾已有分隔符
  if (/[,，、;；:：\n]$/.test(b)) return false;
  // 开头已有分隔符
  if (/^[,，、;；]/.test(a)) return false;
  // 都是英文/数字，若末尾已有空格则不再补
  return true;
}

function pushUndo() {
  state.undoStack.push({
    text: els.promptBox.value,
    selStart: els.promptBox.selectionStart,
    selEnd: els.promptBox.selectionEnd,
    chips: state.ui.chips.slice(),
  });
  if (state.undoStack.length > 60) state.undoStack.shift();
}

/**
 * 把一段提示词插入到文本框的光标/选区位置。
 * @param {string} rawText
 * @param {object} opts { silent, label }
 * @returns {boolean} 是否插入成功
 */
function insertPrompt(rawText, opts = {}) {
  const text = normalizePrompt(rawText);
  if (!text) return false;

  const ta = els.promptBox;
  const joiner = state.cfg.appendJoin ? ', ' : ' ';

  let value = ta.value;
  let start = ta.selectionStart != null ? ta.selectionStart : value.length;
  let end   = ta.selectionEnd   != null ? ta.selectionEnd   : value.length;

  // 去重：整段已存在时提示并跳过
  if (state.cfg.dedupe) {
    const flat = value.toLowerCase();
    const needle = text.toLowerCase();
    if (needle && flat.includes(needle)) {
      if (!opts.silent) toast('这段提示词已经在对话框里了', 'warn');
      return false;
    }
  }

  pushUndo();

  const before = value.slice(0, start);
  const after  = value.slice(end);

  let insert = text;
  let pre = '', post = '';

  if (state.cfg.appendJoin) {
    if (needsJoiner(before, insert)) pre = joiner;
    if (needsJoiner(insert, after))  post = joiner;
  } else {
    // 关闭自动分隔符时：若光标前后紧贴非空白字符，补一个空格
    if (before && !/[\s,，、]$/.test(before)) pre = ' ';
    if (after && !/^[\s,，、]/.test(after))  post = ' ';
  }

  ta.value = before + pre + insert + post + after;
  const caret = (before + pre + insert + post).length;
  try { ta.setSelectionRange(caret, caret); } catch (e) {}

  // 记录 chip
  const chip = { id: uid(), text: insert };
  state.ui.chips.push(chip);
  if (state.ui.chips.length > 40) state.ui.chips.shift();

  updatePromptMeta();
  renderChips(chip.id);
  saveDraft();

  if (!opts.silent) {
    const ta2 = els.promptBox;
    try { ta2.focus({ preventScroll: true }); } catch (e) { try { ta2.focus(); } catch (e2) {} }
    flashComposer();
  }
  return true;
}

function undoAppend() {
  const prev = state.undoStack.pop();
  if (!prev) { toast('没有可撤销的操作', 'warn'); return; }
  els.promptBox.value = prev.text;
  state.ui.chips = prev.chips;
  try { els.promptBox.setSelectionRange(prev.selStart, prev.selEnd); } catch (e) {}
  updatePromptMeta();
  renderChips();
  saveDraft();
  toast('已撤销上次追加');
}

function flashComposer() {
  const box = els.promptBox;
  box.style.transition = 'box-shadow .18s, border-color .18s';
  box.style.borderColor = 'var(--accent)';
  box.style.boxShadow = '0 0 0 4px var(--accent-soft)';
  setTimeout(() => {
    box.style.borderColor = '';
    box.style.boxShadow = '';
  }, 420);
}

function saveDraft() {
  state.cfg._draft = els.promptBox.value;
  persist.cfg();
}

/* ---------------- 渲染：词库 ---------------- */
const els = {};

function getVisibleLib() {
  const q = state.ui.search.trim().toLowerCase();
  let groups = state.lib.map(g => {
    if (!q) return { group: g, items: g.items.slice() };
    const nameHit = g.name.toLowerCase().includes(q);
    const items = nameHit ? g.items.slice()
      : g.items.filter(i => i.text.toLowerCase().includes(q));
    return { group: g, items };
  });
  if (q) groups = groups.filter(x => x.items.length > 0 || x.group.name.toLowerCase().includes(q));

  const sort = state.ui.sort;
  if (sort === 'manual') return groups;

  groups = groups.map(x => {
    const items = x.items.slice().sort((a, b) => {
      if (sort === 'usage')  return (b.usage || 0) - (a.usage || 0);
      if (sort === 'recent') return (b.lastUsed || 0) - (a.lastUsed || 0);
      if (sort === 'alpha')  return a.text.localeCompare(b.text, 'zh');
      return 0;
    });
    return { group: x.group, items };
  });
  return groups;
}

function renderLib() {
  const wrap = els.libScroll;
  const groups = getVisibleLib();
  const total = state.lib.reduce((n, g) => n + g.items.length, 0);
  els.libCount.textContent = total;

  if (!state.lib.length) {
    wrap.innerHTML = `<div class="lib-empty">
      <span class="big">🗂</span>
      词库还空着<br>点右上角 ＋ 建一个分组
    </div>`;
    return;
  }
  if (!groups.length) {
    wrap.innerHTML = `<div class="lib-empty">
      <span class="big">🔍</span>
      没有匹配「${esc(state.ui.search)}」的提示词
    </div>`;
    return;
  }

  const html = groups.map(({ group: g, items }) => {
    const collapsed = g.collapsed && !state.ui.search ? 'collapsed' : '';
    const body = items.length
      ? items.map(it => renderItemCard(g.id, it)).join('')
      : `<div class="group-empty">这个分组还没有提示词</div>`;

    return `<div class="group ${collapsed}" data-gid="${g.id}">
      <div class="group-head" data-gid="${g.id}">
        <span class="group-caret">▾</span>
        <span class="group-dot" style="background:${esc(g.color)}"></span>
        <span class="group-name" data-gid="${g.id}">${esc(g.name)}</span>
        <span class="group-count">${items.length}</span>
        <span class="group-spacer"></span>
        <span class="group-actions">
          <button class="icon-btn" data-act="add-item" data-gid="${g.id}" title="加提示词">＋</button>
          <button class="icon-btn" data-act="rename-group" data-gid="${g.id}" title="重命名">✎</button>
          <button class="icon-btn" data-act="color-group" data-gid="${g.id}" title="换颜色">◐</button>
          <button class="icon-btn" data-act="del-group" data-gid="${g.id}" title="删除分组">🗑</button>
        </span>
      </div>
      <div class="group-body" data-gid="${g.id}">${body}</div>
    </div>`;
  }).join('');

  wrap.innerHTML = html;
}

function renderItemCard(gid, it) {
  const picked = state.ui.picked.includes(it.id) ? 'picked' : '';
  const used = it.usage ? `<span class="pcard-used" title="使用 ${it.usage} 次">★${it.usage}</span>` : '';
  return `<div class="pcard ${picked}" draggable="true" data-gid="${gid}" data-iid="${it.id}">
    <div class="pcard-main">
      <div class="pcard-text">${esc(it.text)}</div>
      <div class="pcard-meta">
        <span>${it.text.length} 字</span>
        ${used}
      </div>
    </div>
    <div class="pcard-actions">
      <button class="icon-btn" data-act="edit-item" data-gid="${gid}" data-iid="${it.id}" title="编辑">✎</button>
      <button class="icon-btn" data-act="copy-item" data-gid="${gid}" data-iid="${it.id}" title="拷贝">⧉</button>
      <button class="icon-btn" data-act="del-item" data-gid="${gid}" data-iid="${it.id}" title="删除">🗑</button>
    </div>
  </div>`;
}

/* ---------------- 渲染：对话框 chips ---------------- */
function renderChips(flashId) {
  const row = els.chipsRow;
  const chips = state.ui.chips;
  if (!chips.length) {
    row.innerHTML = '';
    els.comboInfo.textContent = '';
    return;
  }
  row.innerHTML = chips.map(c => `<span class="chip ${c.id === flashId ? 'flash' : ''}" data-cid="${c.id}" title="${esc(c.text)}">
    <span class="chip-txt">${esc(c.text)}</span>
    <button class="chip-x" data-cid="${c.id}" title="移除这段">✕</button>
  </span>`).join('');
  els.comboInfo.textContent = `已拼接 ${chips.length} 段`;
  if (flashId) {
    const n = row.querySelector(`[data-cid="${flashId}"]`);
    if (n) setTimeout(() => n.classList.remove('flash'), 600);
  }
  row.scrollLeft = row.scrollWidth;
}

/* 移除某段 chip 时，同步从文本框里删掉对应的那段文本 */
function removeChipByText(cid) {
  const c = state.ui.chips.find(x => x.id === cid);
  if (!c) return;
  pushUndo();
  const val = els.promptBox.value;
  const idx = val.toLowerCase().indexOf(c.text.toLowerCase());
  if (idx >= 0) {
    let next = val.slice(0, idx) + val.slice(idx + c.text.length);
    next = normalizePrompt(next);
    els.promptBox.value = next;
  }
  state.ui.chips = state.ui.chips.filter(x => x.id !== cid);
  updatePromptMeta();
  renderChips();
  saveDraft();
}

/* ---------------- 渲染：结果 & 历史 ---------------- */
function renderResults() {
  const items = state.ui.results || [];
  const grid = els.resultGrid;
  const empty = $('#emptyState');

  if (!items.length && !state.busy) {
    empty.classList.remove('hidden');
    grid.innerHTML = '';
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = items.map(r => {
    if (r.kind === 'loading') {
      return `<div class="card-skeleton" id="${r.id}">绘制中…<br><small style="opacity:.7">正在等接口返回</small></div>`;
    }
    if (r.kind === 'error') {
      return `<div class="card-error" id="${r.id}">
        <b>生成失败</b>
        <div class="msg">${esc(r.message)}</div>
      </div>`;
    }
    const picked = state.ui.dlMode && state.ui.dlPicked.includes(r.id) ? 'picked' : '';
    return `<div class="card-img ${picked} ${state.ui.dlMode ? 'dl-mode' : ''}" id="${r.id}">
      ${state.ui.dlMode ? `<div class="pick-box" data-act="toggle-pick" data-id="${r.id}"></div>` : ''}
      <img src="${esc(r.src)}" alt="生成结果" loading="lazy" data-act="zoom" data-id="${r.id}">
      <div class="card-img-bar">
        <span class="txt" title="${esc(r.prompt)}">${esc(r.prompt)}</span>
        <button class="icon-btn" data-act="copy-result-prompt" data-id="${r.id}" title="复制提示词">⧉</button>
        <a class="icon-btn" href="${esc(r.src)}" download="painting-${r.id}.png" title="下载">⤓</a>
      </div>
    </div>`;
  }).join('');
}

/* ============================================================
   生成历史存储（IndexedDB）
   ------------------------------------------------------------
   为什么不用 localStorage：它只有约 5MB 且只能存文本，一张
   1024×1024 的图转成 base64 就要 1.4MB，两三张就写满，写满后
   所有改动静默失败。所以改成：
     · 大图原图 → IndexedDB（二进制存储，无膨胀），只保留最新 10 张
     · 缩略图   → IndexedDB，永久保留（单张约 20KB）
     · 提示词   → 记录里，几乎不占空间
   ============================================================ */
const HIST_DB    = 'prompt-painter';   // 沿用旧库名，保证老用户的图片历史不丢
const HIST_STORE = 'hist';
const KEEP_FULL  = 10;    // 保留大图原图的条数（用户策略：最近 10 张）
const THUMB_MAX  = 256;   // 缩略图最长边

let _histDBP = null;
function histDB() {
  if (_histDBP) return _histDBP;
  _histDBP = new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('浏览器不支持 IndexedDB')); return; }
    const req = indexedDB.open(HIST_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(HIST_STORE)) {
        const os = db.createObjectStore(HIST_STORE, { keyPath: 'id' });
        os.createIndex('time', 'time');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _histDBP;
}

function histPut(rec) {
  return histDB().then(db => new Promise((res, rej) => {
    const tx = db.transaction(HIST_STORE, 'readwrite');
    tx.objectStore(HIST_STORE).put(rec);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  }));
}
/* 清空整个历史仓库。
   成功 → resolve(true)；失败 / 中止 → reject(Error)。
   oncomplete / onerror / onabort 三者都监听，且保证 Promise 只结算一次。 */
function histDeleteAll() {
  return histDB().then(db => new Promise((res, rej) => {
    let settled = false;
    const done = (fn, v) => { if (settled) return; settled = true; fn(v); };

    let tx;
    try {
      tx = db.transaction(HIST_STORE, 'readwrite');
    } catch (e) {
      done(rej, e);
      return;
    }

    tx.oncomplete = () => done(res, true);
    tx.onerror = () => done(rej, tx.error || new Error('清空历史失败'));
    tx.onabort = () => done(rej, tx.error || new Error('清空历史被中止'));

    try {
      tx.objectStore(HIST_STORE).clear();
    } catch (e) {
      done(rej, e);
      try { tx.abort(); } catch (e2) {}
    }
  }));
}
function histGetAll() {
  return histDB().then(db => new Promise((res, rej) => {
    const req = db.transaction(HIST_STORE, 'readonly').objectStore(HIST_STORE).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => rej(req.error);
  })).catch(() => []);
}

/* 图片元素载入（远程图走 CORS，失败则放弃生成缩略图） */
function loadImgEl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!/^data:|^blob:/.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片载入失败'));
    img.src = src;
  });
}

/* canvas 生成缩略图 Blob；被 CORS 污染或编码失败时返回 null */
async function makeThumbBlob(src, max) {
  max = max || THUMB_MAX;
  try {
    const img = await loadImgEl(src);
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    const scale = Math.min(1, max / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
    const cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0, cw, ch);
    const blob = await new Promise(r => cv.toBlob(r, 'image/webp', 0.72));
    if (blob) return blob;
    return await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.75));
  } catch (e) {
    return null;   // 跨域污染等情况：降级为只存地址，不生成缩略图
  }
}

/* dataURL / blobURL → Blob（无损保留原始字节） */
async function srcToBlob(src) {
  if (/^data:/.test(src)) return dataUrlToBlob(src);
  if (/^blob:/.test(src)) { try { return await (await fetch(src)).blob(); } catch (e) { return null; } }
  return null;
}

/* 写入若干条历史（生成成功后调用） */
async function histAdd(items) {
  if (!items || !items.length) return 0;
  let n = 0;
  for (const it of items) {
    const rec = {
      id: it.id, time: it.time || Date.now(), prompt: it.prompt || '', kind: 'img',
      thumb: null, full: null, srcUrl: '', w: 0, h: 0,
    };
    try {
      if (/^https?:/i.test(it.src)) {
        rec.srcUrl = it.src;                                  // 远程图：只记地址，不占本地空间
      } else {
        rec.full = await srcToBlob(it.src);
        rec.thumb = await makeThumbBlob(it.src);
        if (!rec.thumb && rec.full) rec.thumb = await makeThumbBlob(URL.createObjectURL(rec.full));
      }
    } catch (e) { /* 至少把提示词留下 */ }
    await histPut(rec);
    n++;
  }
  await histEnforce();
  return n;
}

/* 只让最新 KEEP_FULL 条保留大图，其余释放（缩略图与提示词永久保留） */
async function histEnforce() {
  const all = (await histGetAll()).sort((a, b) => b.time - a.time);
  for (let i = 0; i < all.length; i++) {
    const r = all[i];
    if (i >= KEEP_FULL && r.full) { r.full = null; await histPut(r); }
  }
  return all.length;
}

/* 从 IDB 读回内存态；缩略图转 objectURL 供 <img> 直接用 */
const _histURLs = [];
const _histFull = new Map();     // id → 大图 Blob（仅最近 10 张会有）
function revokeHistURLs() {
  while (_histURLs.length) { try { URL.revokeObjectURL(_histURLs.pop()); } catch (e) {} }
}

async function reloadHistory() {
  const all = (await histGetAll()).sort((a, b) => b.time - a.time);
  revokeHistURLs();
  _histFull.clear();
  state.history = all.map((r, i) => {
    let src = r.srcUrl || '';
    if (r.thumb) { src = URL.createObjectURL(r.thumb); _histURLs.push(src); }
    if (r.full) _histFull.set(r.id, r.full);
    return {
      id: r.id, kind: 'img', prompt: r.prompt, time: r.time, src,
      srcRaw: r.srcUrl || '',        // 远程图地址（也就是它的大图）
      hasFull: !!(r.full || r.srcUrl),
      rank: i,                        // 0 起，< KEEP_FULL 表示还在「大图区」
    };
  });
  return state.history;
}

/* 取某条历史的大图（懒加载）；没有大图则返回 '' */
function histFullSrc(id) {
  const rec = state.history.find(x => x.id === id);
  if (!rec) return '';
  if (rec._fullSrc) return rec._fullSrc;
  const blob = _histFull.get(id);
  if (blob) {
    const u = URL.createObjectURL(blob);
    _histURLs.push(u);
    rec._fullSrc = u;
    return u;
  }
  if (rec.srcRaw) return rec.srcRaw;
  return '';
}

/* 旧版本把 base64 历史存在 localStorage 里 → 一次性迁移进 IDB 并清掉旧键 */
async function histMigrateLS() {
  const old = store.read(LS.hist, null);
  if (!Array.isArray(old)) return 0;
  if (!old.length) { store.remove(LS.hist); return 0; }

  const exist = await histGetAll();
  const have = new Set(exist.map(r => r.id));
  const sorted = old.slice().sort((a, b) => (b.time || 0) - (a.time || 0));
  let n = 0;
  for (const it of sorted) {
    if (!it || !it.id || have.has(it.id)) continue;
    const rec = {
      id: it.id, time: it.time || Date.now(), prompt: it.prompt || '', kind: 'img',
      thumb: null, full: null, srcUrl: '', w: 0, h: 0,
    };
    try {
      if (it.src && /^data:/.test(it.src)) {
        rec.full = dataUrlToBlob(it.src);
        rec.thumb = await makeThumbBlob(it.src);
      } else if (it.src) {
        rec.srcUrl = it.src;
      }
    } catch (e) {}
    await histPut(rec);
    n++;
  }
  await histEnforce();
  store.remove(LS.hist);   // 旧键是配额元凶，迁移完立即删除
  return n;
}

function renderHistory() {
  const h = state.history;
  els.histCount.textContent = h.length;
  const grid = els.historyGrid;
  const empty = $('#historyEmpty');

  // 清空入口：历史为空时禁用；信息条显示条数与原图数
  const clearBtn = $('#btnClearHist');
  if (clearBtn) clearBtn.disabled = !h.length;
  const wipeBtn = $('#btnWipeGen');
  if (wipeBtn) wipeBtn.disabled = !h.length;
  const info = $('#histInfo');
  if (info) {
    info.textContent = h.length
      ? `共 ${h.length} 条 · 其中原图 ${h.filter(x => x.hasFull).length} 张`
      : '';
  }

  if (!h.length) {
    empty.classList.remove('hidden');
    grid.innerHTML = '';
    return;
  }
  empty.classList.add('hidden');
  grid.innerHTML = h.slice(0, 120).map(r => {
    const picked = state.ui.dlMode && state.ui.dlPicked.includes(r.id) ? 'picked' : '';
    return `<div class="hist-card ${picked}" data-hid="${r.id}" data-act="open-hist">
      ${state.ui.dlMode ? `<div class="pick-box" data-act="toggle-pick" data-id="${r.id}"></div>` : ''}
      <img src="${esc(r.src)}" alt="" loading="lazy">
      <span class="hist-badge${r.hasFull ? ' full' : ''}">${r.hasFull ? '原图' : '小图'}</span>
      <div class="hist-card-meta">
        <div class="txt" title="${esc(r.prompt)}">${esc(r.prompt)}</div>
        <div>${fmtTime(r.time)}</div>
      </div>
    </div>`;
  }).join('');
}

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ============================================================
   清空历史记录
   —— 历史区与设置面板两个入口共用；确认后才动数据
   ============================================================ */

/* 打开二次确认弹窗。条数与原图数从 IndexedDB 现取，不用可能过期的内存态 */
async function openClearHistoryConfirm() {
  if (state.busy) {
    toast('正在生成图片，请等待任务完成后再清空历史', 'warn', 3400);
    return;
  }

  let recs = [];
  try { recs = await histGetAll(); } catch (e) { recs = []; }
  const total = Array.isArray(recs) ? recs.length : 0;

  if (!total) {
    toast('还没有历史记录可清空', '', 2400);
    await reloadHistory().catch(() => {});
    renderHistory();
    updateStoreStat();
    return;
  }

  const fullCnt = recs.filter(r => r && (r.full || r.srcUrl)).length;

  openModal('清空历史记录', `
    <p>将删除 <b>${total}</b> 条历史记录${fullCnt ? `，其中 <b>${fullCnt}</b> 条仍保存着原图数据` : ''}。</p>
    <p>这些图片的本地数据会一并清除，<b style="color:var(--danger)">此操作不可撤销</b>。</p>
    <p style="font-size:12px;color:var(--text-3)">只清除生成历史及其关联的本地图片；
    提示词词库、接口配置、GitHub 云同步设置、主题等数据都不受影响。</p>
    <div class="field-row">
      <button class="btn tiny danger" data-clearhist="1">确认清空</button>
      <button class="btn tiny ghost" data-close-only="1">取消</button>
    </div>`);
}

/* 真正执行清空。返回 true 表示 IndexedDB 已清空成功。
   顺序：先清数据库，成功后才动缓存 / 下载状态 / 旧迁移键 / 界面。 */
let _clearingHistory = false;

async function clearHistoryRecords() {
  if (_clearingHistory) return false;      // 防重复提交（连点确认）
  if (state.busy) {
    toast('正在生成图片，请等待任务完成后再清空历史', 'warn', 3400);
    return false;
  }

  _clearingHistory = true;
  try {
    /* 1) 数据库清空：失败时不动任何界面与持久化状态 */
    try {
      await histDeleteAll();
    } catch (e) {
      const msg = (e && e.message) ? e.message : String(e);
      toast('清空失败：' + msg + '（历史记录未删除）', 'err', 4600);
      return false;
    }

    /* 2) 数据库已成功，下面是收尾；收尾异常不应误报为「清空失败」 */
    try {
      await reloadHistory();                 // 内部 revokeHistURLs() + _histFull.clear() + 重建 state.history
      if (state.ui.dlMode) exitDownloadMode();   // 退出下载模式（内部会 persistDL 写入空状态）
      else state.ui.dlPicked = [];
      store.remove(LS.dl);                   // 彻底移除下载选择持久化（含 exitDownloadMode 刚写入的空状态）
      store.remove(LS.hist);                 // 旧版 localStorage 历史，防止下次启动被 histMigrateLS 迁移回来
      renderHistory();
      updateStoreStat();
    } catch (e) {
      toast('历史已清空，但界面刷新异常，请刷新页面查看', 'warn', 4200);
      return true;
    }

    toast('历史记录已清空', 'ok');
    return true;
  } finally {
    _clearingHistory = false;
  }
}

/* ---------------- 提示词用量统计 ---------------- */
function bumpUsage(text) {
  const t = normalizePrompt(text).toLowerCase();
  let hit = false;
  state.lib.forEach(g => g.items.forEach(it => {
    if (!hit && it.text.toLowerCase() === t) {
      it.usage = (it.usage || 0) + 1;
      it.lastUsed = Date.now();
      hit = true;
    }
  }));
  if (hit) { persist.lib(); if (state.ui.sort !== 'manual') renderLib(); }
}

/* ============================================================
   画图 API
   ============================================================ */
function buildEndpoint() {
  let base = (state.cfg.baseUrl || '').trim().replace(/\/+$/, '');
  if (!base) throw new Error('请先填写接口地址 Base URL');
  if (/\/images\/generations$/.test(base)) return base;
  if (/\/v\d+$/.test(base)) return base + '/images/generations';
  // 未带版本号时补 /v1
  if (!/\/v\d+\//.test(base)) return base + '/v1/images/generations';
  return base + '/images/generations';
}

function buildPayload(prompt) {
  const c = state.cfg;
  const body = {
    model: c.model || 'gpt-image-1',
    prompt,
    n: clamp(Number(c.count) || 1, 1, 8),
  };

  const sizeField = (c.mapSize || 'size').trim() || 'size';
  if (c.sizeString) {
    body[sizeField] = `${c.width}x${c.height}`;
  } else if (sizeField === 'size') {
    body.size = `${c.width}x${c.height}`;
  } else if (sizeField === 'width' || sizeField === 'height') {
    body.size = `${c.width}x${c.height}`;
  } else {
    body[sizeField] = `${c.width}x${c.height}`;
  }
  // 同时给出宽高数值，兼容 width/height 型接口
  if (c.mapSize === 'width' || c.mapSize === 'height') {
    body.width = Number(c.width);
    body.height = Number(c.height);
  }

  if (c.quality) body.quality = c.quality;
  if (c.style && c.style !== 'vivid') body.style = c.style;
  if (c.style === 'vivid') body.style = 'vivid';
  if (c.responseFormat) body.response_format = c.responseFormat;

  if (c.useNegative && c.negative.trim()) {
    const nf = (c.mapNegative || 'negative_prompt').trim() || 'negative_prompt';
    body[nf] = normalizePrompt(c.negative);
  }

  if (c.extraJson && c.extraJson.trim()) {
    try {
      const extra = JSON.parse(c.extraJson);
      if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
        Object.assign(body, extra);
      }
    } catch (e) {
      throw new Error('额外 JSON 参数格式错误：' + e.message);
    }
  }
  return body;
}

function extractImages(data) {
  const list = [];
  if (!data) return list;
  const arr = data.data || data.images || data.output || (Array.isArray(data) ? data : []);
  if (!Array.isArray(arr)) return list;

  arr.forEach(d => {
    if (!d) return;
    // OpenAI 风格
    if (d.b64_json) { list.push({ src: 'data:image/png;base64,' + d.b64_json }); return; }
    if (d.url)      { list.push({ src: d.url }); return; }
    if (d.image_url) { list.push({ src: d.image_url }); return; }
    if (d.base64)   { list.push({ src: 'data:image/png;base64,' + d.base64 }); return; }
    // 有些中转直接给字符串
    if (typeof d === 'string') {
      list.push({ src: /^https?:|^data:/.test(d) ? d : 'data:image/png;base64,' + d });
    }
  });
  return list;
}

/* 发起一次生图请求，返回 { ok, status, data, text } */
async function postImages(endpoint, headers, payload) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 180000); // 3 分钟上限
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch (e) { /* 可能不是 JSON */ }
    return { ok: res.ok, status: res.status, data, text };
  } finally {
    clearTimeout(timer);
  }
}

/* 请求 + 参数降级重试（单图 / 矩阵共用，避免两条路径行为不一致）
   ① 400/422 且报错点名参数不支持 → 摘掉该参数重试
   ② 报错点名字段类型不符（如要求 number 实发 string）→ 翻转类型重试 */
async function postImagesSmart(endpoint, headers, payload) {
  let result = await postImages(endpoint, headers, payload);
  if (result.ok) return result;

  const firstMsg = (result.data && (result.data.error?.message || result.data.message || result.data.msg)) ||
                   result.text || '';
  const stripKeys = pickParamsToStrip(result.status, firstMsg, payload);
  let retryPayload = null, note = '';
  if (stripKeys.length) {
    retryPayload = Object.assign({}, payload);
    stripKeys.forEach(k => delete retryPayload[k]);
    note = `接口不认参数 ${stripKeys.join('/')}，已自动去掉重试`;
  } else {
    const coerced = coercePayload(payload, firstMsg);
    if (coerced) { retryPayload = coerced; note = '接口要求字段类型不同，已自动纠正重试'; }
  }
  if (!retryPayload) return result;

  if (state.cfg.debug && els.debugPre) {
    els.debugPre.textContent += `\n\n── 降级重试 ──\n` + JSON.stringify(retryPayload, null, 2);
  }
  toast(note, 'warn', 3000);
  return postImages(endpoint, headers, retryPayload);
}

/* 从报错信息里推断哪些参数不被支持，需要摘掉重试。
   覆盖常见别名：aspect_ratio / image_size / dimensions 等 → 尺寸类 */
function pickParamsToStrip(status, errMsg, payload) {
  if (status !== 400 && status !== 422) return [];
  const msg = String(errMsg || '').toLowerCase();
  if (!msg) return [];
  const strip = new Set();

  // 参数别名表：报错出现左边这些词 → 摘掉右边 payload 里的字段
  const aliasMap = [
    [/aspect[_ -]?ratio|宽高比/, ['size', 'width', 'height']],
    [/image[_ -]?size|dimensions|resolution|分辨率/, ['size', 'width', 'height']],
    [/quality|质量/, ['quality']],
    [/style|风格/, ['style']],
    [/response[_ -]?format/, ['response_format']],
    [/\bn\b(?!otify)|数量|images?\s*count|sample/, ['n']],
    [/negative|负向/, Object.keys(payload).filter(k => /negative/i.test(k))],
  ];
  aliasMap.forEach(([re, keys]) => {
    if (re.test(msg)) keys.forEach(k => { if (k in payload) strip.add(k); });
  });

  // 报错里直接点名了 payload 中的字段名 → 也摘掉
  Object.keys(payload).forEach(k => {
    if (k !== 'prompt' && k !== 'model' && new RegExp('\\b' + k.toLowerCase() + '\\b').test(msg)) {
      strip.add(k);
    }
  });
  return [...strip];
}

async function generate() {
  if (state.busy) return;

  const raw = els.promptBox.value.trim();
  if (!raw) { toast('先组合一段提示词吧', 'warn'); els.promptBox.focus(); return; }

  const prompt = normalizePrompt(raw);
  let endpoint, payload;
  try {
    endpoint = buildEndpoint();
    payload = buildPayload(prompt);
    applyImagePayload(payload);   // 图生图：并入参考图字段
  } catch (e) {
    toast(e.message, 'err', 3200); return;
  }

  if (state.cfg.debug) {
    els.debugPre.classList.remove('hidden');
    els.debugPre.textContent = `POST ${endpoint}\n\n` + JSON.stringify(payload, null, 2);
  }

  const n = clamp(Number(payload.n) || 1, 1, 8);  state.busy = true;
  setGenerating(true);
  state.ui.results = [];
  const holders = [];
  for (let i = 0; i < n; i++) {
    const id = uid();
    holders.push(id);
    state.ui.results.push({ id, kind: 'loading' });
  }
  renderResults();
  state.ui.results = [];

  const headers = { 'Content-Type': 'application/json' };
  if (state.cfg.apiKey.trim()) headers['Authorization'] = 'Bearer ' + state.cfg.apiKey.trim();

  try {
    const result = await postImagesSmart(endpoint, headers, payload);

    if (!result.ok) {
      const msg = (result.data && (result.data.error?.message || result.data.message || result.data.msg)) ||
                  result.text.slice(0, 400) || ('HTTP ' + result.status);
      throw new Error(`HTTP ${result.status} · ${msg}`);
    }

    const imgs = extractImages(result.data);
    if (!imgs.length) {
      const hint = result.data ? JSON.stringify(result.data).slice(0, 300) : result.text.slice(0, 300);
      throw new Error('接口返回里没有识别到图片数据：' + hint);
    }

    state.ui.results = imgs.map(im => ({ id: uid(), kind: 'img', src: im.src, prompt, time: Date.now() }));

    // 归档历史：最新 10 张存大图原图，其余只留缩略图 + 提示词（见 histAdd/histEnforce）
    await histAdd(state.ui.results.map(r => ({ id: r.id, src: r.src, prompt, time: r.time })));
    await reloadHistory();
    renderHistory();
    updateStoreStat();
    renderResults();
    bumpUsage(raw);
    toast(`绘制完成 · ${state.ui.results.length} 张`, 'ok');
  } catch (e) {
    let msg = e.message || String(e);
    if (e.name === 'AbortError') msg = '请求超时（超过 3 分钟未返回）';
    else if (/Failed to fetch|NetworkError/i.test(msg)) {
      msg = '网络请求失败：可能是接口地址写错、被浏览器 CORS 拦截，或该站点不允许网页直连。' +
            '（浏览器控制台会有更详细的原因）';
    }
    state.ui.results = holders.map(h => ({ id: h, kind: 'error', message: msg }));
    renderResults();
    toast('生成失败，看看画布上的原因', 'err', 3600);
  } finally {
    state.busy = false;
    setGenerating(false);
  }
}

function setGenerating(on) {
  const btn = els.btnGenerate;
  btn.disabled = on;
  btn.querySelector('.gen-label').textContent = on ? '绘制中…' : '开始绘制';
  const sp = btn.querySelector('.gen-spinner');
  if (sp) sp.hidden = !on;
}

/* ---------------- 模型列表拉取 ---------------- */
let _modelCache = { baseUrl: '', models: [] };

function renderModelPicker(filter) {
  const list = els.modelList;
  const models = _modelCache.models || [];
  const q = (filter || '').trim().toLowerCase();
  const shown = q ? models.filter(m => m.toLowerCase().includes(q)) : models;
  els.modelCount.textContent = models.length ? `${shown.length}/${models.length}` : '';
  if (!models.length) {
    list.innerHTML = `<div class="model-empty">还没有拉取到模型</div>`;
    return;
  }
  if (!shown.length) {
    list.innerHTML = `<div class="model-empty">没有匹配的模型</div>`;
    return;
  }
  const cur = state.cfg.model;
  list.innerHTML = shown.map(m => `<div class="model-opt ${m === cur ? 'active' : ''}" data-model="${esc(m)}">
    <span>${esc(m)}</span>${m === cur ? '<span class="cur">当前</span>' : ''}
  </div>`).join('');
}

async function fetchModels() {
  const btn = $('#btnFetchModels');
  const out = els.apiTestResult;
  let base = (state.cfg.baseUrl || '').trim().replace(/\/+$/, '');
  if (!base) { toast('先填接口地址 Base URL', 'warn'); return; }
  if (!/\/v\d+$/.test(base) && !/\/models$/.test(base)) base += '/v1';
  const url = /\/models$/.test(base) ? base : base + '/models';

  btn.disabled = true;
  btn.textContent = '拉取中…';
  if (out) { out.className = 'test-result busy'; out.textContent = '正在拉取模型列表…'; }

  try {
    const headers = {};
    if (state.cfg.apiKey.trim()) headers['Authorization'] = 'Bearer ' + state.cfg.apiKey.trim();
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status} · ${(await res.text()).slice(0, 160)}`);

    const d = await res.json();
    let models = [];
    if (Array.isArray(d.data)) {
      models = d.data.map(m => m.id || m.name || m.model || m).filter(x => typeof x === 'string');
    } else if (Array.isArray(d.models)) {
      // Gemini 风格 { models: [{name: "models/gemini-..."}] }
      models = d.models.map(m => String(m.name || m.id || '').replace(/^models\//, '')).filter(Boolean);
    } else if (Array.isArray(d)) {
      models = d.map(m => typeof m === 'string' ? m : (m.id || m.name || '')).filter(Boolean);
    }
    models = [...new Set(models)].sort((a, b) => a.localeCompare(b));
    if (!models.length) throw new Error('接口返回中没有模型列表');

    _modelCache = { baseUrl: state.cfg.baseUrl, models };
    renderModelPicker('');
    els.modelPicker.classList.remove('hidden');
    els.modelFilter.value = '';
    if (out) { out.className = 'test-result ok'; out.textContent = `✓ 拉取到 ${models.length} 个模型，点击列表即可选用`; }
  } catch (e) {
    if (out) {
      out.className = 'test-result err';
      out.textContent = '✕ 拉取失败：' + (e.message || e) + '（有些中转不开放 /models，可手动填模型名）';
    }
  } finally {
    btn.disabled = false;
    btn.textContent = '获取模型';
  }
}

/* 轻量连通性测试：用 GET /models 探活 */
async function testApi() {
  const out = els.apiTestResult;
  out.className = 'test-result busy';
  out.textContent = '测试中…';
  try {
    let base = (state.cfg.baseUrl || '').trim().replace(/\/+$/, '');
    if (!base) throw new Error('Base URL 为空');
    let url = /\/v\d+$/.test(base) ? base + '/models' : base + '/v1/models';
    const headers = {};
    if (state.cfg.apiKey.trim()) headers['Authorization'] = 'Bearer ' + state.cfg.apiKey.trim();

    const res = await fetch(url, { headers });
    if (res.ok) {
      let n = '';
      try {
        const d = await res.json();
        if (Array.isArray(d.data)) n = `，可见 ${d.data.length} 个模型`;
      } catch (e) {}
      out.className = 'test-result ok';
      out.textContent = `✓ 接口可达${n}`;
    } else {
      out.className = 'test-result err';
      out.textContent = `✕ HTTP ${res.status}：${(await res.text()).slice(0, 200)}`;
    }
  } catch (e) {
    out.className = 'test-result err';
    out.textContent = '✕ ' + (e.message || e) + '（若为浏览器跨域拦截属正常现象，直接生成试试）';
  }
}

/* ============================================================
   GitHub 云同步
   ============================================================ */
function ghReady(forWrite) {
  const g = state.cfg.gh;
  if (!g.owner || !g.repo) return false;
  if (forWrite && !g.token) return false;
  return true;
}

function ghApi(path) {
  return `https://api.github.com/repos/${encodeURIComponent(state.cfg.gh.owner)}/${encodeURIComponent(state.cfg.gh.repo)}${path}`;
}

function ghHeaders() {
  const h = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (state.cfg.gh.token) h['Authorization'] = 'Bearer ' + state.cfg.gh.token;
  return h;
}

function libPayload() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'prompt-painter',   // 数据标识，保持不变以兼容云端旧文件
    groups: state.lib,
  };
}

function setSync(stateName, text) {
  const pill = els.syncPill;
  pill.dataset.state = stateName;
  els.syncText.textContent = text;
}

async function ghGetFile() {
  const g = state.cfg.gh;
  const url = ghApi(`/contents/${encodeURIComponent(g.path || 'prompts.json')}` +
                    `?ref=${encodeURIComponent(g.branch || 'main')}&t=${Date.now()}`);
  const res = await fetch(url, { headers: ghHeaders() });
  if (res.status === 404) return { json: null, sha: null };
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`读取云端失败 HTTP ${res.status}：${t.slice(0, 200)}`);
  }
  const d = await res.json();
  let content = '';
  if (d.content) {
    try { content = decodeURIComponent(escape(atob(d.content.replace(/\n/g, '')))); }
    catch (e) { content = atob(d.content.replace(/\n/g, '')); }
  } else if (d.download_url) {
    const r2 = await fetch(d.download_url + '?t=' + Date.now());
    content = await r2.text();
  }
  let json = null;
  try { json = JSON.parse(content); } catch (e) { throw new Error('云端文件不是合法 JSON'); }
  return { json, sha: d.sha };
}

async function ghPull(silent) {
  if (!ghReady(false)) { if (!silent) toast('请先填仓库 owner 与 repo', 'warn'); return false; }
  setSync('busy', '正在拉取云端…');
  try {
    const { json } = await ghGetFile();
    if (!json || !Array.isArray(json.groups)) {
      setSync('on', '云端暂无数据');
      if (!silent) toast('云端还没有词库文件', 'warn');
      return false;
    }
    // 合并：按分组名去重，提示词按文本去重
    const merged = mergeLibraries(state.lib, json.groups);
    state.lib = merged.lib;
    persist.lib();
    renderLib();
    state.cfg.gh.lastSync = Date.now();
    persist.cfg();
    setSync('on', `已同步 · ${fmtTime(Date.now())}`);
    if (!silent) toast(`云端同步完成 · ${mergeSummary(merged)}`, 'ok', 3400);
    return merged;
  } catch (e) {
    setSync('err', '同步失败');
    if (!silent) toast('拉取失败：' + (e.message || e), 'err', 4000);
    els.ghResult.className = 'test-result err';
    els.ghResult.textContent = e.message || String(e);
    return false;
  }
}

function mergeLibraries(local, remote) {
  let added = 0, dups = 0, newGroups = 0;
  const byName = new Map(local.map(g => [g.name.trim().toLowerCase(), g]));
  (remote || []).forEach(rg => {
    const key = String(rg.name || '').trim().toLowerCase();
    let target = byName.get(key);
    if (!target) {
      target = { id: uid(), name: rg.name || '未命名分组', color: rg.color || GROUP_COLORS[0], collapsed: false, items: [] };
      local.push(target);
      byName.set(key, target);
      newGroups++;
    }
    const seen = new Set(target.items.map(i => i.text.trim().toLowerCase()));
    (rg.items || []).forEach(ri => {
      const t = String(ri.text || '').trim();
      if (!t) return;
      if (seen.has(t.toLowerCase())) { dups++; return; }
      seen.add(t.toLowerCase());
      target.items.push({
        id: uid(), text: t,
        usage: ri.usage || 0, lastUsed: ri.lastUsed || 0,
        tags: Array.isArray(ri.tags) ? ri.tags : [],
      });
      added++;
    });
  });
  return { lib: local, added, dups, newGroups };
}

/* 差异摘要：把一次合并的结果说成人话（供启动自动拉取提示） */
function mergeSummary(r) {
  if (!r) return '云端暂无新内容';
  const bits = [];
  if (r.added) bits.push(`新增 ${r.added} 条${r.newGroups ? `（含 ${r.newGroups} 个新分组）` : ''}`);
  if (r.dups) bits.push(`跳过重复 ${r.dups} 条`);
  return bits.length ? bits.join(' · ') : '与云端一致，无变化';
}

async function ghPush(silent) {
  if (!ghReady(true)) { if (!silent) toast('云同步需要仓库信息 + Token', 'warn'); return false; }
  setSync('busy', '正在上传…');
  try {
    let sha = null;
    try {
      const cur = await ghGetFile();
      sha = cur.sha;
    } catch (e) { /* 文件不存在或读失败，当作新建 */ }

    const body = {
      message: `chore(欧阳画板): 更新提示词库 · ${new Date().toLocaleString('zh-CN')}`,
      content: b64EncodeUnicode(JSON.stringify(libPayload(), null, 2)),
      branch: state.cfg.gh.branch || 'main',
    };
    if (sha) body.sha = sha;

    const res = await fetch(ghApi(`/contents/${encodeURIComponent(state.cfg.gh.path || 'prompts.json')}`), {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders()),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const t = await res.text();
      let hint = `HTTP ${res.status}`;
      if (res.status === 401) hint += ' · Token 无效或已过期';
      else if (res.status === 403) hint += ' · 权限不足（需要 Contents: Read and write）';
      else if (res.status === 404) hint += ' · 仓库不存在，或 Token 无该仓库权限';
      else if (res.status === 409) hint += ' · SHA 冲突，请先「从云端拉取」';
      throw new Error(`${hint}：${t.slice(0, 220)}`);
    }

    state.cfg.gh.lastSync = Date.now();
    persist.cfg();
    setSync('on', `已上传 · ${fmtTime(Date.now())}`);
    if (!silent) toast('已同步到 GitHub', 'ok');
    els.ghResult.className = 'test-result ok';
    els.ghResult.textContent = '✓ 词库已提交到 ' +
      `${state.cfg.gh.owner}/${state.cfg.gh.repo}/${state.cfg.gh.branch}/${state.cfg.gh.path}`;
    return true;
  } catch (e) {
    setSync('err', '上传失败');
    if (!silent) toast('上传失败：' + (e.message || e), 'err', 4500);
    els.ghResult.className = 'test-result err';
    els.ghResult.textContent = e.message || String(e);
    return false;
  }
}

/* 测试连接：分步校验，逐步报结果，让「填错的是哪一项」一目了然
   步骤 1 Token 有效性 → 步骤 2 仓库可达与写权限 → 步骤 3 路径可读与云端条目数
   注意：全程只读，不做任何写入探测，避免污染仓库 */
async function ghTestConn() {
  const g = state.cfg.gh;
  const out = els.ghResult;
  const lines = [];
  const draw = (cls) => {
    out.className = 'test-result ' + (cls || 'busy');
    out.innerHTML = lines.join('<br>');
  };

  if (!g.owner || !g.repo) {
    out.className = 'test-result err';
    out.textContent = '✗ 请先填写仓库 Owner 与 Repo';
    toast('请先填写 Owner 与 Repo', 'warn');
    return false;
  }
  if (!g.token && !g.publicRead) {
    out.className = 'test-result err';
    out.textContent = '✗ 私有仓库必须填 Token；公开仓库请勾选「公开仓库（跳过 token）」';
    toast('未填 Token 且未开启只读模式', 'warn', 3200);
    return false;
  }

  const t0 = Date.now();
  const branch = g.branch || 'main';
  lines.push(`<b>开始检测</b> · ${esc(g.owner)}/${esc(g.repo)} @ ${esc(branch)} → ${esc(g.path || 'prompts.json')}`);
  draw();

  /* 步骤 1：Token 是否有效 */
  if (!g.token) {
    lines.push('· 只读模式：未填 Token，跳过身份校验');
    draw();
  } else {
    try {
      const r = await fetch('https://api.github.com/user', { headers: ghHeaders() });
      if (!r.ok) {
        const t = await r.text();
        const why = r.status === 401 ? 'Token 无效或已过期'
                  : r.status === 403 ? 'Token 被限制或触发限流'
                  : `HTTP ${r.status}`;
        lines.push(`✗ <b>Token 校验失败</b> · ${esc(why)}`);
        lines.push(`<span class="tr-dim">${esc(String(t).slice(0, 160))}</span>`);
        draw('err');
        toast('Token 校验失败：' + why, 'err', 4200);
        return false;
      }
      const me = await r.json();
      lines.push(`✓ Token 有效 · 身份 <b>${esc(me.login || '?')}</b>`);
      draw();
    } catch (e) {
      lines.push(`✗ <b>Token 校验失败</b> · ${esc(e.message || String(e))}`);
      draw('err');
      return false;
    }
  }

  /* 步骤 2：仓库是否可达（顺带校验 Owner/Repo 拼写与写权限） */
  let repoInfo = null;
  try {
    const r = await fetch(ghApi(''), { headers: ghHeaders() });
    if (!r.ok) {
      const why = r.status === 404 ? '仓库不存在，或 Token 没有该仓库的权限'
                : r.status === 401 ? '认证失败'
                : r.status === 403 ? '访问被拒绝（可能是限流或权限不足）'
                : `HTTP ${r.status}`;
      lines.push(`✗ <b>仓库不可达</b> · ${esc(why)}`);
      draw('err');
      toast('仓库不可达：' + why, 'err', 4500);
      return false;
    }
    repoInfo = await r.json();
    const perm = repoInfo.permissions || {};
    const canWrite = !!perm.push;
    lines.push(`✓ 仓库可达 · ${repoInfo.private ? '私有' : '公开'}仓库 · 默认分支 <b>${esc(repoInfo.default_branch || 'main')}</b>` +
               ` · 写权限 ${canWrite ? '<b>已具备</b>' : '未确认（只读）'}`);
    draw();
  } catch (e) {
    lines.push(`✗ <b>仓库不可达</b> · ${esc(e.message || String(e))}`);
    draw('err');
    return false;
  }

  if (branch !== (repoInfo.default_branch || 'main')) {
    lines.push(`· 注意：你填的分支「${esc(branch)}」与仓库默认分支「${esc(repoInfo.default_branch || 'main')}」不同，确认这是你要同步的分支`);
    draw();
  }

  /* 步骤 3：路径能否读取、云端有多少数据 */
  try {
    const { json } = await ghGetFile();
    if (!json) {
      lines.push(`✓ 路径可读 · 云端还没有 <b>${esc(g.path || 'prompts.json')}</b>，首次「上传到云端」时创建`);
    } else {
      const groups = Array.isArray(json.groups) ? json.groups : [];
      const items = groups.reduce((n, x) => n + ((x.items || []).length), 0);
      const when = json.exportedAt ? new Date(json.exportedAt).toLocaleString('zh-CN') : '未知时间';
      lines.push(`✓ 路径可读 · 云端已有 <b>${groups.length} 组 / ${items} 条</b>词（导出时间 ${esc(when)}）`);
    }
    lines.push(`<span class="tr-dim">检测通过，共耗时 ${Date.now() - t0} ms</span>`);
    draw('ok');
    toast('连接正常 ✓', 'ok');
    return true;
  } catch (e) {
    lines.push(`✗ <b>路径读取失败</b> · ${esc(e.message || String(e))}`);
    draw('err');
    toast('路径读取失败，请检查「文件路径」与分支', 'err', 4200);
    return false;
  }
}

/* UTF-8 安全 base64（GitHub 要求） */
function b64EncodeUnicode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
}
function b64DecodeUnicode(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/* 自动同步：变更后延迟上传，避免频繁提交 */
const scheduleSync = (() => {
  let t = null;
  return (reason) => {
    const g = state.cfg.gh;
    if (!g.autoSync || !ghReady(true)) {
      if (ghReady(false) && !g.autoSync) { /* 手动模式不自动传 */ }
      return;
    }
    setSync('busy', '待上传…');
    clearTimeout(t);
    t = setTimeout(() => ghPush(true), 2500);
  };
})();

/* ============================================================
   导入 / 导出
   ============================================================ */
function exportJson() {
  const blob = new Blob([JSON.stringify(libPayload(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  a.download = `ouyang-huaban-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  toast('已导出 JSON 备份', 'ok');
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const groups = Array.isArray(data) ? data : (data.groups || []);
      if (!Array.isArray(groups) || !groups.length) throw new Error('文件里没有找到分组数据');
      const r = mergeLibraries(state.lib, groups);
      persist.lib();
      renderLib();
      scheduleSync('import');
      toast(`导入完成 · 新增 ${r.added} 条提示词`, 'ok');
    } catch (e) {
      toast('导入失败：' + (e.message || e), 'err');
    }
  };
  reader.readAsText(file, 'utf-8');
}

/* ============================================================
   设置面板绑定
   ============================================================ */
const CFG_KEYS = [
  ['cfgBaseUrl', 'baseUrl', 'text'],
  ['cfgApiKey', 'apiKey', 'text'],
  ['cfgModel', 'model', 'text'],
  ['cfgWidth', 'width', 'num'],
  ['cfgHeight', 'height', 'num'],
  ['cfgQuality', 'quality', 'text'],
  ['cfgStyle', 'style', 'text'],
  ['cfgResponse', 'responseFormat', 'text'],
  ['cfgNegative', 'negative', 'text'],
  ['mapSize', 'mapSize', 'text'],
  ['mapNegative', 'mapNegative', 'text'],
  ['cfgExtraJson', 'extraJson', 'text'],
];

const CFG_BOOLS = [
  ['chkSizeString', 'sizeString'],
  ['chkUseNegative', 'useNegative'],
  ['chkDebug', 'debug'],
  ['chkAppendJoin', 'appendJoin'],
  ['chkDedupe', 'dedupe'],
];

const GH_KEYS = [
  ['ghOwner', 'owner'], ['ghRepo', 'repo'], ['ghBranch', 'branch'],
  ['ghPath', 'path'], ['ghToken', 'token'],
];
const GH_BOOLS = [['chkAutoSync', 'autoSync'], ['chkAutoPull', 'autoPull'], ['chkSyncPrompt', 'publicRead']];

function bindSettings() {
  CFG_KEYS.forEach(([elId, key, kind]) => {
    const el = $('#' + elId);
    if (!el) return;
    const isPassword = el.type === 'password';
    el.addEventListener('input', () => {
      state.cfg[key] = kind === 'num' ? Number(el.value) : el.value;
      if (isPassword) updateDangerNote();
      persist.cfg();
      markSizeActive();
    });
    el.addEventListener('change', () => {
      state.cfg[key] = kind === 'num' ? Number(el.value) : el.value;
      persist.cfg();
      markSizeActive();
    });
  });

  CFG_BOOLS.forEach(([elId, key]) => {
    const el = $('#' + elId);
    if (!el) return;
    el.addEventListener('change', () => { state.cfg[key] = el.checked; persist.cfg(); });
  });

  GH_KEYS.forEach(([elId, key]) => {
    const el = $('#' + elId);
    if (!el) return;
    el.addEventListener('input', () => {
      state.cfg.gh[key] = el.value;
      persist.cfg();
      updateSyncPill();
    });
  });
  GH_BOOLS.forEach(([elId, key]) => {
    const el = $('#' + elId);
    if (!el) return;
    el.addEventListener('change', () => { state.cfg.gh[key] = el.checked; persist.cfg(); updateSyncPill(); });
  });

  const cnt = $('#cfgCount');
  cnt.addEventListener('input', () => {
    state.cfg.count = Number(cnt.value);
    $('#cfgCountOut').textContent = cnt.value + ' 张';
    persist.cfg();
  });

  $('#cfgNegativePreset').addEventListener('change', e => {
    const v = e.target.value;
    if (!v) return;
    $('#cfgNegative').value = v;
    state.cfg.negative = v;
    state.cfg.useNegative = true;
    $('#chkUseNegative').checked = true;
    persist.cfg();
    e.target.value = '';
  });

  $$('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = $('#' + btn.dataset.target);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁' : '🙈';
    });
  });
}

function settingsToUI() {
  CFG_KEYS.forEach(([elId, key]) => {
    const el = $('#' + elId);
    if (el) el.value = state.cfg[key] ?? '';
  });
  CFG_BOOLS.forEach(([elId, key]) => {
    const el = $('#' + elId);
    if (el) el.checked = !!state.cfg[key];
  });
  GH_KEYS.forEach(([elId, key]) => {
    const el = $('#' + elId);
    if (el) el.value = state.cfg.gh[key] ?? '';
  });
  GH_BOOLS.forEach(([elId, key]) => {
    const el = $('#' + elId);
    if (el) el.checked = !!state.cfg.gh[key];
  });
  $('#cfgCount').value = state.cfg.count;
  $('#cfgCountOut').textContent = state.cfg.count + ' 张';

  // 图生图相关
  $('#i2iStrength').value = state.cfg.i2iStrength;
  $('#i2iStrength2').value = state.cfg.i2iStrength;
  $('#i2iStrengthOut').textContent = Number(state.cfg.i2iStrength).toFixed(2);
  $('#i2iStrengthOut2').textContent = Number(state.cfg.i2iStrength).toFixed(2);
  $('#i2iFollowSize').checked = !!state.cfg.i2iFollowSize;
  $('#i2iFormat').value = state.cfg.i2iFormat || 'dataurl';
  $('#mapImage').value = state.cfg.mapImage || 'image';
  $('#mapStrength').value = state.cfg.mapStrength || 'strength';
  if (state.cfg.i2iOutW) $('#i2iOutW').value = state.cfg.i2iOutW;
  if (state.cfg.i2iOutH) $('#i2iOutH').value = state.cfg.i2iOutH;
  $('#i2iOutW').disabled = !!state.cfg.i2iFollowSize;
  $('#i2iOutH').disabled = !!state.cfg.i2iFollowSize;

  // 翻译
  $('#trBaseUrl').value = state.cfg.trBaseUrl || '';
  $('#trApiKey').value = state.cfg.trApiKey || '';
  $('#trModel').value = state.cfg.trModel || 'gpt-4o-mini';
  $('#trAction').value = state.cfg.trAction || 'replace';

  updateSyncPill();
  renderSizeGrid();
  updateStoreStat();
  renderReference();
}

function updateSyncPill() {
  const g = state.cfg.gh;
  if (!g.owner || !g.repo) { setSync('off', '未配置云同步'); return; }
  if (g.lastSync) setSync('on', `已同步 · ${fmtTime(g.lastSync)}`);
  else if (g.token || g.publicRead) setSync('off', '待首次同步');
  else setSync('off', '缺少 Token');
}

/* Key 写入本机的安全提示 —— 只在有值时轻声提醒一次 */
let _keyWarned = false;
function updateDangerNote() {
  if (_keyWarned) return;
  const hasKey = !!(state.cfg.apiKey || '').trim();
  if (hasKey) {
    _keyWarned = true;
    setSync('off', '未配置云同步'); // 保持同步胶囊语义不变
    toast('API Key 已保存在本机浏览器，请勿在公共电脑上使用', 'warn', 3200);
  }
}

function updateStoreStat() {
  let bytes = 0;
  [LS.lib, LS.cfg, LS.ui].forEach(k => {
    const v = localStorage.getItem(k);
    if (v) bytes += v.length;
  });
  const kb = (bytes / 1024).toFixed(1);
  const fullCnt = _histFull.size;
  const line = () => {
    els.storeStat.textContent =
      `设置占用 ${kb} KB · 历史 ${state.history.length} 条（大图 ${fullCnt} 张，其余仅缩略图 + 提示词；图片在顶部「历史记录」标签查看）` +
      ` · 提示词 ${state.lib.reduce((n, g) => n + g.items.length, 0)} 条` + (els.storeStat.dataset.extra || '');
  };
  line();
  // 图片库体积（IndexedDB）异步补充
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then(est => {
      els.storeStat.dataset.extra = ` · 历史图片共约 ${((est.usage || 0) / 1048576).toFixed(1)} MB`;
      line();
    }).catch(() => {});
  }
}

/* ---------------- 尺寸预设 ---------------- */
function renderSizeGrid() {
  const grid = els.sizeGrid;
  grid.innerHTML = SIZE_PRESETS.map((p, i) =>
    `<button class="size-chip" data-i="${i}"><b>${p.label}</b>${p.w}×${p.h}</button>`).join('');
  markSizeActive();
}
function markSizeActive() {
  $$('.size-chip').forEach((c, i) => {
    const p = SIZE_PRESETS[i];
    c.classList.toggle('active', p && Number(state.cfg.width) === p.w && Number(state.cfg.height) === p.h);
  });
}

/* ============================================================
   弹窗 / 灯箱
   ============================================================ */
function openModal(title, html) {
  abortAiRequest();          // 面板被替换/重开时，先中止 AI 帮写未完成的请求
  els.modalTitle.textContent = title;
  els.modalBody.innerHTML = html + `<div class="ver-badge">欧阳画板 v${APP_VERSION}</div>`;
  els.modal.hidden = false;
}
function closeModal() {
  abortAiRequest();          // 关闭面板时中止请求，避免后台继续跑
  els.modal.hidden = true;
}

function openLightbox(src, prompt) {
  els.lbImg.src = src;
  els.lbPrompt.value = prompt || '';
  els.lbDownload.href = src;
  els.lightbox.hidden = false;
}
function closeLightbox() { els.lightbox.hidden = true; els.lbImg.src = ''; }

const HELP_HTML = `
  <h4>核心玩法：点一下 = 追加，不是替换</h4>
  <p>左侧每一张卡片都是一段可复用的提示词。点击它，文字会<b>插入到光标所在位置</b>，
  前后自动补齐逗号分隔。所以你可以像搭积木一样，把「画质增强 + 光影 + 画风」拼成一句话。</p>
  <h4>三步出图</h4>
  <ol>
    <li>先在对话框里写好主体描述，比如 <code>一只戴墨镜的橘猫</code>。</li>
    <li>把光标放到想插的位置，依次点亮 <code>画质增强</code>、<code>光影氛围</code> 里的词。</li>
    <li>右侧调好尺寸与模型，按 <b>Ctrl + Enter</b> 或点「开始绘制」。</li>
  </ol>
  <h4>几个顺手的小设计</h4>
  <ul>
    <li><b>拖拽排序</b>：卡片可以在分组内拖动调整顺序（「手动排序」模式下生效）。</li>
    <li><b>去重</b>：开启后重复的词不会再加进去；关掉就能故意叠权重。</li>
    <li><b>撤销</b>：底部「撤销上次追加」可以回退，连按多次逐步回退。</li>
    <li><b>权重写法</b>：<code>(关键词:1.3)</code> 提权、<code>[关键词]</code> 降权，按你的接口习惯来。</li>
    <li><b>右键/悬停</b>：卡片悬停出现 ✎ 编辑、⧉ 拷贝、🗑 删除。</li>
  </ul>
  <h4>云同步是怎么回事</h4>
  <p>网站把你的词库存成 GitHub 仓库里的一个 JSON 文件。点保存 = 提交一次 commit。
  换设备打开同一网址，拉取后就是你那一份词库。Token 只存在本机浏览器里。</p>
`;

const ABOUT_HTML = `
  <div class="kv">
    <b>应用</b><span>欧阳画板 · 提示词绘画工作台</span>
    <b>形态</b><span>单页纯前端应用，无后端、无构建</span>
    <b>绘图接口</b><span>OpenAI 兼容的 Images API</span>
    <b>数据存放</b><span>浏览器 localStorage（+ 可选 GitHub 仓库）</span>
  </div>
  <p>你的 API Key、GitHub Token 全部只保存在这台设备的浏览器里，
  请求直接从浏览器发往对应服务商，本站不经过任何第三方服务器。</p>
`;

/* ============================================================
   事件绑定
   ============================================================ */
function bindEvents() {
  /* --- 顶栏 --- */
  $('#btnSettings').addEventListener('click', () => {
    const p = els.panelParams;
    if (window.innerWidth <= 1000) {
      p.classList.add('open'); els.scrim.hidden = false;
      p.querySelector('.params-scroll').scrollTop = 0;
    } else {
      p.querySelector('.params-scroll').scrollTo({ top: 0, behavior: 'smooth' });
      $$('.acc', p).forEach(a => { if (a.querySelector('#apiTestResult') || a.dataset.force) a.open = true; });
    }
  });
  $('#btnTheme').addEventListener('click', () => {
    const next = state.ui.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    store.write(LS.theme, next);
  });
  $('#brandBtn').addEventListener('click', () => openModal('关于', ABOUT_HTML));
  $('#btnToggleLib').addEventListener('click', () => { els.panelLib.classList.add('open'); els.scrim.hidden = false; });
  $('#btnToggleParams').addEventListener('click', () => { els.panelParams.classList.add('open'); els.scrim.hidden = false; });
  $('#btnCloseLib').addEventListener('click', () => closeDrawers());
  $('#btnCloseParams').addEventListener('click', () => closeDrawers());
  els.scrim.addEventListener('click', closeDrawers);

  /* --- 词库工具栏 --- */
  $('#btnNewGroup').addEventListener('click', () => {
    const g = addGroup();
    renderLib();
    setTimeout(() => startRenameGroup(g.id), 30);
  });
  $('#btnHelpAppend').addEventListener('click', () => openModal('使用说明', HELP_HTML));
  $('#btnClearSearch').addEventListener('click', () => {
    els.libSearch.value = ''; state.ui.search = ''; els.btnClearSearch.hidden = true; renderLib();
  });
  els.libSearch.addEventListener('input', debounce(e => {
    state.ui.search = e.target.value;
    els.btnClearSearch.hidden = !e.target.value;
    renderLib();
  }, 160));
  els.libSort.addEventListener('change', e => {
    state.ui.sort = e.target.value; persist.ui(); renderLib();
  });

  /* --- 词库点击（事件委托）--- */
  els.libScroll.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (btn) { handleLibAction(btn, e); return; }

    const card = e.target.closest('.pcard');
    if (card) { onPickItem(card.dataset.gid, card.dataset.iid); return; }

    const head = e.target.closest('.group-head');
    if (head && !e.target.closest('.group-name[contenteditable]')) {
      toggleGroup(head.dataset.gid);
    }
  });

  // 双击分组名重命名
  els.libScroll.addEventListener('dblclick', e => {
    const nameEl = e.target.closest('.group-name');
    if (nameEl) startRenameGroup(nameEl.dataset.gid);
  });

  /* --- 拖拽卡片 --- */
  let dragCtx = null;
  els.libScroll.addEventListener('dragstart', e => {
    const card = e.target.closest('.pcard');
    if (!card) return;
    dragCtx = { gid: card.dataset.gid, iid: card.dataset.iid };
    card.classList.add('dragging');
    try { e.dataTransfer.setData('text/plain', dragCtx.iid); } catch (er) {}
    e.dataTransfer.effectAllowed = 'move';
  });
  els.libScroll.addEventListener('dragend', e => {
    $$('.pcard.dragging').forEach(c => c.classList.remove('dragging'));
    $$('.pcard.drop-before').forEach(c => c.classList.remove('drop-before'));
    $$('.group.drop-target').forEach(c => c.classList.remove('drop-target'));
    dragCtx = null;
  });
  els.libScroll.addEventListener('dragover', e => {
    if (!dragCtx) return;
    const over = e.target.closest('.group-body');
    if (!over) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    $$('.group.drop-target').forEach(c => c.classList.remove('drop-target'));
    $$('.pcard.drop-before').forEach(c => c.classList.remove('drop-before'));
    const tgtGroup = over.closest('.group');
    if (tgtGroup) tgtGroup.classList.add('drop-target');
    const overCard = e.target.closest('.pcard');
    if (overCard && overCard.dataset.iid !== dragCtx.iid) overCard.classList.add('drop-before');
  });
  els.libScroll.addEventListener('drop', e => {
    if (!dragCtx) return;
    e.preventDefault();
    const bodyEl = e.target.closest('.group-body');
    if (!bodyEl) return;
    const toGid = bodyEl.dataset.gid;
    const overCard = e.target.closest('.pcard');
    moveItem(dragCtx.gid, dragCtx.iid, toGid, overCard ? overCard.dataset.iid : null);
    dragCtx = null;
  });

  /* --- 输入台 --- */
  els.promptBox.addEventListener('input', () => { updatePromptMeta(); saveDraft(); });
  els.promptBox.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); generate(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey) {
      e.preventDefault(); undoAppend();
    }
  });
  els.btnGenerate.addEventListener('click', generate);
  $('#btnClearPrompt').addEventListener('click', () => {
    if (!els.promptBox.value) return;
    pushUndo();
    els.promptBox.value = '';
    state.ui.chips = [];
    updatePromptMeta(); renderChips(); saveDraft();
  });
  $('#btnUndoAppend').addEventListener('click', undoAppend);

  els.chipsRow.addEventListener('click', e => {
    const x = e.target.closest('.chip-x');
    if (x) { removeChipByText(x.dataset.cid); return; }
    const chip = e.target.closest('.chip');
    if (chip) {
      const c = state.ui.chips.find(v => v.id === chip.dataset.cid);
      if (c) {
        const idx = els.promptBox.value.toLowerCase().indexOf(c.text.toLowerCase());
        if (idx >= 0) {
          els.promptBox.focus();
          els.promptBox.setSelectionRange(idx, idx + c.text.length);
        }
      }
    }
  });

  $('#chkAppendJoin').addEventListener('change', e => { state.cfg.appendJoin = e.target.checked; persist.cfg(); });
  $('#chkDedupe').addEventListener('change', e => { state.cfg.dedupe = e.target.checked; persist.cfg(); });

  /* --- 结果区 --- */
  els.tabResult.addEventListener('click', e => {
    // 下载模式：勾选/取消
    const pickBox = e.target.closest('[data-act="toggle-pick"]');
    if (pickBox) { e.stopPropagation(); togglePick(pickBox.dataset.id); return; }

    const img = e.target.closest('img[data-act="zoom"]');
    if (img) {
      if (state.ui.dlMode) {
        const cardId = img.closest('.card-img')?.id;
        if (cardId) togglePick(cardId);
        return;
      }
      const r = (state.ui.results || []).find(x => x.id === img.closest('[id]')?.id);
      openLightbox(img.src, r ? r.prompt : '');
      return;
    }
    const cp = e.target.closest('[data-act="copy-result-prompt"]');
    if (cp) {
      const r = (state.ui.results || []).find(x => x.id === cp.dataset.id);
      if (r) copyText(r.prompt).then(() => toast('提示词已复制', 'ok')).catch(() => toast('复制失败', 'err'));
    }
  });

  els.historyGrid.addEventListener('click', e => {
    const pickBox = e.target.closest('[data-act="toggle-pick"]');
    if (pickBox) { e.stopPropagation(); togglePick(pickBox.dataset.id); return; }

    const card = e.target.closest('[data-act="open-hist"]');
    if (!card) return;
    if (state.ui.dlMode) { togglePick(card.dataset.hid); return; }
    const h = state.history.find(x => x.id === card.dataset.hid);
    if (h) {
      const full = histFullSrc(h.id);
      if (!full) toast('这张的大图已释放（只保留最近 10 张），当前显示缩略图', 'warn', 3200);
      openLightbox(full || h.src, h.prompt);
    }
  });

  /* --- 批量下载工具条 --- */
  $('#btnDownloadMode').addEventListener('click', () => {
    if (state.ui.dlMode) exitDownloadMode(); else enterDownloadMode();
  });
  $('#dlExit').addEventListener('click', exitDownloadMode);
  $('#dlConfirm').addEventListener('click', downloadPicked);
  $('#dlSelectAll').addEventListener('click', () => {
    const imgs = (state.ui.results || []).filter(r => r.kind === 'img');
    const src = imgs.length ? imgs : state.history;
    state.ui.dlPicked = [...new Set(src.map(r => r.id))];
    persistDL(); updateDlInfo(); renderResults(); renderHistory();
  });
  $('#dlSelectNone').addEventListener('click', () => {
    state.ui.dlPicked = [];
    persistDL(); updateDlInfo(); renderResults(); renderHistory();
  });
  $('#dlInvert').addEventListener('click', () => {
    const imgs = (state.ui.results || []).filter(r => r.kind === 'img');
    const src = imgs.length ? imgs : state.history;
    const all = src.map(r => r.id);
    const cur = new Set(state.ui.dlPicked);
    state.ui.dlPicked = all.filter(id => !cur.has(id));
    persistDL(); updateDlInfo(); renderResults(); renderHistory();
  });

  /* --- 矩阵组合 --- */
  $('#btnMatrix').addEventListener('click', openMatrix);
  $('#matrixClose').addEventListener('click', closeMatrix);
  els.matrix.addEventListener('click', e => { if (e.target === els.matrix) closeMatrix(); });
  [els.listA, els.listB].forEach(ta => ta.addEventListener('input', debounce(buildMatrixRows, 260)));
  els.matrixCommon.addEventListener('input', debounce(buildMatrixRows, 260));
  els.matrixList.addEventListener('click', e => {
    const row = e.target.closest('.mx-row');
    if (!row) return;
    const r = state.matrix.rows.find(x => x.id === row.dataset.mxid);
    if (!r) return;
    r.on = !r.on;
    row.classList.toggle('off', !r.on);
    updateMatrixCount();
  });
  $('#matrixFillCommon').addEventListener('click', () => {
    els.matrixCommon.value = els.promptBox.value.trim();
    buildMatrixRows();
    toast('已填入当前对话框内容', 'ok', 1600);
  });
  $('#matrixPickGroupB').addEventListener('click', () => {
    const auto = guessActionPrompts();
    if (!auto.length) { toast('词库里没找到「动作/姿势」类分组，请手动填写', 'warn'); return; }
    els.listB.value = auto.join('\n');
    buildMatrixRows();
    toast(`已从词库填入 ${auto.length} 条`, 'ok', 1800);
  });
  els.matrixRun.addEventListener('click', runMatrix);

  /* --- 移动端 ⋯ 菜单 --- */
  $('#btnMore').addEventListener('click', openMoreMenu);
  $('#btnMoreStage').addEventListener('click', openMoreMenu);
  els.moreMenu.addEventListener('click', e => {
    if (e.target === els.moreMenu) return closeMoreMenu();
    const item = e.target.closest('[data-more]');
    if (item) handleMoreAction(item.dataset.more);
  });

  /* --- 图生图 --- */
  $('#btnImg2Img').addEventListener('click', () => {
    const has = !!(state.cfg.refImage && state.cfg.refImage.dataUrl);
    if (has) {
      // 已有参考图：聚焦对话框，方便补充描述
      els.promptBox.focus();
      toast('参考图已就位，补充描述后开始绘制', '', 2200);
    } else {
      els.i2iFile.click();
    }
  });
  els.i2iFile.addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) handleRefFile(f);
    e.target.value = '';
  });
  els.i2iDrop.addEventListener('click', () => els.i2iFile.click());
  ['dragenter', 'dragover'].forEach(ev => els.i2iDrop.addEventListener(ev, e => {
    e.preventDefault(); els.i2iDrop.classList.add('over');
  }));
  ['dragleave', 'drop'].forEach(ev => els.i2iDrop.addEventListener(ev, e => {
    e.preventDefault(); els.i2iDrop.classList.remove('over');
  }));
  els.i2iDrop.addEventListener('drop', e => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleRefFile(f);
  });
  $('#i2iRemove').addEventListener('click', clearReference);
  $('#i2iClearCfg').addEventListener('click', clearReference);

  // 全局粘贴图片
  document.addEventListener('paste', e => {
    // 词库搜索框等输入场景不拦截
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (const it of items) {
      if (it.type && it.type.indexOf('image') === 0) {
        const f = it.getAsFile();
        if (f) {
          e.preventDefault();
          handleRefFile(f);
          // 同步打开参数面板里的图生图区域
          const acc = document.getElementById('accI2I');
          if (acc) acc.open = true;
          return;
        }
      }
    }
  });

  // 强度滑杆（对话框区 + 参数面板，双向同步）
  const syncStrength = (val, from) => {
    const v = clamp(Number(val), 0, 1);
    state.cfg.i2iStrength = v;
    persist.cfg();
    const out1 = $('#i2iStrengthOut'), out2 = $('#i2iStrengthOut2');
    if (out1) out1.textContent = v.toFixed(2);
    if (out2) out2.textContent = v.toFixed(2);
    if (from !== 'strip') $('#i2iStrength').value = v;
    if (from !== 'panel') $('#i2iStrength2').value = v;
  };
  $('#i2iStrength').addEventListener('input', e => syncStrength(e.target.value, 'strip'));
  $('#i2iStrength2').addEventListener('input', e => syncStrength(e.target.value, 'panel'));

  // 输出尺寸
  els.i2iOutW.addEventListener('input', e => { state.cfg.i2iOutW = Number(e.target.value) || null; persist.cfg(); });
  els.i2iOutH.addEventListener('input', e => { state.cfg.i2iOutH = Number(e.target.value) || null; persist.cfg(); });
  $('#i2iFollowSize').addEventListener('change', e => {
    state.cfg.i2iFollowSize = e.target.checked; persist.cfg();
    const w = els.i2iOutW, h = els.i2iOutH;
    w.disabled = e.target.checked; h.disabled = e.target.checked;
  });
  $('#i2iFormat').addEventListener('change', e => { state.cfg.i2iFormat = e.target.value; persist.cfg(); });
  $('#mapImage').addEventListener('input', e => { state.cfg.mapImage = e.target.value; persist.cfg(); });
  $('#mapStrength').addEventListener('input', e => { state.cfg.mapStrength = e.target.value; persist.cfg(); });

  /* --- 翻译 --- */
  $('#trBaseUrl').addEventListener('input', e => { state.cfg.trBaseUrl = e.target.value; persist.cfg(); });
  $('#trApiKey').addEventListener('input', e => { state.cfg.trApiKey = e.target.value; persist.cfg(); });
  $('#trModel').addEventListener('input', e => { state.cfg.trModel = e.target.value; persist.cfg(); });
  $('#trAction').addEventListener('change', e => { state.cfg.trAction = e.target.value; persist.cfg(); });
  $('#trReuse').addEventListener('click', () => {
    state.cfg.trBaseUrl = state.cfg.baseUrl || '';
    $('#trBaseUrl').value = state.cfg.trBaseUrl;
    persist.cfg();
    toast('已复用画图接口地址', 'ok', 1500);
  });
  $('#btnTranslate').addEventListener('click', translatePrompt);
  $('#btnAiWrite').addEventListener('click', openAiWrite);

  /* --- Tab --- */
  $$('.tab').forEach(t => t.addEventListener('click', () => {
    $$('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    const isResult = t.dataset.tab === 'result';
    els.tabResult.classList.toggle('hidden', !isResult);
    els.tabHistory.classList.toggle('hidden', isResult);
  }));

  /* --- 灯箱 --- */
  $('#lbClose').addEventListener('click', closeLightbox);
  els.lightbox.addEventListener('click', e => { if (e.target === els.lightbox) closeLightbox(); });
  $('#lbCopyPrompt').addEventListener('click', () => {
    copyText(els.lbPrompt.value).then(() => toast('已复制', 'ok')).catch(() => toast('复制失败', 'err'));
  });

  /* --- 弹窗 --- */
  $('#modalClose').addEventListener('click', closeModal);
  els.modal.addEventListener('click', e => { if (e.target === els.modal) closeModal(); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!els.matrix.hidden) return closeMatrix();
      if (!els.lightbox.hidden) return closeLightbox();
      if (!els.modal.hidden) return closeModal();
      if (state.ui.dlMode) return exitDownloadMode();
      if (els.panelLib.classList.contains('open') || els.panelParams.classList.contains('open')) return closeDrawers();
    }
    // Ctrl+K 聚焦搜索
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (window.innerWidth <= 1000) { els.panelLib.classList.add('open'); els.scrim.hidden = false; }
      els.libSearch.focus(); els.libSearch.select();
    }
    // Ctrl+Enter 全局触发生成
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && document.activeElement !== els.promptBox) {
      e.preventDefault(); generate();
    }
  });

  /* --- 视口变化：切回桌面宽时清理抽屉与遮罩，避免残留覆盖层 --- */
  let _lastNarrow = window.innerWidth <= 1000;
  window.addEventListener('resize', debounce(() => {
    const narrow = window.innerWidth <= 1000;
    if (_lastNarrow && !narrow) closeDrawers();     // 由窄变宽
    if (!narrow) closeDrawers();                     // 桌面端永远不该有抽屉打开
    _lastNarrow = narrow;
  }, 120));

  /* --- 接口测试 / 预设 / 模型列表 --- */
  $('#btnTestApi').addEventListener('click', testApi);
  $('#btnFetchModels').addEventListener('click', fetchModels);
  els.modelFilter.addEventListener('input', debounce(e => renderModelPicker(e.target.value), 120));
  els.modelList.addEventListener('click', e => {
    const opt = e.target.closest('.model-opt');
    if (!opt) return;
    state.cfg.model = opt.dataset.model;
    $('#cfgModel').value = opt.dataset.model;
    persist.cfg();
    renderModelPicker(els.modelFilter.value);
    toast('已选用模型：' + opt.dataset.model, 'ok', 1600);
  });
  // 输入框聚焦且有缓存时，展开选择列表
  $('#cfgModel').addEventListener('focus', () => {
    if (_modelCache.models.length) els.modelPicker.classList.remove('hidden');
  });
  document.addEventListener('click', e => {
    if (!els.modelPicker || els.modelPicker.classList.contains('hidden')) return;
    if (e.target.closest('#modelPicker') || e.target.closest('#cfgModel') || e.target.closest('#btnFetchModels')) return;
    els.modelPicker.classList.add('hidden');
  });
  $('#btnPreset').addEventListener('click', () => {
    const html = `
      <p>选一个常用服务商快速填好地址与模型（Key 需自己填）：</p>
      <div class="field-row two" style="flex-wrap:wrap;gap:8px">
        <button class="btn tiny ghost" data-preset="openai">OpenAI 官方</button>
        <button class="btn tiny ghost" data-preset="silicon">硅基流动</button>
        <button class="btn tiny ghost" data-preset="zhipu">智谱 AI</button>
        <button class="btn tiny ghost" data-preset="dashscope">通义万相</button>
        <button class="btn tiny ghost" data-preset="local">本地 / 自建</button>
      </div>
      <p style="font-size:11.5px;color:var(--text-3);margin-top:12px">
        这些只是把常见地址填进去，具体可用模型请以服务商文档为准。</p>`;
    openModal('快填预设', html);
  });
  els.modalBody.addEventListener('click', e => {
    const b = e.target.closest('[data-preset]');
    if (!b) return;
    const presets = {
      openai:    { baseUrl: 'https://api.openai.com/v1', model: 'gpt-image-1' },
      silicon:   { baseUrl: 'https://api.siliconflow.cn/v1', model: 'Kwai-Kolors/Kolors' },
      zhipu:     { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'cogview-4' },
      dashscope: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'wanx2.1-t2i-turbo' },
      local:     { baseUrl: 'http://127.0.0.1:3000/v1', model: 'flux-schnell' },
    };
    const p = presets[b.dataset.preset];
    if (p) {
      Object.assign(state.cfg, p);
      persist.cfg();
      settingsToUI();
      toast('已填入 ' + p.baseUrl, 'ok');
    }
    closeModal();
  });

  /* --- 尺寸 --- */
  els.sizeGrid.addEventListener('click', e => {
    const chip = e.target.closest('.size-chip');
    if (!chip) return;
    const p = SIZE_PRESETS[Number(chip.dataset.i)];
    if (!p) return;
    state.cfg.width = p.w; state.cfg.height = p.h;
    $('#cfgWidth').value = p.w; $('#cfgHeight').value = p.h;
    persist.cfg();
    markSizeActive();
  });

  /* --- 云同步 --- */
  $('#btnGhPush').addEventListener('click', () => ghPush(false));
  $('#btnGhPull').addEventListener('click', () => ghPull(false));
  $('#btnGhTest').addEventListener('click', () => ghTestConn());

  /* --- 数据 --- */
  $('#btnExport').addEventListener('click', exportJson);
  $('#btnExport2').addEventListener('click', exportJson);
  $('#btnImport').addEventListener('click', () => $('#fileImport').click());
  $('#btnImport2').addEventListener('click', () => $('#fileImport').click());
  $('#fileImport').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) importJson(f);
    e.target.value = '';
  });
  $('#btnResetLib').addEventListener('click', () => {
    openModal('示例模板库', `
      <p>内置了两套可直接用的词组模板，可以<b>合并</b>进你现有词库（重复的会自动跳过），
      也可以整体替换。</p>
      <div class="field" style="margin-top:14px">
        <label>人像摄影模板（推荐）</label>
        <small>主体 / 五官 / 妆造 / 光线 / 镜头 / 氛围 / 背景，共 8 组，点几下就能拼出完整人像提示词。</small>
        <div class="field-row" style="margin-top:8px">
          <button class="btn tiny primary" data-seed="portrait-merge">合并人像模板</button>
          <button class="btn tiny ghost" data-seed="portrait-only">只保留人像模板</button>
        </div>
      </div>
      <div class="field" style="margin-top:16px">
        <label>通用词组模板</label>
        <small>画质 / 产品电商 / 色彩 / 画风 / 排版，适合产品图与插画。</small>
        <div class="field-row" style="margin-top:8px">
          <button class="btn tiny ghost" data-seed="all-merge">合并全部模板</button>
          <button class="btn tiny danger" data-seed="all-replace">清空并只保留模板</button>
        </div>
      </div>`);
  });
  els.modalBody.addEventListener('click', e => {
    const b = e.target.closest('[data-seed]');
    if (!b) return;
    const mode = b.dataset.seed;
    if (mode === 'all-replace') {
      state.lib = seedLibrary();
      persist.lib(); renderLib(); scheduleSync('seed-replace');
      toast('已重置为内置模板词库', 'ok');
    } else if (mode === 'portrait-only') {
      state.lib = portraitLibrary();
      persist.lib(); renderLib(); scheduleSync('seed-portrait');
      toast('已载入人像模板', 'ok');
    } else {
      const src = mode === 'portrait-merge' ? portraitLibrary() : seedLibrary();
      const r = mergeLibraries(state.lib, src);
      persist.lib(); renderLib(); scheduleSync('seed-merge');
      toast(`已合并 · 新增 ${r.added} 条`, 'ok');
    }
    closeModal();
  });
  $('#btnOpenHist').addEventListener('click', () => {
    $('#modalClose')?.click();
    document.querySelector('[data-tab="history"]')?.click();
  });
  /* 清空历史：历史区与设置面板共用同一套确认 + 清空逻辑 */
  $('#btnClearHist').addEventListener('click', openClearHistoryConfirm);
  $('#btnWipeGen').addEventListener('click', openClearHistoryConfirm);
  els.modalBody.addEventListener('click', async e => {
    const btn = e.target.closest('[data-clearhist]');
    if (!btn) return;
    btn.disabled = true;
    const ok = await clearHistoryRecords();
    if (ok) closeModal();
    else btn.disabled = false;   // 失败时保留弹窗，方便直接重试
  });
  $('#btnWipeAll').addEventListener('click', () => {
    openModal('重置全部数据', `
      <p>将清除：词库、接口配置、生成历史、主题设置。<b>此操作不可撤销。</b></p>
      <p style="color:var(--danger)">如果已经配置了云同步，建议先「上传到云端」备份，或先导出 JSON。</p>
      <div class="field-row"><button class="btn tiny danger" data-wipe="1">确认清除全部</button></div>`);
  });
  els.modalBody.addEventListener('click', async e => {
    if (!e.target.closest('[data-wipe]')) return;
    [LS.lib, LS.cfg, LS.hist, LS.ui].forEach(store.remove);
    try { await histDeleteAll(); } catch (err) {}
    location.reload();
  });
}

/* ---------------- 词库动作 ---------------- */
function handleLibAction(btn) {
  const act = btn.dataset.act;
  const gid = btn.dataset.gid;
  const iid = btn.dataset.iid;

  switch (act) {
    case 'add-item': {
      openModal('新增提示词', `
        <div class="field">
          <label>提示词内容</label>
          <textarea id="newItemText" rows="4" placeholder="例如：soft natural window light, gentle shadows"></textarea>
        </div>
        <div class="field-row">
          <button class="btn tiny primary" data-newitem="${gid}">保存</button>
        </div>`);
      setTimeout(() => { const t = $('#newItemText'); if (t) t.focus(); }, 40);
      break;
    }
    case 'rename-group':
      startRenameGroup(gid);
      break;
    case 'color-group': {
      const g = findGroup(gid);
      if (!g) break;
      const i = GROUP_COLORS.indexOf(g.color);
      g.color = GROUP_COLORS[(i + 1) % GROUP_COLORS.length];
      persist.lib(); renderLib(); scheduleSync('color');
      break;
    }
    case 'del-group': {
      const g = findGroup(gid);
      if (!g) break;
      openModal('删除分组', `
        <p>确定删除分组 <b>${esc(g.name)}</b> 及其中的 ${g.items.length} 条提示词？</p>
        <div class="field-row">
          <button class="btn tiny danger" data-delgroup="${gid}">确认删除</button>
        </div>`);
      break;
    }
    case 'edit-item': {
      const it = findItem(gid, iid);
      if (!it) break;
      openModal('编辑提示词', `
        <div class="field">
          <label>提示词内容</label>
          <textarea id="editItemText" rows="5">${esc(it.text)}</textarea>
        </div>
        <div class="field-row">
          <button class="btn tiny primary" data-saveitem="${gid}|${iid}">保存</button>
        </div>`);
      setTimeout(() => { const t = $('#editItemText'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }, 40);
      break;
    }
    case 'copy-item': {
      const it = findItem(gid, iid);
      if (it) copyText(it.text).then(() => toast('已复制到剪贴板', 'ok')).catch(() => toast('复制失败', 'err'));
      break;
    }
    case 'del-item': {
      const g = findGroup(gid);
      if (!g) break;
      const i = g.items.findIndex(x => x.id === iid);
      if (i < 0) break;
      g.items.splice(i, 1);
      persist.lib(); renderLib(); scheduleSync('del-item');
      toast('已删除');
      break;
    }
  }
}

/* 弹窗内的保存动作 */
document.addEventListener('click', e => {
  if (e.target.closest('[data-close-only]')) { closeModal(); return; }

  const ni = e.target.closest('[data-newitem]');
  if (ni) {
    const t = $('#newItemText');
    if (t && t.value.trim()) {
      addItem(ni.dataset.newitem, t.value);
      renderLib();
      toast('已保存', 'ok');
    }
    closeModal();
    return;
  }
  const si = e.target.closest('[data-saveitem]');
  if (si) {
    const [gid, iid] = si.dataset.saveitem.split('|');
    const it = findItem(gid, iid);
    const t = $('#editItemText');
    if (it && t) {
      it.text = normalizePrompt(t.value);
      persist.lib(); renderLib(); scheduleSync('edit-item');
      toast('已更新', 'ok');
    }
    closeModal();
    return;
  }
  const dg = e.target.closest('[data-delgroup]');
  if (dg) {
    deleteGroup(dg.dataset.delgroup);
    renderLib();
    closeModal();
    toast('分组已删除');
  }
});

/* 单个提示词点击 → 追加 */
function onPickItem(gid, iid) {
  const it = findItem(gid, iid);
  if (!it) return;
  insertPrompt(it.text, { label: it.text });
  const card = els.libScroll.querySelector(`.pcard[data-iid="${iid}"]`);
  if (card) {
    card.classList.add('picked');
    setTimeout(() => card.classList.remove('picked'), 420);
  }
}

/* 拖拽移动 */
function moveItem(fromGid, iid, toGid, beforeIid) {
  const from = findGroup(fromGid);
  const to   = findGroup(toGid);
  if (!from || !to) return;
  const idx = from.items.findIndex(x => x.id === iid);
  if (idx < 0) return;
  const [it] = from.items.splice(idx, 1);

  if (!beforeIid) {
    to.items.push(it);
  } else {
    const at = to.items.findIndex(x => x.id === beforeIid);
    if (at < 0) to.items.push(it);
    else to.items.splice(at, 0, it);
  }
  persist.lib();
  renderLib();
  scheduleSync('move');
}

function toggleGroup(gid) {
  const g = findGroup(gid);
  if (!g) return;
  g.collapsed = !g.collapsed;
  const node = els.libScroll.querySelector(`.group[data-gid="${gid}"]`);
  if (node) node.classList.toggle('collapsed', g.collapsed);
  persist.lib();
}

function startRenameGroup(gid) {
  const el = els.libScroll.querySelector(`.group-name[data-gid="${gid}"]`);
  const g = findGroup(gid);
  if (!el || !g) return;
  el.contentEditable = 'true';
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges(); sel.addRange(range);

  const finish = (save) => {
    el.contentEditable = 'false';
    const name = (el.textContent || '').trim();
    if (save && name) { g.name = name; persist.lib(); scheduleSync('rename'); }
    renderLib();
  };
  el.addEventListener('blur', () => finish(true), { once: true });
  el.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { ev.preventDefault(); el.blur(); }
    if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
  });
}

/* ============================================================
   批量下载模式
   ============================================================ */
function enterDownloadMode() {
  const imgs = (state.ui.results || []).filter(r => r.kind === 'img');
  const histImgs = state.history;
  if (!imgs.length && !histImgs.length) { toast('还没有可下载的图片', 'warn'); return; }
  state.ui.dlMode = true;
  // 默认全选当前结果；若结果为空则全选历史
  state.ui.dlPicked = (imgs.length ? imgs : histImgs).map(r => r.id);
  persistDL();
  els.dlBar.classList.remove('hidden');
  $('#btnDownloadMode').classList.add('active');
  renderResults();
  renderHistory();
  updateDlInfo();
  toast('已全选，点击图片可取消勾选', '', 2600);
}

function exitDownloadMode() {
  state.ui.dlMode = false;
  state.ui.dlPicked = [];
  persistDL();
  els.dlBar.classList.add('hidden');
  $('#btnDownloadMode').classList.remove('active');
  renderResults();
  renderHistory();
}

function persistDL() {
  store.write(LS.dl, { mode: state.ui.dlMode, picked: state.ui.dlPicked });
}

function updateDlInfo() {
  const n = state.ui.dlPicked.length;
  els.dlInfo.textContent = n ? `已选 ${n} 张` : '未选择';
  $('#dlConfirm').disabled = n === 0;
}

function togglePick(id) {
  const list = state.ui.dlPicked;
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1); else list.push(id);
  persistDL();
  updateDlInfo();
  // 局部更新样式，避免整块重绘造成闪烁
  $$(`[data-act="toggle-pick"][data-id="${CSS.escape(id)}"]`).forEach(box => {
    box.closest('.card-img, .hist-card')?.classList.toggle('picked', list.includes(id));
  });
}

/* 收集所有可选图片（结果 + 历史），按 id 去重 */
function collectAllImages() {
  const map = new Map();
  (state.ui.results || []).forEach(r => { if (r.kind === 'img') map.set(r.id, r); });
  state.history.forEach(r => { if (!map.has(r.id)) map.set(r.id, r); });
  return map;
}

/* 下载一张图片为文件。跨域图片走 fetch→blob，失败则退回新窗口打开 */
async function downloadImage(src, filename) {
  // data: 协议直接下载
  if (/^data:/.test(src)) {
    const a = document.createElement('a');
    a.href = src; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    return true;
  }
  try {
    const res = await fetch(src, { mode: 'cors' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch (e) {
    // 跨域受限时退化为新标签打开，用户可手动另存
    window.open(src, '_blank', 'noopener');
    return false;
  }
}

async function downloadPicked() {
  const picked = state.ui.dlPicked;
  if (!picked.length) { toast('先勾选要下载的图片', 'warn'); return; }

  const map = collectAllImages();
  const items = picked.map(id => map.get(id)).filter(Boolean);
  if (!items.length) { toast('勾选的图片已不在列表中', 'warn'); return; }

  const btn = $('#dlConfirm');
  btn.disabled = true;
  let okCnt = 0, fallbackCnt = 0;
  for (let i = 0; i < items.length; i++) {
    btn.textContent = `下载中 ${i + 1}/${items.length}`;
    const it = items[i];
    const stamp = fmtFileStamp(it.time || Date.now());
    const name = `painting-${stamp}-${String(i + 1).padStart(2, '0')}.png`;
    // 历史条目优先下载大图原图；结果区条目用自身 src
    const full = _histFull.has(it.id) || it.srcRaw ? histFullSrc(it.id) : '';
    // eslint-disable-next-line no-await-in-loop
    const ok = await downloadImage(full || it.src, name);
    if (ok) okCnt++; else fallbackCnt++;
    await new Promise(r => setTimeout(r, 320)); // 避免浏览器拦截连续下载
  }
  btn.textContent = '下载所选';
  btn.disabled = false;

  if (fallbackCnt) {
    toast(`已下载 ${okCnt} 张，${fallbackCnt} 张因跨域限制改为新标签打开`, 'warn', 3600);
  } else {
    toast(`已下载 ${okCnt} 张图片`, 'ok');
  }
}

function fmtFileStamp(ts) {
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/* ============================================================
   矩阵组合出图
   ============================================================ */
function openMatrix() {
  els.matrix.hidden = false;
  // 首次打开：用当前对话框内容作为公共后缀，B 组从词库的动作类分组预填
  if (!els.matrixCommon.value.trim()) els.matrixCommon.value = els.promptBox.value.trim();
  if (!els.listB.value.trim()) {
    const auto = guessActionPrompts();
    if (auto.length) els.listB.value = auto.join('\n');
  }
  buildMatrixRows();
  setTimeout(() => els.listA.focus(), 80);
}

function closeMatrix() {
  els.matrix.hidden = true;
}

/* 从词库里猜「动作/姿势」类分组的提示词 */
function guessActionPrompts() {
  const kw = /动作|姿势|pose|action|姿态|构图/;
  const out = [];
  state.lib.forEach(g => {
    if (kw.test(g.name)) g.items.forEach(it => out.push(it.text));
  });
  return out.slice(0, 8);
}

function parseLines(text) {
  return String(text || '')
    .split('\n')
    .map(s => normalizePrompt(s))
    .filter(Boolean);
}

/* 根据 A/B 两组 + 公共后缀，构建笛卡尔积行 */
function buildMatrixRows() {
  const aList = parseLines(els.listA.value);
  const bList = parseLines(els.listB.value);
  const common = normalizePrompt(els.matrixCommon.value);
  const prevOn = new Map(state.matrix.rows.map(r => [r.id, r.on]));

  const rows = [];
  const combos = [];
  if (aList.length && bList.length) {
    aList.forEach(a => bList.forEach(b => combos.push({ a, b })));
  } else if (aList.length) {
    aList.forEach(a => combos.push({ a, b: '' }));
  } else if (bList.length) {
    bList.forEach(b => combos.push({ a: '', b }));
  }

  combos.forEach((c, idx) => {
    const parts = [c.a, c.b, common].filter(Boolean);
    const text = normalizePrompt(parts.join(', '));
    const id = 'mx-' + idx + '-' + (c.a.slice(0, 6) + '|' + c.b.slice(0, 6));
    rows.push({ id, a: c.a, b: c.b, text, on: prevOn.has(id) ? prevOn.get(id) : true });
  });

  state.matrix.rows = rows;
  renderMatrixList();
  updateMatrixCount();
}

function renderMatrixList() {
  const list = els.matrixList;
  const rows = state.matrix.rows;
  if (!rows.length) {
    list.innerHTML = `<div class="matrix-empty">在 A 组和 B 组各写至少一条（每行一条），这里会列出所有组合</div>`;
    return;
  }
  list.innerHTML = rows.map((r, i) => {
    // 直接从 a/b/common 分段渲染，避免从完整文本反拆导致重复
    const segs = [];
    if (r.a) segs.push(`<em>${esc(r.a)}</em>`);
    if (r.b) segs.push(`<i>${esc(r.b)}</i>`);
    const commonOnly = normalizePrompt(els.matrixCommon.value);
    if (commonOnly) segs.push(esc(commonOnly));
    return `<div class="mx-row ${r.on ? '' : 'off'}" data-mxid="${esc(r.id)}">
      <span class="mx-idx">${String(i + 1).padStart(2, '0')}</span>
      <span class="mx-text">${segs.join('<span class="mx-sep">, </span>')}</span>
    </div>`;
  }).join('');
}

function updateMatrixCount() {
  const onRows = state.matrix.rows.filter(r => r.on);
  els.matrixCount.textContent = onRows.length;
  const perReq = clamp(Number(state.cfg.count) || 1, 1, 8);
  const total = onRows.length * perReq;
  const hint = els.matrixBatchHint;
  if (perReq > 1) {
    hint.textContent = `每条组合生成 ${perReq} 张，共约 ${total} 张`;
  } else {
    hint.textContent = '';
  }
  const cnt = els.cntPreview;
  cnt.textContent = `${parseLines(els.listA.value).length} × ${parseLines(els.listB.value).length} = ${state.matrix.rows.length}`;
  cnt.classList.toggle('warn', onRows.length > 30);
  $('#matrixRun').disabled = onRows.length === 0 || state.matrix.running;
  if (onRows.length > 30) hint.textContent = `⚠ 数量较多（${total} 张），将按顺序逐条请求，耗时可能较长`;
}

/* 逐条执行组合出图 */
async function runMatrix() {
  const rows = state.matrix.rows.filter(r => r.on);
  if (!rows.length) { toast('没有要生成的组合', 'warn'); return; }

  let endpoint, headers;
  try {
    endpoint = buildEndpoint();
    headers = { 'Content-Type': 'application/json' };
    if (state.cfg.apiKey.trim()) headers['Authorization'] = 'Bearer ' + state.cfg.apiKey.trim();
    buildPayload('probe'); // 提前校验额外 JSON 等参数合法性
  } catch (e) {
    toast(e.message, 'err', 3200); return;
  }

  state.matrix.running = true;
  const runBtn = els.matrixRun;
  const prog = els.matrixProgress;
  runBtn.disabled = true;

  // 清空画布为本次批量结果做准备
  state.busy = true;
  els.tabResult.click();
  state.ui.results = [];
  const placeholders = rows.map(r => ({ id: uid(), kind: 'loading' }));
  state.ui.results = placeholders.slice();
  renderResults();

  const collected = [];
  let okCnt = 0, failCnt = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    prog.textContent = `进度 ${i + 1}/${rows.length}`;
    // 当前项标为 loading
    const ph = placeholders[i];
    const idxInResults = state.ui.results.findIndex(x => x.id === ph.id);
    if (idxInResults >= 0) state.ui.results[idxInResults] = { id: ph.id, kind: 'loading' };
    renderResults();

    try {
      const payload = buildPayload(row.text);
      const result = await postImagesSmart(endpoint, headers, payload);

      if (!result.ok) {
        const msg = (result.data && (result.data.error?.message || result.data.message || result.data.msg)) ||
                    result.text.slice(0, 300) || ('HTTP ' + result.status);
        throw new Error(`HTTP ${result.status} · ${msg}`);
      }

      const imgs = extractImages(result.data);
      if (!imgs.length) throw new Error('返回中未识别到图片');

      const newItems = imgs.map(im => ({ id: uid(), kind: 'img', src: im.src, prompt: row.text, time: Date.now() }));
      const at = state.ui.results.findIndex(x => x.id === ph.id);
      if (at >= 0) state.ui.results.splice(at, 1, ...newItems);
      else state.ui.results.push(...newItems);

      newItems.forEach(it => collected.push(it));
      await histAdd(newItems.map(it => ({ id: it.id, src: it.src, prompt: it.prompt, time: it.time })));
      okCnt++;
    } catch (e) {
      let msg = e.message || String(e);
      if (e.name === 'AbortError') msg = '请求超时';
      const at = state.ui.results.findIndex(x => x.id === ph.id);
      const errItem = { id: ph.id, kind: 'error', message: msg };
      if (at >= 0) state.ui.results.splice(at, 1, errItem);
      else state.ui.results.push(errItem);
      failCnt++;
    }
    renderResults();
    bumpUsage(row.text);
  }

  await reloadHistory();
  renderHistory();
  state.busy = false;
  state.matrix.running = false;
  runBtn.disabled = false;
  prog.textContent = `完成 ${okCnt} 条${failCnt ? ' · 失败 ' + failCnt + ' 条' : ''}`;

  toast(`组合出图完成 · 成功 ${okCnt} 条${failCnt ? `，失败 ${failCnt} 条` : ''}`, failCnt ? 'warn' : 'ok', 3600);

  if (els.matrixAutoDownload.checked && collected.length) {
    closeMatrix();
    enterDownloadMode();
  }
}

/* ============================================================
   图生图（Image-to-Image）
   ============================================================ */
const I2I_MAX_BYTES = 8 * 1024 * 1024;   // 单张上限 8MB
const I2I_MAX_DIM   = 2048;              // 超过则等比压缩

/* 读取文件 → dataURL，必要时压缩，返回 { dataUrl, base64, width, height, name, size } */
function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error('请选择图片文件')); return; }
    if (file.size > I2I_MAX_BYTES) {
      reject(new Error(`图片过大（${(file.size / 1048576).toFixed(1)}MB），请压缩到 8MB 以内`));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const img = new Image();
      img.onerror = () => reject(new Error('图片格式无法解析'));
      img.onload = () => {
        const needShrink = img.width > I2I_MAX_DIM || img.height > I2I_MAX_DIM;
        if (!needShrink) {
          resolve({
            dataUrl, base64: dataUrl.split(',')[1] || '',
            width: img.width, height: img.height,
            name: file.name || 'reference.png', size: file.size,
          });
          return;
        }
        // 等比压缩到上限
        const scale = I2I_MAX_DIM / Math.max(img.width, img.height);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        const out = cv.toDataURL('image/jpeg', 0.92);
        resolve({
          dataUrl: out, base64: out.split(',')[1] || '',
          width: w, height: h,
          name: (file.name || 'reference').replace(/\.[^.]+$/, '') + '-resized.jpg',
          size: Math.round(out.length * 0.75),
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

function setReferenceImage(ref) {
  state.cfg.refImage = ref ? {
    dataUrl: ref.dataUrl, base64: ref.base64,
    width: ref.width, height: ref.height,
    name: ref.name, size: ref.size,
  } : null;
  persist.cfg();
  renderReference();
}

function renderReference() {
  const ref = state.cfg.refImage;
  const strip = els.i2iStrip;
  const has = !!(ref && ref.dataUrl);

  strip.hidden = !has;
  document.querySelector('.composer').classList.toggle('i2i-active', has);
  // 参数面板里的控件
  if (els.i2iDrop) els.i2iDrop.classList.toggle('hidden', has);
  ['i2iFieldStrength', 'i2iFieldSize', 'i2iFieldFollow'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.hidden = !has;
  });
  if (!has) return;

  els.i2iThumb.src = ref.dataUrl;
  els.i2iName.textContent = ref.name || 'reference.png';
  els.i2iSize.textContent = `${ref.width}×${ref.height} · ${(ref.size / 1024).toFixed(0)} KB`;
  if (els.i2iOutW && !els.i2iOutW.value) els.i2iOutW.placeholder = ref.width + '';
  if (els.i2iOutH && !els.i2iOutH.value) els.i2iOutH.placeholder = ref.height + '';
}

async function handleRefFile(file) {
  try {
    const ref = await readImageFile(file);
    setReferenceImage(ref);
    toast(`参考图已载入 · ${ref.width}×${ref.height}`, 'ok', 2000);
  } catch (e) {
    toast('载入失败：' + (e.message || e), 'err', 3200);
  }
}

function clearReference() {
  setReferenceImage(null);
  if (els.i2iFile) els.i2iFile.value = '';
  toast('已移除参考图');
}

/* 图生图模式下，把参考图字段并入 payload */
function applyImagePayload(payload) {
  const ref = state.cfg.refImage;
  if (!(ref && ref.dataUrl)) return payload;

  const fmt = state.cfg.i2iFormat || 'dataurl';
  const imgVal = fmt === 'base64' ? ref.base64 : ref.dataUrl;
  const imgField = (state.cfg.mapImage || 'image').trim() || 'image';
  payload[imgField] = imgVal;

  const st = clamp(Number(state.cfg.i2iStrength ?? 0.6), 0, 1);
  const stField = (state.cfg.mapStrength || 'strength').trim() || 'strength';
  payload[stField] = st;

  // 输出尺寸：跟随原图 or 用设定值
  if (state.cfg.i2iFollowSize) {
    const sizeField = (state.cfg.mapSize || 'size').trim() || 'size';
    if (sizeField === 'size') payload.size = `${ref.width}x${ref.height}`;
    else payload[sizeField] = `${ref.width}x${ref.height}`;
    if (state.cfg.mapSize === 'width' || state.cfg.mapSize === 'height') {
      payload.width = ref.width; payload.height = ref.height;
    }
  } else if (state.cfg.i2iOutW && state.cfg.i2iOutH) {
    const sizeField = (state.cfg.mapSize || 'size').trim() || 'size';
    if (sizeField === 'size') payload.size = `${state.cfg.i2iOutW}x${state.cfg.i2iOutH}`;
    else payload[sizeField] = `${state.cfg.i2iOutW}x${state.cfg.i2iOutH}`;
  }
  return payload;
}

/* ============================================================
   移动端 ⋯ 菜单
   ============================================================ */
function openMoreMenu() {
  els.moreMenu.hidden = false;
}
function closeMoreMenu() {
  els.moreMenu.hidden = true;
}

function handleMoreAction(action) {
  closeMoreMenu();
  switch (action) {
    case 'theme':    $('#btnTheme').click(); break;
    case 'matrix':   openMatrix(); break;
    case 'download': $('#btnDownloadMode').click(); break;
    case 'img2img':  $('#btnImg2Img').click(); break;
    case 'translate': translatePrompt(); break;
    case 'aiwrite':  openAiWrite(); break;
    case 'clear':    $('#btnClearPrompt').click(); break;
    case 'undo':     undoAppend(); break;
    case 'help':     openModal('使用说明', HELP_HTML); break;
    case 'close':    break;
  }
}

/* ============================================================
   LLM 对话接口（翻译 / AI 帮写共用）
   —— 配置沿用「翻译」那一组：trBaseUrl / trApiKey / trModel
   —— 留空时回退到画图接口的地址与 Key，不新增独立配置项
   ============================================================ */
function resolveLlm() {
  return {
    base: (state.cfg.trBaseUrl || state.cfg.baseUrl || '').trim().replace(/\/+$/, ''),
    key:  (state.cfg.trApiKey   || state.cfg.apiKey   || '').trim(),
    model: (state.cfg.trModel || 'gpt-4o-mini').trim(),
  };
}

function chatEndpoint(base) {
  return /\/chat\/completions$/.test(base) ? base : base + '/chat/completions';
}

/* 兼容 OpenAI 风格 choices[].message.content 与部分站点的 output_text */
function extractChatText(data) {
  let out = '';
  if (data && data.choices && data.choices[0]) {
    out = data.choices[0].message?.content || data.choices[0].text || '';
  } else if (data && data.output_text) out = data.output_text;
  return String(out || '').trim().replace(/^["']|["']$/g, '');
}

/**
 * 统一对话请求。失败时抛出带 HTTP 状态与服务商原话的错误。
 * @param {object} o { system, user, temperature, timeoutMs, signal }
 * @returns {Promise<string>} 已 trim 的文本（可能为空串，由调用方判定）
 */
async function callChat(o = {}) {
  const { base, key, model } = resolveLlm();
  if (!base || !key) {
    const err = new Error('还没配置对话接口');
    err.code = 'NO_CONFIG';
    throw err;
  }

  const timeoutMs = o.timeoutMs == null ? 60000 : o.timeoutMs;
  const ctrl = new AbortController();
  let timer = null;
  let timedOut = false;
  const onAbort = () => ctrl.abort();
  if (o.signal) {
    if (o.signal.aborted) ctrl.abort();
    else o.signal.addEventListener('abort', onAbort);
  }
  if (timeoutMs > 0) timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, timeoutMs);

  try {
    const res = await fetch(chatEndpoint(base), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: o.system || '' },
          { role: 'user', content: o.user || '' },
        ],
        temperature: o.temperature == null ? 0.2 : o.temperature,
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const t = await res.text();
      let msg = `HTTP ${res.status}`;
      try { const d = JSON.parse(t); msg += ' · ' + (d.error?.message || d.message || '').slice(0, 160); }
      catch (e) { msg += ' · ' + t.slice(0, 160); }
      throw new Error(msg);
    }

    return extractChatText(await res.json());
  } catch (e) {
    /* 超时：保持与改造前一致的错误形态，方便上层文案不变 */
    if (timedOut) {
      const err = new Error('signal timed out');
      err.name = 'TimeoutError';
      throw err;
    }
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
    if (o.signal) o.signal.removeEventListener('abort', onAbort);
  }
}

/* ============================================================
   提示词翻译（中 → 英）
   ============================================================ */
const TR_SYSTEM = 'You are a prompt translator for AI image generation. Translate the user text into concise, natural English prompt keywords. Keep proper nouns and existing English words as-is. Preserve comma-separated keyword structure. Output ONLY the translation, nothing else.';

async function translatePrompt() {
  const raw = els.promptBox.value.trim();
  if (!raw) { toast('提示词是空的，没东西可译', 'warn'); return; }

  // 纯英文则跳过
  if (!/[\u4e00-\u9fa5]/.test(raw)) { toast('提示词里没有中文，无需翻译', '', 2000); return; }

  const { base, key } = resolveLlm();
  if (!base || !key) {
    toast('请先在设置 →「翻译」里配置接口（或点「同画图」复用画图 Key）', 'warn', 3800);
    const acc = document.getElementById('accTranslate');
    if (acc) { acc.open = true; if (window.innerWidth > 1000) els.panelParams.classList.add('open'); }
    return;
  }

  const btn = $('#btnTranslate');
  const orig = btn.textContent;
  btn.textContent = '🌍 翻译中…';
  btn.disabled = true;

  try {
    const out = await callChat({ system: TR_SYSTEM, user: raw, temperature: 0.2, timeoutMs: 60000 });

    if (!out) throw new Error('接口返回为空');

    const action = state.cfg.trAction || 'replace';
    if (action === 'copy') {
      await copyText(out);
      toast('译文已复制到剪贴板', 'ok');
    } else if (action === 'append') {
      insertPrompt(out, { silent: false });
      toast('译文已追加到提示词', 'ok');
    } else {
      pushUndo();
      els.promptBox.value = out;
      state.ui.chips = [{ id: uid(), text: out }];
      updatePromptMeta();
      renderChips();
      saveDraft();
      toast('已替换为英文译文（Ctrl+Shift+Z 可撤销）', 'ok');
    }
  } catch (e) {
    let msg = e.message || String(e);
    if (/Failed to fetch|NetworkError/i.test(msg)) {
      msg = '网络失败：检查翻译接口地址是否正确、该地址是否支持对话接口（/chat/completions）';
    }
    toast('翻译失败：' + msg, 'err', 4200);
  } finally {
    btn.textContent = orig;
    btn.disabled = false;
  }
}

/* ============================================================
   AI 帮写提示词
   —— 复用翻译那套 LLM 配置（resolveLlm / callChat），独立系统提示词
   ============================================================ */
const AI_REQ_MAX = 2000;

/* ---------- 三档共用规则：语言、输出形态、不可越过的边界 ---------- */
const AI_WRITE_BASE = [
  '你是资深的 AI 绘图提示词工程师。把用户的创作要求加工成一条可直接用于文生图 / 图生图的中文提示词。',
  '',
  '共同规则：',
  '- 默认用简体中文输出完整提示词；不要输出英文提示词，也不要中英混排（专有名词、型号、用户指定保留的原文除外）。',
  '- 输出格式：逗号分隔的单行中文提示词，不要换行。',
  '- 只输出最终提示词：不要解释、不要标题、不要编号、不要 Markdown、不要代码块、不要加引号。',
  '- 不得改变用户明确指定的主体、服装、动作、场景、画风、画面文字、比例等关键要求。',
  '- 不得添加与原始要求冲突的设定；不为凑长度堆砌无关形容词，也不添加用户没有要求的人物、品牌或元素。',
  '- 下文「本次加工等级」的规则优先于你的默认习惯；等级越高，允许补充的细节越多。',
].join('\n');

/* ---------- 三档分级规则：只描述加工深度差异，公共约束在上面的 BASE 里 ---------- */
const AI_LEVEL_RULES = {
  l1: [
    '本次加工等级：一级 · 整理优化。',
    '目标：改善表达，而不是扩写。',
    '- 整理语序、消除重复，理顺主体、动作、环境、光线、构图之间已经存在的关系。',
    '- 只明确原文已经表达或可以直接推导的内容；不主动决定用户未指定的关键视觉设定（例如具体服装款式、颜色、镜头焦段）。',
    '- 原文已经清楚时，允许只做很小的修改，结果与原文接近是正常的。',
    '- 不设强制扩写数量，不要为了让结果看起来不同而硬加细节。',
    '- 参考长度：与原文相当，不要明显变长。',
  ].join('\n'),

  l2: [
    '本次加工等级：二级 · 细节扩充。',
    '目标：在保留原意的前提下，补充合理且可见的画面细节。',
    '- 根据原文情况选择适用的维度补充：人物外观与服装；动作、姿态与物体交互；环境与背景元素；光线、阴影、构图、镜头与景深；材质、纹理与表面特征。',
    '- 通常补充若干处有价值的细节即可，不把固定数量当作硬性指标。',
    '- 用户明确指定的内容优先于你补充的内容；未指定的部分可以做协调的合理创作，但不要把新增设定说成用户原本的要求。',
    '- 不必深挖每个手指关节或每处褶皱，整体协调、清晰、可执行比细节数量更重要。',
    '- 参考长度：约为原文的 1.5-2.5 倍。',
  ].join('\n'),

  l3: [
    '本次加工等级：三级 · 深度具象化。',
    '目标：把模糊的概念拆成可以直接画出来的具体描述。',
    '',
    '按原文情况，从下面几类里挑最影响成图的 2-4 类来拆解，不要机械填满所有类别：',
    '- 服装：颜色与色调、面料与光泽、剪裁与版型、领口、袖型、腰线、裙摆、褶皱、花边蕾丝刺绣、纽扣与饰品及其具体位置。',
    '- 动作：身体朝向、躯干姿态、肩膀与头部角度、重心落在哪条腿、膝盖弯曲、双脚间距与脚尖方向、手臂位置、手腕角度、手指动作、左右手分工。',
    '- 物体交互：哪只手接触物体、如何握持、接触位置、物体朝向，以及另一只手或身体其他部分在哪、在做什么。',
    '- 环境与光影：把「氛围感」「电影感」这类抽象词换成具体光源方向与色温、反射、阴影、空间层次、背景元素、景深与镜头感。',
    '',
    '细节选择规则：',
    '- 优先补全对画面影响最大的细节；不必每次同时描写服装、手、腿脚和光影。',
    '- 不为达到固定细节数量而编造无意义内容；不确定时宁可少写一个细节，也不要输出明显不合理的细节。',
    '- 输出前做一次合理性检查：左右手是否冲突、关节是否反关节、重心是否成立、物体接触关系是否矛盾；发现冲突就删掉冲突项。',
    '- 不得因为进入三级就擅自改变原文的核心设定。',
    '- 参考长度：约为原文的 2.5-4 倍，清晰优先，不要为了长而拖长。',
  ].join('\n'),
};

/* ---------- 统一输出格式（放在最后，强化一次） ---------- */
const AI_WRITE_FORMAT = [
  '输出要求：',
  '- 只输出一条中文提示词，用逗号分隔，整条保持在一行内。',
  '- 不要输出等级名称、加工说明或任何额外文字。',
].join('\n');

const AI_LEVEL_KEYS = ['l1', 'l2', 'l3'];
const AI_LEVEL_DEFAULT = 'l2';

const AI_LEVEL_HINT = {
  l1: '一级：只整理表达、理顺语序，几乎不新增设定',
  l2: '二级：保留原意，补充合理的可见细节（推荐）',
  l3: '三级：把服装、动作、交互、光影拆成具体细节',
};

function normalizeAiLevel(level) {
  return AI_LEVEL_RULES[level] ? level : AI_LEVEL_DEFAULT;
}

/* 组合当前等级的系统提示词：BASE + 该档规则 + FORMAT */
function buildAiSystem(level) {
  return [AI_WRITE_BASE, AI_LEVEL_RULES[normalizeAiLevel(level)], AI_WRITE_FORMAT].join('\n\n');
}

/* 输出清理：去围栏 / 前缀 / 编号 / 多余换行，最后交给 normalizePrompt 收尾。
   只清理结构性杂质，不删除正文里的标点与内容。 */
function sanitizePromptOut(text) {
  let s = String(text == null ? '' : text);
  if (!s.trim()) return '';

  // 1) Markdown 代码围栏（```json … ``` / ~~~ … ~~~）
  s = s.replace(/```[a-zA-Z0-9_-]*\s*/g, '\n').replace(/~~~/g, '\n');

  // 2) 行首常见前缀（Prompt: / English prompt: / 英文提示词：/ 以下是…）
  const PREFIX = /^(?:final\s+)?(?:(?:english|中文|英文)\s*)?(?:prompt|提示词|画面描述|描述)\s*[:：]\s*/i;
  const LEAD = /^(?:[-*•·>]+\s*|\d{1,2}\s*[.、)]\s*|\(\d{1,2}\)\s*)/;
  const INTRO = /^(?:以下|下面)(?:是|为)[^\n]{0,24}?[:：]\s*/i;

  // 3) 逐行去掉前缀、编号与项目符号，再合并成一行
  const lines = s.split(/\r?\n/)
    .map(l => l.trim())
    .map(l => l.replace(LEAD, '').replace(PREFIX, '').replace(INTRO, '').trim())
    .filter(Boolean);

  // 4) 去掉整体被引号/反引号包裹的外壳；并清掉合并后仍残留的「, 2. 」式行内编号
  //    （分隔符同时认半角逗号与中文逗号，中文输出里编号常写成「，2. xxx」）
  s = lines.join(', ')
    .replace(/(^|[,，]\s*)\d{1,2}\s*[.、)]\s+/g, '$1')
    .replace(/(^|[,，]\s*)\(\d{1,2}\)\s*/g, '$1')
    .replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, '')
    .trim();

  // 5) 交给现有规范函数（合并空格、规范逗号、去首尾标点）
  return normalizePrompt(s);
}

function aiPanelHTML() {
  return `
    <div class="ai-levels" id="aiLevels" role="group" aria-label="加工等级">
      <button type="button" class="ai-level-btn" data-ailevel="l1" aria-pressed="false">① 整理优化</button>
      <button type="button" class="ai-level-btn" data-ailevel="l2" aria-pressed="true">② 细节扩充</button>
      <button type="button" class="ai-level-btn" data-ailevel="l3" aria-pressed="false">③ 深度具象化</button>
    </div>
    <small class="ai-level-hint" id="aiLevelHint"></small>
    <div class="field">
      <label>你想画什么</label>
      <textarea id="aiReq" rows="4" placeholder="例：画一只穿机甲的橘猫，站在赛博朋克城市的雨夜街头，电影级光影" spellcheck="false"></textarea>
      <small>用日常语言描述即可，AI 会按所选等级整理成可直接绘图的中文提示词</small>
    </div>
    <div class="ai-actions">
      <button class="btn tiny primary" id="aiRun">生成提示词</button>
      <span class="ai-status" id="aiStatus"></span>
    </div>
    <div class="field">
      <label>生成结果（可编辑）</label>
      <textarea id="aiResult" rows="6" placeholder="点「生成提示词」后，结果会出现在这里" spellcheck="false"></textarea>
      <small id="aiResultMeta">生成后可在此微调，确认无误再填入提示词框</small>
    </div>
    <div class="ai-actions">
      <button class="btn tiny ghost" id="aiAgain">重新生成</button>
      <span class="grow"></span>
      <button class="btn tiny ghost" id="aiCancel">取消</button>
      <button class="btn tiny primary" id="aiFill">填入提示词</button>
    </div>
    <div class="ai-fill-choice" id="aiFillChoice" hidden>
      <span>提示词框里已有内容：</span>
      <button class="btn tiny danger" data-aifill="replace">覆盖</button>
      <button class="btn tiny ghost" data-aifill="append">追加</button>
      <button class="btn tiny ghost" data-aifill="cancel">取消</button>
    </div>`;
}

function setAiStatus(kind, text) {
  const el = $('#aiStatus');
  if (!el) return;
  el.className = 'ai-status' + (kind ? ' ' + kind : '');
  el.dataset.state = kind || '';
  el.textContent = text || '';
}

function updateAiMeta() {
  const el = $('#aiResultMeta');
  const res = $('#aiResult');
  if (!el) return;
  const n = res ? res.value.trim().length : 0;
  el.textContent = n
    ? `${n} 字符 · 生成后可在此微调，确认无误再填入提示词框`
    : '生成后可在此微调，确认无误再填入提示词框';
}

function showAiFillChoice(on) {
  const box = $('#aiFillChoice');
  if (box) box.hidden = !on;
}

/* ---------- 加工等级：切换与渲染 ---------- */
function setAiLevel(level) {
  state.ai.level = normalizeAiLevel(level);
  renderAiLevels();
}

/* 同步按钮选中态与说明文字；不碰用户输入与生成结果，也不发请求 */
function renderAiLevels() {
  const cur = normalizeAiLevel(state.ai.level);
  $$('#aiLevels .ai-level-btn').forEach(btn => {
    const on = btn.dataset.ailevel === cur;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.disabled = !!state.ai.busy;
  });
  const hint = $('#aiLevelHint');
  if (hint) hint.textContent = AI_LEVEL_HINT[cur] || '';
}

function setAiBusy(on) {
  const run = $('#aiRun'), again = $('#aiAgain'), fill = $('#aiFill');
  if (run) {
    run.disabled = on;
    run.textContent = on ? '生成中…' : '生成提示词';
  }
  if (again) again.disabled = on;
  if (fill) fill.disabled = on;
  // 请求期间禁止切档，避免请求用的等级与界面显示不一致
  $$('#aiLevels .ai-level-btn').forEach(btn => { btn.disabled = on; });
  if (on) setAiStatus('busy', '正在生成提示词…');
  else {
    const st = $('#aiStatus');
    if (st && st.dataset.state === 'busy') setAiStatus('', '');
  }
}

/* 关闭 / 切换面板时中止未完成的请求，并恢复按钮与加载态 */
function abortAiRequest() {
  const ctrl = state.ai.ctrl;
  if (ctrl) {
    state.ai.ctrl = null;
    try { ctrl.abort(); } catch (e) {}
  }
  if (state.ai.busy) {
    state.ai.busy = false;
    setAiBusy(false);
  }
}

function openAiWrite() {
  closeMoreMenu();
  openModal('✨ AI 帮写提示词', aiPanelHTML());

  const reqEl = $('#aiReq');
  const resEl = $('#aiResult');
  if (reqEl) reqEl.value = state.ai.req || '';
  if (resEl) resEl.value = state.ai.result || '';

  bindAiPanel();
  renderAiLevels();
  updateAiMeta();
  setAiStatus('', '');
  setAiBusy(false);

  setTimeout(() => {
    const t = state.ai.result ? resEl : reqEl;
    if (t) t.focus();
  }, 60);
}

function bindAiPanel() {
  const run = $('#aiRun');
  const again = $('#aiAgain');
  const fill = $('#aiFill');
  const cancel = $('#aiCancel');
  const reqEl = $('#aiReq');
  const resEl = $('#aiResult');
  const choice = $('#aiFillChoice');
  const levels = $('#aiLevels');

  if (levels) levels.addEventListener('click', e => {
    const btn = e.target.closest('[data-ailevel]');
    if (!btn || btn.disabled) return;
    setAiLevel(btn.dataset.ailevel);   // 只改档位：不清输入、不清结果、不触发请求
  });

  if (run) run.addEventListener('click', runAiWrite);

  if (again) again.addEventListener('click', () => {
    if (state.ai.busy) return;
    runAiWrite();
  });

  if (fill) fill.addEventListener('click', () => fillAiResult(''));

  if (cancel) cancel.addEventListener('click', () => closeModal());

  if (choice) choice.addEventListener('click', e => {
    const b = e.target.closest('[data-aifill]');
    if (!b) return;
    if (b.dataset.aifill === 'cancel') { showAiFillChoice(false); return; }
    fillAiResult(b.dataset.aifill);
  });

  if (reqEl) {
    reqEl.addEventListener('input', () => { state.ai.req = reqEl.value; });
    reqEl.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runAiWrite(); }
    });
  }

  if (resEl) {
    resEl.addEventListener('input', () => { state.ai.result = resEl.value; updateAiMeta(); });
  }
}

async function runAiWrite() {
  if (state.ai.busy) return;

  const reqEl = $('#aiReq');
  if (!reqEl) return;
  const req = reqEl.value.trim();
  if (!req) { toast('先写一句创作要求吧', 'warn'); reqEl.focus(); return; }
  if (req.length > AI_REQ_MAX) {
    toast(`创作要求太长了（上限 ${AI_REQ_MAX} 字）`, 'warn', 3200);
    return;
  }

  const { base, key } = resolveLlm();
  if (!base || !key) {
    toast('请先在设置 →「翻译」里配置对话接口（或点「同画图」复用画图 Key）', 'warn', 3800);
    const acc = document.getElementById('accTranslate');
    if (acc) { acc.open = true; if (window.innerWidth > 1000) els.panelParams.classList.add('open'); }
    return;
  }

  state.ai.req = req;
  state.ai.busy = true;
  const ctrl = new AbortController();
  state.ai.ctrl = ctrl;
  showAiFillChoice(false);
  setAiBusy(true);

  try {
    const raw = await callChat({
      system: buildAiSystem(state.ai.level),
      user: req,
      temperature: 0.7,
      timeoutMs: 60000,
      signal: ctrl.signal,
    });

    const out = sanitizePromptOut(raw);
    if (!out) throw new Error('模型没有返回有效的提示词，换个说法再试一次');

    state.ai.result = out;
    const resEl = $('#aiResult');
    if (resEl) { resEl.value = out; updateAiMeta(); }
    setAiStatus('ok', '✓ 已生成');
    toast('提示词已生成，可修改后填入', 'ok', 2400);
  } catch (e) {
    if (e && e.name === 'AbortError') {
      /* 用户取消或关闭面板：静默，不打扰 */
    } else {
      let msg = e.message || String(e);
      if (e && e.code === 'NO_CONFIG') msg = '还没配置对话接口';
      else if (e && e.name === 'TimeoutError') msg = '请求超时（60 秒未返回），可以重试';
      else if (/Failed to fetch|NetworkError/i.test(msg)) {
        msg = '网络失败：检查接口地址是否正确、该地址是否支持对话接口（/chat/completions）';
      }
      setAiStatus('err', '✕ ' + msg);
      toast('生成失败：' + msg, 'err', 4200);
    }
  } finally {
    if (state.ai.ctrl === ctrl) {
      state.ai.ctrl = null;
      state.ai.busy = false;
      setAiBusy(false);
    }
  }
}

/**
 * 填入提示词框。
 * @param {''|'replace'|'append'} mode 空串表示「让函数自己决定」
 */
function fillAiResult(mode) {
  const resEl = $('#aiResult');
  const out = sanitizePromptOut(state.ai.result || (resEl ? resEl.value : ''));
  if (!out) {
    toast('还没有可填入的提示词', 'warn');
    return;
  }
  state.ai.result = out;
  if (resEl && resEl.value !== out) resEl.value = out;

  const cur = els.promptBox.value;
  if (!cur.trim()) mode = 'replace';
  else if (!mode) { showAiFillChoice(true); return; }   // 有内容 → 必须显式选择

  if (mode === 'replace') {
    pushUndo();
    els.promptBox.value = out;
    state.ui.chips = [{ id: uid(), text: out }];        // 重置 chips，避免残留旧词条
    updatePromptMeta();
    renderChips();
    saveDraft();
    toast('已填入提示词（Ctrl+Shift+Z 可撤销）', 'ok', 2600);
  } else if (mode === 'append') {
    const ta = els.promptBox;
    try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) {}
    if (!insertPrompt(out, { silent: true })) {
      toast('这段提示词已经在输入框里了', 'warn', 2600);
      return;
    }
    toast('已追加到提示词', 'ok');
  } else {
    return;
  }

  flashComposer();
  closeModal();
  try { els.promptBox.focus({ preventScroll: true }); } catch (e) {}
}

/* ---------------- 主题 / 抽屉 ---------------- */
function applyTheme(t) {
  state.ui.theme = t;
  document.documentElement.dataset.theme = t;
  $('#btnTheme').textContent = t === 'dark' ? '☀' : '◐';
  // 浏览器地址栏 / 状态栏颜色跟随主题
  const meta = document.querySelector('#metaThemeColor');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#12141c' : '#5b5bd6');
}
function closeDrawers() {
  els.panelLib.classList.remove('open');
  els.panelParams.classList.remove('open');
  els.scrim.hidden = true;
}

/* ---------------- 元信息 ---------------- */
function updatePromptMeta() {
  const v = els.promptBox.value;
  els.charCount.textContent = v.length + ' 字符';
  els.tokenEst.textContent = '≈' + estimateTokens(v) + ' tokens';
}

/* ============================================================
   启动
   ============================================================ */
function init() {
  // 缓存 DOM
  els.panelLib = $('#panelLib');
  els.panelParams = $('#panelParams');
  els.libScroll = $('#libScroll');
  els.libCount = $('#libCount');
  els.libSearch = $('#libSearch');
  els.libSort = $('#libSort');
  els.btnClearSearch = $('#btnClearSearch');
  els.promptBox = $('#promptBox');
  els.chipsRow = $('#chipsRow');
  els.btnGenerate = $('#btnGenerate');
  els.sizeGrid = $('#sizeGrid');
  els.resultGrid = $('#resultGrid');
  els.historyGrid = $('#historyGrid');
  els.histCount = $('#histCount');
  els.tabResult = $('#tabResult');
  els.tabHistory = $('#tabHistory');
  els.syncPill = $('#syncPill');
  els.syncText = $('#syncText');
  els.scrim = $('#scrim');
  els.lightbox = $('#lightbox');
  els.lbImg = $('#lbImg');
  els.lbPrompt = $('#lbPrompt');
  els.lbDownload = $('#lbDownload');
  els.modal = $('#modal');
  els.modalTitle = $('#modalTitle');
  els.modalBody = $('#modalBody');
  els.apiTestResult = $('#apiTestResult');
  els.ghResult = $('#ghResult');
  els.debugPre = $('#debugPre');
  els.storeStat = $('#storeStat');
  els.comboInfo = $('#comboInfo');
  els.modelPicker = $('#modelPicker');
  els.modelList = $('#modelList');
  els.modelFilter = $('#modelFilter');
  els.modelCount = $('#modelCount');
  els.dlBar = $('#dlBar');
  els.dlInfo = $('#dlInfo');
  els.matrix = $('#matrix');
  els.matrixList = $('#matrixList');
  els.matrixCount = $('#matrixCount');
  els.matrixBatchHint = $('#matrixBatchHint');
  els.matrixCommon = $('#matrixCommon');
  els.matrixProgress = $('#matrixProgress');
  els.matrixRun = $('#matrixRun');
  els.matrixAutoDownload = $('#matrixAutoDownload');
  els.cntPreview = $('#cntPreview');
  els.listA = $('#listA');
  els.listB = $('#listB');
  els.moreMenu = $('#moreMenu');
  els.i2iStrip = $('#i2iStrip');
  els.i2iThumb = $('#i2iThumb');
  els.i2iName = $('#i2iName');
  els.i2iSize = $('#i2iSize');
  els.i2iFile = $('#i2iFile');
  els.i2iDrop = $('#i2iDrop');
  els.i2iOutW = $('#i2iOutW');
  els.i2iOutH = $('#i2iOutH');
  els.charCount = $('#charCount');
  els.tokenEst = $('#tokenEst');

  loadAll();
  applyTheme(state.ui.theme);
  els.libSort.value = state.ui.sort;

  settingsToUI();
  bindSettings();
  bindEvents();

  renderLib();
  renderSizeGrid();
  renderChips();
  renderHistory();
  renderResults();

  // 生成历史从 IndexedDB 载入（首次会把旧版存在 localStorage 的 base64 历史迁移进来）
  (async () => {
    try {
      const n = await histMigrateLS();
      if (n) toast(`已把 ${n} 条旧历史迁移到「历史记录」`, '', 2800);
      await reloadHistory();
    } catch (e) { state.history = []; }
    renderHistory();
    updateStoreStat();
  })();

  // 恢复批量下载模式（刷新前若处于该模式）
  const dlState = store.read(LS.dl, null);
  if (dlState && dlState.mode && Array.isArray(dlState.picked) && dlState.picked.length) {
    state.ui.dlMode = true;
    state.ui.dlPicked = dlState.picked;
    els.dlBar.classList.remove('hidden');
    $('#btnDownloadMode').classList.add('active');
    updateDlInfo();
    renderHistory();
  }

  // 恢复草稿
  if (state.cfg._draft) els.promptBox.value = state.cfg._draft;
  updatePromptMeta();

  // 首次使用引导
  if (!store.read('pp.seen.v1', false)) {
    store.write('pp.seen.v1', true);
    setTimeout(() => openModal('欢迎来到 欧阳画板 🎨', HELP_HTML), 400);
  }

  // 示例库有更新时，提示老用户一键升级（不覆盖已有内容）
  const seenSeed = store.read(LS.seedVer, 0);
  if (seenSeed < SEED_VERSION) {
    store.write(LS.seedVer, SEED_VERSION);
    if (seenSeed > 0) {
      // 老用户：给出合并入口，用户自己决定
      setTimeout(() => {
        openModal('示例模板库有更新 ✨', `
          <p>这次内置了一套完整的 <b>人像摄影模板</b>（主体 / 五官 / 妆造 / 光线 / 镜头 / 氛围 / 背景），
          以及产品电商、画风切换等词组。</p>
          <p>合并进来即可，<b>不会影响你已有的分组和提示词</b>，重复的会自动跳过。</p>
          <div class="field-row" style="margin-top:14px">
            <button class="btn tiny primary" data-seed="portrait-merge">合并人像模板</button>
            <button class="btn tiny ghost" data-seed="all-merge">合并全部模板</button>
            <button class="btn tiny ghost" data-close-only="1">以后再说</button>
          </div>`);
      }, 500);
    }
  }

  // 启动时按开关自动拉取云端并合并（默认关，避免多设备静默分叉）
  if (state.cfg.gh.autoPull && ghReady(false) && (state.cfg.gh.token || state.cfg.gh.publicRead)) {
    setSync('busy', '正在同步…');
    setTimeout(async () => {
      const r = await ghPull(true);
      if (r) {
        if (r.added > 0) toast(`云端合并：${mergeSummary(r)}`, 'ok', 4200);
      } else {
        updateSyncPill();
      }
    }, 800);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
