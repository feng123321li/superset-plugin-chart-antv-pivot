# superset-plugin-chart-antv-pivot

This is the Superset Plugin Chart [Antv Pivot](https://s2.antv.antgroup.com/) Superset Chart Plugin.


### Usage

To build the plugin, run the following commands:

```
npm ci

版本兼容问题，强制安装：

npm ci --legacy-peer-deps

or use：

npm install -g cnpm --registry=https://registry.npm.taobao.org
cnpm i


npm run build
```

Alternatively, to run the plugin in development mode (=rebuilding whenever changes are made), start the dev server with the following command:

```
npm run dev
```

To add the package to Superset, go to the `superset-frontend` subdirectory in your Superset source folder (assuming both the `superset-plugin-chart-antv-pivot` plugin and `superset` repos are in the same root directory) and run
```
npm i -S ../../superset-plugin-chart-antv-pivot
```

After this edit the `superset-frontend/src/visualizations/presets/MainPreset.js` and make the following changes:

```js
import { SupersetPluginChartAntvPivot } from 'superset-plugin-chart-antv-pivot';
```

to import the plugin and later add the following to the array that's passed to the `plugins` property:
```js
new SupersetPluginChartAntvPivot().configure({ key: 'superset-plugin-chart-antv-pivot' }),
```

After that the plugin should show up when you run Superset, e.g. the development server:

```
npm run dev-server
```
