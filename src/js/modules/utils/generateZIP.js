import './JSZIP.js';
import { db } from '../db/db.js';

export async function downloadProject(projectRootPath) {
  const zip = new JSZip();

  const files = await db.files
    .where('path')
    .startsWith(projectRootPath + '/')
    .toArray();

  for (const file of files) {
    const dataRecord = await db.data.get(file.fid);
    const content = dataRecord?.text || '';
    zip.file(file.path.replace(projectRootPath + '/', ''), content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });

  // 🔹 ambil nama project dari path
  const projectName = projectRootPath.split('/').pop();

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = projectName + '.zip'; // jadi "HTML.zip"
  a.click();
}

//// misalnya project ada di path "idb/HTML"
//
//downloadProject("idb/HTML");
export async function shareProject(projectRootPath) {
  const zip = new JSZip();

  // ambil semua file project
  const files = await db.files
    .where('path')
    .startsWith(projectRootPath + '/')
    .toArray();

  for (const file of files) {
    const dataRecord = await db.data.get(file.fid);
    const content = dataRecord?.text || '';
    zip.file(file.path.replace(projectRootPath + '/', ''), content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });

  const projectName = projectRootPath.split('/').pop();
  const zipFile = new File([blob], projectName + '.zip', {
    type: 'application/zip',
  });

  // cek support Web Share API + file
  if (navigator.canShare && navigator.canShare({ files: [zipFile] })) {
    try {
      await navigator.share({
        title: 'Bagikan Project',
        text: 'Ini project saya: ' + projectName,
        files: [zipFile],
      });
      console.log('✅ Berkas dibagikan');
    } catch (err) {
      console.error('❌ Gagal share:', err);
    }
  } else {
    console.log('❌ Device tidak mendukung Web Share API dengan file.');
  }
}
