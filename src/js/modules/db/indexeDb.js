const DB_NAME = 'WorkspaceDB';
const DB_VERSION = 4;

export const PROJECT_STORE_NAME = 'projects';

export function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(PROJECT_STORE_NAME)) {
        db.createObjectStore(PROJECT_STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        console.log(`IndexedDB: Object store '${PROJECT_STORE_NAME}' dibuat.`);
      }

      if (!db.objectStoreNames.contains('tabsManager')) {
        db.createObjectStore('tabsManager', {
          keyPath: 'id',
          autoIncrement: true,
        });
        console.log(`IndexedDB: Object store '${'tabsManager'}' dibuat.`);
      }


      
      if (!db.objectStoreNames.contains('openedFilePaths')) {
        const store = db.createObjectStore('openedFilePaths', {
          keyPath: 'projectId',
        });
        store.createIndex('projectId', 'projectId', { unique: false });
        console.log(`IndexedDB: Object store 'openedFilePaths' dibuat.`);
      }

      if (!db.objectStoreNames.contains('files')) {
        const store = db.createObjectStore('files', {
          keyPath: 'id',
        });
        store.createIndex('projectId', 'projectId', { unique: false });
        store.createIndex('path', 'path', { unique: false });
        // Tambahkan indeks gabungan ini untuk performa yang lebih baik
        store.createIndex('pathAndProject', ['path', 'projectId'], {
          unique: false,
        });
      }

      // indexeDb.js
      if (!db.objectStoreNames.contains('directory')) {
        const store = db.createObjectStore('directory', {
          keyPath: 'path',
        });
        // Sekarang, 'store' bisa diakses di sini
        store.createIndex('projectId', 'projectId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}



export async function createTab(t) {
  const db = await openDb();
  const tx = db.transaction('tabsManager', 'readwrite');
  const store = tx.objectStore('tabsManager');
  const request = store.add(t);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function updateTabs(t) {
  const db = await openDb();
  const tx = db.transaction('tabsManager', 'readwrite');
  const store = tx.objectStore('tabsManager');
  const request = store.put(t);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getTabByIdProject(id) {
  const db = await openDb();
  const tx = db.transaction('tabsManager', 'readonly');
  const store = tx.objectStore('tabsManager');
  const request = store.get(id);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);

    request.onerror = () => reject(request.error);
  });
}

//---
export async function addFilePaths(projectId, filePath) {
  const db = await openDb();
  const tx = db.transaction('openedFilePaths', 'readwrite');
  const store = tx.objectStore('openedFilePaths');

  try {
    // Ambil data yang sudah ada berdasarkan projectId
    const existingData = await new Promise((resolve, reject) => {
      const getRequest = store.get(projectId);
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject(getRequest.error);
    });

    let updatedData;
    if (existingData) {
      // Jika data proyek sudah ada, perbarui array
      if (!existingData.openedFilePaths.includes(filePath)) {
        existingData.openedFilePaths.push(filePath);
      }
      updatedData = existingData;
    } else {
      // Jika data proyek belum ada, buat objek baru
      updatedData = {
        projectId: projectId,
        openedFilePaths: [filePath],
      };
    }

    // Gunakan store.put() untuk menambahkan atau memperbarui data
    const putRequest = store.put(updatedData);

    return new Promise((resolve, reject) => {
      putRequest.onsuccess = () => {
        console.log(
          `IndexedDB: File path '${filePath}' berhasil ditambahkan untuk proyek ${projectId}.`,
        );
        resolve(putRequest.result);
      };
      putRequest.onerror = () => reject(putRequest.error);
    });
  } catch (error) {
    console.error('Transaksi IndexedDB gagal:', error);
    return Promise.reject(error);
  } finally {
    tx.oncomplete = () => console.log('Transaksi IndexedDB selesai.');
  }
}

// indexeDb.js

export async function renameFilePath(projectId, oldPath, newPath) {
  const db = await openDb();
  const tx = db.transaction('openedFilePaths', 'readwrite');
  const store = tx.objectStore('openedFilePaths');

  try {
    const existingData = await new Promise((resolve, reject) => {
      const getRequest = store.get(projectId);
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject(getRequest.error);
    });

    if (existingData) {
      const index = existingData.openedFilePaths.indexOf(oldPath);
      if (index > -1) {
        existingData.openedFilePaths[index] = newPath;
      }
      await new Promise((resolve, reject) => {
        const putRequest = store.put(existingData);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      });
    }

    // Setelah berhasil, kirim event kustom
    window.dispatchEvent(
      new CustomEvent('file-renamed', {
        detail: { projectId, oldPath, newPath },
      }),
    );
  } catch (error) {
    console.error('Gagal memperbarui jalur file:', error);
    return Promise.reject(error);
  } finally {
    tx.oncomplete = () => console.log('Transaksi rename selesai.');
  }
}

export async function getFilePaths(projectId) {
  const db = await openDb();
  const tx = db.transaction('openedFilePaths', 'readonly');
  const store = tx.objectStore('openedFilePaths');
  const request = store.get(projectId);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      if (request.result) {
        console.log(request.result.projectId);

        resolve(request.result);
      } else {
        resolve([]);
      }
    };
    request.onerror = () => reject(request.error);
  });
}
// Asumsikan Anda memiliki ID proyek yang sedang aktif

// Panggil fungsi getFilePaths untuk mendapatkan daftar file yang dibuka
// getFilePaths(Number(currentProjectId))
//   .then(filePaths => {
//     console.log('Daftar jalur file yang dibuka:', filePaths
//     );

//     // Di sini, Anda bisa mengolah data yang didapat
//     // Contoh: membuat tab atau item di UI untuk setiap file
//     filePaths.forEach(path => {
//       console.log(`Membuat tab untuk file: ${path}`);
//       // Lanjutkan dengan logika untuk menampilkan tab
//     });
//   })
//   .catch(error => {
//     console.error('Gagal mengambil jalur file:', error);
//   });

//---
export async function clearFilePaths(projectId) {
  const db = await openDb();
  const tx = db.transaction('openedFilePaths', 'readwrite');
  const store = tx.objectStore('openedFilePaths');
  const request = store.get(projectId);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      if (request.result) {
        request.result.openedFilePaths = [];
        const updateRequest = store.put(request.result);
        updateRequest.onsuccess = () => {
          console.log(
            `IndexedDB: File paths untuk proyek ${projectId} telah dihapus.`,
          );
          resolve();
        };
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        console.log(
          `IndexedDB: Tidak ada file paths untuk proyek ${projectId}.`,
        );
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getAllProjects() {
  const db = await openDb();
 
  const tx = db.transaction(PROJECT_STORE_NAME, 'readonly');
  const store = tx.objectStore(PROJECT_STORE_NAME);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

//---
export async function addProject(project) {
  const db = await openDb();
  const tx = db.transaction(PROJECT_STORE_NAME, 'readwrite');
  const store = tx.objectStore(PROJECT_STORE_NAME);
  const request = store.add(project);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const obj = JSON.parse(
  '{"type":"directory","name":"apk11","path":"/","children":[{"type":"directory","name":"indra","path":"/indra","children":[{"type":"file","name":"main.jsx","path":"/indra/main.jsx"}]}],"createdAt":1755430506062,"id":11,"processed":true}',
);

//---
//ini selalu mengembalikan project semua struktur nya
//parameter project mengembalikan struktur project setelah ada file atau folder baru
export async function updateProject(project) {

  const db = await openDb();
  const tx = db.transaction(PROJECT_STORE_NAME, 'readwrite');
  const store = tx.objectStore(PROJECT_STORE_NAME);
  const request = store.put(project);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve();

      window.dispatchEvent(
        new CustomEvent('refresh-content', {
          detail: { path: project.path },
        }),
      );
    };
    request.onerror = () => reject(request.error);
  });
}

//---



export async function getProjectById(id) {
  const db = await openDb();
  const tx = db.transaction(PROJECT_STORE_NAME, 'readonly');
  const store = tx.objectStore(PROJECT_STORE_NAME);
  const request = store.get(id);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export class directory {
  static async add(path, rootnodeId) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const entry = {
        ctimeMs: Date.now(),
        mtimeMs: Date.now(),
        path,
        projectId: rootnodeId,
      };
      const tx = db.transaction('directory', 'readwrite');
      const store = tx.objectStore('directory');
      const request = store.put(entry);
      request.onsuccess = () => resolve(path);
      request.onerror = () => reject(request.error);
    });
  }

  
  static async rename(oldPath, newPath, projectId) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['directory'], 'readwrite');
      const store = tx.objectStore('directory');

      // Gunakan cursor dengan range yang mencakup semua sub-folder
      const range = IDBKeyRange.bound(
        oldPath,
        oldPath + '\uffff',
        false,
        false,
      );
      const cursorRequest = store.openCursor(range);

      cursorRequest.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
          const entry = cursor.value;

          // Buat path baru untuk entri ini
          const relativePath = entry.path.substring(oldPath.length);
          const updatedPath = newPath + relativePath;

          // Buat entri baru untuk mengganti yang lama
          const newEntry = {
            ...entry,
            path: updatedPath,
            mtimeMs: Date.now(),
            projectId,
          };

          // Hapus entri lama
          const deleteReq = store.delete(entry.path);
          deleteReq.onsuccess = () => {
            // Tambahkan entri baru
            store.add(newEntry);
          };

          cursor.continue(); // Lanjutkan ke entri berikutnya
        } else {
          console.log(
            `[IndexedDB] Rename folder di 'directory' store selesai.`,
          );
          resolve(newPath);
        }
      };

      cursorRequest.onerror = event => reject(event.target.error);
      tx.oncomplete = () => console.log('Transaksi directory rename selesai.');
    });
  }
}

const request1 = indexedDB.deleteDatabase('WorkspaceDB2');

request1.onsuccess = () => {
  console.log('Database berhasil dihapus');
};

request1.onerror = event => {
  console.error('Gagal menghapus database:', event);
};

request1.onblocked = () => {
  console.warn('Database masih dibuka di tab lain');
};

// deleteProject(1)
export async function deleteProject(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(PROJECT_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
      window.dispatchEvent(
        new CustomEvent('refresh-content', {
          detail: { path: '' },
        }),
      );
    };
    request.onerror = () => reject(request.error);

    tx.oncomplete = () =>
      console.log('IndexedDB: Transaksi deleteProject selesai.');
  });
}
