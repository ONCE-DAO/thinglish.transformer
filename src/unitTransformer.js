"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ts = __importStar(require("typescript"));
function finish() {
    return (ctx) => {
        return (sourceFile) => {
            function visitor(node) {
                return ts.visitEachChild(node, visitor, ctx);
            }
            return ts.visitEachChild(sourceFile, visitor, ctx);
        };
    };
}
function default_1(program, pluginOptions) {
    // console.log(program.getRootFileNames())
    const rootDir = program.getCompilerOptions().rootDir;
    const outDir = program.getCompilerOptions().outDir;
    const extensions = pluginOptions.extensions;
    if (!rootDir)
        throw new Error('ERROR: UnitTransformer: No root dir found');
    if (!outDir)
        throw new Error('ERROR: UnitTransformer: No out dir found');
    if (!extensions)
        throw new Error('ERROR: UnitTransformer: no extensions in config');
    if (!Array.isArray(extensions)) {
        throw new Error('ERROR: UnitTransformer: extension is expected to be an array');
    }
    fs.cpSync(rootDir, outDir, {
        recursive: true,
        filter: (source, dest) => {
            if (path.basename(source) === 'assets') {
                fs.cpSync(source, dest, { recursive: true });
                return false;
            }
            return (path.basename(source) !== 'node_modules' &&
                (fs.lstatSync(source).isDirectory() ||
                    extensions.includes(path.extname(source))));
        }
    });
    return finish();
}
exports.default = default_1;
