//import '../../../../cdn_modules/dexie@4.2.0/dexie.min.js';
import { templateHtml } from '../temp/template.js';
import { Dexie, liveQuery } from '../db/dexie.min.js';
const db = new Dexie('DataBase3');
db.version(1).stores({
  directory: 'path',
  data: 'fid',
  files: 'id, path,fid',
});

//updateSettings('text.language', "id")

function randomCode(length = 25) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    // Ambil karakter acak dari chars
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }

  return result;
}
async function safeAdd(path) {
  const exists = await db.directory.get(path);
  if (!exists) {
    await db.directory.add({
      path,
      ctimeMs: Date.now(),
      mtimeMs: Date.now(),
    });
  }
}

// Buat template default project saat user pertama kali buat project

async function initialize() {
  await safeAdd('idb');
  await safeAdd('idb/.metadata/.info');
  await safeAdd('idb/.metadata/.sessions');
  await safeAdd('idb/.tmp');
  await safeAdd('idb/.settings');
}
initialize();

async function saveProjects(projects) {
  const record = await db.data.orderBy('fid').reverse().first();

  if (!record) {
    //pangil  default content disini
    // await db.data.put(defaultContent());
    // Kalau record belum ada → buat baru
    await db.data.put({
      encoding: 'utf8',
      fid: randomCode(26), // primary key unik
      text: JSON.stringify(projects), // simpan sebagai string JSON
      ctimeMs: Date.now(),
      mtimeMs: Date.now(),
    });
  } else {
    //Kalau udah ada content update
    // await db.data.update(record.fid, defaultContent());
    // Kalau sudah ada → update record lama
    await db.data.update(record.fid, {
      text: JSON.stringify(projects),
      mtimeMs: Date.now(),
    });
  }
}

/**
 * Tambah project baru (hanya butuh nama project)
 *
 * @param {string} projectName - Nama project baru
 */

// Helper untuk cek apakah path valid project atau folder hidden
function isValidProjectDir(dir) {
  // abaikan folder hidden (.tmp, .metadata, .settings, dsb.)
  return !(
    (
      dir.startsWith('idb/.') || // semua folder diawali titik
      dir === 'idb'
    ) // root indexdb
  );
}

async function getProjects() {
  // ambil semua record dari store data
  const records = await db.data.toArray();
  if (!records.length) return [];

  for (let i = records.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(records[i].text);

      // hanya valid kalau hasil parse adalah array of projects
      if (Array.isArray(parsed)) {
        return parsed.filter(p => isValidProjectDir(p.dir));
      }
    } catch (e) {
      console.warn('Skip record corrupt:', e.message);
      continue;
    }
  }

  return []; // kalau gak ada array valid
}

async function createNewProject(projectName) {
  const projects = await getProjects(); // ambil semua project valid

  const newDir = 'idb/' + (projectName || 'Untitled');

  // cegah masukin project hidden
  if (!isValidProjectDir(newDir)) {
    console.warn('Folder tidak valid untuk project:', newDir);
    return null;
  }

  const newProject = {
    dir: newDir,
    git: false,
    modifiedAt: Date.now(),
  };

  projects.push(newProject);
  await saveProjects(projects);

  console.log('Project berhasil ditambahkan:', newProject);
  return newProject;
}

/*async function createNewProject(projectName) {
  const projects = await getProjects(); // Ambil semua project
  console.log(projects)
  // Buat object project baru
  const newProject = {
    dir: 'idb/' + (projectName || 'Untitled'),
    git: false,
    modifiedAt: Date.now(),
  };

  projects.push(newProject); // Tambahkan ke array
  await saveProjects(projects); // Simpan balik ke DB

  console.log('Project berhasil ditambahkan:', newProject);
}
*/
/**
 * Cari project berdasarkan nama
 *
 * @param {string} projectName - Nama project yang mau dicari
 * @returns {object|null} - Object project atau null kalau tidak ada
 */
async function findProject(projectName) {
  const projects = await getProjects(); // Ambil semua project

  // Cari yang sesuai
  const project = projects.find(p => p.dir === 'idb/' + projectName);

  return project || null;
}

/**
 * Hapus project berdasarkan nama
 *
 * @param {string} projectName - Nama project yang mau dihapus
 */
async function removeProject(projectName) {
  const projects = await getProjects(); // Ambil semua project

  // Filter: sisakan semua project kecuali yang mau dihapus
  const updatedProjects = projects.filter(p => p.dir !== 'idb/' + projectName);

  // Simpan balik hasil filter
  await saveProjects(updatedProjects);

  console.log('Project berhasil dihapus:', projectName);
}

// Update project tertentu (merge data baru)
async function updateProject(projectName, newData = {}) {
  const projects = await getProjects();
  const index = projects.findIndex(p => p.dir === 'idb/' + projectName);

  if (index === -1) {
    console.warn('Project tidak ditemukan:', projectName);
    return projects;
  }

  // merge data lama dengan data baru
  projects[index] = {
    ...projects[index],
    ...newData,
    modifiedAt: Date.now(), // selalu update waktu
  };

  await saveProjects(projects);
  return projects[index]; // kembalikan project yang sudah diupdate
}

export {
  getProjects,
  saveProjects,
  createNewProject,
  removeProject,
  findProject,
  updateProject,
};

async function addFile(fullPath, size = 0) {
  const parts = fullPath.split('/');
  parts.pop(); // buang nama file
  let currentPath = '';

  // Buat semua folder intermediate
  for (const part of parts) {
    currentPath = currentPath ? currentPath + '/' + part : part;
    await addDirectory(currentPath); // pakai fungsi lama
  }

  // Cek apakah file sudah ada
  const exists = await db.files.where('path').equals(fullPath).first();
  if (exists) {
    console.warn('File sudah ada:', fullPath);
    return exists;
  }

  const now = Date.now();
  const id = randomCode(26); // primary key unik
  const fid = id; // turunan / referensi pakai fid = id
  const name = fullPath.split('/').pop();

  // Simpan metadata file di store files
  await db.files.add({
    id,
    fid,
    path: fullPath,
    name,

    createdAt: now,
    ctimeMs: now,
    mtimeMs: now,
    encoding: 'utf8',
    size,
    mode: undefined,
    target: undefined,
  });

  // Simpan content file di store data (default kosong)
  await db.data.add({
    fid,
    bom: false,
    encoding: 'binary',
    text: '',
    ctimeMs: now,
    mtimeMs: now,
  });

  return { id, fid, path: fullPath, name, size };
}

//  await addFile("idb/HTML/src/index.html", 1024);

/**
 * Update atau simpan content file
 * @param {string} filePath - fullPath file
 * @param {string|Uint8Array} content - isi file baru
 * @param {object} options - optional: {bom, encoding}
 */
async function updateFileContent(filePath, content, options = {}) {
  // Ambil metadata file
  const file = await db.files.where('path').equals(filePath).first();
  if (!file) {
    console.warn('File tidak ditemukan:', filePath);
    return null;
  }

  const now = Date.now();
  const fid = file.fid;

  // Update atau tambah content di store data
  const existingData = await db.data.where('fid').equals(fid).first();
  const newData = {
    fid,
    bom: options.bom ?? false,
    encoding: options.encoding ?? 'binary',
    text: content,
    ctimeMs: existingData ? existingData.ctimeMs : now,
    mtimeMs: now,
  };

  if (existingData) {
    await db.data.update(fid, newData);
  } else {
    await db.data.add(newData);
  }

  // Update metadata file (mtimeMs)
  await db.files.update(fid, {
    mtimeMs: now,
    size: typeof content === 'string' ? content.length : content.byteLength,
  });

  return newData;
}

export { updateFileContent, addFile };

// await updateFileContent("idb/Icodex-editor-beta.v1.1.1/src/assets/css/app.css", templateHtml);

// Ambil data
/**
 * Baca file dari IndexedDB berdasarkan path
 * @param {string} path - path file di db.files
 * @returns {Promise<string|null>} isi file sebagai string UTF-8, atau null kalau file tidak ada
 */
export async function readFileByPath(path) {
  // Cari record file di db.files
  const fileRecord = await db.files.where('path').equals(path).first();
  if (!fileRecord) {
    console.warn('File belum ada:', path);
    return null;
  }

  // Ambil konten dari db.data sesuai fid
  const fileData = await db.data.where('fid').equals(fileRecord.fid).first();
  if (!fileData?.text) return '';

  // Convert ArrayBuffer ke string UTF-8
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(fileData.text);
}

async function addDirectory(fullPath) {
  const exists = await db.directory.get(fullPath);
  if (!exists) {
    const now = Date.now();
    await db.directory.add({
      path: fullPath,
      name: fullPath.split('/').pop(), // ambil nama terakhir
      createdAt: now,
      ctimeMs: now,
      mtimeMs: now,
    });
  }
}

/**
 * Rename folder dan update semua path file yang ada di dalam folder itu
 * @param {string} oldPath - full path folder lama
 * @param {string} newPath - full path folder baru
 */
async function renameDirectory(oldPath, newPath) {
  // 1. Update record directory
  const dirRecord = await db.directory.where('path').equals(oldPath).first();
  if (!dirRecord) {
    console.warn('Directory tidak ditemukan:', oldPath);
    return;
  }

  await db.directory.update(oldPath, {
    path: newPath,
    name: newPath.split('/').pop(),
    mtimeMs: Date.now(),
  });

  // 2. Update semua sub-directory yang path-nya diawali oldPath
  const subDirs = await db.directory
    .filter(d => d.path.startsWith(oldPath + '/'))
    .toArray();
  for (const sub of subDirs) {
    const newSubPath = sub.path.replace(oldPath, newPath);
    await db.directory.update(sub.path, {
      path: newSubPath,
      mtimeMs: Date.now(),
    });
  }

  // 3. Update semua file di folder lama
  const files = await db.files
    .filter(f => f.path.startsWith(oldPath + '/'))
    .toArray();
  for (const f of files) {
    const newFilePath = f.path.replace(oldPath, newPath);
    await db.files.update(f.fid, { path: newFilePath, mtimeMs: Date.now() });
  }

  console.log(`Folder berhasil di-rename: ${oldPath} → ${newPath}`);
}

/**
 * Rename file dan update path-nya di files
 * @param {string} oldPath - full path file lama
 * @param {string} newPath - full path file baru
 */
async function renameFile(oldPath, newPath) {
  const file = await db.files.where('path').equals(oldPath).first();
  if (!file) {
    console.warn('File tidak ditemukan:', oldPath);
    return;
  }

  await db.files.update(file.fid, {
    path: newPath,
    name: newPath.split('/').pop(),
    mtimeMs: Date.now(),
  });
  console.log(`File berhasil di-rename: ${oldPath} → ${newPath}`);
}

/**
 * Hapus file beserta data isinya
 * @param {string} filePath - fullPath file
 */
async function removeFile(filePath) {
  const file = await db.files.where('path').equals(filePath).first();
  if (!file) {
    console.warn('File tidak ditemukan:', filePath);
    return;
  }

  const fid = file.fid;

  // Hapus metadata di files
  await db.files.delete(fid);

  // Hapus isi file di data
  await db.data.where('fid').equals(fid).delete();

  console.log(`File berhasil dihapus: ${filePath}`);
}

/**
 * Hapus folder beserta semua sub-folder dan file
 * @param {string} dirPath - fullPath folder
 */
async function removeDirectory(dirPath) {
  // 1. Hapus semua sub-folder
  const subDirs = await db.directory
    .filter(d => d.path.startsWith(dirPath + '/'))
    .toArray();
  for (const sub of subDirs) {
    await db.directory.delete(sub.path);
  }

  // 2. Hapus folder itu sendiri
  await db.directory.delete(dirPath);

  // 3. Hapus semua file di folder itu dan subfolder
  const files = await db.files
    .filter(f => f.path.startsWith(dirPath + '/'))
    .toArray();
  for (const f of files) {
    await db.data.where('fid').equals(f.fid).delete(); // hapus isi file
    await db.files.delete(f.fid); // hapus metadata file
  }

  console.log(`Directory berhasil dihapus: ${dirPath}`);
}

/**
 * Import file(s) ke project
 * @param {File[]} fileList - array File dari input / drag-drop
 * @param {string} projectRoot - folder root project (contoh: "idb/HTML")
 */
/**
 * Import file(s) ke project
 * @param {File[]} fileList - array File dari input / drag-drop
 * @param {string} projectRoot - folder root project (contoh: "idb/HTML")
 */
/**
 * Import file(s) ke folder target
 * @param {File[]} fileList - array File dari input / drag-drop
 * @param {string} targetFolder - folder relatif di project (misal "idb/HTML/w")
 */
async function importFile(fileList, targetFolder) {
  const now = Date.now();

  // --- STEP 1: Pastikan folder target ada di directory ---
  const exists = await db.directory.get(targetFolder);
  if (!exists) {
    await db.directory.add({
      path: targetFolder,
      name: targetFolder.split('/').pop(),
      ctimeMs: now,
      mtimeMs: now,
    });
  }

  // --- STEP 2: Tambahkan setiap file ke files + data ---
  for (const file of fileList) {
    const fullPath = `${targetFolder}/${file.name}`;
    const existingFile = await db.files.where('path').equals(fullPath).first();

    if (!existingFile) {
      // Simpan metadata file
      const id = randomCode(26);
      const fid = id;

      await db.files.add({
        id,
        fid,
        path: fullPath,
        name: file.name,
        size: file.size,
        ctimeMs: now,
        mtimeMs: now,
      });

      // Simpan isi file
      const arrayBuffer = await file.arrayBuffer();
      await db.data.add({
        fid,
        encoding: 'binary',
        bom: false,
        text: arrayBuffer,
        ctimeMs: now,
        mtimeMs: now,
      });

      console.log(`✅ File baru diimport: ${fullPath}`);
    } else {
      console.warn(`⚠️ File sudah ada, skip: ${fullPath}`);
    }
  }
}

/**
 * Ambil semua root project (non-child) dari db.directory
 * Misal: "idb/HTML", "idb/HTML-1", dst.
 */
export async function getAllProject() {
  const dirs = await db.directory.toArray();
  // Filter hanya root project = idb/<ProjectName>
  const projects = dirs.filter(d => {
    if (d.path.startsWith('idb/.')) return;
    const parts = d.path.split('/');
    return parts.length === 2; // contoh: ["idb", "HTML"]
  });

  // Format sederhana untuk debug
  return projects.map(p => ({
    name: p.name,
    path: p.path,
    createdAt: p.createdAt,
  }));
}

(async () => {
  const projects = await getAllProject();
  console.log('Daftar Project Root:', projects);
})();

/**
 * Ambil struktur treeview dari project berdasarkan path root
 * @param {string} projectPath contoh: "idb/HTML"
 */
/**
 * Ambil struktur treeview dari project berdasarkan path root
 * @param {string} projectPath contoh: "idb/HTML"
 */
// async function getProjectTree(projectPath) {
//   const dirs = await db.directory.toArray();
//   const files = await db.files.toArray();

//   // Gabungkan semua node di bawah projectPath
//   const all = [
//     ...dirs.filter(d => d.path.startsWith(projectPath)),
//     ...files.filter(f => f.path.startsWith(projectPath))
//   ];

//   function buildTree(basePath) {
//     const children = [];

//     for (const item of all) {
//       // Skip root
//       if (item.path === basePath) continue;

//       // Ambil relative path dari base
//       const relPath = item.path.slice(basePath.length + 1);
//       if (!relPath) continue;

//       const parts = relPath.split("/");
//       if (parts.length === 1) {
//         // Level 1 child
//         const isFile = "size" in item; // files punya "size"
//         children.push({
//           type: isFile ? "file" : "directory",
//           name: item.name,
//           path: item.path,
//           children: isFile ? undefined : buildTree(item.path)
//         });
//       }
//     }

//     return children;
//   }

//   return {
//     type: "directory",
//     name: projectPath.split("/").pop(),
//     path: projectPath,
//     children: buildTree(projectPath)
//   };
// }

// function buildTree(basePath) {
//   const children = [];

//   for (const item of all) {
//     // Skip root
//     if (item.path === basePath) continue;

//     // Ambil relative path dari base
//     const relPath = item.path.slice(basePath.length + 1);
//     if (!relPath) continue;

//     const parts = relPath.split('/');
//     if (parts.length === 1) {
//       // Cek file / directory
//       const isFile = 'size' in item;
//       children.push({
//         type: isFile ? 'file' : 'directory',
//         name: item.name,
//         path: item.path, // absolute
//         relPath: item.path.slice(projectPath.length), // relative dari root
//         children: isFile ? undefined : buildTree(item.path),
//       });
//     }
//   }

//   return children;
// }
// export async function getProjectTree(projectPath) {
//   const dirs = await db.directory.toArray();
//   const files = await db.files.toArray();

//   // Gabungkan semua node di bawah projectPath
//   const all = [
//     ...dirs.filter(d => d.path.startsWith(projectPath)),
//     ...files.filter(f => f.path.startsWith(projectPath)),
//   ];

// function buildTree(basePath) {
//   const children = [];

//   for (const item of all) {
//     if (item.path === basePath) continue; // skip diri sendiri

//     const parentPath = item.path.substring(0, item.path.lastIndexOf('/'));
//     if (parentPath !== basePath) continue; // pastikan parent tepat

//     const isFile = 'size' in item;
//     children.push({
//       type: isFile ? 'file' : 'directory',
//       name: item.name,
//       path: item.path,
//       relPath: item.path.slice(projectPath.length), // rel dari root
//       children: isFile ? [] : buildTree(item.path),
//     });
//   }

//   return children;
// }

//   return {
//     type: 'directory',
//     name: projectPath.split('/').pop(),
//     path: projectPath, // absolute
//     relPath: '/', // root selalu "/"
//     children: buildTree(projectPath),
//   };
// }
export async function getProjectTree(projectPath) {
  const dirs = await db.directory.toArray();
  const files = await db.files.toArray();

  // Gabungkan semua node di bawah projectPath
  const all = [
    ...dirs.filter(d => d.path.startsWith(projectPath)),
    ...files.filter(f => f.path.startsWith(projectPath)),
  ];

  function buildTree(basePath) {
    const children = [];

    for (const item of all) {
      if (item.path === basePath) continue; // skip diri sendiri

      const parentPath = item.path.substring(0, item.path.lastIndexOf('/'));
      if (parentPath !== basePath) continue; // pastikan parent tepat

      const isFile = 'size' in item;
      children.push({
        type: isFile ? 'file' : 'directory',
        name: item.name,
        path: item.path,
        relPath: item.path.slice(projectPath.length), // rel dari root
        children: isFile ? [] : buildTree(item.path), // rekursif buat folder
      });
    }

    // 🔥 Urutkan: folder dulu lalu file, masing-masing urut abjad/angka
    children.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1; // folder dulu
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
    return children;
  }

  // >>> full struktur project
  return {
    type: 'directory',
    name: projectPath.split('/').pop(), // nama folder project
    path: projectPath, // absolute
    relPath: '/', // root relpath selalu "/"
    children: buildTree(projectPath), // isi folder
  };
}

async () => {
  const tree = await getProjectTree('idb/html');
  console.log(tree, 898989898);
};

export function observeProjectTree(projectPath, callback) {
  return liveQuery(async () => {
    const dirs = await db.directory.toArray();
    const files = await db.files.toArray();

    const all = [
      ...dirs.filter(d => d.path.startsWith(projectPath)),
      ...files.filter(f => f.path.startsWith(projectPath)),
    ];

    function buildTree(basePath) {
      const children = [];

      for (const item of all) {
        if (item.path === basePath) continue;
        const relPath = item.path.slice(basePath.length + 1);
        if (!relPath) continue;

        const parts = relPath.split('/');
        if (parts.length === 1) {
          const isFile = 'size' in item;
          children.push({
            type: isFile ? 'file' : 'directory',
            name: item.name,
            path: item.path,
            relPath: item.path.slice(projectPath.length),
            children: isFile ? undefined : buildTree(item.path),
          });
        }
      }
      return children;
    }

    return {
      type: 'directory',
      name: projectPath.split('/').pop(),
      path: projectPath,
      relPath: '/',
      children: buildTree(projectPath),
    };
  }).subscribe({
    next: tree => callback(tree),
    error: err => console.error('observeProjectTree error', err),
  });
}

// di homepage/editor
/*const unsubscribe = observeProjectTree('idb/HTML', tree => {
  console.log('Tree updated:', tree);
  
  // renderProjectTree(tree); // langsung update UI
})*/

// kalau udah ga dipake
// unsubscribe();

// Helper: cek apakah path punya folder tersembunyi
function isHiddenPath(path) {
  // pecah path by "/", lalu cek kalau ada segmen yang diawali "."
  return path.split('/').some(seg => seg.startsWith('.'));
}

// Ambil project terbaru (root) yang tidak hidden
export async function getLatestProject() {
  const dirs = await db.directory.toArray();

  // Filter: hanya root-level project (tanpa "/") dan bukan hidden
  const projects = dirs.filter(d => {
    const parts = d.path.split('/');
    return parts.length === 2 && !isHiddenPath(d.path);
  });

  if (projects.length === 0) return null;

  // Urutkan by createdAt terbaru
  projects.sort((a, b) => b.createdAt - a.createdAt);

  return projects[0] || null;
}

// Kalau langsung mau TreeView dari project terbaru
// export async function getLatestProjectTree() {
//   const latest = await getLatestProject();
//   if (!latest) return null;

//   return await getProjectTree(latest.path);
// }

// Cara Penggunaan fungsi
// --- contoh debug ---
async () => {
  const latest = await getLatestProject();
  console.log('Project terbaru:', latest);

  // const tree = await getLatestProjectTree();
  // console.log("Tree project terbaru:", tree);
};

export {
  db,
  randomCode,
  addDirectory,
  renameFile,
  renameDirectory,
  removeFile,
  removeDirectory,
  importFile,
};

// async function addFiles(relativePath) {
//   const record = await db.data.orderBy('fid').reverse().first();
//   console.log(record);
// }
// addFiles();
// async function openFilePaths(relativePath) {}

// async function unpinnedTabs(relativePath) {}
