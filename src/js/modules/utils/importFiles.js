//import { FileContentStorage } from '../db/FileContentStorage.js';
import { importFile } from '../db/db.js';
function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  for (; bytes >= 1024 && i < units.length - 1; ) (bytes /= 1024), i++;
  return `${bytes.toFixed(1)} ${units[i]}`;
}

// ImportFiles.js

export function importFiles({
  node,
  self,
  loadingContainer,
  findRootProject,
  refreshAndSave,
}) {
  (function () {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.webkitdirectory = false;

    fileInput.addEventListener('change', async () => {
      const files = Array.from(fileInput.files);
      if (files.length === 0) return;

      const old = document.querySelector('.progress-wrapper');
      if (old) old.remove();

      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      let loadedSize = 0;

      const progressWrap = document.createElement('div');
      const progressBar = document.createElement('progress');
      const progressText = document.createElement('label');

      progressWrap.className = 'progress-wrapper';
      progressBar.className = 'progress-bar';
      progressText.className = 'progress-value';
      progressBar.value = 0;
      progressBar.max = 100;
      progressBar.id = 'progress';
      progressText.htmlFor = 'progress';

      progressWrap.appendChild(progressBar);
      progressWrap.appendChild(progressText);
      loadingContainer.appendChild(progressWrap);

      if (!document.querySelector('#progress-style')) {
        const style = document.createElement('style');
        style.id = 'progress-style';
        style.textContent = `
        .progress-wrapper {
          margin: 1rem auto;
          width: calc(340px - 20%);
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          overflow: hidden;
          line-height: 16px;
          height: max-content;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
        .progress-bar {
          width: 100%;
          display: block;
          margin: 0!important;
          appearance: none;
        }
        .progress-value {
          position: relative;
          font-size: 14px;
          display: inline-flex;
          line-height: inherit;
          font-weight: 400;
          margin-block: 8px;
          color: color-mix(in oklab, var(--bg-dark,#0D161F), #fff 70%);
        }
        .progress-bar::-webkit-progress-inner-element {
          height: 14px!important;
        }
        .progress-bar::-webkit-progress-bar {
          background-color: color-mix(in oklab, var(--bg-dark,#0D161F), currentColor 25%);
          border-radius: 9999px;
          overflow: hidden;
        }
        .progress-bar::-webkit-progress-value {
          background-color: #3b82f6!important;
          outline: 1.5px solid color-mix(in oklab, var(--bg-dark,#0D161F), #fff 70%);
        }
      `;
        document.head.appendChild(style);
      }

      const rootProject = findRootProject(self.data, node);

      for (const file of files) {
        await new Promise((resolve, reject) => {
          const reader = new FileReader();

          reader.onprogress = e => {
            if (e.lengthComputable) {
              const currentTotal = loadedSize + e.loaded;
              const percent = (currentTotal / totalSize) * 100;
              progressBar.value = percent.toFixed(1);
              progressText.textContent = `${formatBytes(
                currentTotal,
              )} dari ${formatBytes(totalSize)}`;
            }
          };

          reader.onload = async () => {
            loadedSize += file.size;

            const cleanPath = `${node.path}/${file.name}`.replace(/\/+/g, '/');

            const fileNode = {
              type: 'file',
              name: file.name,
              path: cleanPath,
            };

            // console.log(
            //   `[Import] File disimpan: ${fileNode.path}, ${reader.result.byteLength} byte`,
            // );

            node.children = node.children || [];
            const exists = node.children.some(
              child => child.name === file.name && child.type === 'file',
            );
            if (!exists) node.children.push(fileNode);

            const percentDone = (loadedSize / totalSize) * 100;
            progressBar.value = percentDone;
            progressText.textContent = `${formatBytes(
              loadedSize,
            )} dari ${formatBytes(totalSize)}`;

            resolve();
          };

          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });

        await new Promise(r => setTimeout(r, 5));
      }

      if (rootProject) {
        refreshAndSave(rootProject);
        console.log(`${files.length} file berhasil diimpor.`);
      }

      progressWrap.remove();
    });

    fileInput.click();
  })();
}

//SART
// function formatBytes(bytes) {
//   const units = ['B', 'KB', 'MB', 'GB'];
//   let i = 0;
//   for (; bytes >= 1024 && i < units.length - 1; ) (bytes /= 1024), i++;
//   return `${bytes.toFixed(1)} ${units[i]}`;
// }

// function createProgressBar(loadingContainer) {
//   const old = document.querySelector('.progress-wrapper');
//   if (old) old.remove();

//   const progressWrap = document.createElement('div');
//   const progressBar = document.createElement('progress');
//   const progressText = document.createElement('label');

//   progressWrap.className = 'progress-wrapper';
//   progressBar.className = 'progress-bar';
//   progressText.className = 'progress-value';
//   progressBar.value = 0;
//   progressBar.max = 100;
//   progressBar.id = 'progress';
//   progressText.htmlFor = 'progress';

//   progressWrap.appendChild(progressBar);
//   progressWrap.appendChild(progressText);
//   loadingContainer.appendChild(progressWrap);

//   if (!document.querySelector('#progress-style')) {
//     const style = document.createElement('style');
//     style.id = 'progress-style';
//     style.textContent = `
//             .progress-wrapper {
//               margin: 1rem auto;
//               width: calc(340px - 20%);
//               display: flex;
//               flex-direction: column;
//               align-items: center;
//               position: relative;
//               overflow: hidden;
//               line-height: 16px;
//               height: max-content;
//               font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
//             }
//             .progress-bar {
//               width: 100%;
//               display: block;
//               margin: 0!important;
//               appearance: none;
//             }
//             .progress-value {
//               position: relative;
//               font-size: 14px;
//               display: inline-flex;
//               line-height: inherit;
//               font-weight: 400;
//               margin-block: 8px;
//               color: color-mix(in oklab, var(--bg-dark,#0D161F), #fff 70%);
//             }
//             .progress-bar::-webkit-progress-inner-element {
//               height: 14px!important;
//             }
//             .progress-bar::-webkit-progress-bar {
//               background-color: color-mix(in oklab, var(--bg-dark,#0D161F), currentColor 25%);
//               border-radius: 9999px;
//               overflow: hidden;
//             }
//             .progress-bar::-webkit-progress-value {
//               background-color: #3b82f6!important;
//               outline: 1.5px solid color-mix(in oklab, var(--bg-dark,#0D161F), #fff 70%);
//             }
//         `;
//     document.head.appendChild(style);
//   }

//   return { progressWrap, progressBar, progressText };
// }

// // ... (fungsi formatBytes dan createProgressBar sama seperti sebelumnya) ...

// export function importFiles({
//   node,
//   self,
//   loadingContainer,
//   findRootProject,
//   refreshAndSave,
// }) {
//   (function () {
//     const fileInput = document.createElement('input');
//     fileInput.type = 'file';
//     fileInput.multiple = true;
//     fileInput.webkitdirectory = false;

//     fileInput.addEventListener('change', async () => {
//       const files = Array.from(fileInput.files);
//       if (files.length === 0) return;

//       const { progressWrap, progressBar, progressText } =
//         createProgressBar(loadingContainer);
//       const totalSize = files.reduce((sum, f) => sum + f.size, 0);
//       const rootProject = findRootProject(self.data, node);

//       const worker = new Worker(
//         new URL('../../worker/import-worker.js', import.meta.url),
//         { type: 'module' },
//       );

//       worker.postMessage({
//         action: 'import',
//         files: files,
//         totalSize: totalSize,
//         node: {
//           path: node.path,
//           name: node.name,
//           type: node.type,
//         },
//         rootProjectId: rootProject.id,
//       });

//       worker.onmessage = event => {
//         const data = event.data;
//         if (data.action === 'progress') {
//           progressBar.value = data.percent;
//           progressText.textContent = `${formatBytes(
//             data.loadedSize,
//           )} dari ${formatBytes(data.totalSize)}`;
//         } else if (data.action === 'done') {
//           if (rootProject && data.updatedNode) {
//             function findAndReplaceNode(treeNode, newNode) {
//               if (treeNode.path === newNode.path) {
//                 treeNode.children = newNode.children;
//                 return true;
//               }
//               if (treeNode.children) {
//                 for (let i = 0; i < treeNode.children.length; i++) {
//                   if (findAndReplaceNode(treeNode.children[i], newNode)) {
//                     return true;
//                   }
//                 }
//               }
//               return false;
//             }

//             async function saveContent() {
//               return FileContentStorage.saveContent(
//                 data.path,
//                 data.content,
//                 rootProject.id,
//               );
//             }

//             // findAndReplaceNode(rootProject, data.updatedNode);
//             if (rootProject) {

//               refreshAndSave(rootProject);
// }

//             console.log(
//               'Root Project berhasil diupdate dan refresh dipanggil.',
//             );
//             console.log(`${files.length} file berhasil diimpor.`);
//           }
//           progressWrap.remove();
//           worker.terminate();
//         }
//       };

//       worker.onerror = function (event) {
//         console.error("Worker Error:", event.message); // Ini akan menampilkan pesan error
//         console.error("Di file:", event.filename);      // Ini akan menampilkan file yang bermasalah
//         console.error("Di baris ke:", event.lineno);
//         progressWrap.remove();
//         worker.terminate();
//       }
//     });

//     fileInput.click();
//   })();
// }
//END

// File: src/utils/importFiles.js

// Fungsi untuk membuat UI progress bar dan styling-nya
/*function createProgressBar(loadingContainer) {
  const oldProgress = document.querySelector(".progress-wrapper");
  if (oldProgress) oldProgress.remove();
  
  const progressWrap = document.createElement("div");
  const progressBar = document.createElement("progress");
  const progressText = document.createElement("label");
  
  progressWrap.className = "progress-wrapper";
  progressBar.className = "progress-bar";
  progressText.className = "progress-value";
  progressBar.value = 0;
  progressBar.max = 100;
  progressBar.id = "progress";
  progressText.htmlFor = "progress";
  
  progressWrap.appendChild(progressBar);
  progressWrap.appendChild(progressText);
  loadingContainer.appendChild(progressWrap);
  
  // Style untuk progress bar, hanya tambahkan sekali
  if (!document.querySelector("#progress-style")) {
    const style = document.createElement("style");
    style.id = "progress-style";
    style.textContent = `
      .progress-wrapper {
        margin: 1rem auto;
        width: calc(340px - 20%);
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        overflow: hidden;
        line-height: 16px;
        height: max-content;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      }
      .progress-bar {
        width: 100%;
        display: block;
        margin: 0!important;
        appearance: none;
      }
      .progress-value {
        position: relative;
        font-size: 14px;
        display: inline-flex;
        line-height: inherit;
        font-weight: 400;
        margin-block: 8px;
        color: color-mix(in oklab, var(--bg-dark,#0D161F), #fff 70%);
      }
      .progress-bar::-webkit-progress-inner-element {
        height: 14px!important;
      }
      .progress-bar::-webkit-progress-bar {
        background-color: color-mix(in oklab, var(--bg-dark,#0D161F), currentColor 25%);
        border-radius: 9999px;
        overflow: hidden;
      }
      .progress-bar::-webkit-progress-value {
        background-color: #3b82f6!important;
        outline: 1.5px solid color-mix(in oklab, var(--bg-dark,#0D161F), #fff 70%);
      }
    `;
    document.head.appendChild(style);
  }
  
  return { progressWrap, progressBar, progressText };
}
*/
// Fungsi untuk mengonversi byte ke format yang mudah dibaca
/*function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  for (; bytes >= 1024 && i < units.length - 1;) bytes /= 1024, i++;
  return `${bytes.toFixed(1)} ${units[i]}`;
}

export function importFiles({ node, self, loadingContainer, findRootProject, refreshAndSave }) {
  (function() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true;
    fileInput.webkitdirectory = false;
    
    fileInput.addEventListener("change", async () => {
      const files = Array.from(fileInput.files);
      if (files.length === 0) return;
      
      const { progressWrap, progressBar, progressText } = createProgressBar(loadingContainer);
      
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      const rootProject = findRootProject(self.data, node);
      
      // Membuat Web Worker baru. Pastikan path-nya benar!
      const worker = new Worker('worker/import-worker.js', { type: 'module'});
      
      // Mengirim data file ke Web Worker
      worker.postMessage({
        action: 'import',
        files: files,
        totalSize: totalSize,
        node: node,
        rootProjectId: rootProject.id
      });
      
      // Menerima pesan dari Web Worker
      worker.onmessage = (event) => {
        const data = event.data;
        if (data.action === 'progress') {
          // Update UI dengan data progress dari worker
          progressBar.value = data.percent;
          progressText.textContent = `${formatBytes(data.loadedSize)} dari ${formatBytes(data.totalSize)}`;
        } else if (data.action === 'done') {
          // Proses import selesai
          if (rootProject) {
            refreshAndSave(rootProject);
            console.log(`${files.length} file berhasil diimpor.`);
          }
          progressWrap.remove();
          worker.terminate(); // Penting: hentikan worker setelah selesai
        }
      };
      
      worker.onerror = (error) => {
        console.error("Worker error:", error);
        progressWrap.remove();
        worker.terminate();
      };
    });
    
    fileInput.click();
  })();
}*/
