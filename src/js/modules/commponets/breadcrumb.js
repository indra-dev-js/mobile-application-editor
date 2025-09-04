// Breadcrumb.js
export class Breadcrumb {
  constructor(path = '') {
  
    this.path = path.replace(/^\/+/, '');
    this.parts = this.path.split('/');
    this.iconMap = {
      css: 'devicon-css3-plain colored',
      js: 'devicon-javascript-plain colored',
      html: 'devicon-html5-plain colored',
      json: 'icon-json',
      txt: 'icon-txt',
      md: 'icon-markdown',
      default: '',
    };
  }

  // Return kumpulan <li> di dalam DocumentFragment
  render() {
    
    const fragment = document.createDocumentFragment();
    let cumulative = '';

    this.parts.forEach((part, index) => {
      cumulative += '/' + part;

      const li = document.createElement('li');
      li.className = 'breadcrumb-item';
      li.dataset.index = index;
      const a = document.createElement('a');
      
      const isLast = index === this.parts.length - 1;
      const isSingle = this.parts.length === 1;

      if (isLast) {
        a.classList.add('last');
        a.dataset.fullPath = this.path

        const ext = part.includes('.') ? part.split('.').pop() : '';
        const iconClass = this.iconMap[ext] || this.iconMap.default;

        const icon = document.createElement('i');
        icon.className = iconClass;

        const span = document.createElement('span');
        span.textContent = part;

        a.appendChild(icon);
        a.appendChild(span);
      } else {
        a.textContent = part;
        a.dataset.path = part
        if (!isSingle) {
          const chevron = document.createElement('i');
          chevron.className = 'icodex icodex-chevron-right';
          a.appendChild(chevron);
        }
      }

      li.appendChild(a);
      fragment.appendChild(li);
    });

    return fragment; // langsung <li> saja dalam fragment
  }
}
