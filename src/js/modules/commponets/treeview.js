import {
  renameDirectory,
  renameFile,
  addDirectory,
  addFile,
  updateFileContent,
  removeFile,
  removeDirectory,
  observeProjectTree,
  getProjectTree,
  importFile,
  readFileByPath,
} from '../db/db.js';

import { Dom, createElement, EventRegistry } from './dom.js';
import { extMap } from './extention/extMap.js';
import { dialogWrapper, CustomDialog } from './dialog.js';
import clipboard from '../utils/Clipboard.js';

import {
  updateTabs,
  createTab,
  getTabByIdProject,
  addFilePaths,
  directory,
  renameFilePath,
  updateProject,
} from '../db/indexeDb.js';
import {
  CustomDropdown,
  DROPDOWN_CONTAINERS,
  DropdownTree,
} from './dropdown.js';
import { SearchBox } from './searchBox.js';

import { LangText } from '../utils/language.js';
import { downloadProject, shareProject } from '../utils/generateZIP.js';
Object.assign(icodex, {
  plugin: {
    clipboard: clipboard,
  },
});

const selectedMarker = document.createElement('div');

selectedMarker.className = '--selected';

// -----------------
// Treeview
// -----------------

export class TreeView {
  cutNode = new Map();
  static currentOpenDropdown = null;

  mainParentTree;
  treeParentNode;
  containerLoading;
  openPath = [];
  static version = Object.freeze({
    major: 1,
    minor: 0,
    patch: 0,
  });

  folderOpen = false;
  static getVersion() {
    const v = TreeView.version;
    return `${v.major}.${v.minor}.${v.patch}`;
  }
  constructor(data) {
    if (Array.isArray(data)) {
      const valid = data.every(
        item =>
          typeof item === 'object' && item !== null && !Array.isArray(item),
      );
      if (!valid)
        throw new Error('TreeView error: array harus berisi object saja');
      this.data = data;
    } else if (typeof data === 'object' && data !== null) {
      this.data = [data];
    } else {
      throw new Error('TreeView error: data harus object atau array of object');
    }

    this.fileIndex = [];
    this.recentFilePaths = [];
    this.fileNodeMap = new WeakMap();
    this.tabData = [];
    this.dropdownData = {};
    this.counter = 1;
    this._cutNode = null;
    this._cutParent;
    this.item;

    this.dropdownWrapper = createElement('div');

    window.icodex.root.mainWrapper
      ? addEventListener('click', e => {
          if (
            !e.target.closest('.dropdown-tree') &&
            !e.target.classList.contains('btn')
          ) {
            this.dropdownWrapper.innerHTML = '';
            this.dropdownWrapper.style = '';
          }
          const clickedItem = e.target.closest('.file-item');

          // Klik file item
          if (clickedItem) {
            this.handleFileClick.call(this, this.item, clickedItem);
          }
        })
      : console.error('mainParentTree bukan elemen dom');
  }
}

TreeView.prototype.getNodeByPath = function getNodeByPath(path) {
  const parts = path.split('/').filter(Boolean);

  let currentNodes = this.data,
    currentNode = null;
  for (const part of parts) {
    if (((currentNode = currentNodes.find(n => n.name === part)), !currentNode))
      return null;
    currentNodes = currentNode.children || [];
  }

  return currentNode;
};

TreeView.prototype.searchTree = function searchTree(keyword) {
  const normalized = keyword.trim().toLowerCase();
  const isEmpty = normalized === '';

  const folderItems = this.mainParentTree.querySelectorAll('.folder-item');
  const fileItems = this.mainParentTree.querySelectorAll('.file-item');
  const allLabels = this.mainParentTree.querySelectorAll(
    '.folder-name, .file-name',
  );

  // Reset semua tampilan dan hapus highlight
  folderItems.forEach(el => (el.style.display = ''));
  fileItems.forEach(el => (el.style.display = ''));
  const directoryContents =
    this.mainParentTree.querySelectorAll('.directory-content');
  directoryContents.forEach(dc => {
    dc.style.display = '';
    dc.classList.remove('open');
  });

  allLabels.forEach(label => {
    const text = label.textContent;
    label.innerHTML = text; // reset isi label ke semula (tanpa span.highlight)
  });

  // Kalau kosong, berhenti di sini
  if (isEmpty) return;

  // Pencarian aktif
  const matchedItems = new Set();

  allLabels.forEach(label => {
    const text = label.textContent.toLowerCase();
    if (text.includes(normalized)) {
      // Tambah highlight
      const rawText = label.textContent;
      const regex = new RegExp(`(${keyword})`, 'ig');
      label.innerHTML = rawText.replace(
        regex,
        `<span class="highlight">$1</span>`,
      );

      const item = label.closest('.folder-item, .file-item');
      matchedItems.add(item);

      // Buka semua parent .directory-content agar terlihat
      let parent = item.parentElement;
      while (parent && parent.classList.contains('directory-content')) {
        parent.style.display = '';
        parent.classList.add('open');
        parent = parent.parentElement.closest('.directory-content');
      }
    }
  });

  // Sembunyikan yang tidak cocok, kecuali root (project name)
  folderItems.forEach(item => {
    if (!matchedItems.has(item)) {
      const isProjectRoot = item.id === 'line-0'; // Atur sesuai id project kamu
      if (!isProjectRoot) item.style.display = 'none';
    }
  });

  fileItems.forEach(item => {
    if (!matchedItems.has(item)) {
      item.style.display = 'none';
    }
  });

  // Sembunyikan folder kosong (yang tidak punya visible isi)
  directoryContents.forEach(dir => {
    const hasVisibleChild = dir.querySelector(
      ".folder-item:not([style*='display: none']), .file-item:not([style*='display: none'])",
    );
    if (!hasVisibleChild) {
      dir.style.display = 'none';
    }
  });
};

TreeView.prototype.createErrorMessageElement =
  function createErrorMessageElement(text) {
    const p = document.createElement('p');
    p.className = 'error-messages-text';
    p.innerText = text;
    return p;
  };

// Fungsi async tunggal untuk handle klik
TreeView.prototype.handleFileClick = async function handleFileClick(
  item,
  clickedItem,
) {
  const node = this.fileNodeMap.get(clickedItem);
  if (!node) return;

  const filePath = node.path;

  (async () => {
    const content = await readFileByPath(filePath);
    const ext = node.name.split('.').pop();
    window.icodex.root.mainWrapper.dispatchEvent(
      new CustomEvent('open-file', {
        detail: { content: content, type: ext },
      }),
    );
  })();

  // Update breadcrumb

  window.icodex.root.mainWrapper.dispatchEvent(
    new CustomEvent('update-breadcrumb', {
      detail: { path: filePath },
    }),
    new CustomEvent('file-path', {
      details: filePath,
    }),
  );

  // Simpan path ke IndexedDB
  // try {
  //   await addFilePaths(projectId, filePath);
  //   // Setelah berhasil, kirim event kustom
  //   icodex.root.mainWrapper.dispatchEvent(
  //     new CustomEvent('file-paths-updated', {
  //       detail: { projectId: projectId },
  //     }),
  //   );
  // } catch (error) {
  //   console.error('Gagal menambahkan jalur file:', error);
  // }

  // Ambil dan kirim konten file
  // try {
  //   const contentBuffer = await FileContentStorage.getContent(
  //     filePath,
  //     projectId,
  //   );
  //   const text = new TextDecoder().decode(contentBuffer);

  //   const ext = node.name.split('.').pop();

  //   window.icodex.root.mainWrapper.dispatchEvent(
  //     new CustomEvent('open-file', {
  //       detail: { content: text, type: ext },
  //     }),
  //   );
  // } catch (err) {
  //   console.error('[FileClick] Gagal mengambil konten file:', err);
  // }
};

// TreeView.prototype.renderTree = function renderTree() {
//   // Buat elemen utama tree
//   this.mainParentTree = document.createElement('div');
//   this.headerTools();
//   this.mainParentTree.className = 'treeView';

//   // Buat dan tambahkan elemen loading di atas
//   this.containerLoading = document.createElement('div');
//   this.mainParentTree.insertAdjacentElement(
//     'afterbegin',
//     this.containerLoading,
//   );

//     const menuData = [
//   { icon: "icodex icodex-file-added", label: "new file", action: () => console.log("New File") },
//   { icon: "icodex icodex-folder-plus", label: "new folder", action: () => console.log("New Folder") },
//   { icon: "icodex icodex-upload", label: "import files", action: () => console.log("Import Files") },
//   { type: "divider" },
//   { icon: "icodec icodex-copy", label: "copy", action: () => console.log("Copy") },
//   { icon: "tb tb-cut", label: "cut", action: () => console.log("Cut") },
//   { icon: "icodex icodex-pencil", label: "rename", action: () => console.log("Rename") },
//   { icon: "icodec icodex-copy", label: "copy path", action: () => console.log("Copy Path") },
//   { type: "divider" },
//   { icon: "icodec icodex-share", label: "share", action: () => console.log("Share") },
//   { icon: "icodex icodex-trash", label: "delete", action: () => console.log("Delete") },
// ];
//   const dropdown1 = new DropdownTree(menuData);

// this.data.forEach((item, index) => {
//   const el = this.createNode(item, index);

//   el.addEventListener('click', (e) => {
//     const clickedItem = e.target.closest('.file-item');
//     const threedot = e.target.closest('._toggle_three_dots-horizontal');

//     if (threedot) {
//       e.stopPropagation();// Mencegah event bubble ke parent
//     dropdown1.show(threedot.parentElement);
//       console.log(threedot.parentElement);

//     }
//    if (!e.target.closest(".dropdown-tree") && !e.target.classList.contains("_toggle_three_dots-horizontal")) {
//     dropdown1.hide()
//   }

//     if (clickedItem) {
//       this.handleFileClick.call(this, item, clickedItem);
//     }
//   });

//   if (el) this.mainParentTree.appendChild(el);
// });

//   /*this.mainParentTree.addEventListener('click', async (e) => {
//     const clickedItem = e.target.closest('.file-item');

//     if (clickedItem) {
//          var filePath = this.data.path;
//     var projectId = this.data.id?.id;
//     }
//   });
// */

//   return this.mainParentTree;
// };

TreeView.prototype.renderTree = function renderTree() {
  //console.warn('renderTree dipanggil', this.counter++);
  // Elemen utama tree

  this.mainParentTree = createElement('div', {
    className: 'treeView',
  });
  this.mainParentTree.appendChild(this.dropdownWrapper);
  this.headerTools();

  // Elemen loading di atas
  this.containerLoading = createElement('div');
  this.mainParentTree.insertAdjacentElement(
    'afterbegin',
    this.containerLoading,
  );

  this.parentDir = createElement('div', {
    className: 'parentDir',
  });

  async () => {
    await updateTabs({
      openedFilePaths: ['src'],
    });
  };

  // Handle click global

  this.data.forEach((item, index) => {
    const el = this.createNode(item, index);
    if (!el) return;

    // Klik global
    this.item = item;

    this.parentDir.appendChild(el);
  });
  this.mainParentTree.append(this.parentDir);

  return this.mainParentTree;
};
TreeView.prototype.handleNewFile = function (node) {
  const self = this;

  const newFile = new CustomDialog(
    new LangText({
      id: 'Berkas Baru',
      en: 'New File',
    }).getText(),
    dialogWrapper,
  );
  const tagErrorFile = this.createErrorMessageElement('');
  const inputFileEl = newFile.input.input;

  inputFileEl.parentNode.appendChild(tagErrorFile);

  const fileType = document.createElement('span');
  fileType.className = 'validation-icon-type';
  fileType.setAttribute('data-validation-type', 'unknown');
  inputFileEl.parentNode.appendChild(fileType);

  const validateFileName = value => {
    const trimmed = value.trim();
    const ext = value.split('.').pop().toLowerCase();
    const type = extMap[ext] || 'unknown';

    fileType.setAttribute('data-validation-type', type);

    if (!trimmed) {
      tagErrorFile.textContent = 'Path cannot be empty';
      tagErrorFile.classList.add('show');
      tagErrorFile.id = '';
      inputFileEl.classList.add('form-error');
      return false;
    }

    if (!/^[a-zA-Z0-9_\-./ ]+$/.test(trimmed)) {
      tagErrorFile.textContent = '!Invalid path name';
      tagErrorFile.classList.add('show');
      tagErrorFile.id = 'infalid';
      return false;
    }

    const fileNameOnly = trimmed.split('/').pop();
    const isDuplicate = (node.children || []).some(
      child => child.type === 'file' && child.name === fileNameOnly,
    );

    if (isDuplicate) {
      tagErrorFile.textContent = 'Path Already Exists';
      tagErrorFile.classList.add('show');
      inputFileEl.classList.add('form-error');
      tagErrorFile.id = '';
      return false;
    }

    // clear error
    tagErrorFile.classList.remove('show');
    tagErrorFile.id = '';
    inputFileEl.classList.remove('form-error');
    return true;
  };

  const onPositiveClick = () => {
    const inputValue = inputFileEl.value;
    if (!validateFileName(inputValue)) return;

    self.handleAddItem('file', inputValue.trim(), node);

    inputFileEl.value = '';
    newFile.show(false);
    inputFileEl.classList.remove('form-error');
    tagErrorFile.classList.remove('show');
    newFile.buttonPositive.button.removeEventListener('click', onPositiveClick);
  };

  newFile.show(true);
  inputFileEl.addEventListener('input', () =>
    validateFileName(inputFileEl.value),
  );

  inputFileEl.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === 13) onPositiveClick();
  });

  newFile.buttonPositive.button.removeEventListener('click', onPositiveClick);
  newFile.buttonPositive.button.addEventListener('click', onPositiveClick);

  newFile.buttonNegative.button.addEventListener('click', () => {
    newFile.show(false);
    tagErrorFile.classList.remove('show');
    inputFileEl.classList.remove('form-error');
    newFile.buttonPositive.button.removeEventListener('click', onPositiveClick);
  });
};
TreeView.prototype.handleNewFolder = function (node) {
  const self = this;
  const newFolder = new CustomDialog(
    new LangText({
      id: 'Folder Baru',
      en: 'New Folder',
    }).getText(),
    dialogWrapper,
  );
  var tagErrorFolder = this.createErrorMessageElement(
    'path tidak boleh kosong',
  );

  const inputFolderEl = newFolder.input.input;
  newFolder.show(true);

  const confirmBtn = newFolder.buttonPositive.button;
  const cancelBtn = newFolder.buttonNegative.button;

  const validateFolderName = value => {
    const trimmed = value.trim();
    if (!trimmed) {
      tagErrorFolder.textContent = 'Path Cannot Be Empty';
      tagErrorFolder.classList.add('show');
      inputFolderEl.classList.add('form-error');
      return false;
    }

    if (!/^[a-zA-Z0-9_\-./ ]+$/.test(trimmed)) {
      tagErrorFolder.textContent = 'Infalid Path Name';
      tagErrorFolder.classList.add('show');
      inputFolderEl.classList.add('form-error');
      return false;
    }

    const pathParts = trimmed.split('/');
    let current = node;
    let isDuplicate = false;

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      if (!current.children) break;

      const found = current.children.find(
        child => child.name === part && child.type === 'directory',
      );
      if (!found) break;

      current = found;
      if (i === pathParts.length - 1) isDuplicate = true;
    }

    if (isDuplicate) {
      tagErrorFolder.textContent = 'Folder sudah ada.';
      tagErrorFolder.classList.add('show');
      inputFolderEl.classList.add('form-error');
      return false;
    }

    tagErrorFolder.classList.remove('show');
    inputFolderEl.classList.remove('form-error');
    return true;
  };

  inputFolderEl.addEventListener('input', () => {
    validateFolderName(inputFolderEl.value);
  });

  inputFolderEl.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === 13) {
      onConfirm();
    }
  });

  const onConfirm = () => {
    const inputValue = inputFolderEl.value;
    if (validateFolderName(inputValue)) {
      self.handleAddItem('directory', inputValue.trim(), node);
      newFolder.show(false);
      inputFolderEl.value = '';
      tagErrorFolder.classList.remove('show');
      inputFolderEl.classList.remove('form-error');
      confirmBtn.removeEventListener('click', onConfirm);
    }
  };

  confirmBtn.removeEventListener('click', onConfirm);
  confirmBtn.addEventListener('click', onConfirm);

  cancelBtn.addEventListener('click', () => {
    newFolder.show(false);
    tagErrorFolder.classList.remove('show');
    inputFolderEl.classList.remove('form-error');
    confirmBtn.removeEventListener('click', onConfirm);
  });
};

TreeView.prototype.createNode = function createNode(node, index, level = 0) {
  this.index = index;
  return node
    ? 'directory' === node.type
      ? this.createDirectoryNode(node, level)
      : 'file' === node.type
      ? this.createFileNode(node, level, index)
      : null
    : null;
};

TreeView.prototype.headerTools = function headerTools() {
  const self = this;

  const root = self.data[0];
  const $header = document.createElement('nav');
  $header.className = 'treeView-header';
  const $iconGroup = document.createElement('a');
  $iconGroup.className = 'tree-icon-group';

  const dialogAddFolder = new CustomDialog(dialogWrapper);
  const $inputFolder = dialogAddFolder.input.input;
  const dialogNewFile = new CustomDialog(dialogWrapper);
  const inputNewFile = dialogNewFile.input.input;
  const confirmBtn = dialogNewFile.buttonPositive.button;
  const cancelBtn = dialogNewFile.buttonNegative.button;

  const $errorFolder = this.createErrorMessageElement('Path cannot be empty.');
  const tagErrorFile = this.createErrorMessageElement('Path cannot be empty');
  const fileType = document.createElement('span');
  (fileType.className = 'validation-icon-type'),
    fileType.setAttribute('data-validation-type', 'unknown'),
    inputNewFile.parentNode.appendChild(fileType);
  dialogAddFolder._dialogBody.append($errorFolder);

  const iconsActions = [
    'Explorer',
    {
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>',
    },
    {
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
    },
    {
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="1.5rem" height="1.5rem" viewBox="0 0 15 15"><path fill="currentColor" fill-rule="evenodd" d="M3.5 2a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5V4.707L9.293 2zM2 2.5A1.5 1.5 0 0 1 3.5 1h6a.5.5 0 0 1 .354.146l2.926 2.927c.141.14.22.332.22.53V12.5a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 2 12.5zm2.75 5a.5.5 0 0 1 .5-.5H7V5.25a.5.5 0 0 1 1 0V7h1.75a.5.5 0 0 1 0 1H8v1.75a.5.5 0 0 1-1 0V8H5.25a.5.5 0 0 1-.5-.5" clip-rule="evenodd" stroke-width="0.5" stroke="currentColor"/></svg>',
    },
    {
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10v6"/><path d="M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
    },
    {
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="ic-three-dots" viewBox="0 0 16 16"><path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3"/></svg>',
    },
  ];

  iconsActions.forEach((item, i) => {
    if (typeof item === 'string') {
      const $title = document.createElement('span');
      $title.textContent = item;
      $title.className = '_title';
      $header.appendChild($title);
      return;
    }

    const $btn = document.createElement('span');
    $btn.className = 'tree-icon-btn';
    $btn.id = `tree-tools-btn-${i}`;
    $btn.tabIndex = 0;
    $btn.role = 'button';

    const $tpl = document.createElement('template');
    $tpl.innerHTML = item.icon.trim();
    const $svg = $tpl.content.firstElementChild;
    if ($svg) $btn.appendChild($svg);

    if (i === 1) {
      const searchBox = new SearchBox();

      $header.appendChild(searchBox.element);
      this.searchBox = searchBox; // simpan referensi kalau butuh di luar
      const searchBoxEl = searchBox.element;
      $btn.addEventListener('click', () => {
        searchBoxEl.classList.remove('hidden');
        searchBox.focus();
        searchBox.onInput(keyword => this.searchTree(keyword));
        searchBox.close.addEventListener(
          'click',
          () => {
            searchBoxEl.classList.add('hidden');
          },
          { once: true },
        );
      });
    } else if (i === 2) {
    } else if (i === 3) {
      $btn.addEventListener('click', () => {
        dialogNewFile.placeholder = 'placeholder1';

        dialogNewFile.show(true);

        const validateFileName = value => {
          const trimmed = value.trim();
          const ext = trimmed.split('.').pop().toLowerCase();
          const type = extMap[ext] || 'unknown';

          fileType.setAttribute('data-validation-type', type);

          if (!trimmed) {
            tagErrorFile.textContent = 'Path cannot be empty';
            tagErrorFile.classList.add('show');
            inputNewFile.classList.add('form-error');
            return false;
          }

          if (!/^[a-zA-Z0-9_\-./ ]+$/.test(trimmed)) {
            tagErrorFile.textContent = '!Invalid path name';
            tagErrorFile.classList.add('show');
            inputNewFile.classList.add('form-error');
            return false;
          }

          const fileName = trimmed.split('/').pop();
          const isDuplicate = (root.children || []).some(
            child => child.type === 'file' && child.name === fileName,
          );

          if (isDuplicate) {
            tagErrorFile.textContent = 'Path already exists';
            tagErrorFile.classList.add('show');
            inputNewFile.classList.add('form-error');
            return false;
          }

          tagErrorFile.classList.remove('show');
          inputNewFile.classList.remove('form-error');
          return true;
        };

        const onConfirm = () => {
          const value = inputNewFile.value;
          if (!validateFileName(value)) return;

          self.handleAddItem('file', value.trim(), root);
          dialogNewFile.show(false);
          inputNewFile.value = '';
          inputNewFile.classList.remove('form-error');
          tagErrorFile.classList.remove('show');
          confirmBtn.removeEventListener('click', onConfirm);
        };

        inputNewFile.addEventListener('input', () =>
          validateFileName(inputNewFile.value),
        );
        inputNewFile.addEventListener('keydown', e => {
          if (e.key === 'Enter') onConfirm();
        });

        confirmBtn.removeEventListener('click', onConfirm);
        confirmBtn.addEventListener('click', onConfirm);

        cancelBtn.addEventListener('click', () => {
          dialogNewFile.show(false);
          tagErrorFile.classList.remove('show');
          inputNewFile.classList.remove('form-error');
          confirmBtn.removeEventListener('click', onConfirm);
        });
      });
    } else if (i === 4) {
      $btn.addEventListener('click', () => {
        dialogAddFolder.title = 'new_folder';
        dialogAddFolder.placeholder = 'placeholder1';
        dialogAddFolder.updateLanguage();
        dialogAddFolder.show(true);

        const $ok = dialogAddFolder.buttonPositive.button;
        const $cancel = dialogAddFolder.buttonNegative.button;

        const validate = val => {
          const name = val.trim();
          if (!name) {
            $errorFolder.textContent = 'Path Cannot Be Empty';
            $errorFolder.classList.add('show');
            $inputFolder.classList.add('form-error');
            return false;
          }

          if (!/^[a-zA-Z0-9_\-./ ]+$/.test(name)) {
            $errorFolder.textContent = 'Invalid Path Name';
            $errorFolder.classList.add('show');
            $inputFolder.classList.add('form-error');
            return false;
          }

          const parts = name.split('/');
          let cur = root;
          let dup = false;
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!cur.children) break;
            const found = cur.children.find(
              c => c.name === part && c.type === 'directory',
            );
            if (!found) break;
            cur = found;
            if (i === parts.length - 1) dup = true;
          }

          if (dup) {
            $errorFolder.textContent = 'Folder sudah ada.';
            $errorFolder.classList.add('show');
            $inputFolder.classList.add('form-error');
            return false;
          }

          $errorFolder.classList.remove('show');
          $inputFolder.classList.remove('form-error');
          return true;
        };

        const confirm = () => {
          const val = $inputFolder.value;
          if (validate(val)) {
            self.handleAddItem('directory', val.trim(), root);
            dialogAddFolder.show(false);
            $inputFolder.value = '';
            $errorFolder.classList.remove('show');
            $inputFolder.classList.remove('form-error');
            $ok.removeEventListener('click', confirm);
          }
        };

        $inputFolder.addEventListener('input', () =>
          validate($inputFolder.value),
        );
        $inputFolder.addEventListener('keydown', e => {
          if (e.key === 'Enter') confirm();
        });

        $ok.removeEventListener('click', confirm);
        $ok.addEventListener('click', confirm);

        $cancel.addEventListener('click', () => {
          dialogAddFolder.show(false);
          $errorFolder.classList.remove('show');
          $inputFolder.classList.remove('form-error');
          $ok.removeEventListener('click', confirm);
        });
      });
    } else {
      $btn.addEventListener('click', event => {
        const anchor = event.currentTarget;
        dropdown.toggle($btn);
      });
    }

    $iconGroup.appendChild($btn);
  });

  const headerTreeheader = new Dom(
    [
      {
        name: 'button',
        attr: [{ class: 'btn', 'aria-label': 'search file' }],
        children: [{ name: 'i', attr: [{ class: 'icodex icodex-search-2' }] }],
      },
      {
        name: 'button',
        attr: [{ class: 'btn', 'aria-label': 'file opened' }],
        children: [{ name: 'i', attr: [{ class: 'icodex icodex-location' }] }],
      },
      {
        name: 'button',
        attr: [{ class: 'btn', 'aria-label': 'new file' }],
        children: [
          { name: 'i', attr: [{ class: 'icodex icodex-file-added' }] },
        ],
      },
      {
        name: 'button',
        attr: [{ class: 'btn', 'aria-label': 'new folder' }],
        children: [
          { name: 'i', attr: [{ class: 'icodex icodex-folder-plus' }] },
        ],
      },
      {
        name: 'button',
        attr: [{ class: 'btn', 'aria-label': 'open dropdown' }],
        children: [
          { name: 'i', attr: [{ class: 'icodex icodex-kebab-horizontal' }] },
        ],
      },
    ],
    $header,
  );

  if (!$header.isConnected) {
    this.mainParentTree.insertAdjacentElement('afterbegin', $header);
  }
};

TreeView.prototype.createDirectoryNode = function createDirectoryNode(
  node,
  level = 0,
) {
  if (arguments.length > 2 || arguments.length < 2) {
    console.error('TreeView.prototype.createDirectoryNode ');
    return false;
  }
  // Elemen utama direktori (pembungkus)
  const directory = document.createElement('div');
  directory.className = 'directory';

  // Wrapper folder sebagai item clickable
  const wrapper = document.createElement('a');
  wrapper.className = 'folder-item ';
  wrapper.tabIndex = 0;
  directory.id = `line-${level}`;
  // Pasang event pointerenter agar jalan di HP dan desktop

  // Jika showIndent true, tambahkan indentasi sesuai level

  Array.from({ length: level }, () => {
    wrapper.appendChild(
      Object.assign(document.createElement('span'), { className: 'indent' }),
    );
  });

  // Chevron SVG (ikon panah)
  const chevron = document.createElement('span');
  chevron.className = 'codicon codicon-chevron-right';

  // Nama folder
  const folderName = document.createElement('span');
  folderName.className = 'folder-name';
  folderName.textContent = node.name;

  // Tambahkan chevron dan nama folder ke wrapper
  wrapper.appendChild(chevron);
  wrapper.appendChild(folderName);

  // Tombol tiga titik (dropdown toggle)
  const _toggle_three_dots = document.createElement('span');
  _toggle_three_dots.className = '_toggle_three_dots-horizontal';
  _toggle_three_dots.tabIndex = 0;
  _toggle_three_dots.innerHTML = '<i class="icodex icodex-kebab-horizontal"/>';

  // wrapper.addEventListener('pointerenter', () => {
  //   moveSelectedMarkerTo(wrapper);
  // });

  wrapper.appendChild(_toggle_three_dots);

  // Kontainer konten anak dari direktori
  const content = document.createElement('div');
  content.className = 'directory-content';

  content.id = level;
  content.dataset.id = level;
  // Inisialisasi dropdown
  const renderDropdown = new CustomDropdown(DROPDOWN_CONTAINERS, wrapper);

  // Setup dropdown folder dari TreeView

  // this.setupDirectoryDropdown(node, renderDropdown);

  // Tambahkan opsi "Import Files" ke grup pertama
  renderDropdown._group[0].option.push({
    value: 'Import Files',
    icon: 'icodex icodex-upload',
    id: 'import-files',
  });

  wrapper.addEventListener('click', e => {
    if (
      e.target !== wrapper &&
      e.target !== chevron &&
      e.target !== folderName
    ) {
      return; // abaikan klik kalau bukan di wrapper, chevron, atau folderName
    }

    content.classList.toggle('open');
    content.classList.contains('open')
      ? (chevron.style.rotate = '90deg')
      : (chevron.style.rotate = '0deg');
    wrapper.classList.toggle('open');
  });

  const menuData = [
    {
      icon: 'icodex icodex-file-added',
      label: 'new file',
      action: () => this.handleNewFile(node),
    },
    {
      icon: 'icodex icodex-folder-plus',
      label: 'new folder',
      action: () => this.handleNewFolder(node),
    },
    {
      icon: 'icodex icodex-upload',
      label: 'import files',
      action: () => this.handleImportFile(node),
    },
    { type: 'divider' },
    {
      icon: 'icodec icodex-copy',
      label: 'copy',
      action: () => null,
    },
    { icon: 'tb tb-cut', label: 'cut', action: () => null },
    {
      icon: 'icodex icodex-pencil',
      label: 'rename',
      action: () => this.handleRenameFolder(node),
    },
    {
      icon: 'icodec icodex-copy',
      label: 'copy path',
      action: () => this.handleCopypathFolder(node),
    },
    { type: 'divider' },
    {
      icon: 'icodec icodex-move-to-bottom',
      label: 'download',
      action: () => {
        downloadProject(node.path);
      },
    },
    {
      icon: 'icodec icodex-share',
      label: 'share',
      action: () => {
        const webShareSupported = 'canShare' in navigator;
        if (webShareSupported) {
          shareProject(node.path);
        } else {
          downloadProject(node.path);
        }
      },
    },
  ];

  const root = this.data[0];
  if (node === root) {
    if (
      (wrapper.classList.contains('open') ||
        content.classList.contains('open')) !== true
    ) {
      wrapper.classList.add('open');
      content.classList.add('open');
      chevron.style.rotate = '90deg';
    }
  }
  if (node !== root) {
    menuData.push({
      icon: 'icodex icodex-trash',
      label: 'delete',
      action: () => this.handleDeleteFolder(node),
    });
  }
  this.dropdownData = menuData;

  // Satu instance dropdown
  const dropdown = new DropdownTree(menuData);

  // Event: klik pada tiga titik (tampilkan dropdown)
  _toggle_three_dots.addEventListener('click', event => {
    event.stopPropagation();
    event.preventDefault();
    // Tampilkan dropdown di dalam wrapper
    dropdown.show(this.dropdownWrapper, _toggle_three_dots);
  });
  content.addEventListener('contextmenu', e => {
    e.preventDefault();
  });
  this.parentDir.addEventListener('scroll', e => {
    e.stopPropagation();
    dropdown.hide();
    this.dropdownWrapper.removeAttribute('style');
  });

  // Jika ada children, render secara rekursif
  if (Array.isArray(node.children)) {
    node.children.forEach((child, index) => {
      const childNode = this.createNode(child, index, level + 1);
      if (childNode) content.appendChild(childNode);
    });
  }

  // Tambahkan wrapper dan konten ke elemen utama direktori
  directory.appendChild(wrapper);
  directory.appendChild(content);

  return directory;
};

TreeView.prototype.handleImportFile = function (node) {
  const self = this;
  const rootProject = self.findRootProject(self.data, node);
  console.log(rootProject);
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true; // boleh banyak file
  // jangan pakai accept, biarin semua file masuk

  input.addEventListener('change', async e => {
    const files = Array.from(input.files);
    console.log(node);
    // filter: buang zip
    const validFiles = files.filter(
      f => !f.name.toLowerCase().endsWith('.zip'),
    );

    if (validFiles.length < files.length) {
      console.error('File .zip tidak diperbolehkan.');
    }

    for (const file of files) {
      const cleanPath = `${node.path}/${file.name}`.replace(/\/+/g, '/');
      const relcleanPath = `${node.relPath}/${file.name}`.replace(/\/+/g, '/');

      const fileNode = {
        type: 'file',
        name: file.name,
        path: cleanPath,
        relPath: relcleanPath,
      };

      node.children = node.children || [];
      const exists = node.children.some(
        child => child.name === file.name && child.type === 'file',
      );
      if (!exists) node.children.push(fileNode);

      console.log(fileNode);
    }

    await importFile(files, node.path);
    if (rootProject) this.refreshAndSave(rootProject);
  });

  input.click();
};

// TreeView.prototype.handleRenameFolder = function (node) {
//   const self = this;

//   const renameFolder = new CustomDialog(
//     new LangText({
//       id: 'Ganti Nama Folder',
//       en: 'Rename Folder',
//     }).getText(),
//     dialogWrapper,
//   );
//   var tagErrorRenameFolder = this.createErrorMessageElement(
//     'path tidak boleh kosong',
//   );
//   const renameFolderInputEl = renameFolder.input.input;
//   renameFolderInputEl.parentNode.appendChild(tagErrorRenameFolder);

//   renameFolder.show(true);

//   const confirmBtn = renameFolder.buttonPositive.button;
//   const cancelBtn = renameFolder.buttonNegative.button;

//   renameFolder.value = node.name;
//   renameFolder.input.select();

//   const validateFolderName = value => {
//     const trimmed = String(value).trim();
//     if (!trimmed) {
//       tagErrorRenameFolder.textContent = new LangText({
//         en: 'Path Cannot be Empty',
//         id: 'Path tidak boleh kosong',
//         es: 'la ruta no puede estar vacía',
//         fr: 'le chemin ne peut pas être vide',
//         de: 'Pfad darf nicht leer sein',
//         ja: 'パスを空にすることはできません',
//         ko: '경로는 비워둘 수 없습니다',
//         zh: '路径不能为空',
//         ru: 'путь не может быть пустым',
//         pt: 'o caminho não pode estar vazio',
//         hi: 'पथ खाली नहीं हो सकता',
//         tr: 'yol boş olamaz',
//       }).getText();
//       tagErrorRenameFolder.classList.add('show');
//       renameFolderInputEl.classList.add('form-error');
//       return false;
//     }

//     if (!/^[a-zA-Z0-9_\- ]+$/.test(trimmed)) {
//       tagErrorRenameFolder.textContent = new LangText({
//         id: 'Path tidak valid',
//         en: 'Invalid path',
//       });
//       tagErrorRenameFolder.classList.add('show');
//       renameFolderInputEl.classList.add('form-error');
//       return false;
//     }

//     const rootProject = self.findRootProject(self.data, node);
//     const parentNode = self.findParentNode(rootProject, node);

//     const isDuplicate = (parentNode?.children || []).some(
//       child =>
//         child.type === 'directory' && child !== node && child.name === trimmed,
//     );
//     console.log('char codes:', trimmed);

//     if (isDuplicate) {
//       tagErrorRenameFolder.textContent = new LangText({
//         id: 'nama folder ' + trimmed.toLowerCase(),
//         en: `folder ${trimmed.toString()} already exists`,
//         es: `la carpeta ${trimmed} ya existe`,
//         fr: `le dossier ${trimmed} existe déjà`,
//         de: `der Ordner ${trimmed} existiert bereits`,
//         ja: `フォルダ ${trimmed} はすでに存在します`,
//         ko: `폴더 ${trimmed}이 이미 존재합니다`,
//         zh: `文件夹 ${trimmed} 已经存在`,
//         ru: `папка ${trimmed} уже существует`,
//       }).getText();
//       tagErrorRenameFolder.classList.add('show');
//       renameFolderInputEl.classList.add('form-error');
//       return false;
//     }

//     tagErrorRenameFolder.classList.remove('show');
//     renameFolderInputEl.classList.remove('form-error');
//     return true;
//   };

//   renameFolderInputEl.addEventListener('input', () => {
//     validateFolderName(renameFolderInputEl.value);
//   });
//   console.log(renameFolderInputEl.value);
//   const onConfirm = () => {
//     const newName = renameFolder.value;

//     if (!validateFolderName(newName)) return;

//     const oldPath = node.path;
//     const oldName = node.name;

//     node.name = newName;

//     const rootProject = self.findRootProject(self.data, node);
//     // Hanya jika node adalah root project

//     if (!rootProject) {
//       console.error('Root project tidak ditemukan saat rename.');
//       return;
//     }

//     const isRoot = node === rootProject;
//     let newPath = 'idb/';
//     let newRelpath = '/';
//     if (!isRoot) {
//       const parentNode = self.findParentNode(rootProject, node);
//       newPath = `${parentNode?.path || '/'}/${newName}`.replace(/\/+/g, '/');

//       newRelpath = `${parentNode?.relPath || '/'}/${newName}`.replace(
//         /\/+/g,
//         '/',
//       );

//       node.path = newPath;
//       node.relPath = '/';
//     } else {
//       node.path = 'idb/' + newName;
//       node.relPath = '/';
//       //bisa di hapus new name agar path root tidak menampilkan nama project dan hanya path slash / saja
//     }

//     const updateChildPaths = folderNode => {
//       if (folderNode.children) {
//         for (const child of folderNode.children) {
//           child.path = `${folderNode.path}/${child.name}`.replace(/\/+/g, '/');
//           child.relPath = `${folderNode.relPath}/${child.name}`.replace(
//             /\/+/g,
//             '/',
//           );
//           if (child.type === 'directory') {
//             updateChildPaths(child);
//           }
//         }
//       }
//     };

//     if (!isRoot) {
//       updateChildPaths(node);
//     }

//     console.log(
//       `[TreeView] Folder di-rename dari "${oldName}" menjadi "${newName}", path baru: ${node.path}`,
//     );

//     // RENAME FOLDER DI DB
//     async function renameFold() {
//       await renameDirectory(oldPath, node.path);
//     }
//     renameFold();

//     self.refreshAndSave(rootProject);

//     renameFolder.show(false);
//     tagErrorRenameFolder.classList.remove('show');
//     renameFolderInputEl.classList.remove('form-error');
//     confirmBtn.removeEventListener('click', onConfirm);
//   };

//   confirmBtn.removeEventListener('click', onConfirm);
//   confirmBtn.addEventListener('click', onConfirm);

//   const closeDialog = () => {
//     renameFolder.show(false);
//     tagErrorRenameFolder.classList.remove('show');
//     renameFolderInputEl.classList.remove('form-error');
//     confirmBtn.removeEventListener('click', onConfirm);
//   };

//   cancelBtn.addEventListener('click', closeDialog);
//   renameFolder.buttonNegative.button.addEventListener('click', closeDialog);
// };

// TreeView.prototype.handleDeleteFolder = function (node) {
//   const self = this;
//   const rootProject = self.findRootProject(self.data, node);
//   if (!rootProject) {
//     alert('Root project tidak ditemukan.');
//     return;
//   }

//   console.log(node === rootProject);
//   if (node === rootProject) {
//     (async () => {
//       await removeDirectory(rootProject.path);
//       this.parentDir.remove();
//       localStorage.removeItem('currentProjectPath');
//     })();
//     return;
//   }
//   const parentNode = self.findParentNode(rootProject, node);
//   if (!parentNode) {
//     console.error('Parent folder tidak ditemukan.');
//     return;
//   }

//   if (
//     confirm(`Yakin ingin menghapus folder "${node.name}" dan semua isinya?`)
//   ) {
//     (async () => {
//       try {
//         await removeDirectory(node.path);

//         const index = parentNode.children.findIndex(
//           child => child.path === node.path,
//         );
//         if (index !== -1) {
//           parentNode.children.splice(index, 1);
//         }

//         self.refreshAndSave(rootProject);
//       } catch (err) {
//         console.error('Gagal menghapus folder:', err);
//       }
//     })();
//   }
// };

TreeView.prototype.handleRenameFolder = function (node) {
  const self = this;

  const dlg = new CustomDialog(
    new LangText({ id: 'Ganti Nama Folder', en: 'Rename Folder' }).getText(),
    dialogWrapper,
  );

  const errEl = this.createErrorMessageElement('Path tidak boleh kosong');
  const inputEl = dlg.input.input;
  inputEl.parentNode.appendChild(errEl);

  dlg.show(true);
  dlg.value = node.name;
  dlg.input.select();

  const confirmBtn = dlg.buttonPositive.button;
  const cancelBtn = dlg.buttonNegative.button;

  const validate = val => {
    const name = String(val).trim();

    // kosong
    if (!name) {
      errEl.textContent = new LangText({
        en: 'Path Cannot be Empty',
        id: 'Path tidak boleh kosong',
      }).getText();
      errEl.classList.add('show');
      inputEl.classList.add('form-error');
      return false;
    }

    // karakter invalid → titik (.) boleh, tapi karakter ini dilarang: ' " ; ! ? + > < { } `
    if (/['";!?+><{}\`]/.test(name)) {
      errEl.textContent = new LangText({
        en: 'Invalid path: contains forbidden characters',
        id: 'Path tidak valid: mengandung karakter terlarang',
      }).getText();
      errEl.classList.add('show');
      inputEl.classList.add('form-error');
      return false;
    }

    // duplikat
    const root = self.findRootProject(self.data, node);
    const parent = self.findParentNode(root, node);
    const dup = (parent?.children || []).some(
      ch => ch.type === 'directory' && ch !== node && ch.name === name,
    );
    if (dup) {
      errEl.textContent = new LangText({
        en: `Folder "${name}" already exists`,
        id: `Folder ${name.toLowerCase()} sudah ada`,
      }).getText();
      errEl.classList.add('show');
      inputEl.classList.add('form-error');
      return false;
    }

    // valid
    errEl.classList.remove('show');
    inputEl.classList.remove('form-error');
    return true;
  };

  // realtime validate
  inputEl.addEventListener('input', () => validate(inputEl.value));
  validate(inputEl.value); // cek awal

  const onConfirm = async () => {
    const newName = dlg.value;
    if (!validate(newName)) return;

    const oldPath = node.path;
    const oldName = node.name;
    const root = self.findRootProject(self.data, node);
    if (!root) return console.error('Root project tidak ditemukan.');

    node.name = newName;
    const isRoot = node === root;

    if (!isRoot) {
      const parent = self.findParentNode(root, node);
      node.path = `${parent?.path || '/'}/${newName}`.replace(/\/+/g, '/');
      node.relPath = `${parent?.relPath || '/'}/${newName}`.replace(
        /\/+/g,
        '/',
      );
    } else {
      node.path = 'idb/' + newName;
      node.relPath = '/';
    }

    // update path children
    const upd = folder => {
      folder.children?.forEach(ch => {
        ch.path = `${folder.path}/${ch.name}`.replace(/\/+/g, '/');
        ch.relPath = `${folder.relPath}/${ch.name}`.replace(/\/+/g, '/');
        if (ch.type === 'directory') upd(ch);
      });
    };
    if (!isRoot) upd(node);

    console.log(`[TreeView] Folder rename "${oldName}" -> "${newName}"`);

    await renameDirectory(oldPath, node.path);
    self.refreshAndSave(root);

    dlg.show(false);
    confirmBtn.removeEventListener('click', onConfirm);
  };

  confirmBtn.addEventListener('click', onConfirm);

  const close = () => {
    dlg.show(false);
    errEl.classList.remove('show');
    inputEl.classList.remove('form-error');
    confirmBtn.removeEventListener('click', onConfirm);
  };

  cancelBtn.addEventListener('click', close);
};

TreeView.prototype.handleDeleteFolder = function (node) {
  const root = this.findRootProject(this.data, node);
  if (!root) return alert('Root project tidak ditemukan.');

  // Kalau yang dihapus adalah root project
  if (node === root) {
    return;
  }

  const parent = this.findParentNode(root, node);
  if (!parent) return console.error('Parent folder tidak ditemukan.');

  if (!confirm(`Yakin ingin menghapus folder "${node.name}" dan semua isinya?`))
    return;

  (async () => {
    try {
      await removeDirectory(node.path);
      parent.children = parent.children.filter(c => c.path !== node.path);
      this.refreshAndSave(root);
    } catch (err) {
      console.error('Gagal menghapus folder:', err);
    }
  })();
};

TreeView.prototype.handleCutFolder = function (node) {
  const rootProject = this.findRootProject(this.data, node);
  const parentNode = this.findParentNode(rootProject, node);

  if (!rootProject || !parentNode) {
    console.warn('[Cut] Root atau parent node tidak ditemukan.');
    return;
  }

  // Simpan referensi node dan parent lama
  this._cutNode = node;
  this._cutParent = parentNode;

  console.log(`[Cut] Folder "${node.path}" siap dipindahkan.`);
};

TreeView.prototype.handleCopyFolder = function (node) {
  icodex.plugin.clipboard.copy(node.path);
};
TreeView.prototype.handleCopypathFolder = function (node) {
  icodex.plugin.clipboard.copy(node.relPath);
};

TreeView.prototype.createFileNode = function createFileNode(
  node,
  level = 0,
  index,
) {
  const fileWrapper = document.createElement('a');
  fileWrapper.className = 'file-item';
  fileWrapper.tabIndex = 0;
  fileWrapper.id = 'item-' + index;
  fileWrapper.dataset.path = node.path;
  fileWrapper.dataset.name = node.name;

  // Tambahkan indentasi menggunakan array
  Array.from({ length: level }, () => {
    fileWrapper.appendChild(
      Object.assign(document.createElement('span'), { className: 'indent' }),
    );
  });

  // Buat elemen nama file
  const fileName = document.createElement('span');
  fileName.className = 'file-name';
  fileName.id = `line-${level}`;
  fileName.textContent = node.name;

  // Buat icon berdasarkan ekstensi file
  const _language_icon = document.createElement('span');
  _language_icon.className = 'icodex-lang-icon';
  const ext = node.name.split('.').pop().toLowerCase();
  _language_icon.dataset.fileType = extMap[ext] || 'unknown';

  // Susun elemen ke dalam fileWrapper
  fileWrapper.appendChild(_language_icon);
  // fileWrapper.appendChild(_language_icon);
  fileWrapper.appendChild(fileName);

  this.fileIndex.push(node.path);
  // Tambahkan dropdown & interaksi UI
  this.setupFileDropdown(node, fileWrapper);
  // fileWrapper.addEventListener('pointerenter', () => {
  //   moveSelectedMarkerTo(fileWrapper);
  // });

  // Klik file → simpan path dan kirim event
  /*  fileWrapper.addEventListener('click', () => {
    window.Cache = window.Cache || {};
    window.Cache.recentPath = node.path;

    window.dispatchEvent(new CustomEvent('update-breadcrumb', {
      detail: { path: node.path }
    }));
  });
*/
  this.findRootProject(
    Array.isArray(this.data) ? this.data : [this.data],
    node,
  );

  this.fileNodeMap.set(fileWrapper, node);
  this.recentFilePaths.push(node.path);
  return fileWrapper;
};

TreeView.prototype.setupFileDropdown = function setupFileDropdown(
  node,
  anchor,
) {
  const self = this;
  const _toggle_three_dots = document.createElement('span');
  _toggle_three_dots.className = '_toggle_three_dots-horizontal';
  _toggle_three_dots.tabIndex = 0;
  _toggle_three_dots.setAttribute('role', 'button');
  _toggle_three_dots.ariaLabel = 'Open Dropdown';
  _toggle_three_dots.innerHTML = '<i class="icodex icodex-kebab-horizontal"/>';
  anchor.appendChild(_toggle_three_dots);

  const icodeXFileDropdown = new CustomDropdown(DROPDOWN_CONTAINERS, anchor);
  icodeXFileDropdown._group[0].option = [
    {
      value: new LangText({ id: 'salin', en: 'Copy' }).getText(),
      icon: 'icodex icodex-copy',
      id: 'copy-file',
    },
    {
      value: new LangText({ id: 'potong', en: 'Cut' }).getText(),
      icon: 'tb tb-scissors',
      id: 'cut-file',
    },
    {
      value: new LangText({ id: 'ubah nama', en: 'Rename' }).getText(),
      icon: 'bi bi-pencil',
      id: 'rename-file',
    },
    {
      value: new LangText({ id: 'salin path', en: 'Copy Path' }).getText(),
      icon: 'bi bi-copy',
      id: 'copy-path-file',
    },
  ];

  icodeXFileDropdown._group.push({
    label: 'group-2',
    option: [
      {
        value: new LangText({ id: 'hapus', en: 'Delete' }).getText(),
        icon: 'codicon codicon-trash',
        id: 'delete-this-file',
      },
    ],
  });

  _toggle_three_dots.addEventListener('click', event => {
    event.stopPropagation();
    event.preventDefault();
    //indrajit
    if (
      TreeView.currentOpenDropdown &&
      TreeView.currentOpenDropdown !== icodeXFileDropdown
    ) {
      TreeView.currentOpenDropdown.open(false);
    }

    const isOpen = DROPDOWN_CONTAINERS.classList.toggle('open');
    icodeXFileDropdown.open(isOpen);
    TreeView.currentOpenDropdown = isOpen ? icodeXFileDropdown : null;
  });

  this.parentDir.addEventListener('scroll', e => {
    e.stopPropagation();
    if (TreeView.currentOpenDropdown) {
      TreeView.currentOpenDropdown.open(false);
      TreeView.currentOpenDropdown = null;
    }
  });

  const hideDropdown = () => {
    TreeView.currentOpenDropdown &&
      (TreeView.currentOpenDropdown.open(!1),
      (TreeView.currentOpenDropdown = null));
  };

  document.removeEventListener('click', hideDropdown);
  //  document.addEventListener('click', hideDropdown);

  icodeXFileDropdown.addEventListener('optclick', e => {
    const clicked = e.detail.option;
    if ('rename-file' === clicked.id) {
      const newName = prompt('Rename file:', node.name);
      if (!newName || !newName.trim()) return;
      const trimmedName = newName.trim();
      const rootProject = self.findRootProject(self.data, node);
      if (!rootProject)
        return void console.error(
          'Root project tidak ditemukan saat rename file.',
        );
      const parentNode = self.findParentNode(rootProject, node);
      if (
        (parentNode?.children || []).some(
          child =>
            child !== node &&
            'file' === child.type &&
            child.name === trimmedName,
        )
      ) {
        return void alert(
          `File dengan nama "${trimmedName}" sudah ada di folder ini.`,
        );
      }
      const oldPath = node.path;
      node.name = trimmedName;
      const newPath = `${parentNode?.path || '/'}/${trimmedName}`.replace(
        /\/+/g,
        '/',
      );
      node.path = newPath;
      // (async () => {
      //   try {
      //     // Panggil fungsi untuk mengganti nama file di IndexedDB
      //     const result = await FileContentStorage.renameFile(
      //       rootProject.id,
      //       oldPath,
      //       newPath,
      //     );
      //     console.log(`File berhasil di-rename: ${result}`);
      //   } catch (error) {}
      // })();
      self.refreshAndSave(rootProject);
      // const renameEvent = new CustomEvent('file-renamed', {
      //   detail: {
      //     oldPath: oldPath,
      //     newPath: newPath,
      //     newName: trimmedName,
      //     type: node.type,
      //   },
      // });
      // document.dispatchEvent(renameEvent);
      console.log(`File berhasil di-rename dari ${oldPath} → ${newPath}`);

      const renameFiles = async () => {
        await renameFile(oldPath, newPath);
      };
      renameFiles();
    } else if ('copy-path-file' === clicked.id) {
      icodex.plugin?.clipboard?.copy(node.path);
    } else if ('delete-this-file' === clicked.id) {
      const type = node.type;
      const name = node.name;

      if (!window.confirm(`Yakin ingin menghapus ${type} "${name}"?`)) return;
      const rootProject = self.findRootProject(self.data, node);
      delete this.data.type;
      if (!rootProject)
        return void console.error('Root project tidak ditemukan.');
      const parentNode = self.findParentNode(rootProject, node);
      if (!parentNode || !Array.isArray(parentNode.children)) {
        return void console.error(
          'Parent node tidak ditemukan atau tidak valid.',
        );
      }
      const index = parentNode.children.findIndex(child => child === node);
      if (-1 !== index) {
        parentNode.children.splice(index, 1);
        self.refreshAndSave(rootProject);

        async function deleteFile() {
          await removeFile(node.path);
        }
        deleteFile();
        // (async () => {
        //   try {
        //     if (typeof FileContentStorage?.deleteContentByPath === 'function') {
        //       await FileContentStorage.deleteContentByPath(
        //         node.path,
        //         rootProject.id,
        //       );
        //       console.log(
        //         `[IndexedDB] File ${node.path} dihapus dari storage.`,
        //       );
        //     } else {
        //       console.warn(
        //         'Fungsi FileContentStorage.deleteContent tidak tersedia.',
        //       );
        //     }
        //   } catch (err) {
        //     console.error('Gagal menghapus file dari FileContentStorage:', err);
        //   }
        // })();
      } else {
        console.error(`${type} "${name}" tidak ditemukan di parent.`);
      }
    }
  });
};

TreeView.prototype.findParentNode = function findParentNode(
  currentNode,
  targetNode,
) {
  if (!currentNode || !currentNode.children) return null;
  for (const child of currentNode.children) {
    if (child === targetNode) return currentNode;
    if ('directory' === child.type) {
      const found = this.findParentNode(child, targetNode);
      if (found) return found;
    }
  }
  return null;
};

TreeView.prototype.getOpenFolderPaths = function getOpenFolderPaths() {
  const openFolders = [],
    nodes = document.querySelectorAll('.folder-item.open');
  for (const node of nodes) {
    const path = this.getFullPath(node);
    //
    path && openFolders.push(path), this.openPath.push(path);
  }
  return openFolders;
};

TreeView.prototype.getFullPath = function getFullPath(el) {
  const path = [];

  let current = el;
  while (current && !current.classList.contains('treeView')) {
    if (current.classList.contains('directory')) {
      // Ambil SPAN .folder-name DI DALAM .directory
      const nameEl = current.querySelector('.folder-name');
      if (nameEl) path.unshift(nameEl.textContent.trim());
    }
    current = current.parentElement;
  }
  return path.join('/');
};

TreeView.prototype.reopenFolders = function reopenFolders(paths) {
  document.querySelectorAll('.directory').forEach(dir => {
    const nameEl = dir.querySelector('.folder-item'),
      contentEl = dir.querySelector('.directory-content');
    if (!nameEl || !contentEl) return;

    const fullPath = this.getFullPath(nameEl);
    if (paths.includes(fullPath)) {
      nameEl.classList.add('open');
      contentEl.classList.add('open');
    }
  });
};

TreeView.prototype._replaceTree = function _replaceTree(newTreeElement) {
  const oldTree = document.querySelector('.treeView');

  oldTree &&
    oldTree.parentNode &&
    oldTree.parentNode.replaceChild(newTreeElement, oldTree);
};

/*TreeView.prototype.handleAddItem = async function handleAddItem(
  type,
  name,
  node,
  content
) {
  if (!name.trim()) return;

  const pathParts = name.trim().split('/').filter(Boolean);
  const isNested = pathParts.length > 1;

  if (type === 'directory' && isNested) {
    return void (await this.createNestedDirectory(name.trim(), node));
  }

  if (type === 'file' && isNested) {
    const fileName = pathParts.pop();
    const folderPath = pathParts.join('/');

    if (!fileName.trim()) return void console.warn('Nama file tidak valid.');
    
    const parentFolder = await this.createNestedDirectory(folderPath, node);
    return void (await this.handleAddItem(
      'file',
      fileName,
      parentFolder,
      content,
      
    ));
  }

  const rootProject = this.findRootProject(this.data, node);
  const fullPath = `${node.path || '/'}/${name.trim()}`.replace(/\/+/g, '/');

  console.debug(
    `[TreeView] ${
      type === 'directory' ? 'Folder' : 'File'
    } dibuat dengan path: ${fullPath}`,
  );

  const item = {
    type: type,
    name: name.trim(),
    path: fullPath,
    
  };

  if (type === 'directory') {
  item.children = [];
} else {
  if (typeof content === 'undefined' || content === null) {
  content = "";
}

const uint8 = typeof content === 'string'
  ? new TextEncoder().encode(content)
  : content;

// Simpan konten ke IndexedDB
if (typeof FileContentStorage === 'function') {
  if (!rootProject?.id) {
    console.error('[TreeView] Root project tidak ditemukan atau tidak memiliki ID');
  } else {
    await FileContentStorage.saveContent(fullPath, uint8, rootProject.id);
  }
} else {
  console.warn('class FileContentStorage tidak di definisikan');
}

  /*if (content === 'undefined') content = "";
  const uint8 =
    typeof content === 'string' ? new TextEncoder().encode(content) : content;

  if (typeof FileContentStorage === 'function') {
    if (!rootProject?.id) {
      console.error('[TreeView] Root project tidak ditemukan atau tidak memiliki ID');
    } else {
      await FileContentStorage.saveContent(fullPath, uint8, rootProject.id);
    }
  } else {
    console.warn('class FileContentStorage tidak di definisikan');
  }
}
*/
/*

  node.children = node.children || [];

  const isDuplicate = node.children.some(
    child => child.name === item.name && child.type === item.type,
  );

  if (isDuplicate) {
    console.warn(
      `${type === 'directory' ? 'Folder' : 'File'} "${item.name}" sudah ada.`,
    );
  } else {
    node.children.push(item);
    this.sortNodeChildren(node);

    if (rootProject) {
      await updateProject(rootProject);
      this.refreshTree();
    } else {
      console.error('Root project tidak ditemukan!');
    }
  }
};
*/

TreeView.prototype.handleAddItem = async function handleAddItem(
  type,
  name,
  node,
  content,
) {
  if (!name.trim()) return;
  console.log(node);
  const pathParts = name.trim().split('/').filter(Boolean);
  const isNested = pathParts.length > 1;

  if (type === 'directory' && isNested) {
    console.debug(`[TreeView] Membuat direktori nested: ${name.trim()}`);
    return void (await this.createNestedDirectory(name.trim(), node));
  }

  if (type === 'file' && isNested) {
    const fileName = pathParts.pop();
    const folderPath = pathParts.join('/');

    if (!fileName.trim()) return void console.warn('Nama file tidak valid.');

    const parentFolder = await this.createNestedDirectory(folderPath, node);

    async function saveFolders() {
      try {
        const result = await directory.add(parentFolder.path, node.id);
        console.log(`Path "${result}" berhasil ditambahkan!`);
      } catch (error) {
        console.error('Gagal menambahkan path:', error);
      }
    }
    saveFolders();
    return void (await this.handleAddItem(
      'file',
      fileName,
      parentFolder,
      content,
    ));
  }

  const rootProject = this.findRootProject(this.data, node);
  const fullPath = `${node.path || '/'}/${name.trim()}`.replace(/\/+/g, '/');
  const relativePath = `${node.relPath || '/'}/${name.trim()}`.replace(
    /\/+/g,
    '/',
  );
  console.debug(
    `[TreeView] ${
      type === 'directory' ? 'Folder' : 'File'
    } dibuat dengan path: ${fullPath}`,
  );

  const item = {
    type: type,
    name: name.trim(),
    path: fullPath,
    relPath: relativePath,
  };

  if (type === 'directory') {
    item.children = [];
    async function saveSingleFolder() {
      try {
        // const parentPath = node.path || 'idb'; // path parent
        await addDirectory(fullPath);

        console.log(`Path "${(fullPath, relativePath)}" berhasil ditambahkan!`);
      } catch (error) {
        console.error('Gagal menambahkan path:', error.message);
      }
    }
    saveSingleFolder();
  } else {
    const addf = async () => {
      await addFile(fullPath);
    };
    addf();

    // Jika content tidak diberikan, tampilkan form prompt untuk input awal
    if (typeof content === 'undefined' || content === null) {
      content = prompt(`Isi awal untuk file "${name.trim()}"?`, '') || '';
    }

    // Konversi string ke Uint8Array
    const uint8 =
      typeof content === 'string' ? new TextEncoder().encode(content) : content;
    const upFls = async () => {
      await updateFileContent(fullPath, uint8);
    };
    upFls();

    // Simpan ke IndexedDB via FileContentStorage
    // if (typeof FileContentStorage === 'function') {
    //   if (!rootProject?.id) {
    //     console.error(
    //       '[TreeView] Root project tidak ditemukan atau tidak memiliki ID',
    //     );
    //   } else {
    //     await FileContentStorage.saveContent(fullPath, uint8, rootProject.id);
    //   }
    // } else {
    //   console.warn('class FileContentStorage tidak di definisikan');
    // }
  }

  // Tambahkan node baru ke dalam children
  node.children = node.children || [];

  const isDuplicate = node.children.some(
    child => child.name === item.name && child.type === item.type,
  );

  if (isDuplicate) {
    console.warn(
      `${type === 'directory' ? 'Folder' : 'File'} "${item.name}" sudah ada.`,
    );
  } else {
    node.children.push(item);
    this.sortNodeChildren(node);

    if (rootProject) {
      await getProjectTree(rootProject.path);

      this.refreshTree();
    } else {
      console.error('Root project tidak ditemukan!');
    }
  }
};

TreeView.prototype.refreshTree = function refreshTree() {
  const openPaths = this.getOpenFolderPaths();
  const refreshedTree = this.renderTree();

  this._replaceTree(refreshedTree);
  this.reopenFolders(openPaths);
};
TreeView.prototype.refreshAndSave = function refreshAndSave(rootProject) {
  try {
    const openPaths = this.getOpenFolderPaths();
    const refreshedTree = this.renderTree();

    this._replaceTree(refreshedTree);
    this.reopenFolders(openPaths);
    //async () => await getProjectTree(rootProject.path);
    const unsubscribe = observeProjectTree(
      String(rootProject.path),
      tree => {},
    );
  } catch (e) {
    throw e;
  }

  //ini dia selalu memanggil update project lagi. yang sangat berat
};
TreeView.prototype._findPathInProjectTree = function _findPathInProjectTree(
  root,
  targetNode,
  currentPath = [],
) {
  if (root === targetNode)
    return currentPath.length ? [...currentPath, root.name].join('/') : '/';
  if (!root.children) return null;
  for (const child of root.children) {
    const result = this._findPathInProjectTree(child, targetNode, [
      ...currentPath,
      root.name,
    ]);
    if (result) return result;
  }
  return null;
};

TreeView.prototype.findRootProject = function findRootProject(
  projectList,
  targetNode,
) {
  for (const project of projectList) {
    if (this.containsNode(project, targetNode)) return project;
  }
  return null;
};

TreeView.prototype.containsNode = function containsNode(current, target) {
  return (
    current === target ||
    (!!current.children &&
      current.children.some(child => this.containsNode(child, target)))
  );
};

TreeView.prototype.createNestedDirectory = async function createNestedDirectory(
  path,
  rootNode,
) {
  const parts = path.split('/').filter(Boolean);
  let current = rootNode;
  for (const part of parts) {
    current.children || (current.children = []);
    let existing = current.children.find(
      child => child.name === part && 'directory' === child.type,
    );
    if (!existing) {
      const fullPath = `${current.path || '/'}/${part}`.replace(/\/+/g, '/');
      (existing = {
        type: 'directory',
        name: part,
        path: fullPath,
        children: [],
      }),
        current.children.push(existing);
      this.sortNodeChildren(current);
      // Simpan ke IndexedDB
      async function saveNestedDirectory() {
        try {
          const parentPath = rootNode.path || 'idb'; // path parent
          const finalName = part; // nama folder yg dibuat
          await addDirectory(fullPath);
          console.log(
            `Path "${parentPath}/${finalName}" berhasil ditambahkan!`,
          );
          const result = await directory.add(fullPath, rootNode.id);
          console.log(`Path "${result}" berhasil ditambahkan!`);
        } catch (error) {
          console.error('Gagal menambahkan path:', error);
        }
      }

      saveNestedDirectory();

      console.log(`[TreeView] Folder bertingkat dibuat: ${fullPath}`);
    }
    current = existing;
  }
  // Simpan ke DB setelah semua folder dibuat
  const rootProject = this.findRootProject(this.data, rootNode);
  if (rootProject) {
    //console.log(rootNode, '7777');
    //await getProjectTree(rootProject.path)
    //await updateProject(rootProject);
    // await updateProject(rootProject);
    this.refreshTree();
  }

  return current;
};

TreeView.prototype.sortNodeChildren = function sortNodeChildren(node) {
  node.children &&
    node.children.sort((a, b) =>
      a.type === b.type
        ? a.name.localeCompare(b.name)
        : 'directory' === a.type
        ? -1
        : 1,
    );
};

TreeView.prototype.addItemFromOutside = function addItemFromOutside(
  type,
  name,
  node,
  content = '',
) {
  return this.handleAddItem(type, name, node, content);
};

TreeView.prototype.instanceMethodCount = function instanceMethodCount() {
  return Object.getOwnPropertyNames(TreeView.prototype).filter(
    key => typeof this[key] === 'function' && key !== 'constructor',
  ).length;
};

document.body.appendChild(dialogWrapper);
window.dialogContainer = dialogWrapper;
