import { getPlatform } from '../utils/getPlatform.js';

import { EventRegistry } from '../commponets/dom.js';
export class SwipeSidebar {
  constructor({ sidebar, overlay }) {
    this.sidebar = sidebar;
    this.overlay = overlay;

    if (!this.sidebar || !this.overlay) {
      throw new Error('Sidebar atau overlay tidak ditemukan!');
    }

    this.startX = 0;
    this.isDragging = false;

    // Sidebar width sebaiknya dihitung ulang saat dibutuhkan
    this.getSidebarWidth = () => this.sidebar.offsetWidth;

    this._bindEvents();
  }

  open() {
    // Reset dulu semua transisi
    this.sidebar.style.transition = '';
    this.overlay.style.transition = '';
    this.sidebar.style.transform = 'translateX(0)'; // posisi fix

    // Tambahkan class
    this.sidebar.classList.add('open');
    document.getElementById('mainWrapper').classList.add('open');

    const platform = getPlatform();
    if (platform === 'Android' || platform === 'iOS') {
      this.overlay.classList.add('open');
    }

    // Paksa overlay muncul
    this.overlay.style.display = 'block'; // tambahkan ini
    this.overlay.style.opacity = '1';
  }

  close() {
    this.sidebar.classList.remove('open');
    this.overlay.classList.remove('open');
    document.getElementById('mainWrapper').classList.remove('open');

    this.sidebar.style.transform = '';
    this.sidebar.style.transition = '';
    this.overlay.style.transition = '';

    // Pastikan overlay tetap visible lalu hilang setelah animasi
    this.overlay.style.opacity = '0';

    // Delay agar display:none dilakukan setelah transisi
    setTimeout(() => {
      if (!this.isOpen()) {
        this.overlay.style.display = 'none'; // ini penting
      }
    }, 0.35); // waktu transisi CSS kamu
    // Kirim event drawer ditutup
    EventRegistry.register(window, 'drawer-closed-by-backdrop');

    // document.dispatchEvent(new CustomEvent('drawer-closed-by-backdrop'));
  }

  isOpen() {
    return this.sidebar.classList.contains('open');
  }

  /*_bindEvents() {
  this.overlay.addEventListener("touchstart", e => {
    // ⛔ Cegah multitouch: hanya 1 jari yang diizinkan
    if (e.touches.length > 1) return;

    this.startX = e.touches[0].clientX;
    this.isDragging = true;

    this.sidebar.style.transition = "none";
    this.overlay.style.transition = "none";
  }, { passive: false });

  this.overlay.addEventListener("touchmove", e => {
    if (!this.isDragging || e.touches.length > 1) return;

    const currentX = e.touches[0].clientX;
    const deltaX = currentX - this.startX;

    if (deltaX < 0) {
      const sidebarWidth = this.getSidebarWidth();
      const offset = Math.max(deltaX, -sidebarWidth);
      this.sidebar.style.transform = `translateX(${offset}px)`;

      const progress = 1 + offset / sidebarWidth;
      this.overlay.style.opacity = progress.toFixed(2);
    }
  }, { passive: false });

  this.overlay.addEventListener("touchend", e => {
    if (!this.isDragging) return;
    this.isDragging = false;

    const endX = e.changedTouches[0].clientX;
    const distance = endX - this.startX;
    const screenWidth = window.innerWidth;

    this.sidebar.style.transition = "";
    this.overlay.style.transition = "";

    if (Math.abs(distance) > screenWidth / 6) {
      this.close();
    } else {
      this.sidebar.style.transform = `translateX(0)`;
      this.overlay.style.opacity = "1";
    }
  });

  // Klik overlay hanya bisa jika tidak sedang drag
  this.overlay.addEventListener("click", () => {
    if (!this.isDragging) {
      this.close();
    }
  });
}*/
  _bindEvents() {
    // === START DRAG ===
    this.overlay.addEventListener(
      'touchstart',
      e => {
        if (e.touches.length > 1) return; // hanya 1 jari
        this.startX = e.touches[0].clientX;
        this.isDragging = true;

        this.sidebar.style.transition = 'none';
        this.overlay.style.transition = 'none';
      },
      { passive: true },
    );

    // === DRAGGING ===
    this.overlay.addEventListener(
      'touchmove',
      e => {
        if (!this.isDragging || e.touches.length > 1) return;

        const currentX = e.touches[0].clientX;
        const deltaX = currentX - this.startX;

        if (deltaX < 0) {
          const sidebarWidth = this.getSidebarWidth();
          const offset = Math.max(deltaX, -sidebarWidth);

          this.sidebar.style.transform = `translate3d(${offset}px,0,0)`;

          const progress = 1 + offset / sidebarWidth;
          this.overlay.style.opacity = progress.toFixed(2);
        }
      },
      { passive: true },
    );

    // === END DRAG ===
    this.overlay.addEventListener('touchend', e => {
      if (!this.isDragging) return;
      this.isDragging = false;

      const endX = e.changedTouches[0].clientX;
      const distance = endX - this.startX;
      const sidebarWidth = this.getSidebarWidth();

      // Aktifin transisi halus
      this.sidebar.style.transition = 'transform 0.25s ease-out';
      this.overlay.style.transition = 'opacity 0.25s ease-out';

      // Kalau lebih dari sepertiga lebar sidebar → close
      if (Math.abs(distance) > sidebarWidth / 3) {
        this.sidebar.style.transform = `translateX(-${sidebarWidth}px)`; // langsung keluar
        this.overlay.style.opacity = '0';

        setTimeout(() => this.close(), 250); // sync sama animasi
      } else {
        // Balik ke posisi terbuka
        this.sidebar.style.transform = `translateX(0)`;
        this.overlay.style.opacity = '1';
      }
    });

    // === CLICK BACKDROP ===
    this.overlay.addEventListener('click', e => {
      if (!this.isDragging) {
        this.close();
      }
    });
  }
}
