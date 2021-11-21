// This file contains the development configuration for Webpack.
// Webpack is used to bundle our source code, in order to optimize which
// scripts are loaded and all required files to run the application are
// neatly put into the build directory.
// Based on https://taraksharma.com/setting-up-electron-typescript-react-webpack/

const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

let mainConfig = {
  mode: 'development',
  entry: './src/main.ts',
  devtool: 'source-map',
  target: ['electron-main', 'es2020'],
  output: {
    filename: 'main.bundle.js',
    path: __dirname + '/build',
    clean: true,
    // keep filename ending the same: certain filename patterns required for certain Electron icon uses
    assetModuleFilename: 'assets/[hash]_[name][ext][query]',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  resolve: {
    extensions: ['.js', '.json', '.ts'],
  },
  module: {
    rules: [
      {
        // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
        test: /\.(ts)$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
        },
      },
      {
        test: /\.(jpg|png|gif|ico|icns|eot|ttf|woff|woff2)$/,
        type: 'asset/resource',
      },
    ],
  },
};

let rendererConfig = {
  mode: 'development',
  entry: './src/renderer.tsx',
  devtool: 'source-map',
  target: ['electron-renderer', 'es2020'],
  output: {
    filename: 'renderer.bundle.js',
    path: __dirname + '/build',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  experiments: {
    asyncWebAssembly: true,
  },
  resolve: {
    extensions: ['.js', '.json', '.ts', '.tsx', '.svg', '.wasm'],
    alias: {
      widgets: path.resolve(__dirname, 'widgets/'),
      resources: path.resolve(__dirname, 'resources/'),
      src: path.resolve(__dirname, 'src/'),
      wasm: path.resolve(__dirname, 'wasm/'),
    },
  },
  module: {
    rules: [
      {
        // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        loader: 'ts-loader',
      },
      {
        test: /\.(scss|css)$/,
        exclude: /\.module\.scss$/,
        use: [
          'style-loader',
          'css-loader?sourceMap',
          { loader: 'sass-loader', options: { sourceMap: true } },
        ],
      },
      {
        test: /\.module.(scss|css)$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
              modules: {
                // Use real class name, hash only added when needed
                localIdentName: '[local]_[hash:base64:5]',
              },
            },
          },
          'sass-loader?sourceMap',
        ],
      },
      {
        test: /\.(jpg|png|gif|ico|icns|eot|ttf|woff|woff2)$/,
        type: 'asset/resource',
      },
      {
        test: /\.wasm$/,
        type: 'asset/resource',
      },
      {
        test: /.node$/,
        loader: 'node-loader',
      },
      {
        test: /\.js$/,
        resourceQuery: /file/,
        type: 'asset/resource',
      },
      {
        test: /\.svg$/,
        oneOf: [
          {
            issuer: /\.scss$/,
            type: 'asset/resource',
          },
          {
            issuer: /.tsx?$/,
            loader: '@svgr/webpack',
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, './src/index.html'),
    }),
  ],
};

module.exports = [mainConfig, rendererConfig];
