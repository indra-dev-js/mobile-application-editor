import { FileContentStorage } from '../db/FileContentStorage.js';
(window.Icodex = window.Icodex || {}),
  (Icodex.plugins = Icodex.plugins || {});
const CRC32 = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = 1 & c ? 3988292384 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return {
    from: function (input) {
      let data =
          input instanceof Uint8Array
            ? input
            : new TextEncoder().encode(String(input)),
        crc = 4294967295;
      for (let i = 0; i < data.length; i++)
        crc = table[255 & (crc ^ data[i])] ^ (crc >>> 8);
      return ~crc >>> 0;
    },
  };
})();
class ZipEntry {
  constructor(name, data, offset) {
    (this.name = name),
      (this.data = data),
      (this.offset = offset),
      (this.size = data.length),
      (this.crc = CRC32.from(data)),
      (this.date = new Date());
  }
  toLocalHeader() {
    const nameBytes = new TextEncoder().encode(this.name),
      header = new Uint8Array(30 + nameBytes.length),
      view = new DataView(header.buffer),
      { dosTime: dosTime, dosDate: dosDate } = this.#getDosDateTime();
    return (
      view.setUint32(0, 67324752, !0),
      view.setUint16(4, 20, !0),
      view.setUint16(6, 0, !0),
      view.setUint16(8, 0, !0),
      view.setUint16(10, dosTime, !0),
      view.setUint16(12, dosDate, !0),
      view.setUint32(14, this.crc, !0),
      view.setUint32(18, this.size, !0),
      view.setUint32(22, this.size, !0),
      view.setUint16(26, nameBytes.length, !0),
      view.setUint16(28, 0, !0),
      header.set(nameBytes, 30),
      header
    );
  }
  toCentralDirectory() {
    const nameBytes = new TextEncoder().encode(this.name),
      header = new Uint8Array(46 + nameBytes.length),
      view = new DataView(header.buffer),
      { dosTime: dosTime, dosDate: dosDate } = this.#getDosDateTime();
    return (
      view.setUint32(0, 33639248, !0),
      view.setUint16(4, 20, !0),
      view.setUint16(6, 20, !0),
      view.setUint16(8, 0, !0),
      view.setUint16(10, 0, !0),
      view.setUint16(12, dosTime, !0),
      view.setUint16(14, dosDate, !0),
      view.setUint32(16, this.crc, !0),
      view.setUint32(20, this.size, !0),
      view.setUint32(24, this.size, !0),
      view.setUint16(28, nameBytes.length, !0),
      view.setUint16(30, 0, !0),
      view.setUint16(32, 0, !0),
      view.setUint16(34, 0, !0),
      view.setUint16(36, 0, !0),
      view.setUint32(38, 0, !0),
      view.setUint32(42, this.offset, !0),
      header.set(nameBytes, 46),
      header
    );
  }
  #getDosDateTime() {
    const d = this.date;
    return {
      dosTime:
        (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() / 2),
      dosDate:
        ((d.getFullYear() - 1980) << 9) |
        ((d.getMonth() + 1) << 5) |
        d.getDate(),
    };
  }
}

class MiniZip {
  constructor() {
    (this.entries = []), (this.offset = 0);
  }
  file(path, content = '') {
    const data =
        content instanceof Uint8Array
          ? content
          : new TextEncoder().encode(String(content)),
      entry = new ZipEntry(path, data, this.offset),
      local = entry.toLocalHeader(),
      full = new Uint8Array(local.length + data.length);
    full.set(local, 0),
      full.set(data, local.length),
      this.entries.push({
        entry: entry,
        data: full,
      }),
      (this.offset += full.length);
  }
  folder(path) {
    const norm = path.endsWith('/') ? path : path + '/';
    return (
      this.file(norm),
      {
        file: (name, content) => this.file(norm + name, content),
        folder: name => this.folder(norm + name),
      }
    );
  }
  generateBlob() {
    const buffers = [],
      central = [];
    for (const { entry: entry, data: data } of this.entries)
      buffers.push(data), central.push(entry.toCentralDirectory());
    const centralStart = this.offset;
    for (const d of central) buffers.push(d), (this.offset += d.length);
    const eocd = new Uint8Array(22),
      view = new DataView(eocd.buffer);
    return (
      view.setUint32(0, 101010256, !0),
      view.setUint16(8, central.length, !0),
      view.setUint16(10, central.length, !0),
      view.setUint32(12, this.offset - centralStart, !0),
      view.setUint32(16, centralStart, !0),
      buffers.push(eocd),
      new Blob(buffers, {
        type: 'application/zip',
      })
    );
  }
}

// Pertama, kamu perlu mengimpor library JSZip

export const p = Icodex.plugins.ZipPlugin = {
  // MiniZip sudah tidak digunakan lagi
  // exportTreeToZip diubah untuk menggunakan JSZip
  async exportTreeToZip(rootNode, zipName = 'project.zip') {
    // Gunakan JSZip, bukan MiniZip
    const zip = new JSZip();

    const rootProjectId = rootNode.id;

    const addToZip = async (node, zipFolder) => {
      if (node.type === 'file') {
        let content;
        try {
          // Ambil konten file dari IndexedDB
          content = await FileContentStorage.getContent(node.path, rootProjectId);
        } catch (e) {
          console.error(`Gagal mengambil konten untuk file ${node.path}:`, e);
          // Jika gagal, gunakan Uint8Array kosong
          content = new Uint8Array();
        }
        // Tambahkan file ke JSZip
        zipFolder.file(node.name, content, { binary: true });
      } else if (node.type === 'directory' && node.children) {
        // Buat folder di JSZip
        const folder = zipFolder.folder(node.name);
        for (const child of node.children) {
          await addToZip(child, folder);
        }
      }
    };

    await addToZip(rootNode, zip);

    // Hasilkan file ZIP dan unduh
    zip.generateAsync({ type: 'blob' }).then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = zipName;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  },
};


// export const p = Icodex.plugins.ZipPlugin = {
//   MiniZip: MiniZip,
//   exportTreeToZip(rootNode, zipName = 'project.zip') {
//     const zip = new MiniZip();
//     !(function addToZip(node, zipFolder) {
//       if ('file' === node.type) zipFolder.file(node.name, node.content || '');
//       else if ('directory' === node.type && node.children) {
//         const folder = zipFolder.folder(node.name);
//         node.children.forEach(child => addToZip(child, folder));
//       }
//     })(rootNode, zip);
//     const blob = zip.generateBlob(),
//       a = document.createElement('a');
//     (a.href = URL.createObjectURL(blob)),
//       (a.download = zipName),
//       a.click(),
//       URL.revokeObjectURL(a.href);
//   },
// };
// export const p = Icodex.plugins.ZipPlugin = {
//   MiniZip: MiniZip,

//   // Fungsi ini sekarang ASYNC
//   async exportTreeToZip(rootNode, zipName = 'project.zip') {
//     const zip = new MiniZip();

//     // Ambil ID project dari rootNode
//     const rootProjectId = rootNode.id;

//     // Fungsi rekursif untuk menelusuri folder
//     // Fungsi ini juga ASYNC
//     const addToZip = async (node, zipFolder) => {
//       if (node.type === 'file') {
//         let content = '';
//         try {
//           // Panggil getContent dari FileContentStorage untuk mengambil isi file
//           content = await FileContentStorage.getContent(node.path, rootProjectId);
//         } catch (e) {
//           console.error(`Gagal mengambil konten untuk file ${node.path}:`, e);
//           // Jika gagal, gunakan konten kosong
//           content = new Uint8Array();
//         }
//         zipFolder.file(node.name, content);
//       } else if (node.type === 'directory' && node.children) {
//         const folder = zipFolder.folder(node.name);
//         for (const child of node.children) {
//           // Panggilan rekursif harus di-await
//           await addToZip(child, folder);
//         }
//       }
//     };
    
//     // Mulai proses dari rootNode
//     await addToZip(rootNode, zip);

//     // Setelah semua file diproses, buat dan unduh ZIP-nya
//     const blob = zip.generateBlob();
//     const a = document.createElement('a');
//     a.href = URL.createObjectURL(blob);
//     a.download = zipName;
//     a.click();
//     URL.revokeObjectURL(a.href);
//   },
// };