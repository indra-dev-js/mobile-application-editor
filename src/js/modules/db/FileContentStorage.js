import { openDb } from './indexeDb.js';

function generateId() {
  return crypto.randomUUID(); // atau Math.random().toString(36).substring(2, 16);
}

// export class FileContentStorage {
//   // Simpan file baru atau overwrite jika path+projectId sudah ada
//   static async saveContent(path, contentUint8Array, projectId) {
//     const db = await openDb();
//     const index = db.transaction("files", "readonly").objectStore("files").index("path");

//     return new Promise((resolve, reject) => {
//       const getReq = index.get(path);
//       getReq.onsuccess = () => {
//         const existing = getReq.result;
//         const id = existing?.projectId === projectId ? existing.id : crypto.randomUUID();

//         const entry = {
//           id,
//           fid: id, // optional mirror seperti SPCK
//           path,
//           projectId,
//           content: contentUint8Array,
//           ctimeMs: existing?.ctimeMs || Date.now(),
//           mtimeMs: Date.now(),
//           size: contentUint8Array.byteLength || 0,
//         };

//         const tx = db.transaction("files", "readwrite");
//         const store = tx.objectStore("files");
//         const putReq = store.put(entry);

//         putReq.onsuccess = () => resolve(id);
//         putReq.onerror = () => reject(putReq.error);
//       };
//       getReq.onerror = () => reject(getReq.error);
//     });
//   }

//   // Ambil konten berdasarkan path dan projectId
//   static async getContent(path, projectId) {
//   const db = await openDb();

//   return new Promise((resolve, reject) => {
//     try {
//       const tx = db.transaction("files", "readonly");
//       const store = tx.objectStore("files");
//       const request = store.getAll();

//       request.onsuccess = () => {
//         const list = request.result;
//         const match = list.find(
//   item => item.path === path && String(item.projectId) === String(projectId)
// );

//         if (match) {
//           console.log("[getContent] Match ditemukan:", match);

// console.warn("[getContent] Dipanggil dengan:", { path, projectId });

//           resolve(match.content || new Uint8Array());
//         } else {
//           console.warn("[getContent] Tidak ditemukan:", { path, projectId });
//           console.warn("[getContent] Dipanggil dengan:", { path, projectId });

//           resolve(new Uint8Array());
//         }
//       };

//       request.onerror = () => reject(request.error);
//     } catch (err) {
//       reject(err);
//     }
//   });
// }

//   // Hapus file berdasarkan path dan projectId
//   static async deleteContentByPath(path, projectId) {
//     const db = await openDb();
//     return new Promise((resolve, reject) => {
//       const store = db.transaction("files", "readwrite").objectStore("files");
//       const index = store.index("path");
//       const getRequest = index.get(path);

//       getRequest.onsuccess = () => {
//         const item = getRequest.result;
//         if (item && item.projectId === projectId) {
//           const deleteRequest = store.delete(item.id);
//           deleteRequest.onsuccess = () => {
//             console.log(`[IndexedDB] File ${path} dihapus dari project ${projectId}`);
//             resolve();
//           };
//           deleteRequest.onerror = () => reject(deleteRequest.error);
//         } else {
//           resolve(); // tidak ada: aman
//         }
//       };
//       getRequest.onerror = () => reject(getRequest.error);
//     });
//   }

//   static async deleteFolderAndContent(folderPath, projectId) {
//   const db = await openDb();
//   return new Promise((resolve, reject) => {
//     const tx = db.transaction("files", "readwrite");
//     const store = tx.objectStore("files");
//     const index = store.index("pathAndProject"); // Gunakan index gabungan

//     // Gunakan cursor untuk mencari semua file yang path-nya dimulai dengan folderPath
//     const range = IDBKeyRange.bound([folderPath, projectId], [folderPath + '\uffff', projectId]);
//     const cursorRequest = index.openCursor(range);

//     const idsToDelete = [];

//     cursorRequest.onsuccess = (event) => {
//       const cursor = event.target.result;
//       if (cursor) {
//         // Simpan id dari setiap file yang ditemukan
//         idsToDelete.push(cursor.value.id);
//         cursor.continue();
//       } else {
//         // Setelah semua ID terkumpul, lakukan penghapusan
//         if (idsToDelete.length === 0) {
//           console.log(`[IndexedDB] Folder ${folderPath} tidak memiliki konten, tidak ada yang dihapus.`);
//           resolve();
//           return;
//         }

//         const deletePromises = idsToDelete.map(id => {
//           return new Promise((res, rej) => {
//             const deleteRequest = store.delete(id);
//             deleteRequest.onsuccess = res;
//             deleteRequest.onerror = rej;
//           });
//         });

//         Promise.all(deletePromises)
//           .then(() => {
//             console.log(`[IndexedDB] Folder ${folderPath} dan ${idsToDelete.length} file di dalamnya berhasil dihapus.`);
//             resolve();
//           })
//           .catch(error => {
//             reject(error);
//           });
//       }
//     };

//     cursorRequest.onerror = (event) => {
//       reject(event.target.error);
//     };

//     tx.oncomplete = () => {
//       console.log(`[IndexedDB] Transaksi hapus folder selesai.`);
//     };

//     tx.onabort = () => {
//       reject(new Error('Transaksi dibatalkan.'));
//     };
//   });
// }

//   // Ambil semua file dari sebuah project
//   static async getAllByProjectId(projectId) {
//     const db = await openDb();
//     return new Promise((resolve, reject) => {
//       const store = db.transaction("files", "readonly").objectStore("files");
//       const index = store.index("projectId");
//       const request = index.getAll(IDBKeyRange.only(projectId));

//       request.onsuccess = () => resolve(request.result);
//       request.onerror = () => reject(request.error);
//     });
//   }

//   // Tampilkan semua file di semua project
//   static async listAllEntries() {
//     const db = await openDb();
//     return new Promise((resolve, reject) => {
//       const store = db.transaction("files", "readonly").objectStore("files");
//       const request = store.getAll();
//       request.onsuccess = () => resolve(request.result);
//       request.onerror = () => reject(request.error);
//     });
//   }

//   static async listAllPaths() {
//     const db = await openDb();
//     return new Promise((resolve, reject) => {
//       const store = db.transaction("files", "readonly").objectStore("files");
//       const request = store.getAll();
//       request.onsuccess = () => {
//         const result = request.result.map(item => item.path);
//         resolve(result);
//       };
//       request.onerror = () => reject(request.error);
//     });
//   }
// }

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
export class FileContentStorage {
  // Simpan file baru atau overwrite jika path+projectId sudah ada
  static async renameFolderAndContent(oldPath, newPath, projectId) {
    try {
      const db = await openDb();
      // Buat satu transaksi yang mencakup kedua object store
      const tx = db.transaction(['directory', 'files'], 'readwrite');
      const directoryStore = tx.objectStore('directory');
      const filesStore = tx.objectStore('files');
      const filesIndex = filesStore.index('pathAndProject');

      // --- Operasi 1: Perbarui 'directory' store ---
      await new Promise((resolve, reject) => {
        const range = IDBKeyRange.bound(
          oldPath,
          oldPath + '\uffff',
          false,
          false,
        );
        const cursorRequest = directoryStore.openCursor(range);
        const promises = [];

        cursorRequest.onsuccess = event => {
          const cursor = event.target.result;
          if (cursor) {
            const entry = cursor.value;
            const relativePath = entry.path.substring(oldPath.length);
            const updatedPath = newPath + relativePath;
            promises.push(
              new Promise((res, rej) => {
                const deleteReq = directoryStore.delete(entry.path);
                deleteReq.onsuccess = () => {
                  const addReq = directoryStore.add({
                    ...entry,
                    path: updatedPath,
                    mtimeMs: Date.now(),
                    projectId,
                  });
                  addReq.onsuccess = res;
                  addReq.onerror = rej;
                };
                deleteReq.onerror = rej;
              }),
            );
            cursor.continue();
          } else {
            Promise.all(promises).then(resolve).catch(reject);
          }
        };
        cursorRequest.onerror = event => reject(event.target.error);
      });

      // --- Operasi 2: Perbarui 'files' store ---
      await new Promise((resolve, reject) => {
        const range = IDBKeyRange.bound(
          [oldPath, projectId],
          [oldPath + '\uffff', projectId],
        );
        const cursorRequest = filesIndex.openCursor(range);
        const promises = [];

        cursorRequest.onsuccess = event => {
          const cursor = event.target.result;
          if (cursor) {
            const fileEntry = cursor.value;
            const relativePath = fileEntry.path.substring(oldPath.length);
            const newFilePath = newPath + relativePath;
            promises.push(
              new Promise((res, rej) => {
                const deleteReq = filesStore.delete(fileEntry.id);
                deleteReq.onsuccess = () => {
                  const putReq = filesStore.put({
                    ...fileEntry,
                    path: newFilePath,
                    mtimeMs: Date.now(),
                  });
                  putReq.onsuccess = res;
                  putReq.onerror = rej;
                };
                deleteReq.onerror = rej;
              }),
            );
            cursor.continue();
          } else {
            Promise.all(promises).then(resolve).catch(reject);
          }
        };
        cursorRequest.onerror = event => reject(event.target.error);
      });

      // Tunggu hingga transaksi selesai secara keseluruhan
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => {
          console.log(
            `[IndexedDB] Rename folder dan file selesai: ${oldPath} -> ${newPath}`,
          );
          resolve(newPath);
        };
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.error('Gagal mengganti nama folder dan file terkait:', error);
      return Promise.reject(error);
    }
  }
  static async saveContent(path, contentUint8Array, projectId) {
    const db = await openDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const index = store.index('pathAndProject'); // Menggunakan indeks gabungan
      const queryKey = [path, projectId];

      const getReq = index.get(queryKey);
      getReq.onsuccess = () => {
        const existing = getReq.result;
        const id = existing ? existing.id : randomCode(26);

        const entry = {
          id,
          fid: id,
          path,
          projectId,
          content: contentUint8Array,
          ctimeMs: existing?.ctimeMs || Date.now(),
          mtimeMs: Date.now(),
          size: contentUint8Array.byteLength || 0,
        };

        const putReq = store.put(entry);
        putReq.onsuccess = () => resolve(id);
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  // Ambil konten berdasarkan path dan projectId
  static async getContent(path, projectId) {
    const db = await openDb();

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction('files', 'readonly');
        const store = tx.objectStore('files');
        const index = store.index('pathAndProject'); // Menggunakan indeks gabungan
        const request = index.get([path, projectId]); // Kueri langsung ke indeks

        request.onsuccess = () => {
          const match = request.result;
          if (match) {
            resolve(match.content || new Uint8Array());
          } else {
            console.warn('[getContent] Tidak ditemukan:', { path, projectId });
            resolve(new Uint8Array());
          }
        };
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Hapus file berdasarkan path dan projectId
  static async deleteContentByPath(path, projectId) {
    const db = await openDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const index = store.index('pathAndProject'); // Menggunakan indeks gabungan
      const getRequest = index.get([path, projectId]);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          const deleteRequest = store.delete(item.id);
          deleteRequest.onsuccess = () => {
            console.log(
              `[IndexedDB] File ${path} dihapus dari project ${projectId}`,
            );
            resolve();
          };
          deleteRequest.onerror = () => reject(deleteRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Metode deleteFolderAndContent tidak diubah, sudah benar
  // static async deleteFolderAndContent(folderPath, projectId) {
  //   const db = await openDb();

  //   return new Promise((resolve, reject) => {
  //     // PERBAIKAN DI SINI: Tambahkan 'directory' ke transaksi
  //     const tx = db.transaction(["files", "directory"], "readwrite");
  //     const filesStore = tx.objectStore("files");
  //     const directoryStore = tx.objectStore("directory");
  //     const index = filesStore.index("pathAndProject");

  //     // Gunakan cursor untuk mencari semua file di dalam folder
  //     const range = IDBKeyRange.bound([folderPath, projectId], [folderPath + '\uffff', projectId]);
  //     const cursorRequest = index.openCursor(range);

  //     const idsToDelete = [];

  //     cursorRequest.onsuccess = (event) => {
  //       const cursor = event.target.result;
  //       if (cursor) {
  //         idsToDelete.push(cursor.value.id);
  //         cursor.continue();
  //       } else {
  //         if (idsToDelete.length === 0) {
  //           console.log(`[IndexedDB] Folder ${folderPath} tidak memiliki konten, tidak ada yang dihapus.`);
  //         }

  //         // Hapus entri folder itu sendiri dari 'directory' store
  //         const deleteFolderRequest = directoryStore.delete(folderPath);

  //         const deletePromises = idsToDelete.map(id => {
  //           return new Promise((res, rej) => {
  //             const deleteFileRequest = filesStore.delete(id);
  //             deleteFileRequest.onsuccess = res;
  //             deleteFileRequest.onerror = rej;
  //           });
  //         });

  //         Promise.all(deletePromises)
  //           .then(() => {
  //             console.log(`[IndexedDB] ${idsToDelete.length} file di dalam folder ${folderPath} berhasil dihapus.`);
  //             resolve();
  //           })
  //           .catch(error => {
  //             reject(error);
  //           });
  //       }
  //     };

  //     cursorRequest.onerror = (event) => reject(event.target.error);
  //     tx.oncomplete = () => console.log(`[IndexedDB] Transaksi hapus folder selesai.`);
  //     tx.onabort = () => reject(new Error('Transaksi dibatalkan.'));
  //   });
  // }
  // Tambahkan fungsi renameFile ke dalam FileContentStorage class
  // File: FileContentStorage.js

  // File: FileContentStorage.js

  static async deleteFolderAndContent(folderPath, projectId) {
    const db = await openDb();

    return new Promise((resolve, reject) => {
      // Transaksi harus mencakup kedua object store: 'files' dan 'directory'
      const tx = db.transaction(['files', 'directory'], 'readwrite');
      const filesStore = tx.objectStore('files');
      const directoryStore = tx.objectStore('directory');
      const filesIndex = filesStore.index('pathAndProject');

      // --- Langkah 1: Hapus semua file di dalam folder dan sub-folder ---
      const filesRange = IDBKeyRange.bound(
        [folderPath, projectId],
        [folderPath + '\uffff', projectId],
      );
      const filesCursorRequest = filesIndex.openCursor(filesRange);

      const fileDeletePromises = [];

      filesCursorRequest.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
          fileDeletePromises.push(
            new Promise((res, rej) => {
              const deleteFileRequest = filesStore.delete(cursor.value.id);
              deleteFileRequest.onsuccess = res;
              deleteFileRequest.onerror = rej;
            }),
          );
          cursor.continue();
        } else {
          // Setelah semua file selesai dihapus, lanjutkan ke langkah 2
          Promise.all(fileDeletePromises)
            .then(() => {
              console.log(
                `[IndexedDB] ${fileDeletePromises.length} file di dalam folder ${folderPath} berhasil dihapus.`,
              );

              // --- Langkah 2: Hapus semua entri folder dan sub-folder dari 'directory' store ---
              const directoryRange = IDBKeyRange.bound(
                folderPath,
                folderPath + '\uffff',
                false,
                false,
              );
              const directoryCursorRequest =
                directoryStore.openCursor(directoryRange);
              const directoryDeletePromises = [];

              directoryCursorRequest.onsuccess = dirEvent => {
                const dirCursor = dirEvent.target.result;
                if (dirCursor) {
                  directoryDeletePromises.push(
                    new Promise((res, rej) => {
                      const deleteDirRequest = directoryStore.delete(
                        dirCursor.value.path,
                      );
                      deleteDirRequest.onsuccess = res;
                      deleteDirRequest.onerror = rej;
                    }),
                  );
                  dirCursor.continue();
                } else {
                  Promise.all(directoryDeletePromises)
                    .then(() => {
                      console.log(
                        `[IndexedDB] ${directoryDeletePromises.length} folder/sub-folder berhasil dihapus.`,
                      );
                      resolve();
                    })
                    .catch(reject);
                }
              };
              directoryCursorRequest.onerror = reject;
            })
            .catch(reject);
        }
      };
      filesCursorRequest.onerror = event => reject(event.target.error);

      tx.oncomplete = () =>
        console.log(`[IndexedDB] Transaksi hapus folder selesai.`);
      tx.onabort = () => reject(new Error('Transaksi dibatalkan.'));
    });
  }
  static async renameFile(projectId, oldPath, newPath) {
    const db = await openDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const index = store.index('pathAndProject');
      const queryKey = [oldPath, projectId];

      const getReq = index.get(queryKey);
      getReq.onsuccess = () => {
        const existingFile = getReq.result;

        if (!existingFile) {
          console.warn(`[renameFile] File tidak ditemukan: ${oldPath}`);
          resolve(null);
          return;
        }

        // Hapus entri lama
        const deleteReq = store.delete(existingFile.id);
        deleteReq.onsuccess = () => {
          // Buat entri baru dengan path yang sudah diubah
          const newEntry = {
            ...existingFile,
            path: newPath, // Ganti path-nya
            mtimeMs: Date.now(),
          };

          // Tambahkan entri baru ke dalam database
          const putReq = store.put(newEntry);
          putReq.onsuccess = () => {
            console.log(
              `[IndexedDB] File berhasil diganti nama dari ${oldPath} menjadi ${newPath}`,
            );
            resolve(newEntry.id);
          };
          putReq.onerror = () => reject(putReq.error);
        };
        deleteReq.onerror = () => reject(deleteReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }
}

/*
export class FileContentStorage {
	static async saveContent(path, contentUint8Array, projectId) {
		const db = await openDb();
		return new Promise((resolve, reject) => {
			const request = db.transaction("files", "readwrite")
				.objectStore("files")
				.put({ path, content: contentUint8Array, projectId });
				
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}
	
	static async getContent(path) {
		const db = await openDb();
		return new Promise((resolve, reject) => {
			const request = db.transaction("files", "readonly")
				.objectStore("files").get(path);
			request.onsuccess = () => {
				resolve(request.result?.content || new Uint8Array());
			};
			request.onerror = () => reject(request.error);
		});
	}

	

	static async listAllPaths() {
		const db = await openDb();
		return new Promise((resolve, reject) => {
			const store = db.transaction("files", "readonly").objectStore("files");
			const request = store.getAll();
			request.onsuccess = () => {
				const result = request.result.map(item => item.path);
				resolve(result);
			};
			request.onerror = () => reject(request.error);
		});
	}

static async listAllEntries() {
	const db = await openDb();
	console.log("[Debug] DB berhasil dibuka");
	return new Promise((resolve, reject) => {
		const store = db.transaction("files", "readonly").objectStore("files");
		console.log("[Debug] Object store diakses");

		const request = store.getAll();

		request.onsuccess = () => {
			console.log("[Debug] Berhasil ambil data:", request.result);
			resolve(request.result);
		};
		request.onerror = () => {
			console.error("[Debug] Gagal ambil data fileContents:", request.error);
			reject(request.error);
		};
	});
}

	// Tambahan: ambil semua file berdasarkan projectId
	static async getAllByProjectId(projectId) {
		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction("files", "readonly");
			const store = tx.objectStore("files");
			const index = store.index("projectId");

			const request = index.getAll(IDBKeyRange.only(projectId));
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}
	
	
	static async deleteContentByPath(path, projectId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    const store = tx.objectStore("files");
    const request = store.delete([path, projectId]);

    request.onsuccess = () => {
      console.log(`[IndexedDB] Konten file "${path}" dihapus dari project ID ${projectId}`);
      resolve();
      
      window.addEventListener("refresh-content", (e) => console.log(e))
    };

    request.onerror = () => {
      console.error(`[IndexedDB] Gagal hapus konten "${path}"`);
      reject(request.error);
    };
  });
  
}

}



async function fname() {
	try {
		 const entries = await FileContentStorage.listAllEntries();

console.log("[Result]", JSON.stringify(entries, null, 2));

		console.log(entries); // tampilkan semua path dan kontennya
	} catch (e) {
		console.error("Gagal mengambil data fileContents:", e);
	}
}
fname()

*/
