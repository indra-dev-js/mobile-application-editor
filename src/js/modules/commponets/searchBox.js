import { Dom, createElement } from './dom.js';
export class SearchBox {
  constructor() {
    this.wrapper = createElement('div', {
      className: 'search-box-wrapper hidden',
    });
    this.root = document.createElement('div');
    this.root.className = 'search-box sb-sb';
    this.root.tabIndex = 0;

    this.icon = document.createElement('span');
    this.icon.className = 'search-ic';
    this.icon.tabIndex = 0;
    this.icon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search-icon lucide-search"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>';
    this.close = createElement('button', {
      type: 'button',
      className: 'btn',
    });
    this.close.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>`;

    this.input = document.createElement('input');
    this.input.className = 'form-search';
    this.input.type = 'text';
    this.input.placeholder = 'Cari nama file';
    this.input.autocomplete = 'off';
    this.input.autocorrect = 'off';
    this.input.autocapitalize = 'none';
    this.input.spellcheck = false;

    this.root.appendChild(this.icon);
    this.root.appendChild(this.input);
    this.wrapper.appendChild(this.root);
    this.root.appendChild(this.close);
  }

  get element() {
    return this.wrapper;
  }

  onInput(callback) {
    // Daftarkan callback input (contoh: pencarian file tree)
    this.input.addEventListener('input', () => {
      const keyword = this.input.value.trim();
      callback(keyword);
    });
  }

  focus() {
    this.input.focus();
  }

  clear() {
    this.input.value = '';
  }
}
