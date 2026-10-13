/* ============================================================
   Prompt Painter · 提示词绘画工作台
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
const APP_VERSION = '1.6.2';

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
  video: {              // 视频生成工作台（结果不持久化，链接通常有时效）
    tasks: [],          // [{ id, kind:'task'|'video'|'error', ... }]
    running: false,
    abort: false,
    ref: null,          // 图生视频的首帧图 { dataUrl, base64, ... }（仅存内存）
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
    /* 视频生成（接口完全独立，与画图互不影响） */
    video: {
      mode: 't2v',             // t2v 文生视频 | i2v 图生视频
      baseUrl: '',
      apiKey: '',
      model: 'sora-2',
      submitPath: '/video/generations',
      queryPath: '',           // 留空 = 提交路径 + /{id}
      format: 'json',          // json | multipart
      auth: 'bearer',          // bearer | x-api-key | none
      pollEvery: 4,            // 轮询间隔（秒）
      pollMax: 300,            // 最长等待（秒）
      size: '1280x720',
      customW: 1280,
      customH: 720,
      seconds: '5',
      fps: '',
      seed: '',
      negative: '',
      mapSize: '',
      mapDuration: '',
      mapImage: '',
      mapNegative: '',
      extraJson: '',
      debug: false,
      prompt: '',              // 提示词草稿
    },
    gh: {
      owner: '', repo: '', branch: 'main', path: 'prompts.json',
      token: '', autoSync: true, publicRead: false, lastSync: 0,
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
  cfg.video = Object.assign(defaultCfg().video, cfgRaw.video || {});
  // 旧字段迁移
  if (cfgRaw.mode && !cfgRaw.sizeString) { /* noop */ }
  state.cfg = cfg;

  state.history = store.read(LS.hist, []) || [];
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
  hist:  debounce(() => store.write(LS.hist, state.history), 500),
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

function renderHistory() {
  const h = state.history;
  els.histCount.textContent = h.length;
  const grid = els.historyGrid;
  const empty = $('#historyEmpty');

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
    let result = await postImages(endpoint, headers, payload);

    // 智能降级：400/422 且报错点名了参数 → 摘掉后重试一次；类型不符 → 纠正后重试一次
    if (!result.ok) {
      const firstMsg = (result.data && (result.data.error?.message || result.data.message || result.data.msg)) || result.text || '';
      const stripKeys = pickParamsToStrip(result.status, firstMsg, payload);
      let retryPayload = null, note = '';
      if (stripKeys.length) {
        retryPayload = Object.assign({}, payload);
        stripKeys.forEach(k => delete retryPayload[k]);
        note = `接口不认参数 ${stripKeys.join('/')}，已自动去掉重试`;
      } else {
        const coerced = vsCoercePayload(payload, firstMsg);
        if (coerced) { retryPayload = coerced; note = '接口要求字段类型不同，已自动纠正重试'; }
      }
      if (retryPayload) {
        if (state.cfg.debug) {
          els.debugPre.textContent += `\n\n── 降级重试 ──\n` + JSON.stringify(retryPayload, null, 2);
        }
        toast(note, 'warn', 3000);
        result = await postImages(endpoint, headers, retryPayload);
      }
    }

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

    // 归档历史（最多保留 200 条）
    imgs.forEach(im => {
      state.history.unshift({ id: uid(), kind: 'img', src: im.src, prompt, time: Date.now() });
    });
    if (state.history.length > 200) state.history.length = 200;
    persist.hist();
    renderHistory();
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
    app: 'prompt-painter',
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
    if (!silent) toast(`云端同步完成 · 新增 ${merged.added} 条`, 'ok');
    return true;
  } catch (e) {
    setSync('err', '同步失败');
    if (!silent) toast('拉取失败：' + (e.message || e), 'err', 4000);
    els.ghResult.className = 'test-result err';
    els.ghResult.textContent = e.message || String(e);
    return false;
  }
}

function mergeLibraries(local, remote) {
  let added = 0;
  const byName = new Map(local.map(g => [g.name.trim().toLowerCase(), g]));
  remote.forEach(rg => {
    const key = String(rg.name || '').trim().toLowerCase();
    let target = byName.get(key);
    if (!target) {
      target = { id: uid(), name: rg.name || '未命名分组', color: rg.color || GROUP_COLORS[0], collapsed: false, items: [] };
      local.push(target);
      byName.set(key, target);
    }
    const seen = new Set(target.items.map(i => i.text.trim().toLowerCase()));
    (rg.items || []).forEach(ri => {
      const t = String(ri.text || '').trim();
      if (!t || seen.has(t.toLowerCase())) return;
      seen.add(t.toLowerCase());
      target.items.push({
        id: uid(), text: t,
        usage: ri.usage || 0, lastUsed: ri.lastUsed || 0,
        tags: Array.isArray(ri.tags) ? ri.tags : [],
      });
      added++;
    });
  });
  return { lib: local, added };
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
      message: `chore(prompt-painter): 更新提示词库 · ${new Date().toLocaleString('zh-CN')}`,
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
  a.download = `prompt-painter-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
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
const GH_BOOLS = [['chkAutoSync', 'autoSync'], ['chkSyncPrompt', 'publicRead']];

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
  [LS.lib, LS.cfg, LS.hist, LS.ui].forEach(k => {
    const v = localStorage.getItem(k);
    if (v) bytes += v.length;
  });
  const kb = (bytes / 1024).toFixed(1);
  els.storeStat.textContent = `本地占用约 ${kb} KB · 生成历史 ${state.history.length} 条 · 提示词 ${state.lib.reduce((n, g) => n + g.items.length, 0)} 条`;
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
  els.modalTitle.textContent = title;
  els.modalBody.innerHTML = html + `<div class="ver-badge">Prompt Painter v${APP_VERSION}</div>`;
  els.modal.hidden = false;
}
function closeModal() { els.modal.hidden = true; }

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
    <b>应用</b><span>Prompt Painter · 提示词绘画工作台</span>
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
    if (h) openLightbox(h.src, h.prompt);
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
          // 视频工作台开着 → 图片交给视频模块当首帧
          if (els.vstudio && !els.vstudio.hidden) {
            if (state.cfg.video.mode === 'i2v') vsHandleFile(f);
            else toast('当前是文生视频，先切到「图生视频」再粘贴首帧', 'warn', 3200);
            return;
          }
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
  $('#btnWipeGen').addEventListener('click', () => {
    state.history = []; persist.hist(); renderHistory(); updateStoreStat();
    toast('生成历史已清空', 'ok');
  });
  $('#btnWipeAll').addEventListener('click', () => {
    openModal('重置全部数据', `
      <p>将清除：词库、接口配置、生成历史、主题设置。<b>此操作不可撤销。</b></p>
      <p style="color:var(--danger)">如果已经配置了云同步，建议先「上传到云端」备份，或先导出 JSON。</p>
      <div class="field-row"><button class="btn tiny danger" data-wipe="1">确认清除全部</button></div>`);
  });
  els.modalBody.addEventListener('click', e => {
    if (!e.target.closest('[data-wipe]')) return;
    [LS.lib, LS.cfg, LS.hist, LS.ui].forEach(store.remove);
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
    // eslint-disable-next-line no-await-in-loop
    const ok = await downloadImage(it.src, name);
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
      let result = await postImages(endpoint, headers, payload);

      if (!result.ok) {
        const firstMsg = (result.data && (result.data.error?.message || result.data.message || result.data.msg)) || result.text || '';
        const stripKeys = pickParamsToStrip(result.status, firstMsg, payload);
        if (stripKeys.length) {
          const retryPayload = Object.assign({}, payload);
          stripKeys.forEach(k => delete retryPayload[k]);
          result = await postImages(endpoint, headers, retryPayload);
        }
      }

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

      newItems.forEach(it => {
        collected.push(it);
        state.history.unshift({ id: uid(), kind: 'img', src: it.src, prompt: it.prompt, time: Date.now() });
      });
      if (state.history.length > 200) state.history.length = 200;
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

  persist.hist();
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
    case 'video':    openVideo(); break;
    case 'matrix':   openMatrix(); break;
    case 'download': $('#btnDownloadMode').click(); break;
    case 'img2img':  $('#btnImg2Img').click(); break;
    case 'translate': translatePrompt(); break;
    case 'clear':    $('#btnClearPrompt').click(); break;
    case 'undo':     undoAppend(); break;
    case 'help':     openModal('使用说明', HELP_HTML); break;
    case 'close':    break;
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

  const base = (state.cfg.trBaseUrl || state.cfg.baseUrl || '').trim().replace(/\/+$/, '');
  const key  = (state.cfg.trApiKey   || state.cfg.apiKey   || '').trim();
  const model = (state.cfg.trModel || 'gpt-4o-mini').trim();

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
    const url = /\/chat\/completions$/.test(base) ? base : base + '/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: TR_SYSTEM },
          { role: 'user', content: raw },
        ],
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout ? AbortSignal.timeout(60000) : undefined,
    });

    if (!res.ok) {
      const t = await res.text();
      let msg = `HTTP ${res.status}`;
      try { const d = JSON.parse(t); msg += ' · ' + (d.error?.message || d.message || '').slice(0, 160); }
      catch (e) { msg += ' · ' + t.slice(0, 160); }
      throw new Error(msg);
    }

    const data = await res.json();
    let out = '';
    if (data.choices && data.choices[0]) {
      out = data.choices[0].message?.content || data.choices[0].text || '';
    } else if (data.output_text) out = data.output_text;
    out = String(out || '').trim().replace(/^["']|["']$/g, '');

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
   视频生成（文生视频 / 图生视频）
   —— 接口独立配置，与画图互不影响
   —— 同时兼容「同步直返视频」与「异步任务轮询」两种形态
   ============================================================ */

const VS_DONE_RE = /^(succeed(ed)?|success|completed?|done|finished|ready|ok|2|200)$/i;
const VS_FAIL_RE = /^(fail(ed|ure)?|error|reject(ed)?|cancell?ed|expired|timeout|3|4|5)$/i;
const VS_VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

/* ---------- 路径拼接 ---------- */
function vsBase() {
  return String(state.cfg.video.baseUrl || '').trim().replace(/\/+$/, '');
}

function vsJoin(base, path) {
  const b = String(base || '').replace(/\/+$/, '');
  let p = String(path || '').trim();
  if (!p) return b;
  if (/^https?:\/\//i.test(p)) return p;
  if (!/^\//.test(p)) p = '/' + p;
  return b + p;
}

function vsSubmitUrl() {
  const v = state.cfg.video;
  return vsJoin(vsBase(), String(v.submitPath || '').trim() || '/video/generations');
}

/* 查询地址：默认 = 提交路径 + /{id}；也可自定义模板 */
function vsQueryUrl(taskId) {
  const v = state.cfg.video;
  let tpl = String(v.queryPath || '').trim();
  if (!tpl) {
    let p = String(v.submitPath || '').trim() || '/video/generations';
    if (!/^\//.test(p)) p = '/' + p;
    tpl = p.replace(/\/+$/, '') + '/{id}';
  }
  return vsJoin(vsBase(), tpl.replace(/\{id\}/g, encodeURIComponent(taskId)));
}

function vsHeaders(json) {
  const v = state.cfg.video;
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  const key = String(v.apiKey || '').trim();
  if (key && v.auth !== 'none') {
    if (v.auth === 'x-api-key') h['x-api-key'] = key;
    else h['Authorization'] = 'Bearer ' + key;
  }
  return h;
}

/* ---------- 响应嗅探：不挑字段名，尽量猜得出来 ---------- */
function vsDeepFind(obj, keys, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 6) return null;
  for (const k of keys) {
    const val = obj[k];
    if (typeof val === 'string' && val) return val;
    if (typeof val === 'number' && isFinite(val)) return String(val);
  }
  for (const k of Object.keys(obj)) {
    const r = vsDeepFind(obj[k], keys, depth + 1);
    if (r != null && r !== '') return r;
  }
  return null;
}

function vsExtractTaskId(data) {
  return vsDeepFind(data, [
    'task_id', 'taskId', 'request_id', 'requestId',
    'video_id', 'videoId', 'job_id', 'jobId', 'generation_id', 'id',
  ]);
}

function vsExtractStatus(data) {
  return vsDeepFind(data, ['status', 'state', 'task_status', 'taskStatus', 'video_status']);
}

function vsNormalizeStatus(raw) {
  if (raw == null || raw === '') return 'pending';
  const s = String(raw).trim();
  if (VS_DONE_RE.test(s)) return 'done';
  if (VS_FAIL_RE.test(s)) return 'fail';
  return 'running';
}

function vsLooksLikeVideoUrl(s) {
  if (typeof s !== 'string' || s.length < 8) return false;
  if (/^data:video\//i.test(s)) return true;
  if (!/^https?:\/\//i.test(s)) return false;
  return VS_VIDEO_EXT_RE.test(s);
}

function vsCollectUrls(obj, path, out, depth) {
  if (!obj || typeof obj !== 'object' || depth > 8) return out;
  Object.keys(obj).forEach(k => {
    const val = obj[k];
    const p = path ? path + '.' + k : k;
    if (typeof val === 'string') {
      if (vsLooksLikeVideoUrl(val)) out.push({ url: val, key: p });
    } else if (val && typeof val === 'object') {
      vsCollectUrls(val, p, out, depth + 1);
    }
  });
  return out;
}

/* 字段名里带 video / url / output 的优先，避免误抓封面图 */
function vsExtractVideoUrl(data) {
  if (typeof data === 'string') return vsLooksLikeVideoUrl(data) ? data : '';
  if (!data || typeof data !== 'object') return '';
  const found = vsCollectUrls(data, '', [], 0);
  if (!found.length) return '';
  found.sort((a, b) => {
    const rank = x => (/video/i.test(x.key) ? 0 : /url|output|result|src|download/i.test(x.key) ? 1 : 2);
    return rank(a) - rank(b);
  });
  return found[0].url;
}

function vsExtractB64Video(data) {
  const b64 = vsDeepFind(data, ['video_base64', 'b64_json', 'video_b64']);
  if (b64 && b64.length > 500) return 'data:video/mp4;base64,' + b64;
  return '';
}

function vsExtractCover(data) {
  const c = vsDeepFind(data, [
    'cover_url', 'coverUrl', 'cover', 'thumbnail_url', 'thumbnail',
    'poster', 'first_frame_url', 'image_url',
  ]);
  if (typeof c !== 'string' || !c) return '';
  return (/^https?:\/\//i.test(c) || /^data:image\//i.test(c)) ? c : '';
}

function vsExtractProgress(data) {
  const p = vsDeepFind(data, ['progress', 'percent', 'percentage', 'progress_percent']);
  if (p == null) return null;
  const n = parseFloat(p);
  if (!isFinite(n)) return null;
  return Math.round(n <= 1 ? n * 100 : n);
}

function vsTaskMessage(data) {
  if (!data) return '';
  if (typeof data === 'string') return data.slice(0, 400);
  if (typeof data === 'object') {
    if (typeof data.error === 'string') return data.error.slice(0, 400);
    if (data.error && typeof data.error === 'object' && data.error.message) {
      return String(data.error.message).slice(0, 400);
    }
    const m = vsDeepFind(data, ['fail_reason', 'error_message', 'error_msg', 'message', 'msg', 'reason']);
    if (m) return String(m).slice(0, 400);
  }
  return '';
}

function vsErrMsg(data, text) {
  const m = vsTaskMessage(data);
  if (m) return m;
  return String(text || '').slice(0, 400) || '（无返回内容）';
}

/* 把服务商的原话翻译成人话：能识别的模式才给提示 */
function vsExplainError(msg) {
  const m = String(msg || '');
  if (/no usage expression or meter/i.test(m)) {
    return '这条来自中转站/服务端，不是请求格式问题：该站点没有为这个模型配置视频任务的计费表达式。通常两种原因——① 该站点根本不支持这个模型名跑视频任务，换用它文档里列出的视频模型（如 sora-2 / veo3 / kling-v1 / hailuo-02）；② 站点管理员尚未给该模型开通视频任务计费。可点「复制诊断信息」发给站点客服核对。';
  }
  if (/model\s*not\s*found|invalid model|unknown model|无可用渠道|不支持(的)?模型|模型不存在/i.test(m)) {
    return '站点不认这个模型名。点「获取模型」从它给的列表里挑一个，或改成该站点文档里的写法。';
  }
  if (/insufficient|quota|balance|余额|欠费|额度/i.test(m)) {
    return '账户余额或额度不足，充值后再试。';
  }
  if (/unauthorized|invalid api key|\b401\b/i.test(m)) {
    return 'API Key 无效或与这个 Base URL 不配套：检查是否复制完整、有没有多余空格。';
  }
  if (/forbidden|\b403\b/i.test(m)) {
    return 'Key 没有调用该模型的权限：在站点里确认该模型已对你开放。';
  }
  if (/content|sensitive|violat|policy|审核|违规/i.test(m)) {
    return '提示词或首帧图触发了内容审核，换个说法或换张图再试。';
  }
  if (/Failed to fetch|NetworkError|CORS/i.test(m)) {
    return '网络层就断了：Base URL 写错，或该站点不允许网页直连（无 CORS 头）。可换支持跨域的中转站点。';
  }
  if (/超时|timeout/i.test(m)) {
    return '等待超时：视频任务耗时较长，可在「高级」里把最长等待时间调大。';
  }
  return '';
}

function vsShort(data, text) {
  return (data ? JSON.stringify(data) : String(text || '')).slice(0, 300);
}

/* ---------- 网络 ---------- */
async function vsFetch(url, opts, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || 120000);
  try {
    const res = await fetch(url, Object.assign({}, opts, { signal: ctrl.signal }));
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch (e) { /* 可能不是 JSON */ }
    return { ok: res.ok, status: res.status, data, text };
  } finally {
    clearTimeout(timer);
  }
}

/* data URI → Blob（multipart 上传首帧图时需要真文件） */
function vsDataUrlToBlob(dataUrl) {
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

/* ---------- 构造请求体 ---------- */
function vsBuildPayload(prompt) {
  const v = state.cfg.video;
  const body = { model: v.model || 'sora-2', prompt };

  let sizeVal = '';
  if (v.size === '__custom__') sizeVal = `${v.customW}x${v.customH}`;
  else if (v.size) sizeVal = v.size;
  if (sizeVal) {
    const sf = (v.mapSize || 'size').trim() || 'size';
    body[sf] = sizeVal;
  }

  if (v.seconds !== '' && v.seconds != null) {
    const df = (v.mapDuration || 'seconds').trim() || 'seconds';
    const s = String(v.seconds).trim();
    if (s !== '') body[df] = s;   // 默认发字符串（Sora/多数 Go 后端要 string），类型不符时由 400 重试兜底
  }

  if (v.fps !== '' && v.fps != null) body.fps = Number(v.fps);
  if (String(v.seed).trim() !== '') body.seed = Number(v.seed);

  if (String(v.negative || '').trim()) {
    const nf = (v.mapNegative || 'negative_prompt').trim() || 'negative_prompt';
    body[nf] = normalizePrompt(v.negative);
  }

  /* 图生视频：带上首帧图 */
  if (v.mode === 'i2v') {
    const ref = state.video.ref;
    if (!ref || !ref.dataUrl) throw new Error('图生视频需要先上传一张首帧图');
    const f = (v.mapImage || 'image').trim() || 'image';
    body[f] = ref.dataUrl;
  }

  if (String(v.extraJson || '').trim()) {
    try {
      const extra = JSON.parse(v.extraJson);
      if (extra && typeof extra === 'object' && !Array.isArray(extra)) Object.assign(body, extra);
    } catch (e) {
      throw new Error('额外 JSON 参数格式错误：' + e.message);
    }
  }
  return body;
}

function vsBuildFormData(payload) {
  const fd = new FormData();
  Object.keys(payload).forEach(k => {
    const val = payload[k];
    if (val == null) return;
    if (typeof val === 'string' && /^data:image\//i.test(val)) {
      const blob = vsDataUrlToBlob(val);
      if (blob) { fd.append(k, blob, 'frame.png'); return; }
    }
    fd.append(k, typeof val === 'object' ? JSON.stringify(val) : String(val));
  });
  return fd;
}

/* 400 且报错点名「某字段类型不对」时，翻转该字段类型后重试 */
function vsCoercePayload(payload, msg) {
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

/* ---------- 主流程 ---------- */
function vsDur(ms) {
  const s = Math.max(0, Math.round((ms || 0) / 1000));
  if (s < 60) return s + ' 秒';
  return Math.floor(s / 60) + ' 分 ' + String(s % 60).padStart(2, '0') + ' 秒';
}

function onVsGenerateClick() {
  if (state.video.running) {
    state.video.abort = true;
    els.vsProgress.textContent = '正在取消…';
    return;
  }
  vsGenerate();
}

function setVsGenerating(on) {
  const btn = els.vsGenerate;
  btn.disabled = false;
  btn.textContent = on ? '✕ 取消生成' : '🎬 生成视频';
  btn.classList.toggle('danger', on);
  els.vsProgress.classList.toggle('busy', on);
  if (!on) els.vsProgress.textContent = '';
}

async function vsGenerate() {
  if (state.video.running) { toast('上一批还在生成中', 'warn'); return; }

  const v = state.cfg.video;
  const raw = els.vsPrompt.value.trim();
  if (!raw) { toast('先写一段视频提示词吧', 'warn'); els.vsPrompt.focus(); return; }
  if (!vsBase()) {
    toast('请先在「接口配置」里填写视频接口地址', 'warn', 3800);
    els.vsAccCfg.open = true;
    els.vsInput.scrollTop = els.vsInput.scrollHeight;
    return;
  }
  if (v.mode === 'i2v' && !(state.video.ref && state.video.ref.dataUrl)) {
    toast('图生视频需要先上传首帧图', 'warn', 3200);
    return;
  }

  const prompt = normalizePrompt(raw);
  let payload, url;
  try {
    payload = vsBuildPayload(prompt);
    url = vsSubmitUrl();
  } catch (e) { toast(e.message, 'err', 3600); return; }

  /* 诊断快照：出错时可一键复制发给中转站客服核对 */
  const diag = { url, model: payload.model, format: v.format, payload };

  if (v.debug) {
    els.vsDebugPre.classList.remove('hidden');
    els.vsDebugPre.textContent = `POST ${url}\n\n` + JSON.stringify(payload, null, 2);
  }

  state.video.running = true;
  state.video.abort = false;
  setVsGenerating(true);

  const task = {
    id: uid(), kind: 'task', status: 'submitting',
    prompt, startedAt: Date.now(), elapsed: 0,
    taskId: '', progress: null, polls: 0, rawStatus: '', message: '', src: '', cover: '',
    hint: '', diag,
  };
  state.video.tasks.unshift(task);
  renderVs();

  try {
    const headers = vsHeaders(v.format !== 'multipart');
    const submitOnce = (pl) => vsFetch(url, {
      method: 'POST', headers,
      body: v.format === 'multipart' ? vsBuildFormData(pl) : JSON.stringify(pl),
    }, 180000);

    let res = await submitOnce(payload);
    if (!res.ok && res.status === 400) {
      /* 服务商嫌字段类型不对（如 seconds 要 string 发了 number）→ 纠正后重试一次 */
      const alt = vsCoercePayload(payload, vsErrMsg(res.data, res.text));
      if (alt) {
        if (v.debug) {
          els.vsDebugPre.textContent += `\n\n-- 400 类型纠正重试 --\n` + JSON.stringify(alt, null, 2);
        }
        const res2 = await submitOnce(alt);
        if (res2.ok) res = res2;
      }
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} · ${vsErrMsg(res.data, res.text)}`);

    /* 形态一：直接给了视频地址 */
    const direct = vsExtractVideoUrl(res.data) || vsExtractB64Video(res.data);
    if (direct) {
      task.kind = 'video';
      task.src = direct;
      task.cover = vsExtractCover(res.data);
      task.status = 'done';
      task.elapsed = Date.now() - task.startedAt;
      renderVs();
      toast('视频已生成 🎬', 'ok', 3000);
      return;
    }

    /* 形态二：给个任务号，慢慢轮询 */
    const taskId = vsExtractTaskId(res.data);
    if (!taskId) {
      throw new Error('返回里既没有视频地址，也没有任务号：' + vsShort(res.data, res.text));
    }
    task.taskId = taskId;
    task.status = 'running';
    const st = vsExtractStatus(res.data);
    if (st) task.rawStatus = String(st);
    task.progress = vsExtractProgress(res.data);
    renderVs();

    await vsPollTask(task);
  } catch (e) {
    if (state.video.abort) {
      state.video.tasks = state.video.tasks.filter(x => x.id !== task.id);
      renderVs();
      toast('已取消生成', '', 2000);
      return;
    }
    let msg = e.message || String(e);
    if (e.name === 'AbortError') msg = '请求超时或无响应';
    else if (/Failed to fetch|NetworkError/i.test(msg)) {
      msg = '网络请求失败：接口地址写错、被浏览器 CORS 拦截，或该站点不允许网页直连。';
    }
    task.kind = 'error';
    task.status = 'fail';
    task.message = msg;
    task.hint = vsExplainError(msg);
    task.elapsed = Date.now() - task.startedAt;
    renderVs();
    toast('视频生成失败，看右侧原因', 'err', 3600);
  } finally {
    state.video.running = false;
    state.video.abort = false;
    setVsGenerating(false);
  }
}

async function vsPollTask(task) {
  const v = state.cfg.video;
  const every = clamp(Number(v.pollEvery) || 4, 1, 60) * 1000;
  const maxMs = clamp(Number(v.pollMax) || 300, 10, 1800) * 1000;
  const deadline = Date.now() + maxMs;
  let attempt = 0;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, every));
    if (state.video.abort) throw new Error('已取消');

    attempt++;
    let res;
    try {
      res = await vsFetch(vsQueryUrl(task.taskId), { method: 'GET', headers: vsHeaders(false) }, 60000);
    } catch (e) {
      /* 单次查询失败不当场判死，容忍几轮抖动 */
      if (attempt <= 3) { task.elapsed = Date.now() - task.startedAt; renderVs(); continue; }
      throw e;
    }

    task.elapsed = Date.now() - task.startedAt;
    task.polls = attempt;

    if (!res.ok) {
      if (attempt <= 3 && (res.status === 404 || res.status >= 500)) { renderVs(); continue; }
      throw new Error(`查询失败 HTTP ${res.status} · ${vsErrMsg(res.data, res.text)}`);
    }

    const vid = vsExtractVideoUrl(res.data) || vsExtractB64Video(res.data);
    if (vid) {
      task.kind = 'video';
      task.src = vid;
      task.cover = vsExtractCover(res.data);
      task.status = 'done';
      task.rawStatus = '';
      task.message = '';
      renderVs();
      toast('视频已生成 🎬', 'ok', 3000);
      return;
    }

    const raw = vsExtractStatus(res.data);
    const st = vsNormalizeStatus(raw);
    task.rawStatus = raw == null ? '' : String(raw);
    task.progress = vsExtractProgress(res.data);
    task.message = vsTaskMessage(res.data);

    if (st === 'fail') {
      const detail = task.message || (task.rawStatus ? '（' + task.rawStatus + '）' : '');
      throw new Error('任务失败' + (detail ? '：' + detail : ''));
    }
    renderVs();
  }
  throw new Error(`等待超时（超过 ${Math.round(maxMs / 1000)} 秒仍未完成）· 任务号 ${task.taskId}`);
}

/* ---------- 渲染 ---------- */
const _vsEls = new Map();   // id → { sig, el }，复用 DOM 节点，避免打断视频播放

function vsCardSig(t) {
  if (t.kind === 'video') return 'v:' + t.id;
  if (t.kind === 'error') return 'e:' + t.message;
  return 't:' + t.status + ':' + Math.floor((t.elapsed || 0) / 1000) + ':' +
         (t.progress == null ? '' : t.progress) + ':' + (t.polls || 0) + ':' + (t.rawStatus || '');
}

function vsCardHTML(t) {
  if (t.kind === 'video') {
    const openLink = /^data:/.test(t.src)
      ? ''
      : `<a class="icon-btn" href="${esc(t.src)}" target="_blank" rel="noopener" title="新窗口打开">↗</a>`;
    return `<div class="vcard" data-vid="${t.id}">
      <div class="vcard-body">
        <video src="${esc(t.src)}"${t.cover ? ` poster="${esc(t.cover)}"` : ''} controls loop playsinline preload="metadata"></video>
        <span class="vcard-badge">⏱ ${vsDur(t.elapsed)}</span>
      </div>
      <div class="vcard-bar">
        <span class="txt" title="${esc(t.prompt)}">${esc(t.prompt)}</span>
        <button class="icon-btn" data-vact="copy" data-vid="${t.id}" title="复制提示词">⧉</button>
        <button class="icon-btn" data-vact="download" data-vid="${t.id}" title="下载视频">⤓</button>
        ${openLink}
      </div>
    </div>`;
  }

  if (t.kind === 'error') {
    const hint = t.hint ? `<div class="vtask-hint">💡 ${esc(t.hint)}</div>` : '';
    return `<div class="vtask fail" data-vid="${t.id}">
      <div class="vtask-head">✕ 生成失败</div>
      <div class="vtask-msg">${esc(t.message || '未知错误')}</div>
      ${hint}
      <div class="vtask-meta">耗时 ${vsDur(t.elapsed)}${t.taskId ? ' · 任务号 ' + esc(t.taskId) : ''}</div>
      ${t.diag ? `<div class="vtask-acts"><button class="mini-btn" data-vact="diag" data-vid="${t.id}">⧉ 复制诊断信息</button></div>` : ''}
    </div>`;
  }

  const pct = t.progress == null ? '' : ` · ${t.progress}%`;
  const label = t.status === 'submitting' ? '正在提交任务…' : '正在生成视频…';
  const meta = [
    '已等待 ' + vsDur(t.elapsed),
    t.rawStatus ? '状态 ' + esc(t.rawStatus) : '',
    t.taskId ? '任务 ' + esc(t.taskId) : '',
    t.polls ? '第 ' + t.polls + ' 次查询' : '',
  ].filter(Boolean).join(' · ');
  return `<div class="vtask" data-vid="${t.id}">
    <div class="vtask-head"><span class="vtask-spin"></span>${label}${pct}</div>
    <div class="vtask-bar"><i></i></div>
    <div class="vtask-meta">${meta}</div>
    <div class="vtask-meta" style="opacity:.75">${esc(String(t.prompt || '').slice(0, 100))}</div>
  </div>`;
}

function renderVs() {
  const tasks = state.video.tasks;
  const list = els.vsList;

  els.vsCount.textContent = tasks.filter(t => t.kind === 'video').length;
  const has = tasks.length > 0;
  els.vsEmpty.hidden = has;
  list.hidden = !has;
  if (!has) { list.innerHTML = ''; _vsEls.clear(); return; }

  tasks.forEach(t => {
    const sig = vsCardSig(t);
    let rec = _vsEls.get(t.id);
    if (!rec || rec.sig !== sig || !rec.el.isConnected) {
      const tmp = document.createElement('div');
      tmp.innerHTML = vsCardHTML(t);
      const el = tmp.firstElementChild;
      if (rec && rec.el.isConnected) rec.el.replaceWith(el);
      rec = { sig, el };
      _vsEls.set(t.id, rec);
    }
    list.appendChild(rec.el);   // 复用同一节点 → 不会打断正在播放的视频
  });

  const alive = new Set(tasks.map(t => t.id));
  Array.from(list.children).forEach(el => { if (!alive.has(el.dataset.vid)) el.remove(); });
  Array.from(_vsEls.keys()).forEach(k => { if (!alive.has(k)) _vsEls.delete(k); });
}

/* 一键复制诊断信息（把 base64 首帧图省略，方便发给中转站客服） */
function vsCopyDiag(t) {
  const d = t.diag || {};
  const p = {};
  Object.keys(d.payload || {}).forEach(k => {
    const val = d.payload[k];
    if (typeof val === 'string' && val.length > 120) p[k] = val.slice(0, 48) + `…（已省略 ${val.length} 字符）`;
    else p[k] = val;
  });
  const txt = [
    '【Prompt Painter · 视频生成诊断】',
    '时间：' + new Date(t.startedAt || Date.now()).toLocaleString(),
    '请求：POST ' + (d.url || '（未记录）'),
    '格式：' + (d.format || 'json') + '　模型：' + (d.model || '（空）'),
    '',
    '请求体：',
    JSON.stringify(p, null, 2),
    '',
    '报错原文：' + (t.message || ''),
  ].join('\n');
  copyText(txt)
    .then(() => toast('诊断信息已复制，可直接发给站点客服', 'ok', 3200))
    .catch(() => toast('复制失败', 'err'));
}

async function vsDownload(task) {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const ok = await downloadImage(task.src, `video-${stamp}.mp4`);
  if (!ok) toast('直接下载被跨域拦截，已新窗口打开，请右键另存', 'warn', 4000);
}

function vsClearResults() {
  if (state.video.running) { toast('正在生成中，先取消再清空', 'warn'); return; }
  state.video.tasks = [];
  _vsEls.clear();
  renderVs();
}

/* ---------- 参考图（图生视频首帧） ---------- */
function renderVsRef() {
  const v = state.cfg.video;
  const isI2V = v.mode === 'i2v';
  els.vsRefBlock.hidden = !isI2V;
  if (!isI2V) return;

  const ref = state.video.ref;
  const has = !!(ref && ref.dataUrl);
  els.vsDrop.classList.toggle('hidden', has);
  els.vsRefCard.hidden = !has;
  if (!has) return;
  els.vsRefThumb.src = ref.dataUrl;
  els.vsRefName.textContent = ref.name || 'frame.png';
  els.vsRefSize.textContent = `${ref.width}×${ref.height} · ${(ref.size / 1024).toFixed(0)} KB`;
}

async function vsHandleFile(file) {
  try {
    const ref = await readImageFile(file);
    state.video.ref = ref;
    renderVsRef();
    toast(`首帧已载入 · ${ref.width}×${ref.height}`, 'ok', 2200);
  } catch (e) {
    toast('载入失败：' + (e.message || e), 'err', 3400);
  }
}

function vsSetMode(mode) {
  state.cfg.video.mode = mode === 'i2v' ? 'i2v' : 't2v';
  persist.cfg();
  $$('.vs-seg-btn').forEach(b => b.classList.toggle('active', b.dataset.vmode === state.cfg.video.mode));
  renderVsRef();
}

/* ---------- 接口配置 ---------- */
function updateVsCustomSize() {
  els.vsCustomSize.hidden = state.cfg.video.size !== '__custom__';
}

function updateVsPill(force) {
  const v = state.cfg.video;
  const pill = els.vsApiPill;
  if (!pill) return;
  if (force === 'on')  { pill.dataset.state = 'on';  pill.textContent = '已连接'; return; }
  if (force === 'err') { pill.dataset.state = 'err'; pill.textContent = '连接异常'; return; }
  if (!v.baseUrl) { pill.dataset.state = 'off'; pill.textContent = '接口未配置'; return; }
  if (v.auth !== 'none' && !String(v.apiKey || '').trim()) {
    pill.dataset.state = 'off'; pill.textContent = '缺少 API Key'; return;
  }
  pill.dataset.state = 'on';
  pill.textContent = '已配置 · ' + (v.model || '未选模型');
}

const VS_KEYS = [
  ['vsBaseUrl', 'baseUrl', 'text'],
  ['vsApiKey', 'apiKey', 'text'],
  ['vsModel', 'model', 'text'],
  ['vsSubmitPath', 'submitPath', 'text'],
  ['vsQueryPath', 'queryPath', 'text'],
  ['vsFormat', 'format', 'text'],
  ['vsAuth', 'auth', 'text'],
  ['vsPollEvery', 'pollEvery', 'num'],
  ['vsPollMax', 'pollMax', 'num'],
  ['vsSize', 'size', 'text'],
  ['vsSeconds', 'seconds', 'text'],
  ['vsFps', 'fps', 'text'],
  ['vsSeed', 'seed', 'text'],
  ['vsNegative', 'negative', 'text'],
  ['vsMapSize', 'mapSize', 'text'],
  ['vsMapDuration', 'mapDuration', 'text'],
  ['vsMapImage', 'mapImage', 'text'],
  ['vsMapNegative', 'mapNegative', 'text'],
  ['vsExtraJson', 'extraJson', 'text'],
  ['vsW', 'customW', 'num'],
  ['vsH', 'customH', 'num'],
];
const VS_BOOLS = [['vsDebug', 'debug']];

function vsSettingsToUI() {
  const v = state.cfg.video;
  VS_KEYS.forEach(([elId, key, kind]) => {
    const el = $('#' + elId);
    if (!el) return;
    const val = v[key];
    el.value = (val == null) ? '' : val;
    if (kind === 'num' && el.value === '') el.value = '';
  });
  VS_BOOLS.forEach(([elId, key]) => {
    const el = $('#' + elId);
    if (el) el.checked = !!v[key];
  });
  $$('.vs-seg-btn').forEach(b => b.classList.toggle('active', b.dataset.vmode === v.mode));
  if (els.vsPrompt) els.vsPrompt.value = v.prompt || '';
  updateVsCustomSize();
  renderVsRef();
  updateVsPill();
}

/* 一键把画图接口的地址与 Key 搬过来 */
function vsReuseImageApi() {
  const c = state.cfg, v = c.video;
  let n = 0;
  if (String(c.baseUrl || '').trim()) { v.baseUrl = c.baseUrl; n++; }
  if (String(c.apiKey || '').trim()) { v.apiKey = c.apiKey; n++; }
  if (!n) { toast('画图接口还没填，先填那边再复制过来', 'warn', 3400); return; }
  persist.cfg();
  vsSettingsToUI();
  toast(`已从画图接口复制 ${n} 项配置`, 'ok', 2400);
}

/* 反向：把视频接口配置同步回画图 */
function vsSyncToImageApi() {
  const c = state.cfg, v = c.video;
  if (!String(v.baseUrl || '').trim()) { toast('视频接口地址还是空的', 'warn'); return; }
  c.baseUrl = v.baseUrl;
  if (String(v.apiKey || '').trim()) c.apiKey = v.apiKey;
  persist.cfg();
  settingsToUI();
  toast('已同步给画图接口', 'ok', 2400);
}

function vsExtractModels(data) {
  const arr = (data && (data.data || data.models || data.result)) || (Array.isArray(data) ? data : []);
  if (!Array.isArray(arr)) return [];
  return arr.map(m => (typeof m === 'string' ? m : (m && (m.id || m.name || m.model)))).filter(Boolean);
}

async function vsTestConn() {
  const out = els.vsTestResult;
  const base = vsBase();
  if (!base) { out.className = 'test-result err'; out.textContent = '请先填写接口地址'; return; }
  out.className = 'test-result';
  out.textContent = '正在探测…';
  const url = /\/models$/.test(base) ? base : base + '/models';
  try {
    const res = await vsFetch(url, { method: 'GET', headers: vsHeaders(false) }, 30000);
    if (res.ok) {
      const list = vsExtractModels(res.data);
      out.className = 'test-result ok';
      out.textContent = list.length
        ? `连接成功 · 发现 ${list.length} 个模型（点「获取模型」可拉取）`
        : '连接成功 ✓';
      updateVsPill('on');
    } else {
      out.className = 'test-result err';
      out.textContent = `接口可达，但 /models 返回 HTTP ${res.status}：${vsErrMsg(res.data, res.text).slice(0, 160)}`;
    }
  } catch (e) {
    out.className = 'test-result err';
    out.textContent = '连接失败：' + (e.name === 'AbortError' ? '超时' : (e.message || e)) +
      '（部分服务商不提供 /models，可忽略此项直接试生成）';
  }
}

async function vsFetchModels() {
  const base = vsBase();
  if (!base) { toast('请先填写视频接口地址', 'warn'); return; }
  const btn = els.vsFetchModelsBtn;
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = '拉取中…';
  try {
    const url = /\/models$/.test(base) ? base : base + '/models';
    const res = await vsFetch(url, { method: 'GET', headers: vsHeaders(false) }, 30000);
    if (!res.ok) throw new Error(`HTTP ${res.status} · ${vsErrMsg(res.data, res.text).slice(0, 160)}`);
    const models = vsExtractModels(res.data);
    if (!models.length) throw new Error('返回里没有模型列表');
    $('#vsModelPresets').innerHTML = models.map(m => `<option value="${esc(m)}"></option>`).join('');
    els.vsModelHint.textContent = `已获取 ${models.length} 个模型，点输入框可下拉选择`;
    toast(`已获取 ${models.length} 个模型`, 'ok', 2600);
  } catch (e) {
    toast('获取失败：' + (e.message || e), 'err', 3800);
  } finally {
    btn.disabled = false; btn.textContent = orig;
  }
}

/* ---------- 开关与事件 ---------- */
function openVideo() {
  closeMoreMenu();
  closeDrawers();
  els.vstudio.hidden = false;
  vsSettingsToUI();
  renderVs();
}

function closeVideo() {
  els.vstudio.hidden = true;
}

function bindVideoEvents() {
  $('#btnVideo').addEventListener('click', openVideo);
  els.vsClose.addEventListener('click', closeVideo);
  els.vstudio.addEventListener('click', e => { if (e.target === els.vstudio) closeVideo(); });

  /* 模式切换 */
  els.vsMode.addEventListener('click', e => {
    const b = e.target.closest('[data-vmode]');
    if (b) vsSetMode(b.dataset.vmode);
  });

  /* 首帧图 */
  els.vsDrop.addEventListener('click', () => els.vsFile.click());
  els.vsFile.addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) vsHandleFile(f);
    e.target.value = '';
  });
  ['dragenter', 'dragover'].forEach(ev => els.vsDrop.addEventListener(ev, e => {
    e.preventDefault(); els.vsDrop.classList.add('over');
  }));
  ['dragleave', 'drop'].forEach(ev => els.vsDrop.addEventListener(ev, e => {
    e.preventDefault(); els.vsDrop.classList.remove('over');
  }));
  els.vsDrop.addEventListener('drop', e => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) vsHandleFile(f);
  });
  $('#vsRefRemove').addEventListener('click', () => {
    state.video.ref = null;
    if (els.vsFile) els.vsFile.value = '';
    renderVsRef();
  });

  /* 提示词 */
  els.vsPrompt.addEventListener('input', debounce(() => {
    state.cfg.video.prompt = els.vsPrompt.value;
    persist.cfg();
  }, 400));
  els.vsPrompt.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onVsGenerateClick(); }
  });
  $('#vsPullPrompt').addEventListener('click', () => {
    const t = els.promptBox.value.trim();
    if (!t) { toast('主对话框还是空的', 'warn'); return; }
    els.vsPrompt.value = t;
    state.cfg.video.prompt = t;
    persist.cfg();
    toast('已取用主对话框的提示词', 'ok', 2000);
  });

  /* 生成 */
  els.vsGenerate.addEventListener('click', onVsGenerateClick);
  $('#vsClearAll').addEventListener('click', vsClearResults);

  /* 结果卡片操作 */
  els.vsList.addEventListener('click', e => {
    const btn = e.target.closest('[data-vact]');
    if (!btn) return;
    const t = state.video.tasks.find(x => x.id === btn.dataset.vid);
    if (!t) return;
    if (btn.dataset.vact === 'copy') {
      copyText(t.prompt).then(() => toast('提示词已复制', 'ok')).catch(() => toast('复制失败', 'err'));
    } else if (btn.dataset.vact === 'diag') {
      vsCopyDiag(t);
    } else if (btn.dataset.vact === 'download') {
      vsDownload(t);
    }
  });

  /* 配置项 */
  VS_KEYS.forEach(([elId, key, kind]) => {
    const el = $('#' + elId);
    if (!el) return;
    const sync = () => {
      state.cfg.video[key] = kind === 'num' ? Number(el.value) : el.value;
      persist.cfg();
      if (elId === 'vsSize') updateVsCustomSize();
      updateVsPill();
    };
    el.addEventListener('input', sync);
    el.addEventListener('change', sync);
  });
  VS_BOOLS.forEach(([elId, key]) => {
    const el = $('#' + elId);
    if (!el) return;
    el.addEventListener('change', () => { state.cfg.video[key] = el.checked; persist.cfg(); });
  });

  $('#vsReuseImg').addEventListener('click', vsReuseImageApi);
  $('#vsSyncBack').addEventListener('click', vsSyncToImageApi);
  $('#vsTest').addEventListener('click', vsTestConn);
  els.vsFetchModelsBtn.addEventListener('click', vsFetchModels);
}

/* ---------------- 主题 / 抽屉 ---------------- */
function applyTheme(t) {
  state.ui.theme = t;
  document.documentElement.dataset.theme = t;
  $('#btnTheme').textContent = t === 'dark' ? '☀' : '◐';
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

  /* 视频工作台 */
  els.vstudio = $('#vstudio');
  els.vsClose = $('#vsClose');
  els.vsApiPill = $('#vsApiPill');
  els.vsMode = $('#vsMode');
  els.vsRefBlock = $('#vsRefBlock');
  els.vsDrop = $('#vsDrop');
  els.vsFile = $('#vsFile');
  els.vsRefCard = $('#vsRefCard');
  els.vsRefThumb = $('#vsRefThumb');
  els.vsRefName = $('#vsRefName');
  els.vsRefSize = $('#vsRefSize');
  els.vsPrompt = $('#vsPrompt');
  els.vsCustomSize = $('#vsCustomSize');
  els.vsList = $('#vsList');
  els.vsEmpty = $('#vsEmpty');
  els.vsCount = $('#vsCount');
  els.vsProgress = $('#vsProgress');
  els.vsGenerate = $('#vsGenerate');
  els.vsInput = $('.vs-input');
  els.vsAccCfg = $('#vsAccCfg');
  els.vsAccAdv = $('#vsAccAdv');
  els.vsTestResult = $('#vsTestResult');
  els.vsDebugPre = $('#vsDebugPre');
  els.vsModelHint = $('#vsModelHint');
  els.vsFetchModelsBtn = $('#vsFetchModels');

  loadAll();
  applyTheme(state.ui.theme);
  els.libSort.value = state.ui.sort;

  settingsToUI();
  bindSettings();
  bindEvents();
  bindVideoEvents();
  vsSettingsToUI();

  renderLib();
  renderSizeGrid();
  renderChips();
  renderHistory();
  renderResults();

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
    setTimeout(() => openModal('欢迎来到 Prompt Painter 🎨', HELP_HTML), 400);
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

  // 启动时尝试静默拉取云端
  if (ghReady(false) && (state.cfg.gh.token || state.cfg.gh.publicRead)) {
    setSync('busy', '正在同步…');
    setTimeout(() => ghPull(true), 800);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
