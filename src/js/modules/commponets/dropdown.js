import { LangText } from '../utils/language.js';
class ixScrollManager {
  constructor(target, mode = 'both') {
    (this.target = target),
      (this.mode = mode),
      (this.handlers = {
        wheel: this._blockEvent.bind(this),
        touchmove: this._blockEvent.bind(this),
      });
  }
  _blockEvent(e) {
    e.preventDefault(), e.stopPropagation();
  }
  lock() {
    this.target &&
      (('both' !== this.mode && 'desktop' !== this.mode) ||
        this.target.addEventListener('wheel', this.handlers.wheel, {
          passive: !1,
        }),
      ('both' !== this.mode && 'mobile' !== this.mode) ||
        this.target.addEventListener('touchmove', this.handlers.touchmove, {
          passive: !1,
        }));
  }
  unlock() {
    this.target &&
      (this.target.removeEventListener('wheel', this.handlers.wheel),
      this.target.removeEventListener('touchmove', this.handlers.touchmove));
  }
}

// function DropdownPosition(target, handle, show = false) {
//   if (show === true || show === 1) {
//     function updatePosition() {
//       // Ambil ukuran handle dan target
//       const handleRect = handle.getBoundingClientRect();
//       const targetRect = target.getBoundingClientRect();

//       // Posisi top = sejajar Y dengan handle
//       target.style.top = handleRect.y + 'px';

//       // Posisi left = handle.width - target.width
//       const left = handleRect.width - targetRect.width;
//       target.style.left = left + 'px';

//       // (opsional) debug
//       console.log('Dropdown width:', targetRect.width);
//       console.log('Handle width:', handleRect.width);
//       console.log('Left position:', left + 'px');
//     }

//     // Set posisi awal
//     updatePosition();

//     // Update posisi saat resize
//     window.addEventListener("resize", updatePosition);
//   }
// }

function DropdownPosition(target, handle, show = false) {
  if (show === true || show === 1) {
    function updatePosition() {
      const handleRect = handle.getBoundingClientRect();
      const dropdownHeight = target.offsetHeight;
      const viewportHeight = window.innerHeight;
      const scrollY = window.scrollY;

      // Ambil top dari posisi handle
      let top = handleRect.top + scrollY;

      // Jika dropdown bakal keluar layar bawah
      if (top + dropdownHeight > scrollY + viewportHeight) {
        const overflow = top + dropdownHeight - (scrollY + viewportHeight);
        top = top - overflow - 5; // geser ke atas sedikit
      }

      // Hindari terlalu naik keluar layar
      if (top < scrollY) {
        top = scrollY + 5;
      }

      // SET hanya top dan left (tidak ubah style lain)
      target.style.top = top + 'px';
      target.style.left = handleRect.right - target.offsetWidth + 'px';
    }

    requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
  }
}

class Dropdown extends EventTarget {
  dropdown = document.createElement('div');
  #onoptionclick = null;
  constructor(
    group = [
      {
        label: 'group1',
        option: [
          {
            value: new LangText({
              id: 'Berkas Baru',
              en: 'New File',
            }).getText(),

            icon: 'icodex icodex-file-added',
            id: 'new-file',
          },
          {
            value: new LangText({
              id: 'Folder Baru',
              en: 'New Folder',
            }).getText(),
            icon: 'icodex icodex-folder-plus',
            id: 'new-folder',
          },
        ],
      },
    ],
  ) {
    super();
    this._group = group;
  }

  fragmentRender(render = false) {
    const fragment = document.createDocumentFragment();
    this.dropdown.className = 'dropdown';

    this._group.forEach(group => {
      const ul = document.createElement('ul');

      // Buat unique ID untuk list
      const randomArray = new Uint32Array(1);
      crypto.getRandomValues(randomArray);
      const uniqueId = `icodex_${randomArray[0].toString(36).slice(0, 10)}`;
      ul.id = uniqueId;

      group.option.forEach(opt => {
        const li = document.createElement('li');
        const opt_icon = document.createElement('span');

        if (
          opt.icon.startsWith('bi') ||
          opt.icon.startsWith('codicon') ||
          opt.icon.startsWith('icodex') ||
          opt.icon.startsWith('tb')
        )
          opt_icon.className = opt.icon;
        else opt_icon.innerHTML = opt.icon;

        const opt_title = document.createElement('span');
        opt_title.textContent = new LangText({
          id: opt.value,
          en: opt.value,
        }).getText();

        // 🟢 Perubahan penting: ambil teks dari valueLangKey jika ada

        li.append(opt_icon, opt_title);

        li.addEventListener('click', e => {
          if (typeof this.#onoptionclick === 'function') {
            this.#onoptionclick(e, opt);
          }
          const customEvent = new CustomEvent('optclick', {
            detail: {
              option: opt,
              eventOri: e,
              group: this.group,
            },
            bubbles: true,
            cancelable: true,
          });
          this.dispatchEvent(customEvent);
        });

        ul.appendChild(li);
      });

      fragment.appendChild(ul);
    });

    return fragment;
  }
  set onoptionclick(callback) {
    this.#onoptionclick = 'function' == typeof callback ? callback : null;
  }
  get onoptionclick() {
    return this.#onoptionclick;
  }
}
export class CustomDropdown extends Dropdown {
  constructor(container, handle) {
    super(),
      (this.handle = handle),
      (this.container = container),
      (this.dropDown = document.createElement('div')),
      (this.dropDown.className = 'dropdown'),
      (this.borderOverlay = document.createElement('div')),
      (this.borderOverlay.className = 'ix-drop-border'),
      (this.scrollManager = new ixScrollManager(this.dropDown, 'mobile'));
  }
  #render(render = !1) {
    !0 === render || 1 === render
      ? ((this.container.innerHTML = ''),
        (this.dropDown.innerHTML = ''),
        this.dropDown.appendChild(super.fragmentRender(!0)),
        DropdownPosition(this.container, this.handle, !0),
        this.container.appendChild(this.dropDown))
      : (DropdownPosition(this.container, this.handle, !1),
        (this.container.innerHTML = ''));
  }

  open(state = false) {
    if (state) {
      if (!this.dropDown.isConnected && this.container) {
        this.#render(true);
      }
      this.#icodexPlaceDropdown();
      this.scrollManager.lock();
      this.container.classList.add('open');
    } else {
      this.scrollManager.lock();
      this.container.classList.remove('open');
      this.#render(false);
    }
    return this;
  }

  #icodexPlaceDropdown() {
    const rect = this.dropDown.getBoundingClientRect(),
      windowHeight = window.innerHeight;
    rect.y < windowHeight - rect.height
      ? (this.dropdown.style.top = rect.top + 'px')
      : (this.dropDown.style.top = `-${rect.height}px`);
  }
}

export const DROPDOWN_CONTAINERS = document.createElement('div');
(DROPDOWN_CONTAINERS.className = 'dropdown-container'),
  document.body.insertAdjacentElement('afterbegin', DROPDOWN_CONTAINERS);

export class DropdownTree {
  constructor(items = []) {
    // container default (punya style khusus .dropdown-tree)
    this.container = document.createElement('div');
    this.container.className = 'dropdown-tree';
    this.items = items;
    this.parent = null;

    this.render();
  }

  // Render isi menu
  render() {
    this.container.innerHTML = ''; // kosongkan isi

    const ul = document.createElement('ul');
    ul.className = 'dropdown-menu';
    ul.setAttribute('role', 'menu');
    ul.setAttribute('aria-label', 'dropdown menu');

    this.items.forEach(item => {
      if (item.type === 'divider') {
        const li = document.createElement('li');
        li.setAttribute('role', 'menuitem');
        li.setAttribute('aria-label', 'line');
        const hr = document.createElement('hr');
        hr.className = 'dropdown-divider';
        li.appendChild(hr);
        ul.appendChild(li);
      } else {
        const li = document.createElement('li');
        li.className = 'dropdown-item';
        li.setAttribute('role', 'menuitem');
        li.setAttribute('aria-label', 'dropdown item');

        if (item.icon) {
          const iconSpan = document.createElement('span');
          iconSpan.className = item.icon + ' mr-2';
          li.appendChild(iconSpan);
        }

        const textSpan = document.createElement('span');
        textSpan.textContent = item.label;
        li.appendChild(textSpan);

        if (typeof item.action === 'function') {
          li.addEventListener('click', e => {
            e.preventDefault();
            item.action();
            this.hide();
          });
        }

        ul.appendChild(li);
      }
    });

    this.container.appendChild(ul);
  }

  show(parent, handle) {
    this.parent = parent;
    if (parent) {
      parent.innerHTML = '';
    }

    this.container.style.position = 'absolute';

    const updatePosition = () => {
      const parentRect = parent.getBoundingClientRect();
      const handleRect = handle.getBoundingClientRect();

      const offsetTop = handleRect.top - parentRect.top;
      const offsetLeft = handleRect.x - 160;

      Object.assign(this.parent.style, {
        position: 'absolute',
        width: '100%',
        height: handleRect.height + 'px',
        top: handleRect.top + 'px',
        left: 0,
        zIndex: 3,
        display: 'block',
        backdropFilter: 'brightness(95%)',
      });

      this.container.style.top = `${handleRect.height}px`;
      this.container.style.left = `${offsetLeft}px`;
    };

    updatePosition();

    // tambahin listener supaya ikut saat layar berubah
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    parent.appendChild(this.container);

    // simpan cleanup biar ga leak
    this.cleanup = () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }

  isOpen() {
    return this.container.isConnected;
  }
  // Sembunyikan dropdown
  hide() {
    if (this.container.parentElement) {
      // Hapus dari parent
      this.parent.removeAttribute('style');
      this.parent.innerHTML = '';
    }
  }

  // Tambah item baru
  addItem(item) {
    this.items.push(item);
    this.render();
  }

  // Hapus item berdasarkan label
  removeItem(label) {
    this.items = this.items.filter(i => i.label !== label);
    this.render();
  }
}
