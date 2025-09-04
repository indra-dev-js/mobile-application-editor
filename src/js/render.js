const $HTML = document.documentElement;
const $BODY = document.body;
// Import modul
import { Dom } from './modules/commponets/dom.js';

import { HomePage } from './modules/commponets/home.js';
import { Drawer } from './modules/commponets/drawer.js';
import {
  SettingsPage,
  subscribeSettings,
  getSettingsFromDB,
} from './modules/commponets/pref.js';
import { Navbar } from './modules/commponets/navbar.js';
import { icodex } from './modules/commponets/page.js';

const main = document.getElementById('app'); //content right

const drawer = new Drawer();

drawer.render(window.icodex.root.mainWrapper);

window.icodex.router.addRoute('home', root => {
  // bersihin sebelum render

  new Navbar('home', root).render();
  new HomePage().render(root);
});

async function init() {
  await page.init();
}

window.icodex.router.addRoute('pref', async root => {
  root.innerHTML = '';
  new Navbar('home', root).render();
  const page = new SettingsPage();
  // pastikan section hanya ditambahkan sekali
  if (!page.sections.notifications) page.addSection('notifications');

  // cek jika setting sudah ada, jangan add duplicate
  if (
    !page.sections.notifications.some(item =>
      item.querySelector?.('#enablePush'),
    )
  )
    page.addSetting('notifications', {
      key: 'enablePush',
      label: 'Enable Push Notifications',
      type: 'switch',
    });

  if (
    !page.sections.notifications.some(item => item.querySelector?.('#resetBtn'))
  )
    page.addSetting('notifications', {
      key: 'resetBtn',
      label: 'Reset to Default',
      type: 'button',
      onClick: settings => console.log('Current settings:', settings),
    });

  (() => {
    if (navigator.userAgentData === undefined) {
      console.warn(
        "['navigator.userAgentData']\n API: not fully supported in your browser.",
      );
      return;
    }

    //Custom area selalu bisa dire-render ulang
    page.addSetting('notifications', {
      type: 'custom',
      label: 'Custom Area',
      element: (() => {
        const system = document.createElement('div');
        system.className = 'system-info-wrapper px-4';

        navigator.userAgentData
          .getHighEntropyValues([
            'architecture',
            'model',
            'platform',
            'platformVersion',
            'fullVersionList',
          ])
          .then(ua => {
            system.innerHTML = /* HTML */ `
              <fieldset class="userAgent">
                <legend>User Agent</legend>
                <ul>
                  <li>Architecture: ${ua.architecture}</li>
                  <li>Mobile: ${ua.mobile}</li>
                  <li>Model: ${ua.model || '-'}</li>
                  <li>Platform: ${ua.platform}</li>
                  <li>Platform Version: ${ua.platformVersion}</li>
                </ul>
              </fieldset>
            `;
          });
        return system;
      })(),
    });
  })();

  await page.render(root);
});

window.icodex.router.addRoute('editor', (root, id) => {
  root.innerHTML = '';
  new Navbar('editor', root).render();
  // const tabEl = document.createElement('nav');
  // tabEl.className = 'file-tab_container';
  // root.appendChild(tabEl);

  // const tab = new icodex.editor.TabEditor(tabEl, id);
  // await tab.loadTabsFromIDB();
  icodex.editor.panelEditor.render();
  if (!id) {
    // fallback watermark kalau belum ada project
    const watermark = document.createElement('div');
    watermark.className = 'editor-group-watermark';
    watermark.innerHTML = `<div class="watermark-box"></div>`;
    root.appendChild(watermark);
    return;
  }
});

window.icodex.router.handleUrlChange();

new Dom(
  [
    {
      name: 'a',
      attr: [{ href: '#editor', class: 'link-to-editor' }],
      meta: '➡ Ke Editor',
      events: {
        click: e => {
          e.preventDefault();
          parent.icodex.router.navigate('editor');
        },
      },
    },
    {
      name: 'a',
      attr: [{ href: '#home', class: 'link-to-home' }],
      meta: '⬅ Ke Home',
      events: {
        click: e => {
          e.preventDefault();
          parent.icodex.router.navigate('home');
        },
      },
    },
  ],
  document.body,
);

// Objek dengan properti "calc" yang isinya string fungsi
// src/js/home.js (atau entry utama app kamu)
/*if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('service.worker.js', {
      type: 'module',
      scope: '',
    })
    .then(reg => console.log('SW registered:', reg))
    .catch(err => console.error('SW error:', err));
}*/

// =======================
// 🔹 Helpers untuk apply setting
// =======================

// Atur ukuran font & line-height
function updateFontSettings(pref) {
  const size = pref.textSize || 16;
  $HTML.style.setProperty('--root-font-size', size + 'px');
  $HTML.style.setProperty('--root-line-height', size * 1.5 + 'px');
}

// Atur tema + night mode
function updateThemeSettings(pref) {
  $HTML.dataset.theme = pref.background || 'dark';
  if (pref.background === 'dark') {
    pref.nightMode
      ? $HTML.classList.add('amoled')
      : $HTML.classList.remove('amoled');
  }
}

// Atur tree indent (indentasi tree view)
function updateShowTreeIndentSetting(pref) {
  if (pref.showtreeindent) {
    $BODY.classList.add('show-indent');
  } else {
    $BODY.classList.remove('show-indent');
  }
}

// =======================
// 🔹 Default render dari DB
// =======================
async function defaultRenderSettings() {
  try {
    const resolve = await getSettingsFromDB();

    if (resolve) {
      updateFontSettings(resolve);
      updateThemeSettings(resolve);
      updateShowTreeIndentSetting(resolve);
    }
  } catch (e) {
    console.error(e);
  }
}

// =======================
// 🔹 Realtime subscribe
// =======================
subscribeSettings(pref => {
  updateFontSettings(pref);
  updateThemeSettings(pref);
  updateShowTreeIndentSetting(pref);
});

window.addEventListener('DOMContentLoaded', async () => {
  await defaultRenderSettings();

  window.icodex.router.start();
});
