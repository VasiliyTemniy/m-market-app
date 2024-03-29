import type { Configuration as WebpackConfiguration } from 'webpack';
import type { Configuration as WebpackDevServerConfiguration } from 'webpack-dev-server';
import path from 'path';
import { rules } from './webpack.rules.js';
import { plugins } from './webpack.plugins.js';
//import { optimization } from './webpack.optimization';
import HtmlWebPackPlugin from 'html-webpack-plugin';

import * as dotenv from 'dotenv';

const isDockerized = (process.env.DOCKERIZED_DEV === 'true' || process.env.DOCKERIZED === 'true');

dotenv.config({
  override: isDockerized ? false : true
});

const frontendModule = process.env.FRONTEND_MODULE ? process.env.FRONTEND_MODULE : 'customer';
const port = process.env.FRONTEND_WEB_PORT ? process.env.FRONTEND_WEB_PORT : '4002';

const outputPublicPath = frontendModule === 'admin' ? '/admin/' :
  frontendModule === 'manager' ? '/manager/' :
  '/';

const backendUrl = process.env.BACKEND_URL;
if (!backendUrl) throw new Error('Backend url not set!');

const isDevelopment = process.env.NODE_ENV === 'development';

interface Configuration extends WebpackConfiguration {
  devServer?: WebpackDevServerConfiguration;
}

const __dirname = path.resolve();

const config: Configuration = {
  context: __dirname,
  entry: `./${frontendModule}/src/index.tsx`,
  output: {
    path: isDevelopment ? path.join(__dirname, `.webpack-dev.${frontendModule}`) : path.join(__dirname, `.webpack.${frontendModule}`),
    filename: isDevelopment ? 'build.js' : 'build.[fullhash].js',
    publicPath: outputPublicPath
  },
  devServer: {
    static: `./.webpack-dev.${frontendModule}`,
    compress: true,
    port,
    allowedHosts: 'all',
    hot: true,
    open: [ outputPublicPath ],
    historyApiFallback: {
      rewrites: [
        { from: /^\/admin\/.*/, to: '/admin/index.html' },
        { from: /^\/manager\/.*/, to: '/manager/index.html' },
        { from: /^\/.*$/, to: '/index.html' },
      ],
    },
    watchFiles: {
      paths: [`${frontendModule}/src/**/*`, `${frontendModule}/public/**/*`],
      options: {
        usePolling: isDockerized ? false : true
      },
    },
    client: {
      webSocketURL: isDockerized ? 'auto://0.0.0.0:0/ws' : `ws://localhost:${port}/ws`,
    }
  },
  module: {
    rules,
  },
  target: 'web',
  plugins: [
    new HtmlWebPackPlugin({
      template: `./${frontendModule}/public/index.html`,
      filename: './index.html'
    }),
    ...plugins
  ],
  mode: isDevelopment ? 'development' : 'production',
  devtool: isDevelopment ? 'inline-source-map' : false,
  resolve: {
    alias: {
      'shared': path.resolve(__dirname, 'shared')
    },
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
  //optimization, // this thing comes from import, should divide build to smaller pieces for better optimization. Does not work now, though. Performance: hints: false disables warnings now!
  performance: {
    hints: false,
  }
};

export default config;