const esbuild = require('esbuild');

const options = {
  entryPoints: ['src/js/render.js'], // file utama
  bundle: true, // gabung semua import jadi 1
  format: 'iife', // hasil jadi IIFE
  globalName: 'vanila', // diekspos di window.vanila
  // output file
  outfile: "src",
  minify: false, // optional: compress hasil
  sourcemap: true, // optional: bikin source map
  // optional: target JS
};

(async () => {
  if (process.argv.includes('--watch')) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await esbuild.build(options);
    console.log('Build complete!');
  }
})();
