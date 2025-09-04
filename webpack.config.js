// const path = require('path');

// module.exports = {
//   entry: './src/js/render.js', // file entry utama
//   output: {
//     path: path.resolve(__dirname, 'dist'),
//     filename: 'app.js', // hasil bundle
//     library: 'vanila', // nama global
//     libraryTarget: 'window', // export ke window.vanila
//   },
//   mode: 'development', // bisa diganti "production" kalau mau minify otomatis
//   devtool: 'source-map', // optional
// };
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './index.html', // langsung pake HTML
  output: {
    filename: 'bundle.[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.html$/i,
        loader: 'html-loader', // biar <script src> dan <link> diproses
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'], // CSS bisa ikut kebundle
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html', // input index.html asli lo
    }),
  ],
};
