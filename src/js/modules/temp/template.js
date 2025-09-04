const templateHtml = /* HTML */ `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Document</title>
</head>
<body>
	
    <script>
      import { Dexie } from './dexie.min.mjs';
import { templateHtml } from '../temp/template.js';
const db = new Dexie('DataBase1');
db.version(1).stores({
  directory: 'path',
  data: 'fid',
  files: 'id, path,fid',
});

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

function template(projectName) {
  var dataName = projectName || 'HTML';
  var data = {
    dir: 'idb/' + dataName,
    git: false,
    modifiedAt: Date.now(),
  };
  return data;
}

async function initialize() {
  await safeAdd('idb');
  await safeAdd('idb/.metadata/.info');
  await safeAdd('idb/.metadata/.sessions');
  await safeAdd('idb/.tmp');
  await safeAdd('idb/.settings');

  
}

initialize();

// Buat template default project saat user pertama kali buat project 

 function defaultContent() {
  return {
    bom: false,
    encoding: 'binary',
    fid: randomCode(26),
    text: "",
  };
}

/**
 * Ambil semua project dari IndexedDB
 *
 * @returns {Promise<Array>} - Array of project object
 */
async function getProjects() {
  // Ambil record terakhir (karena kita simpan semua project dalam satu record)
  const record = await db.data.orderBy('fid').reverse().first();
  if (!record) return []; // Kalau belum ada, balikin array kosong

  try {
    // Parse string JSON → array object
    return JSON.parse(record.text);
  } catch (e) {
    console.error('Gagal parse projects:', e);
    return [];
  }
}

/**
 * Simpan semua project ke IndexedDB
 *
 * @param {Array} projects - Array of project object yang mau disimpan
 */
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
async function createNewProject(projectName) {
  const projects = await getProjects(); // Ambil semua project

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

try {
  console.log(await findProject('Bootstrap 5'));
} catch (error) {}


// Pastikan parent folder ada
async function ensureDirectory(fullPath) {
  const parts = fullPath.split('/');
  parts.pop(); // buang nama file, sisain folder
  let currentPath = '';

  for (const part of parts) {
    currentPath = currentPath ? currentPath + '/' + part : part;

    const exists = await db.directory.get(currentPath);
    if (!exists) {
      const now = Date.now();
      await db.directory.add({
        path: currentPath,
        name: part,
        createdAt: now,
        ctimeMs: now,
        mtimeMs: now,
      });
    }
  }
}

// Tambah file ke store files

// async function addFile(fullPath, size = 0, text = '') {
//   const parts = fullPath.split('/');
//   parts.pop(); // buang nama file
//   let currentPath = '';

//   // Buat semua folder intermediate
//   for (const part of parts) {
//     currentPath = currentPath ? currentPath + '/' + part : part;
//     await addDirectory(currentPath); // pakai fungsi lama
//   }

//   // Cek apakah file sudah ada
//   const exists = await db.files.where('path').equals(fullPath).first();
//   if (exists) {
//     console.warn("File sudah ada:", fullPath);
//     return exists;
//   }

//   const now = Date.now();
//   const id = randomCode(26);
//   const fid = id;
//   const name = fullPath.split('/').pop();

//   await db.files.add({
//     id,
//     fid,
//     path: fullPath,
//     name,
//     createdAt: now,
//     ctimeMs: now,
//     mtimeMs: now,
//     encoding: 'utf8',
//     size,
//     text,
//     mode: undefined,
//     target: undefined
//   });

//   return { id, fid, path: fullPath, name, size, text };
// }


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
    console.warn("File sudah ada:", fullPath);
    return exists;
  }

  const now = Date.now();
  const id = randomCode(26); // primary key unik
  const fid = id;             // turunan / referensi pakai fid = id
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
    target: undefined
  });

  // Simpan content file di store data (default kosong)
  await db.data.add({
    fid,
    bom: false,
    encoding: 'binary',
    text: "",
    ctimeMs: now,
    mtimeMs: now
  });

  return { id, fid, path: fullPath, name, size };
}

 await addFile("idb/HTML/src/index.html", 1024);


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
    console.warn("File tidak ditemukan:", filePath);
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
    mtimeMs: now
  };

  if (existingData) {
    await db.data.update(fid, newData);
  } else {
    await db.data.add(newData);
  }

  // Update metadata file (mtimeMs)
  await db.files.update(fid, { mtimeMs: now, size: typeof content === 'string' ? content.length : content.byteLength });

  return newData;
}


await updateFileContent("idb/HTML/src/index.html", templateHtml);
 


// Ambil data
const fileData = await db.data.where('fid').equals((await db.files.where('path').equals("idb/HTML/src/index.html").first()).fid).first();
console.log(fileData.text); // isi file terbaru

const fileMeta = await db.files.where('path').equals("idb/HTML/src/index.html").first();
console.log(fileMeta.mtimeMs); // waktu update terbaru



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
export { db, randomCode, addDirectory };

















// async function addFiles(relativePath) {
//   const record = await db.data.orderBy('fid').reverse().first();
//   console.log(record);
// }
// addFiles();
// async function openFilePaths(relativePath) {}

// async function unpinnedTabs(relativePath) {}

    </script>
</body>
</html>`;


export { templateHtml }
