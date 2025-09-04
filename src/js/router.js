// // import '../assets/css/app.css';
// // import '../assets/css/ace-autocomplite.css';
// // import '../assets/css/ace-ayu-mirage.css';
// // import '../assets/css/dracula.css';
// // import '../assets/icon/codicon.css';
// // import '../assets/icon/bundle-icon-ui.css';
// // import '../assets/icon/devicon.min.css';
// // import '../assets/icon/tabler-icons.css';
// // import '../assets/icon/bootstrap-icons.min.css';
// // import '../assets/icon/jsdenticon.js';
// export class Router {
//   constructor(root) {
//     this.root = document.getElementById(root) || root;

//     // Perbaikan #1: Inisialisasi lastProjectOpenedId dari sessionStorage saat pertama kali
//     const storedId = sessionStorage.getItem('lastProjectOpenedId');
//     this.lastProjectOpenedId = storedId ? String(storedId) : null;

//     // Gunakan pId untuk menyimpan id dari localStorage sebagai fallback atau default
//     this.pId = localStorage.getItem('currentProjectId');
//     this.pId = this.pId ? String(this.pId) : null;

//     window.addEventListener('popstate', this.handleUrlChange.bind(this));
//     window.addEventListener('hashchange', this.handleUrlChange.bind(this));

//   }

//   navigate(page, id = null) {
//     // Perbaikan #2: Ubah default ID menjadi null
//     if (page.startsWith('/')) page = page.slice(1);

//     const url = location.pathname + '#' + page;
//     history.pushState({ page, id }, '', url);

//     // Perbaikan #3: Hanya simpan jika ID valid
//     if (id !== null) {
//       this.lastProjectOpenedId = id;
//       sessionStorage.setItem('lastProjectOpenedId', String(id));
//       localStorage.setItem('currentProjectPath', String(id));
//     }

//     this.handleUrlChange();
//   }

//   handleUrlChange() {
//     let page = (history.state && history.state.page) || location.hash.slice(1);

//     if (!page) page = 'home';

//     const idFromState =
//       history.state && history.state.id ? String(history.state.id) : null;
//     const currentId = idFromState || this.lastProjectOpenedId || this.pId;

//     if (!window.icodex) window.icodex = {};
//     if (!window.icodex.page) window.icodex.page = {};
//     window.icodex.page.type = page;

//     if (!this.root) return;

//     this, (this.root.innerHTML = '');
//     if (page === 'editor') {

//       // Perbaikan #4: Gunakan ID yang sudah divalidasi

//       if (currentId === null) {
//         console.warn('[Router] : Tidak ada ID proyek yang tersimpan.');
//         const welcomePage = document.createElement('div');
//         welcomePage.innerHTML = `
//       <div class="editor-group-watermark">
//       <div class="watermark-box">
//       </div>
//       </div>
//     `;
//         this.root.append(welcomePage);
//         return;
//       }

//       // Menggunakan ID yang sudah divalidasi
//       // const tab = new icodex.editor.TabEditor(tabEl, currentId);

//       // async function loadTab() {
//       //   await tab.loadTabsFromIDB();
//       // }

//       // loadTab();

//       // icodex.editor.panelEditor.render()

//     } else if (page === 'home') {
//       /*new Navbar('home', this.root).render();
//       new HomePage().render(this.root);*/
//     } else {
//       const el = document.createElement('div');
//       el.textContent = `Halaman "${page}" tidak ditemukan.`;
//       this.root.appendChild(el);
//     }
//         window.dispatchEvent(
//       new CustomEvent('pagechange', { detail: { page, id: currentId } }),
//     );

//   }

//   inPage(page, callback) {
//     window.addEventListener('pagechange', (e) => {
//       if (e.detail.page === page) {
//         callback(e.detail)
//       }
//     })
//   }

//   start() {
//     this.handleUrlChange();
//   }
// }

export class Router {
  constructor(root) {
    this.root = document.getElementById(root) || root;

    // simpan routes sebagai peta { page: callback }
    this.routes = {};

    // ambil state terakhir dari storage
    const storedId = sessionStorage.getItem('lastProjectOpenedId');
    this.lastProjectOpenedId = storedId ? String(storedId) : null;
    this.pId = localStorage.getItem('currentProjectId');
    this.pId = this.pId ? String(this.pId) : null;

    window.addEventListener('popstate', this.handleUrlChange.bind(this));
    window.addEventListener('hashchange', this.handleUrlChange.bind(this));
  }

  /**
   * Registrasi halaman baru
   * @param {string} page nama halaman (tanpa #)
   * @param {Function} renderFn function render(root, id)
   */
  addRoute(page, renderFn) {
    this.routes[page] = renderFn;
    return this; // biar bisa chaining
  }

  navigate(page, id = null) {
    if (page.startsWith('/')) page = page.slice(1);

    const url = location.pathname + '#' + page;
    history.pushState({ page, id }, '', url);

    if (id !== null) {
      this.lastProjectOpenedId = id;
      sessionStorage.setItem('lastProjectOpenedId', String(id));
      localStorage.setItem('currentProjectPath', String(id));
    }

    this.handleUrlChange();
  }

  handleUrlChange() {
    let page = (history.state && history.state.page) || location.hash.slice(1);
    if (!page) page = 'home';

    const idFromState =
      history.state && history.state.id ? String(history.state.id) : null;
    const currentId = idFromState || this.lastProjectOpenedId || this.pId;

    if (!window.icodex) window.icodex = {};
    if (!window.icodex.page) window.icodex.page = {};
    window.icodex.page.type = page;

    if (!this.root) return;

    // clear root
    this.root.innerHTML = '';

    // cek apakah ada route terdaftar
    if (this.routes[page]) {
      this.routes[page](this.root, currentId);
    } else {
      // fallback page not found
      const el = document.createElement('div');
      el.textContent = `Halaman "${page}" tidak ditemukan.`;
      this.root.appendChild(el);
    }

    // dispatch event global
    window.dispatchEvent(
      new CustomEvent('pagechange', { detail: { page, id: currentId } }),
    );
  }

  inPage(page, callback) {
    window.addEventListener('pagechange', e => {
      if (e.detail.page === page) callback(e.detail);
    });
  }

  start() {
    this.handleUrlChange();
  }
}
