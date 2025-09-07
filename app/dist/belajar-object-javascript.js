
export class DOM {
  static instance = [];
  constructor() {
    this.name = 'DOM';
    DOM.instance.push(this);
  }
}

DOM.prototype.create = {
  dom: function dom(tagName = '', attr = {}) {
    const attrs = Object.entries(attr).map(([key]) => key);
    String(attr).trim().toLocaleLowerCase();
    const tag = document.createElement(tagName);
    if (attrs.length >= 1)
      for (let i of attrs) {
        tag.setAttribute(i, attr[i]);
      }
    return tag;
  },
  array: function array(...arrayLength) {
    return arrayLength;
  },
};

const coba = new DOM();
const a = coba.create.array(1);
const b = coba.create.array();
console.log(Array.empty());

// data dummy multilingual, seolah-olah karya seni
const artworks = [
  {
    title: {
      en: 'Morning Light',
      id: 'Cahaya Pagi',
      ko: '아침의 빛',
      ru: 'Утренний свет',
      fr: 'Lumière du matin',
      hi: 'सुबह की रोशनी',
    },
    body: {
      en: 'The **sun** rises beyond the horizon, painting the sky with fire. It whispers: wake, breathe, begin again.',
      id: 'Mentari terbit di ufuk timur, melukis langit dengan warna api. Ia berbisik: bangunlah, bernapaslah, mulai lagi.',
      ko: '해가 지평선 너머로 떠오르며, 하늘을 불빛으로 물들인다. 그것은 속삭인다: 깨어나라, 숨 쉬어라, 다시 시작하라.',
      ru: 'Солнце поднимается за горизонтом, окрашивая небо огнем. Оно шепчет: проснись, дыши, начни снова.',
      fr: 'Le soleil se lève à l’horizon, peignant le ciel de feu. Il murmure : réveille-toi, respire, recommence.',
      hi: 'सूरज क्षितिज से ऊपर उठता है, आकाश को अग्नि से रंगता है। वह कहता है: जागो, साँस लो, फिर से शुरू करो।',
    },
  },
  {
    title: {
      en: 'Silent River',
      id: 'Sungai Sunyi',
      ko: '고요한 강',
      ru: 'Тихая река',
      fr: 'Rivière silencieuse',
      hi: 'शांत नदी',
    },
    body: {
      en: 'The river flows quietly, carrying the stories of the mountains to the sea.',
      id: 'Sungai mengalir tenang, membawa kisah gunung ke laut.',
      ko: '강은 조용히 흐르며 산의 이야기를 바다로 전한다.',
      ru: 'Река тихо течет, унося истории гор к морю.',
      fr: 'La rivière coule calmement, portant les histoires des montagnes à la mer.',
      hi: 'नदी चुपचाप बहती है, पहाड़ों की कहानियाँ समुद्र तक ले जाती है।',
    },
  },
  {
    title: {
      en: 'Whispering Forest',
      id: 'Hutan Berbisik',
      ko: '속삭이는 숲',
      ru: 'Шепчущий лес',
      fr: 'Forêt murmurante',
      hi: 'फुसफुसाता जंगल',
    },
    body: {
      en: 'Every leaf tells a secret, every breeze carries forgotten songs.',
      id: 'Setiap daun menyimpan rahasia, setiap angin membawa lagu yang terlupakan.',
      ko: '모든 잎은 비밀을 이야기하고, 모든 바람은 잊혀진 노래를 전한다.',
      ru: 'Каждый лист хранит тайну, каждый ветер несёт забытые песни.',
      fr: 'Chaque feuille raconte un secret, chaque brise porte des chansons oubliées.',
      hi: 'हर पत्ता एक रहस्य कहता है, हर हवा भूले हुए गीत लेकर आती है।',
    },
  },
];

// loop untuk bikin banyak card
const app = document.getElementById('app');

artworks.forEach(art => {
  const card = new DOM().create.dom('div', { ['class']: 'card' });

  const title = new DOM().create.dom('h3', {
    ['class']: 'card-title',
    ['data-t-en']: art.title.en,
    ['data-t-id']: art.title.id,
    ['data-t-ko']: art.title.ko,
    ['data-t-ru']: art.title.ru,
    ['data-t-fr']: art.title.fr,
    ['data-t-hi']: art.title.hi,
  });

  const body = new DOM().create.dom('p', {
    ['class']: 'card-body',
    ['translate']: 'no',
    ['data-t-en']: art.body.en,
    ['data-t-id']: art.body.id,
    ['data-t-ko']: art.body.ko,
    ['data-t-ru']: art.body.ru,
    ['data-t-fr']: art.body.fr,
    ['data-t-hi']: art.body.hi,
  });

  card.appendChild(title);
  card.appendChild(body);
  app.appendChild(card);
});

// listener select bahasa
document.getElementById('lang').addEventListener('change', e => {
  document.documentElement.lang = e.target.value;
});
const text = artworks[0].body.en;

// regex cari yang diapit **
const regex = /\*\*(.*?)\*\*/g;

// ambil semua hasil
const matches = [...text.matchAll(regex)];

matches.forEach((m, i) => {
  console.log(`Match ${i + 1}:`, m[1]); // m[1] = isi di dalam **
});

const arr = [];
