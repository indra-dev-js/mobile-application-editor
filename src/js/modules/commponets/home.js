import { CustomDialog } from './dialog.js';
import  '../../../assets/icon/jsdenticon.js';
import { addProject, getAllProjects, getProjectById } from '../db/indexeDb.js';

import {
  db,
  removeDirectory,
  randomCode,
  addDirectory,
  createNewProject,
  removeProject,
  findProject,
  getProjectTree,
  getAllProject,
  getLatestProject,
} from '../db/db.js';

//import { loadAllProjects } from '../db/projectLoader.js'; // yang baru dibuat
import { LangText } from '../utils/language.js';

export class RelativeTimeUpdater {
  static start(selector = '.timestamp') {
    document.querySelectorAll(selector).forEach(el => {
      const time = el.dataset.time;
      if (time) el.textContent = getHumanTime(Number(time));
    });

    setInterval(() => {
      document.querySelectorAll(selector).forEach(el => {
        const time = el.dataset.time;
        if (time) el.textContent = getHumanTime(Number(time));
      });
    }, 60000); // setiap 60 detik
  }
}

export function getHumanTime(createdAt) {
  const now = Date.now();
  const time =
    typeof createdAt === 'number' ? createdAt : new Date(createdAt).getTime();
  const diff = now - time;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (seconds < 10) return 'baru saja';
  if (seconds < 60) return `${seconds} detik yang lalu`;
  if (minutes === 1) return '1 menit yang lalu';
  if (minutes < 60) return `${minutes} menit yang lalu`;
  if (hours === 1) return '1 jam yang lalu';
  if (hours < 24) return `${hours} jam yang lalu`;
  if (days === 1) return 'kemarin';
  if (days < 7) return `${days} hari yang lalu`;
  if (days < 30) return `${Math.floor(days / 7)} minggu yang lalu`;
  if (days < 365) return `${Math.floor(days / 30)} bulan yang lalu`;
  return `${Math.floor(days / 365)} tahun yang lalu`;
}

const projectState = {
  recentFilePaths: [],
  openedFilePaths: [],
  unpinnedTabs: [],
  source: 'user',
  currentFilePath: 'main.js',
};
async function addProjectRegistry(finalName) {
  await addDirectory('idb/' + finalName);

  // Ambil record registry lama (1 record aja)
  let registryRecord = await db.data.where('fid').equals('utf8').first();

  let projectRegistry = [];
  if (registryRecord && registryRecord.text) {
    try {
      projectRegistry = JSON.parse(registryRecord.text);
      if (!Array.isArray(projectRegistry)) {
        projectRegistry = [];
      }
    } catch {
      projectRegistry = [];
    }
  }

  // Push project baru
  projectRegistry.push({
    dir: 'idb/' + finalName,
    git: false,
    modifiedAt: Date.now(),
  });

  // Kalau record sudah ada → update
  if (registryRecord) {
    await db.data.update(registryRecord.id, {
      text: JSON.stringify(projectRegistry),
    });
  } else {
    // Kalau belum ada → buat baru
    await db.data.add({
      encoding: 'utf8',
      fid: randomCode(26),
      text: JSON.stringify(projectRegistry),
    });
  }
}

export class HomePage {
  // Deklarasi properti di awal kelas
  addprojectDialog = null;
  ul = null;
  scroller = null;
  data = null;
  projects = null;
  projectCount = 0;
  constructor() {
    this.#setupDialog();
  }

  #setupDialog() {
    this.addprojectDialog = new CustomDialog(
      new LangText({
        id: 'proyek baru',
        en: 'new project',
      }).getText(),
      document.getElementById('dialog-wrapper'),
    );
    // Menangani aksi tombol "OK" pada dialog
    this.addprojectDialog.buttonPositive.button.onclick = async () => {
      const projectName = this.addprojectDialog.input.value.trim();
      if (!projectName) {
        return;
      }

      const allProjects = await getAllProject(); //versi lama
      const semuaProject = await getAllProject();
      const existingNames = allProjects.map(p => p.name);

      let finalName = projectName;
      let counter = 1;
      while (existingNames.includes(finalName)) {
        finalName = `${projectName}-${counter++}`;
      }

      const newProject = {
        type: 'directory',
        name: finalName,
        path: `idb/${finalName}`,
        relPath: '/',
        children: [],
        createdAt: Date.now(),
      };

      try {
        await addDirectory(newProject.path); //ini untuk project di store directory jadi ini juga setiap buat folder bakalan di tambah disini dan ini aman.

        await createNewProject(finalName);
        await db.data.add({
          encoding: 'utf8',
          fid: randomCode(26),
          text: JSON.stringify(projectState),
        });

        /**
         * 
text
: 
"[{\"dir\":\"idb/HTML\",\"git\":false,\"modifiedAt\":1755613183865},{\"dir\":\"idb/Material Lite\",\"git\":false,\"modifiedAt\":1755658955070}]"



text
: 
"{\"recentFilePaths\":[],\"openedFilePaths\":[],\"unpinnedTabs\":[],\"source\":\"template\",\"currentFilePath\":\"main.js\"}"
         */
        // const id = await addProject(newProject); //addproject versi lama menggunakan idexedb vanila js

        const realProject = await getLatestProject();
        console.log(realProject, '[realProject]: await getLatestProject()');
        this.data = realProject; // isi data dengan project tang baru dibuat

        this.addProjectToList();
        this.addprojectDialog.show(false);
        console.log(realProject.path);
        (async () => {
          // const tree = await getProjectTree('idb/HTML');
        })();

        var _latestProjectPath = realProject.path;

        icodex.router.navigate('editor', _latestProjectPath);
        window.icodex.root.mainWrapper.dispatchEvent(
          new CustomEvent('auto-open-latest-project', {
            detail: await getProjectTree(_latestProjectPath),
          }),
        );
      } catch (error) {
        console.error('Gagal menambahkan proyek:', error.message);
        // Tangani error, misalnya tampilkan notifikasi ke user
      }
    };

    // Menangani aksi tombol "Batal" pada dialog
    this.addprojectDialog.buttonNegative.setOnclickListener(() => {
      this.addprojectDialog.show(false);
    });
  }

  // Metode untuk membuat elemen <li> tunggal
  #createProjectListItem(projectData) {
    if (!projectData) {
      return null;
    }

    const li = document.createElement('li');
    const a = document.createElement('a');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('avatar');
    svg.setAttribute('data-jdenticon-value', projectData.name);
    a.appendChild(svg);

    const info = document.createElement('div');
    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = projectData.name;

    const time = document.createElement('div');
    time.className = 'timestamp';
    time.dataset.time = projectData.createdAt;
    time.textContent = getHumanTime(projectData.createdAt);

    info.append(title, time);
    a.appendChild(info);

    const btn = document.createElement('span');
    btn.className = 'btn';
    btn.setAttribute('tab-index', '0');
    btn.setAttribute('role', 'button');
    btn.innerHTML = `<i class="tb tb-dots"></i>`;
    btn.addEventListener('click', async e => {
      //e.preventDefault()
      e.stopPropagation();
      await removeProject(projectData.name);
      await removeDirectory(projectData.path);
    });
    a.appendChild(btn);

    li.appendChild(a);

    li.addEventListener('click', async () => {
      const treeViewData = await getProjectTree(projectData.path);
      const ev = new CustomEvent('data-project', {
        detail: { tree: treeViewData },
      });

      window.icodex.root.mainWrapper.dispatchEvent(ev);
      icodex.router.navigate('editor', projectData.path);
      localStorage.setItem('currentProjectPath', projectData.path);
    });

    // Update Jdenticon setelah elemen dibuat
    if (window.jdenticon && svg instanceof SVGElement) {
      jdenticon.update(svg);
    }

    return li;
  }

  // Menambahkan proyek ke daftar yang sudah ada
  addProjectToList() {
    if (!this.ul || !this.data) {
      return;
    }

    const newListItem = this.#createProjectListItem(this.data);
    if (newListItem) {
      this.ul.prepend(newListItem);

      // Panggil #renderProjects jika perlu memperbarui seluruh daftar dengan sorting baru
    }
  }

  // Merender ulang semua proyek dari database
  async #renderProjects() {
    if (!this.ul) {
      return;
    }

    this.ul.innerHTML = '';

    this.projects = await getAllProject();
    this.projects.sort((a, b) => b.createdAt - a.createdAt);

    this.projects.forEach(p => {
      const listItem = this.#createProjectListItem(p);
      if (listItem) {
        this.ul.appendChild(listItem);
      }
    });
  }

  // Metode render utama untuk membangun DOM
  render(parent) {
    if (!(parent instanceof HTMLElement)) {
      return null;
    }

    const container = document.createElement('div');
    container.className = 'container';

    // === Bagian Kiri (Tools) ===
    const leftPane = this.#createLeftPane();
    // === Bagian Kanan (Daftar Proyek) ===
    const rightPane = this.#createRightPane();

    const grid = document.createElement('div');
    grid.className =
      'grid grid-cols-1 md:grid-cols-1 mt-3 cols-gap-3 lg:grid-cols-2';
    grid.append(leftPane);
    grid.append(rightPane);

    container.appendChild(grid);
    parent.appendChild(container);

    this.#renderProjects();
    return container;
  }

  // Metode untuk membuat bagian kiri UI
  #createLeftPane() {
    const left = document.createElement('div');
    left.className = 'application-tools px-0';

    const searchBox = this.#createSearchBox();
    const buttonGroup = this.#createButtonGroup();

    left.append(searchBox, buttonGroup);
    return left;
  }

  // Metode untuk membuat search box
  #createSearchBox() {
    const searchBox = document.createElement('div');
    searchBox.className = 'search-box';

    const searchIcon = document.createElement('span');
    searchIcon.className = 'search-ic';
    searchIcon.setAttribute('tabindex', '0');

    // Menggabungkan SVG ke dalam satu string untuk efisiensi
    const iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search-icon lucide-search">
      <path d="m21 21-4.34-4.34"/>
      <circle cx="11" cy="11" r="8"/>
    </svg>`;
    searchIcon.innerHTML = iconSvg;

    const input = document.createElement('input');
    input.className = 'form-search';
    input.type = 'text';
    input.placeholder = 'Ketik nama file...';
    input.autocomplete = 'off';
    input.autocorrect = 'off';
    input.spellcheck = false;

    searchBox.append(searchIcon, input);
    return searchBox;
  }

  // Metode untuk membuat grup tombol
  #createButtonGroup() {
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';

    const cloneBtn = document.createElement('button');
    cloneBtn.className = 'btn bg-text-secondary';
    cloneBtn.setAttribute('aria-label', 'Clone Project');
    cloneBtn.innerHTML = '<i class="codicon codicon-repo-clone"></i>';

    const plusBtn = document.createElement('button');
    plusBtn.className = 'btn bg-$primary';
    plusBtn.setAttribute('aria-label', 'Add Project');
    plusBtn.innerHTML = '<i class="tb tb-plus"></i>';
    plusBtn.addEventListener('click', () => {
      this.addprojectDialog.show(true);
    });

    buttonGroup.append(cloneBtn, plusBtn);
    return buttonGroup;
  }

  // Metode untuk membuat bagian kanan UI
  #createRightPane() {
    const right = document.createElement('div');

    const scroller = document.createElement('div');
    scroller.className = 'scroller-container';
    this.scroller = scroller;

    const card = document.createElement('div');
    card.className = 'card mt-3 md:mt-0 py-0';

    this.ul = document.createElement('ul');
    this.ul.className = 'list-project';

    card.appendChild(this.ul);
    scroller.appendChild(card);
    right.appendChild(scroller);

    return right;
  }
}

const data = {
  filePathsOpened: [
    {
      name: 'index.html',
      path: '/src/index.html',
    },
    {
      name: 'main.js',
      path: '/src/assets/js/main.js',
    },
    {
      name: 'style.css',
      path: '/src/css/style.css',
    },
  ],
  projectId: 1,
};

export class TabEditor {
  constructor(container) {
    this.container = container;
    this.Wrap = null;
    this._NavItem = [];
    this.data = data;
  }

  render() {
    this._Wrap = DOMCreate('ul', {
      className: 'file-tab_content',
    });

    this.data.filePathsOpened.forEach((li, i) => {
      const list = DOMCreate('li', {
        className: 'file-tab_items',
      });
      const fileLink = DOMCreate('a', {
        className: 'file-tab_link',
        href: '#',
      });

      fileLink.innerHTML = `
   <i class="devicon devicon-html5-plain colored"></i>
   <span class="file_name">${li.name}</span>
    `;
      list.append(fileLink);
      this._Wrap.append(list);
    });
  }

  ext() {
    //deteksi extention dari nama file contoh index.html (.html) dll.
  }
}
const app = document.querySelector('#app');

function DOMCreate(tag, attr = {}, description = '') {
  const el = document.createElement(tag);

  // Proses semua properti di attr
  for (const key in attr) {
    const value = attr[key];

    if (key === 'append') {
      // Kalau append berisi function, panggil
      const children = typeof value === 'function' ? value() : value;

      // Kalau hasilnya array
      if (Array.isArray(children)) {
        children.forEach(child => {
          if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child));
          } else if (child instanceof Node) {
            el.appendChild(child);
          }
        });
      }
      // Kalau satu node
      else if (children instanceof Node) {
        el.appendChild(children);
      }
      // Kalau string
      else if (typeof children === 'string') {
        el.appendChild(document.createTextNode(children));
      }
    } else if (key.startsWith('on') && typeof value === 'function') {
      // Event listener
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      // Properti normal (className, id, dsb)
      el[key] = value;
    }
  }

  // Kalau ada description, tambahkan juga
  if (typeof description === 'string' && description.trim() !== '') {
    el.appendChild(document.createTextNode(description));
  } else if (description instanceof Node) {
    el.appendChild(description);
  }

  return el;
}
// Contoh penggunaan
