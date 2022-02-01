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
const path = __importStar(require("path"));
const typescript = __importStar(require("typescript"));
const allowedExtensions = ['.interface', '.class'];
const transformer = (_) => (transformationContext) => (sourceFile) => {
    function visitNode(node) {
        if (shouldMutateModuleSpecifier(node)) {
            if (typescript.isImportDeclaration(node)) {
                const newModuleSpecifier = typescript.createLiteral(`${node.moduleSpecifier.text}.js`);
                return typescript.updateImportDeclaration(node, node.decorators, node.modifiers, node.importClause, newModuleSpecifier, undefined);
            }
            else if (typescript.isExportDeclaration(node)) {
                const newModuleSpecifier = typescript.createLiteral(`${node.moduleSpecifier.text}.js`);
                return typescript.updateExportDeclaration(node, node.decorators, node.modifiers, node.exportClause, newModuleSpecifier, false);
            }
        }
        return typescript.visitEachChild(node, visitNode, transformationContext);
    }
    function shouldMutateModuleSpecifier(node) {
        if (!typescript.isImportDeclaration(node) && !typescript.isExportDeclaration(node))
            return false;
        if (node.moduleSpecifier === undefined)
            return false;
        // only when module specifier is valid
        if (!typescript.isStringLiteral(node.moduleSpecifier))
            return false;
        // only when path is relative
        if (!node.moduleSpecifier.text.startsWith('./') && !node.moduleSpecifier.text.startsWith('../'))
            return false;
        // only when module specifier has no extension
        const ext = path.extname(node.moduleSpecifier.text);
        if (ext !== '' && !allowedExtensions.includes(ext))
            return false;
        return true;
    }
    return typescript.visitNode(sourceFile, visitNode);
};
exports.default = transformer;
