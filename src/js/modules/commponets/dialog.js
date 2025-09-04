import { LangText } from "../utils/language.js";

class Input {
  constructor(placeholder = '') {
    (this.input = document.createElement('input')),
    (this.input.spellcheck = !1),
    (this.input.autocomplete = 'off'),
    (this.input.placeholder = placeholder),
    (this.input.type = 'text'),
    (this.input.maxLength = 50),
    (this.input.value = ''),
    (this.input.className = 'form-input');
  }
  set value(val) {
    this.input.value = val;
  }
  set placeholder(placeholder = '') {
    this.input.placeholder = placeholder;
  }
  get value() {
    return this.input.value;
  }
  focus() {
    return this.input.focus();
  }
  blur() {
    return this.input.blur();
  }
  select() {
    this.input.select();
  }
  trim() {
    return this.input.value.trim();
  }
  onInput(callback) {
    this.input.addEventListener('input', callback);
  }
}
class Button {
  constructor(className = 'btn', icon = '') {
    (this.button = document.createElement('button')),
    (this.button.className = className),
    (this.button.innerHTML = icon);
  }
  setOnclickListener(callBack) {
    this.button.addEventListener('click', callBack);
  }
}
export const dialogWrapper = document.createElement('div')
dialogWrapper.id = "dialog-wrapper"


class Dialog {
  dialog = document.createElement('div');
  _dialogHeader;
  _dialogTitle;
  _dialogBody;
  _dialogFooter;
  _buttonCreate;

  constructor(dialogTitle = 'Dialog Header', container) {
    this.dialogTitle = dialogTitle;
    this._container = container;
    this.dialog.className = 'dialog-overlay';
    this.#init();
    this.children = {
      body: this.#createProxyList('body'),
      footer: this.#createProxyList('footer'),
    };
    this.classList = this.dialog.classList;
  }

  render(render = false) {
    if (render === true || render === 1) {
      this._container.innerHTML = '';
      this._container.appendChild(this.dialog);
    } else {
      this._container.innerHTML = '';
    }
  }

  #createProxyList(type) {
    const self = this;
    return new Proxy([], {
      set(target, prop, value) {
        const isIndex = !isNaN(prop);
        const result = Reflect.set(target, prop, value);
        if (isIndex && value instanceof HTMLElement) {
          const targetElement =
            type === 'body' ? self._dialogBody : self._dialogFooter;
          if (targetElement) {
            targetElement.appendChild(value);
          } else {
            console.warn(
              `Attempted to append to ${type} before it was initialized.`
            );
          }
        }
        return result;
      },
    });
  }

  #init() {
    const container = document.createElement('div');
    const header = document.createElement('div');
    const body = document.createElement('div');
    const footer = document.createElement('div');

    header.className = 'dialog-header';
    body.className = 'dialog-body';
    footer.className = 'dialog-footer';
    container.className = 'dialog-container';

    const title = document.createElement('span');
    title.className = 'dialog-title';
    title.innerText = this.dialogTitle;

    header.appendChild(title);
    container.append(header, body, footer);
    this.dialog.appendChild(container);

    this._dialogHeader = header;
    this._dialogTitle = title;
    this._dialogBody = body;
    this._dialogFooter = footer;
  }
}

export class CustomDialog extends Dialog {
  constructor(title,container) {
    super("", container);
    
    this._container = container;
    this._title = title;
    this._placeholder = 'Masukan Nama atau Path';
    
    this.input = new Input(this._placeholder);
    
    this.#initCustomDialog();
  }
  
  set title(value) {
    this._title = value;
    if (this.titleElement) {
      this.titleElement.textContent = value;
    }
  }
  get title() {
    return this._title;
  }
  
  set placeholder(value) {
    this._placeholder = value;
    if (this.input?.input) {
      this.input.input.placeholder = value;
      this.input.input.dataset.lang = 'placeholder1'; // Optional jika ingin translate placeholder otomatis
    }
  }
  get placeholder() {
    return this._placeholder;
  }
  
  get value() {
    return this.input.value;
  }
  set value(val) {
    this.input.value = val;
  }
  
  focus() {
    this.input.focus();
  }
  blur() {
    this.input.blur();
  }
  
  #initCustomDialog() {
    this.titleElement = this.dialog.querySelector('.dialog-title');
    
    if (this.titleElement && this._title) {
      this.titleElement.textContent = this._title;
    }
    
    const buttonNegative = new Button(
      'btn button-negative',
  new LangText({
        id: "batal",
        en: "cancel"
      }).getText()
    );
    buttonNegative.button.accessKey = "x"
    
    const buttonPositive = new Button(
      'btn button-positive',
      new LangText({
        id: "ok",
        en: "ok"
      }).getText()
    );  
    
  
    
    this.buttonNegative = buttonNegative;
    this.buttonPositive = buttonPositive;
    
    this.children.body.push(this.input.input);
    this.children.footer.push(buttonNegative.button);
    this.children.footer.push(buttonPositive.button);
  }
  
  show(state = false) {
    if (state) {
      if (!this.dialog.isConnected && this._container) {
        this.render(true);
      }
      this.dialog.classList.add('open');
      this.input.focus();
    } else {
      this.dialog.classList.remove('open');
      setTimeout(() => this.render(false), 250);
    }
  }
}

