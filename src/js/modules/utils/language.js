window.icodex ??= {} || {}
function capitalizeWords(str) {
  return str
    .split(' ') // pisahkan tiap kata
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // kapital huruf pertama
    .join(' '); // gabungkan kembali
}
export class LangText {
  constructor(langObj) {
    this.langObj = langObj; // Objek { en: "...", id: "..." }
    this.lang = this.detectLanguage(); // Deteksi bahasa user
  }

  // Deteksi bahasa sistem ('id-ID' → 'id')
  detectLanguage() {
    const userLang = navigator.language || 'en';
    const code = userLang.split('-')[0];
    return this.langObj[code] ? code : 'en'; // fallback ke 'en' jika tidak tersedia
  }

  // Ambil teks sesuai bahasa
  getText() {
    return this.langObj[this.lang]; 
  }

  // Bisa juga buat ambil bahasa aktif
  getLang() {
    return this.lang;
  }
}
Object.assign(icodex,  {
  textContent: function textContent(country, str = {}) {
    return new LangText(country, str)
  } 
})
