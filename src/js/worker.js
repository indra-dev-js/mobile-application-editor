self.onmessage = async e => {
  const url = e.data;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Gagal download CSS');

    const cssText = await res.text();

    // misal di sini bisa minify/parse dulu
    self.postMessage(cssText);

  } catch (err) {
    self.postMessage(`/* Error: ${err.message} */`);
  }
};
