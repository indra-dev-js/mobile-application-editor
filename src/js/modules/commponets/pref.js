import { db } from '../db/db.js';
import { liveQuery } from '../db/dexie.min.js';

// 🔹 Inisialisasi default settings
export const DEFAULT_SETTINGS = {
  language: 'en',
  theme: 'github_dark',
  background: 'dark',
  textSize: '16',
  nightMode: false,
  autocomplete: false,
  showHints: false,
  cursorStyle: 'ace',
  editorFontSize: '14px',
  editorFontWeight: 'normal',
  showtreeindent: true,
};

export async function createSettingsDefault() {
  const existing = await db.directory.get('idb/.settings');
  if (!existing) {
    await db.directory.put({
      path: 'idb/.settings',
      text: { ...DEFAULT_SETTINGS, mtimeMs: Date.now() },
    });
  }
}

// 🔹 Update settings
export async function updateSettingsInDB(newTextObj) {
  await db.directory.put({
    path: 'idb/.settings',
    text: newTextObj,
  });
}

// 🔹 Get settings
export async function getSettingsFromDB() {
  const record = await db.directory.get('idb/.settings');
  const dbText = record?.text || {};
  return { ...DEFAULT_SETTINGS, ...dbText };
}

// 🔹 Subscribe helper: callback dipanggil setiap settings berubah
// 🔹 Subscribe bawaan Dexie (reactive)
export function subscribeSettings(callback) {
  const observable = liveQuery(() =>
    db.directory.get('idb/.settings').then(
      r =>
        r?.text || {
          ...DEFAULT_SETTINGS,
        },
    ),
  );

  const subscription = observable.subscribe({
    next: callback,
    error: err => console.error('Error observing settings:', err),
  });

  // kembalikan subscription supaya bisa unsubscribe kalau perlu
  return subscription;
}
export class SettingsPage {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'settings-page';
    this.settings = {};
    this.sections = { appearance: [], editor: [], 'tree-view': [] };
    this.callbacks = [];
  }

  // async init() {
  //   // pastikan record settings ada dulu
  //   await createSettingsDefault();

  //   // ambil settings dari DB
  //   this.settings = await getSettingsFromDB();
  //   this.initDefaultSettings();
  // }
  async init() {
    // ambil settings dari DB
    this.settings = await getSettingsFromDB();

    // kalau DB kosong, inisialisasi default
    if (!this.settings || Object.keys(this.settings).length === 0) {
      this.settings = {
        language: 'en',
        theme: 'github_dark',
        background: 'dark',
        textSize: '16',
        nightMode: false,
        autocomplete: false,
        showHints: false,
        cursorStyle: 'ace',
        editorFontSize: '14px',
        editorFontWeight: 'normal',
        showtreeindent: true,
      };

      // simpan default ke DB
      await updateSettingsInDB(this.settings);
    }

    // baru render default settings
    this.initDefaultSettings();
  }

  async updateSetting(key, value) {
    if (!(key in this.settings)) return;

    if (typeof this.settings[key] === 'boolean') this.settings[key] = !!value;
    else this.settings[key] = String(value);

    this.callbacks.forEach(cb => cb(this.settings));

    const el = this.el.querySelector(`#${key}`);
    if (el) {
      if (el.type === 'checkbox') el.checked = !!this.settings[key];
      else el.value = this.settings[key];
    }

    // 🔹 simpan langsung ke directory
    await updateSettingsInDB(this.settings);
  }
  // ======= UI Builder =======
  onChange(callback) {
    this.callbacks.push(callback);
  }
  createSetting(label, inputElement) {
    const item = document.createElement('div');
    item.className = 'settings-item';

    const labelEl = document.createElement('span');
    labelEl.className = 'settings-name';
    labelEl.textContent = label;

    const handle = document.createElement('span');
    handle.className = 'settings-handle';
    handle.appendChild(inputElement);

    item.appendChild(labelEl);
    item.appendChild(handle);
    return item;
  }

  createSwitch(key) {
    const label = document.createElement('label');
    label.className = 'switch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!this.settings[key];
    input.id = key;

    const slider = document.createElement('span');
    slider.className = 'slider';

    input.addEventListener('change', () => {
      this.updateSetting(key, input.checked);
    });

    label.appendChild(input);
    label.appendChild(slider);
    return label;
  }

  createSelect(key, options, groups = false) {
    const select = document.createElement('select');
    select.className = 'form-select';
    select.id = key;

    if (groups) {
      for (const [groupLabel, opts] of Object.entries(options)) {
        const group = document.createElement('optgroup');
        group.label = groupLabel;
        opts.forEach(([val, text]) => {
          const opt = new Option(text, val, false, this.settings[key] === val);
          group.appendChild(opt);
        });
        select.appendChild(group);
      }
    } else {
      options.forEach(([val, text]) => {
        const opt = new Option(text, val, false, this.settings[key] === val);
        select.appendChild(opt);
      });
    }

    select.addEventListener('change', () => {
      this.updateSetting(key, select.value);
    });

    return select;
  }

  createInput(type, key) {
    const input = document.createElement('input');
    input.type = type;
    input.value = this.settings[key] || '';
    input.id = key;

    input.addEventListener('input', () => {
      this.updateSetting(key, input.value);
    });

    return input;
  }

  createButton(label, callback) {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = label;

    btn.addEventListener('click', e => {
      e.preventDefault();
      callback?.(this.settings);
    });

    return btn;
  }

  renderSection(title, items) {
    const section = document.createElement('section');

    const header = document.createElement('div');
    header.id = 'settings-label';
    header.textContent = title;

    section.appendChild(header);
    items.forEach(el => section.appendChild(el));
    return section;
  }

  addSection(name) {
    if (!this.sections[name]) this.sections[name] = [];
  }

  addSetting(section, config) {
    const { key, label, type, options, groups, onClick, element, onChange } =
      config;
    let input;

    if (type === 'custom' && element instanceof HTMLElement) {
      input = element;
    } else if (type === 'select') {
      input = this.createSelect(key, options, groups);
      if (onChange)
        input.addEventListener('change', () => onChange(this.settings));
    } else if (type === 'switch') {
      input = this.createSwitch(key);
      if (onChange)
        input
          .querySelector('input')
          .addEventListener('change', () => onChange(this.settings));
    } else if (['text', 'number', 'color'].includes(type)) {
      input = this.createInput(type, key);
      if (onChange)
        input.addEventListener('input', () => onChange(this.settings));
    } else if (type === 'button') {
      input = this.createButton(label, onClick);
    } else {
      throw new Error('Unknown setting type: ' + type);
    }

    const item = type === 'custom' ? input : this.createSetting(label, input);

    if (!this.sections[section]) this.addSection(section);

    this.sections[section].push(item);
  }

  initDefaultSettings() {
    // Appearance
    this.addSetting('appearance', {
      key: 'language',
      label: 'Language',
      type: 'select',
      options: [
        ['en', 'English'],
        ['id', 'Indonesia'],
        ['es', 'Español'],
        ['fr', 'Français'],
        ['de', 'Deutsch'],
        ['zh', '中文'],
        ['ja', '日本語'],
        ['ko', '한국어'],
        ['ru', 'Русский'],
        ['pt', 'Português'],
        ['hi', 'हिन्दी (Hindi)'],
      ],
    });

    this.addSetting('appearance', {
      key: 'theme',
      label: 'Theme',
      type: 'select',
      options: {
        'Light Themes': [
          ['one_light', 'One Light'],
          ['chrome', 'Chrome'],
          ['xcode', 'XCode'],
        ],
        'Dark Themes': [
          ['dracula', 'Dracula'],
          ['mirage', 'Mirage'],
          ['monokai', 'Monokai'],
          ['one_dark', 'One Dark'],
          ['github_dark', 'Github Dark'],
        ],
      },
      groups: true,
    });

    this.addSetting('appearance', {
      key: 'background',
      label: 'Background',
      type: 'select',
      options: [
        ['dark', 'Dark'],
        ['light', 'Light'],
        ['system', 'System'],
      ],
    });
    this.addSetting('appearance', {
      key: 'textSize',
      label: 'Text size',
      type: 'select',
      options: [
        ['14', 'small'],
        ['16', 'default'],
        ['18', 'large'],
        ['20', 'extra-large'],
      ],
    });

    this.addSetting('appearance', {
      key: 'nightMode',
      label: 'Night Mode',
      type: 'switch',
    });

    // Editor
    this.addSetting('editor', {
      key: 'autocomplete',
      label: 'Autocomplete',
      type: 'switch',
    });
    this.addSetting('editor', {
      key: 'showHints',
      label: 'Show Hints',
      type: 'switch',
    });
    this.addSetting('editor', {
      key: 'cursorStyle',
      label: 'Cursor Style',
      type: 'select',
      options: [
        ['ace', 'Default'],
        ['smooth', 'No Blink'],
        ['slim', 'Slim'],
      ],
    });

    // Tree View
    this.addSetting('tree-view', {
      key: 'showtreeindent',
      label: 'Show Tree Indent',
      type: 'switch',
    });
  }

  async render(root) {
    await this.init();
    if (!this.el.parentElement) {
      // render sections hanya sekali
      for (const [section, items] of Object.entries(this.sections)) {
        this.el.appendChild(this.renderSection(section, items));
      }
    }
    // append ke root jika belum ada
    if (!this.el.parentElement) root.appendChild(this.el);
    else root.appendChild(this.el); // reuse DOM
  }
}
