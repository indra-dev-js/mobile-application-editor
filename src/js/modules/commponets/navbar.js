import { Dom, buildDOMTree, EventRegistry } from './dom.js';
import { Breadcrumb } from './breadcrumb.js';
// import { icodex } from './page.js';

const $eventRegistry = callBack => {};
// bikin sekali aja, global

// window.icodex.router.in("editor", function () {
//   alert()
// })

const components = {
  pagination: {},
  paginationButtons: {},
};

function paginatinItem() {
  const paginationButtons = buildDOMTree(
    [
      'fragment',
      [
        'span',
        { 'aria-label': 'btn', role: 'button', class: 'btn', key: 'btnPrev' },
        ['i', { class: 'icodex icodex-arrow-left' }],
      ],
      [
        'span',
        { 'aria-label': 'btn', role: 'button', class: 'btn', key: 'btnNext' },
        ['i', { class: 'icodex icodex-arrow-right' }],
      ],
    ],
    components.paginationButtons,
  );
  components.pagination.appendChild(paginationButtons);
}
Object.assign(window.icodex.editor, components);

export class Navbar {
  title = icodex.page.title || 'home';

  constructor(page, appendTo) {
    this.page = page;
    this.currentFilePath = '';
    this.el = document.createElement('div');
    this.childEl = document.createElement('div');
    this.el.className = 'navbar';
    this.childEl.className = 'container';
    this.el.appendChild(this.childEl);
    if (!this.el.isConnected) {
      appendTo.appendChild(this.el);
    }
  }
  set pageTitle(v) {
    this.title = v;
  }
}

Navbar.prototype.render = function render() {
  if (typeof this.page === 'string' && this.page === 'editor') {
    this.editor();
  } else if (this.page === 'home') {
    this.home();
  } else {
    console.error(new ReferenceError(`Error: "${this.page}" is not defined`));
    return false;
  }

  return this.el;
};
let state = false; // status awal drawer tertutup

Navbar.prototype.home = function () {
  // Dengarkan event drawer ditutup dari backdrop
  // document.addEventListener('drawer-closed-by-backdrop', () => {
  //   state = false; // pastikan toggle kembali sinkron
  // });
  // Dengarkan event drawer ditutup dari backdrop
  EventRegistry.listen(
    window,
    'drawer-closed-by-backdrop',
    () => (state = false),
  );

  return new Dom(
    [
      {
        name: 'span',
        attr: [
          {
            class: 'btn toggler-menu',
            type: 'button',
            role: 'button',
            'tab-index': 0,
          },
        ],
        children: [
          {
            name: 'i',
            attr: [{ class: 'bi bi-list' }],
            events: {
              click: e => {
                state = !state; // toggle nilai state

                // Dispatch event drawer

                EventRegistry.register(window, 'open-drawer', {
                  isOpen: state,
                });
              },
            },
          },
        ],
      },
      {
        name: 'span',
        meta: this.title,
        attr: [
          {
            class: 'page-title',
          },
        ],
      },
    ],
    this.childEl,
  );
};

Navbar.prototype.togglerGroupItem = function () {
  const classIcon = [
    'icodex icodex-search-2',
    'tb tb-player-play-filled',
    'icodex icodex-sidebar-expand',
  ];

  const fragment = document.createDocumentFragment();

  for (let i = 0; i < classIcon.length; i++) {
    // Buat <span> dengan class "btn"
    const span = document.createElement('span');
    span.className = 'btn';
    span.setAttribute('aria-label', 'btn');
    span.setAttribute('role', 'button');
    span.id = 'data' + i;
    if (i === 0) span.classList.add('btn-search');
    if (i === 1) span.classList.add('btn-run');
    // Tambahkan class tambahan hanya untuk elemen terakhir
    if (i === classIcon.length - 1) {
      span.classList.add('d-[none]', 'md:d-[inline-flex]');
    }

    // Buat <i> dengan class dari classIcon[i]
    const icon = document.createElement('i');
    icon.className = classIcon[i];

    // Masukkan <i> ke dalam <span>
    span.appendChild(icon);

    // Masukkan <span> ke dalam fragment
    fragment.appendChild(span);
  }

  return fragment;
};
Navbar.prototype.togglerGroup = function () {
  return this.togglerGroupItem(); // cukup return fragment
};

// Pasang listener global sekali saja
if (!window._breadcrumbListenerAttached) {
  const mainWrapper = document.getElementById('mainWrapper');
  mainWrapper.addEventListener('update-breadcrumb', e => {
    const breadcrumbEl = document.getElementById('breadcrumb1');
    if (breadcrumbEl) {
      const path = e.detail.path;
      sessionStorage.setItem('currentActiveFile', path);
      breadcrumbEl.innerHTML = '';
      breadcrumbEl.appendChild(new Breadcrumb(path).render());
    }
  });
  window._breadcrumbListenerAttached = true;
}
Navbar.prototype.editor = function () {
  // const path = window.Cache?.recentPath || null;
  // console.log('Path aktif:', path);

  // Fetch path dari IndexedDB lalu render breadcrumb

  // Buat DOM editor navbar
  new Dom(
    [
      {
        name: 'span',
        attr: [
          {
            class: 'btn toggler-menu',
            type: 'button',
            role: 'button',
            'tab-index': 0,
          },
        ],
        children: [
          {
            name: 'i',
            attr: [{ class: 'bi bi-list' }],

            events: {
              click: () => {
                state = !state;

                EventRegistry.register(window, 'open-drawer', {
                  isOpen: state,
                });
                // document.dispatchEvent(send);
              },
            },
          },
        ],
      },
      {
        name: 'div',
        attr: [
          {
            class: 'pagination-tab d-[none] md:d-[flex]',
            id: 'pagination-editor',
          },
        ],
      },
      {
        name: 'ul',
        attr: [{ class: 'breadcrumb', id: 'breadcrumb1' }],
      },
    ],

    this.childEl,
  );

  components.pagination = document.getElementById('pagination-editor');
  paginatinItem();
  this.childEl.appendChild(this.togglerGroup());

  const breadcrumbEl = this.childEl.querySelector('#breadcrumb1');
  // 1. Muat path dari sessionStorage saat halaman dimuat
  // const savedPath = sessionStorage.getItem('currentActiveFile');
  // if (savedPath) {
  //   breadcrumbEl.appendChild(new Breadcrumb(savedPath).render());
  // } else {
  //   // Jika tidak ada path tersimpan, gunakan default path
  //   breadcrumbEl.appendChild(new Breadcrumb('page/welcome/unitiled').render());
  // }

  // window.addEventListener(
  //   'update-breadcrumb',
  //   e => {
  //     const path = e.detail.path;
  //     sessionStorage.setItem('currentActiveFile', path);
  //     breadcrumbEl.innerHTML = ''; // Kosongkan breadcrumb sebelum render ulang
  //     breadcrumbEl.appendChild(new Breadcrumb(path).render());
  //   },
  //   { once: false },
  // );

  const savedPath = sessionStorage.getItem('currentActiveFile');
  breadcrumbEl.innerHTML = '';
  breadcrumbEl.appendChild(
    new Breadcrumb(savedPath || 'page/welcome/unitiled').render(),
  );
};

const main = document.getElementById('app');

// Pasang listener hanya sekali
