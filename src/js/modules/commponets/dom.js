export const EventRegistry = {
  listen(target, name, handler) {
    if (!target.__eventRegistry) target.__eventRegistry = {};

    // 🔹 kalau event ini belum ada, buat 1 dispatcher saja
    if (!target.__eventRegistry[name]) {
      const handlers = new Set();

      // simpan dispatcher tunggal
      const dispatcher = e => {
        handlers.forEach(fn => fn(e));
      };

      target.__eventRegistry[name] = { handlers, dispatcher };

      // pasang cuma sekali
      target.addEventListener(name, dispatcher);
    }

    // daftar handler (inline pun bisa)
    target.__eventRegistry[name].handlers.add(handler);
  },

  unlisten(target, name, handler) {
    const entry = target.__eventRegistry?.[name];
    if (entry) {
      entry.handlers.delete(handler);
    }
  },

  register(target, name, detail) {
    target.dispatchEvent(new CustomEvent(name, { detail }));
  },
};
document.body.className = "show-indent"
if (typeof globalThis.codeRoomX === 'undefined') {
  Object.defineProperty(globalThis, 'codeRoomX', {
    value: {},
    writable: false,
    enumerable: true,
    configurable: false,
  });
}

Object.defineProperty(codeRoomX, 'debug', {
  value: false,
  writable: true,
  enumerable: false,
  configurable: false,
  set debug(_value = false) {
    this.debug = _value;
  },
  get debug() {
    return this.debug;
  },
});

Object.defineProperty(codeRoomX, 'print', {
  value: {},
  writable: false,
  enumerable: true,
  configurable: false,
});
Object.defineProperties(codeRoomX.print, {
  log: {
    value: function log(message = '') {
      if (!codeRoomX.debug) return;
      if (message === '') return;

      return console.log(message);
    },
    configurable: false,
    writable: false,
    enumerable: true,
  },
  err: {
    value: function err(message = '') {
      if (!codeRoomX.debug) return;
      if (message === '') return;
      return console.error(message);
    },
    configurable: false,
    writable: false,
    enumerable: true,
  },
  debug: {
    value: function debug(message = '') {
      if (!codeRoomX.debug) return;
      if (message === '') return;

      return console.debug(message);
    },

    configurable: false,
    writable: false,
    enumerable: true,
  },
  warn: {
    value: function warn(message = '') {
      if (!codeRoomX.debug) return;
      if (message === '') return;
      return console.warn(message);
    },
    configurable: false,
    writable: false,
    enumerable: true,
  },
});
Object.defineProperty(globalThis.codeRoomX, 'meta', {
  value: {},
  writable: false,
  configurable: false,
  enumerable: true,
});

class UI {
  constructor(tagName) {
    try {
      if (typeof tagName === 'undefined') {
        const customError = new Error(
          "Failed to execute 'build' on 'Document': 1 argument required, but only 0 present.",
        );
        throw customError;
      } else {
        this.el = document.createElement(tagName);
      }
    } catch (e) {
      throw e;
    }
  }

  setClass(classCss = {}) {
    for (var key in classCss) {
      this.el[key] = classCss[key];
    }
    return this;
  }

  text(content = '') {
    this.el.textContent = content;
    return this;
  }
  appendTo(target) {
    if (!target instanceof HTMLElement) {
      return;
    }
    target.append(this.el ? this.el : '');
    return this;
  }
  append(child) {
    if (!child instanceof HTMLElement) {
      return;
    }
    this.el.append(child ? child : '');
    return this;
  }
}
let div = new UI('div')
  .setClass({ className: 'bg-blue-500' })
  .text('Content:').el;
let content = new UI('h1').text('text content').appendTo(div).el;

//a.css is not function

//a.setClass('bg-red text-sm fw-500')

//document.createElement()

window.icodex = window.icodex || {};
window.icodex.editor = {};
window.icodex.root = {};

codeRoomX.debug = false;

export function buildDOMTree(nodeArray, refs = {}) {
  let el;

  // Buat elemen atau fragment
  if (nodeArray[0] === 'fragment' || nodeArray[0] === null) {
    el = document.createDocumentFragment();
  } else {
    el = document.createElement(nodeArray[0]);
  }

  // Proses atribut
  if (typeof nodeArray[1] === 'object' && !Array.isArray(nodeArray[1])) {
    for (const [key, value] of Object.entries(nodeArray[1])) {
      if (key === 'key') {
        refs[value] = el; // simpan berdasarkan key
      } else if (key === 'id') {
        el.id = value;
        refs[value] = el; // simpan berdasarkan id juga
      } else if (key in el) {
        el[key] = value; // properti langsung (onclick, textContent, dll)
      } else {
        el.setAttribute(key, value); // atribut HTML biasa
      }
    }
  }

  // Tentukan index awal children
  const startIndex =
    typeof nodeArray[1] === 'object' && !Array.isArray(nodeArray[1]) ? 2 : 1;

  // Tambahkan children
  for (let i = startIndex; i < nodeArray.length; i++) {
    const child = nodeArray[i];
    if (Array.isArray(child)) {
      el.appendChild(buildDOMTree(child, refs)); // rekursif
    } else {
      el.appendChild(document.createTextNode(child));
    }
  }

  return el;
}

// function pushToRef(refs, target, nodeArray) {
//   if (!refs[target]) {
//     console.warn(`Ref '${target}' tidak ditemukan.`);
//     return;
//   }
//   refs[target].appendChild(buildDOMTree(nodeArray, refs));
// }
export function pushToRef(refs, target, nodeArray) {
  if (!refs[target]) {
    console.warn(`Ref '${target}' tidak ditemukan.`);
    return;
  }

  // Build elemen baru (otomatis daftar ke refs kalau ada key/id)
  const newEl = buildDOMTree(nodeArray, refs);

  // Masukkan ke parent target
  refs[target].appendChild(newEl);
}

document.body.append(
  buildDOMTree(
    ['div', { id: 'mainWrapper', className: 'main' }],
    window.icodex.root,
  ),
);

// pushToRef(icodex.root, 'mainWrapper', ['h1'])

export class Dom {
  elements = [];

  constructor(data = [], container) {
    this.data = data;
    this.container = container;

    this.data.forEach(tag => {
      const el = document.createElement(tag.name);

      // Set atribut (class, id, style, dll)
      if (tag.attr && Array.isArray(tag.attr)) {
        tag.attr.forEach(attr => {
          for (const key in attr) {
            el.setAttribute(key, attr[key]);
          }
        });
      }

      if (tag.appendChild) {
        el.appendChild(tag.appendChild);
      }

      if (tag.meta) {
        el.textContent = tag.meta;
      }
      // Tambah event listener dari tag.events
      if (tag.events && typeof tag.events === 'object') {
        for (const eventName in tag.events) {
          el.addEventListener(eventName, tag.events[eventName], { once: 0 });
        }
      }

      // Tambahkan ke container
      this.container.appendChild(el);
      this.elements.push(el);

      // Set isi teks dari "meta" jika ada
      // Rekursif jika ada children
      if (tag.children && Array.isArray(tag.children)) {
        new Dom(tag.children, el);
      }
    });
  }
}

pushToRef(window.icodex.root, 'mainWrapper', [
  'div',
  {
    key: 'app',
    id: 'app',
    className: 'content-right',
  },
]);

import { Router } from '../../router.js';

Object.assign(window.icodex, {
  editor: {
    TabEditor: {},
    editorWrapper: {},
    panelEditor: {},
  },
  wrapper: {
    tab: document.createElement('nav'),
  },
});

const router = new Router(window.icodex.root.app);
window.icodex.router = router;
// const appNode = document.querySelector('#app');
// const drawerNode = document.querySelector('#drawer');
//const parentNode = appNode.parentNode; // Ambil elemen induk dari #app

// Pindahkan #drawer sebelum #app
//parentNode.insertBefore(drawerNode, appNode);

export function createElement(tag, attrs = {}) {
  const el = document.createElement(tag);
  for (const key in attrs)
    key in el ? (el[key] = attrs[key]) : el.setAttribute(key, attrs[key]);
  return el;
}
window.icodex.root.mainWrapper.dataset.showIndentTree = true;
//export var icodex = window.icodex;
//
// import { renderDialog } from './commponents/dialog.js';
