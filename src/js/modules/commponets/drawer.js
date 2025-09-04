import { LangText } from '../utils/language.js';

import { SwipeSidebar } from '../utils/swipe-sidebar.js';
import { getPlatform } from '../utils/getPlatform.js';
import { EventRegistry } from './dom.js';
import { TreeView } from './treeview.js';
import { getProjectTree } from '../db/db.js';
import { subscribeSettings } from './pref.js';
window.icodex ??= window.icodex || {};
const workerUrl = () => {
  const workerScript = `self.onmessage = (event) => {
  const data = event.data;
  if (!Array.isArray(data)) {
    self.postMessage({ 
      type: "log", 
      message: "Data bukan array, worker dibatalkan.", 
      data 
    });
    return;
  }

  self.postMessage({ 
    type: "log", 
    message: "Menerima data", 
    data 
  });

  const structured = data.map(item => ({
    ...item,
    processed: true
  }));
console.log(structured)
  self.postMessage({ type: "result", data: structured });
};
`;
  const blob = new Blob([workerScript], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
};

Object.assign(icodex, { currentProject: null });
Object.assign(window.icodex, {
  treeview: (data = []) => new TreeView(data),
});

class Drawer {
  constructor() {
    this.tree = new TreeView([]);
    this.counter = 1;

    this.drawerEl = null;
    this.overlay = null;
    this.swipeControl = null;
    this.target = null;
  }

  render(container) {
    this.container = container;

    this.drawerEl = this.#createEl(
      'div',
      { class: 'file_explorer-drawer', id: 'drawer' },
      [
        this.#createEl('div', { class: 'drawer-header' }, [
          this.#createDrawerTab(),
        ]),
        this.#createEl('div', { class: 'flex-1' }, [this.#createDrawerBody()]),
      ],
    );

    const existingElement = this.container.querySelector('#app');
    if (existingElement) {
      this.container.insertBefore(this.drawerEl, existingElement);
    } else {
      this.container.appendChild(this.drawerEl);
    }

    this.target = this.drawerEl.querySelector('#drawer-body');
    this.tree.treeParentNode = this.target;

    // **Hanya buat overlay di mobile**
    const platform = getPlatform();
    if (platform === 'Android' || platform === 'iOS') {
      this.overlay = this.#createEl('div', {
        class: 'drawer-backdrop',
        id: 'backdrop1',
      });
      document.body.appendChild(this.overlay);
      this.swipeControl = new SwipeSidebar({
        sidebar: this.drawerEl,
        overlay: this.overlay,
      });
    }

    window.swipeControl = this.swipeControl ?? null;

    this.#setupShortcuts();
    this.#bindEvents();

    const projectPath = localStorage.getItem('currentProjectPath');
    if (projectPath) {
      (async () => {
        const tree = await getProjectTree(projectPath);
        this.renderProjectTree(tree);
      })();
    } else {
      this.fallback();
    }

    return this.drawerEl;
  }

  // 🔹 helper bikin element
  #createEl(tag, attr = {}, children = [], events = {}) {
    const el = document.createElement(tag);

    Object.entries(attr).forEach(([k, v]) => el.setAttribute(k, v));
    Object.entries(events).forEach(([evt, handler]) =>
      el.addEventListener(evt, handler),
    );

    children.forEach(child => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child);
      }
    });

    return el;
  }

  // 🔹 drawer tab
  #createDrawerTab() {
    const makeBtn = (iconClass, aria, onClick) =>
      this.#createEl(
        'button',
        { 'aria-label': aria, class: 'btn' },
        [this.#createEl('i', { class: iconClass })],
        onClick ? { click: onClick } : {},
      );

    return this.#createEl('div', { class: 'drawer-tab' }, [
      makeBtn('icodex icodex-paper-airplane', 'editor', () =>
        icodex.router.navigate('editor'),
      ),
      makeBtn('icodex icodex-file-directory', 'home', () =>
        icodex.router.navigate('home'),
      ),
      makeBtn('icodex icodex-codescan', 'scan', () =>
        icodex.router.navigate('pref'),
      ),
      makeBtn('icodex icodex-git-branch', 'branch'),
      makeBtn('icodex icodex-person', 'profile'),
    ]);
  }

  // 🔹 drawer body kosong
  #createDrawerBody() {
    return this.#createEl('div', { class: 'drawer-body', id: 'drawer-body' });
  }

  // 🔹 fallback UI kalau ga ada project
  fallback() {
    const message = this.#createEl('p', { class: 'fallback-message' }, [
      new LangText({
        id: 'Tidak ada folder proyek yang dibuka.\nSilakan buka folder dari perangkat Anda untuk memulai.',
        en: 'No folder is currently opened.\nPlease open a folder from your device to get started.',
        zh: '当前未打开任何文件夹。\n请从您的设备打开一个文件夹以开始使用。',
        ko: '현재 열린 폴더가 없습니다.\n시작하려면 기기에서 폴더를 열어주세요.',
        hi: 'कोई फ़ोल्डर अभी खुला नहीं है।\nशुरू करने के लिए कृपया अपने डिवाइस से एक फ़ोल्डर खोलें।',
      }).getText(),
    ]);

    const button = this.#createEl(
      'button',
      { class: 'btn primary', 'aria-label': 'Open Folder', type: 'button' },
      ['Buka Folder'],
      {
        click: () => {
          if (window.Android?.openFolderPicker) {
            Android.openFolderPicker();
          } else {
            console.log('Fungsi openFolderPicker tidak tersedia.');
          }
        },
      },
    );

    const group = this.#createEl('div', { class: 'button-group' }, [
      message,
      button,
    ]);

    if (this.target) {
      this.target.innerHTML = '';
      this.target.appendChild(group);
    }
  }

  // 🔹 render ke container

  // 🔹 render ulang TreeView
  async renderProjectTree(projectData) {
    if (!this.target) return;
    globalThis.codeRoomX.debug = true;
    globalThis.codeRoomX.print.warn(
      `[ renderProjectTree ] - dipanggil: ${this.counter++} kali`,
    );

    this.target.innerHTML = '';

    const worker = new Worker(workerUrl(), { type: 'module' });

    worker.postMessage([projectData]);

    worker.onmessage = e => {
      if (e.data.type === 'result') {
        console.log(e.data);
        this.tree.data = e.data.data;
        const newDom = this.tree.renderTree();
        this.target.appendChild(newDom);
        icodex.treeview = this.tree;

        window.dispatchEvent(
          new CustomEvent('treeViewReady', {
            detail: { treeview: icodex.treeview },
          }),
        );
        worker.terminate();
      }
    };

    worker.onerror = err => {
      console.error('Worker error:', err);
      this.tree.data = [projectData];
      this.target.appendChild(this.tree.renderTree());
      worker.terminate();
    };
  }

  // 🔹 event binding
  #bindEvents() {
    this.container.addEventListener('data-project', async e => {
      const { tree } = e.detail;

      if (!tree) return;

      this.renderProjectTree(tree);
      localStorage.setItem('currentProjectPath', tree.path);
    });

    this.container.addEventListener('auto-open-latest-project', async e => {
      const latest = e.detail;

      this.renderProjectTree(latest);
      localStorage.setItem('currentProjectPath', latest.path);
    });

    // toggle drawer via custom event
    EventRegistry.listen(window, 'open-drawer', () => {
      if (this.swipeControl) {
        // mode mobile pakai SwipeSidebar
        if (this.swipeControl.isOpen()) {
          this.swipeControl.close();
        } else {
          this.swipeControl.open();
        }
      } else {
        // mode desktop: toggle class manual
        this.drawerEl.classList.toggle('open');
        this.container.classList.toggle('open');
      }
    });
    //     document.addEventListener('open-drawer', () => {

    //       //shortcut
    //       //   const openWithShortcut = (e) => {
    //       // const key = e.key.toLowerCase(); // pake e.key biar dapet huruf
    //       // if (key === "b" && e.ctrlKey) { // contoh Ctrl+B
    //       //   this.drawerEl.classList.toggle("open");
    //       //   this.container.classList.toggle("open");
    //       // }

    // });
  }

  // 🔹 keyboard shortcut Ctrl+B
  #setupShortcuts() {
    const isSupported = ['Windows', 'macOS'].includes(getPlatform());

    if (isSupported) {
      document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key.toLowerCase() === 'b') {
          e.preventDefault();
          if (this.swipeControl && this.swipeControl.isOpen()) {
            this.swipeControl.close();
          } else if (this.swipeControl) {
            this.swipeControl.open();
          } else {
            // fallback desktop toggle class
            this.drawerEl.classList.toggle('open');
            this.container.classList.toggle('open');
          }
        }
      });

      // auto buka drawer di desktop
      if (!this.container.classList.contains('open')) {
        this.drawerEl.classList.add('open');
        this.container.classList.add('open');
      }
    }
  }
}

export { Drawer };
