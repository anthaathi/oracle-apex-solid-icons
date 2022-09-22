import * as fs from 'fs';
import * as path from "path";
import withSolid from "rollup-preset-solid";
import {ModuleFormat, RollupOptions} from "rollup";
import copy from "rollup-plugin-copy";

const entryFile = ['./font-apex/svgs/large', './font-apex/svgs/small']
    .map(res => fs.readdirSync(path.join(__dirname, res))
        .map(file => path.join(__dirname, res, file))).flat().map(res => {
            const fileName = path.basename(res);

        const modulePath = fileName
            .replace('.svg', '')
            .replaceAll(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });

        const moduleName = (modulePath.charAt(0).toUpperCase() + modulePath.substring(1))
            .split('-').join('_');

        const dirName = path.dirname(res).split('/');

        const file = dirName[dirName.length - 1];

        return `export { default as Icon${moduleName}${file.charAt(0).toUpperCase() + file.substring(1)} } from '${ res.replace(__dirname, '.') }';`;
}).join('\n');

fs.writeFileSync('index.tsx', entryFile);

interface Options extends RollupOptions {
    /**
     * Defines which target you want
     * @default ['esm']
     */
    targets?: ModuleFormat[];
    /**
     * Whether to generate a package.json or not
     * This is useful for sub packages
     * @default false
     */
    writePackageJson?: boolean;
    /**
     * Whether to hint what to put in your package.json or not
     * @default false
     */
    printInstructions?: boolean;
}

export default withSolid({
    targets: [
        'cjs',
        'esm',
        'commonjs',
        'es'
    ],
    plugins: [
        SVGInjectPlugin() as never,
        copy({
            targets: [
                { src: 'font-apex/svgs', dest: 'dist/source/font-apex' }
            ]
        })
    ]
}as Options);

const isSVGPath = (path) => /\.svg(\.tsx)?$/.test(path);

function SVGInjectPlugin() {
    return {
        enforce: 'pre',
        name: 'svg-inject',
        resolveId(svgPath1, importer) {
            if (!isSVGPath(svgPath1)) {
                return null;
            }

            return svgPath1.replace(/\.svg$/, '.svg.tsx');
        },

        async load(path) {
            if (!isSVGPath(path)) {
                return null;
            }

            const svgPath = path.replace(/\.svg\.tsx$/, '.svg');
            const buffer = await fs.readFileSync(svgPath);
            const content = String(buffer);
            return `
        export default (props = {}) => 
          ${content.replace(/^(<svg.*?)>/i, '$1 {...props}>')}
      `;
        },
    };
}
