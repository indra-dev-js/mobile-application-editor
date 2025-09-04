import { addFilePaths, openDb } from '../db/indexeDb.js';
import { FileContentStorage } from '../db/FileContentStorage.js';
//import { Dom } from './dom.js';

window.icodex.editor.TabEditor = (() => {
  class TabEditor {
    constructor(wrapper, projectId) {
      this.container = wrapper;
      this.projectId = projectId; // simpan projectId
      this.ul = document.createElement('ul');
      this.ul.className = 'file-tab_content';
      this.container.appendChild(this.ul);
      this.dataNode = new WeakMap();
      this.tabs = [];
      //     if (this.ul) {
      //       this.ul.addEventListener('click', (e) => {
      //         const clicked = e.target
      //         if (clicked.closest('.file-tab_link')) {

      // }
      //       })
      //     }
    }

    async loadTabsFromIDB() {
      const db = await openDb();
      const tx = db.transaction('openedFilePaths', 'readonly');
      const store = tx.objectStore('openedFilePaths');
      const data = await store.get(this.projectId);
      return new Promise(resolve => {
        data.onsuccess = () => {
          if (data.result && Array.isArray(data.result.openedFilePaths)) {
            this.tabs = data.result.openedFilePaths.map(path => ({
              path,
              name: path.split('/').pop(),
            }));
            this.render(this.tabs);
          }
          resolve();
        };
      });
    }

    render(fileList) {
      this.tabs = fileList;
      this.ul.innerHTML = '';

      fileList.forEach(file => {
        const li = document.createElement('li');
        li.className = 'file-tab_items';
        li.dataset.path = file.path;

        const a = document.createElement('a');
        a.className = 'file-tab_link';

        const icon = document.createElement('i');
        icon.className = this.getIconClass(file.name);

        const span = document.createElement('span');
        span.className = 'file_name';
        span.textContent = file.name;

        a.appendChild(icon);
        a.appendChild(span);
        li.appendChild(a);
        this.ul.appendChild(li);

        a.addEventListener('click', async () => {
          this.focusTab(file.path);
          try {
            const contentBuffer = await FileContentStorage.getContent(
              file.path,
              this.projectId,
            );
            const text = new TextDecoder().decode(contentBuffer);

            window.icodex.root.mainWrapper.dispatchEvent(
              new CustomEvent('open-file', {
                detail: { content: text, type: file.name.split('.').pop() },
              }),
            );
          } catch (error) {
            throw error.message;
          }
        });
      });
    }

    getIconClass(filename) {
      const ext = filename.split('.').pop().toLowerCase();
      switch (ext) {
        case 'html':
          return 'devicon devicon-html5-plain colored';
        case 'css':
          return 'devicon devicon-css3-plain colored';
        case 'js':
          return 'devicon devicon-javascript-plain colored';
        default:
          return 'devicon devicon-file-plain';
      }
    }

    async addTab(file) {
      if (this.tabs.some(t => t.path === file.path)) return;
      this.tabs.push(file);
      this.render(this.tabs);
      await addFilePaths(this.projectId, file.path); // simpan ke IDB
    }

    closeTab(path) {
      this.tabs = this.tabs.filter(t => t.path !== path);
      this.render(this.tabs);
      // kalau mau sekalian hapus dari IDB juga, bisa tambahin di sini
    }

    focusTab(path) {
      this.ul.querySelectorAll('.file-tab_items').forEach(li => {
        li.classList.remove('active');
      });
      const activeLi = this.ul.querySelector(`[data-path="${path}"]`);
      if (activeLi) activeLi.classList.add('active');
    }
  }

  return TabEditor;
})();

export const setUpEditor = {
  mainApp: function mainApp() {
    const mainApp = document.createElement('div');
    const parentEditor = document.createElement('div');
    const editor = document.createElement('div');
    mainApp.className = 'main-app';
    parentEditor.className = 'editor';
    editor.id = 'editor';
    parentEditor.appendChild(editor);
    mainApp.append(parentEditor);
    window.icodex.root.app.appendChild(mainApp);

    return mainApp;
  },
};
Object.assign(window.icodex, setUpEditor);
window.icodex.editor.panelEditor = new (class AceEditor {
  constructor() {
    this._listenerAttached = false;
  }

  render() {
    if (!ace) return;
    setUpEditor.mainApp();
    const editor = ace.edit(document.getElementById('editor'));
    editor.setTheme('ace/theme/dracula');
    editor.setOptions({
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,
      enableSnippets: true,
      wrap: true,
      animatedScroll: 0,
      scrollSpeed: 2,
    });

    // Pasang listener cuma sekali
    if (!this._listenerAttached) {
      window.icodex.root.mainWrapper.addEventListener('open-file', e => {
        const fileType = e.detail.type;
        const extMap = {
          js: 'javascript',
          css: 'css',
          htm: 'html',
          html: 'html',
          tsx: 'typescript',
          ts: 'typescript',
          scss: 'scss',
          php: 'php',
          json: 'json',
          json5: 'json5',
          xml: 'xml',
        };
        const mode = extMap[fileType]
          ? 'ace/mode/' + extMap[fileType]
          : 'ace/mode/text';
        editor.session.setMode(mode);
        editor.session.setUseWorker(true);
        editor.session.setValue(e.detail.content || '', -1);
      });
      this._listenerAttached = true;
    }

    editor.session.setTabSize(4);
    editor.session.setUseSoftTabs(false);
    const size = 14;
    const lineHeight = size * 1.5;
    editor.setOption('scrollPastEnd', 0.75);
    editor.setFontSize(size);
    editor.renderer.lineHeight = lineHeight;
    editor.renderer.updateFontSize();
  }
})();

window.icodex.editor.panelEditor = new (class AceEditor {
  constructor() {
    this._listenerAttached = false;
    this.editor = null;
  }

  render() {
    // Bersihkan editor lama jika ada
    if (this.editor) {
      this.editor.destroy();
      this.editor.container.remove();
      this.editor = null;
    }

    // Buat container baru
    const mainApp = setUpEditor.mainApp();
    const editorEl = document.getElementById('editor');

    // Buat instance baru
    this.editor = ace.edit(editorEl);
    this.editor.setTheme('ace/theme/dracula');
    this.editor.setOptions({
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,
      enableSnippets: true,
      wrap: true,
      animatedScroll: 0,
      scrollSpeed: 2,
    });

    // Pasang listener hanya sekali
    if (!this._listenerAttached) {
      window.icodex.root.mainWrapper.addEventListener('open-file', e => {
        const fileType = e.detail.type;
        const extMap = {
          js: 'javascript',
          css: 'css',
          htm: 'html',
          html: 'html',
        };
        const mode = extMap[fileType]
          ? 'ace/mode/' + extMap[fileType]
          : 'ace/mode/text';
        this.editor.session.setMode(mode);
        this.editor.session.setUseWorker(true);
        this.editor.session.setValue(e.detail.content || '', -1);
      });
      this._listenerAttached = true;
    }

    // Konfigurasi tambahan
    this.editor.session.setTabSize(4);
    this.editor.session.setUseSoftTabs(false);
    const size = 14;
    const lineHeight = size * 1.5;
    this.editor.setOption('scrollPastEnd', 0.75);
    this.editor.setFontSize(size);
    this.editor.renderer.lineHeight = lineHeight;
    this.editor.renderer.updateFontSize();
  }

  destroy() {
    if (this._onOpenFile) {
      window.icodex.root.mainWrapper.removeEventListener(
        'open-file',
        this._onOpenFile,
      );
      this._onOpenFile = null;
    }
    this._listenerAttached = false;

    if (this.editor) {
      this.editor.destroy();
      this.editor.container.remove();
      this.editor = null;
    }
  }
})();

var icodex = window.icodex;
export { icodex };
