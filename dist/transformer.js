"use strict";
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.type = void 0;
const TS = require("typescript");
const fs_1 = require("fs");
const path = require("path");
const debug = true;
class BaseVisitor {
    constructor(aContext) {
        this.context = aContext;
    }
    get componentDescriptor() {
        return ComponentDescriptor.getComponentDescriptor4File(this.context.sourceFile);
    }
    static get validTSSyntaxKind() {
        throw new Error("Not implemented yet");
    }
}
BaseVisitor.implementations = new Array();
class ComponentDescriptor {
    constructor(packageJson) {
        const packageJsonData = JSON.parse((0, fs_1.readFileSync)(packageJson).toString());
        let path = packageJson.split('/');
        path.pop();
        this.packagePath = path.join('/');
        for (const key of ["package", "name", "version"]) {
            if (packageJsonData[key] === undefined)
                throw new Error(`Missing ${key} in the Package Json file => ${packageJson}`);
        }
        this.package = packageJsonData.package;
        this.name = packageJsonData.name;
        this.version = packageJsonData.version;
    }
    static getComponentDescriptor4File(sourceFile) {
        let filename;
        if (typeof sourceFile === 'string') {
            filename = sourceFile;
        }
        else {
            filename = sourceFile.fileName;
        }
        let packageFile = this.getPackage4File(filename.split('/'), filename);
        if (this._store[packageFile]) {
            return this._store[packageFile];
        }
        else {
            const componentDescriptor = new ComponentDescriptor(packageFile);
            this._store[packageFile] = componentDescriptor;
            return componentDescriptor;
        }
    }
    static getPackage4File(path, originalFilename) {
        //if (debug) console.log("Get package 4 Path " + path);
        if (path.length === 1)
            throw new Error("Could not find a package.json File! " + originalFilename);
        const packageFile = path.join('/') + '/package.json';
        //if (debug) console.log("Check: " + packageFile);
        if ((0, fs_1.existsSync)(packageFile)) {
            return packageFile;
        }
        else {
            path.pop();
            return this.getPackage4File(path, originalFilename);
        }
    }
}
ComponentDescriptor._store = {};
const onceIORModule = "ior:esm:git:tla.EAM.Once";
class ThinglishInterfaceVisitor extends BaseVisitor {
    static get validTSSyntaxKind() {
        return TS.SyntaxKind.InterfaceDeclaration;
    }
    visit(node) {
        this.addImportInterfaceDescriptor();
        const exportVariableStatement = this.getInterfaceDescriptorRegister(node);
        //if (debug) console.log(node);
        return [exportVariableStatement, node];
    }
    checkHeritageClause(tsClass, innerCallExpression) {
        let returnCallExpression = innerCallExpression;
        if (debug)
            console.log("interface: checkHeritageClause");
        if (tsClass.heritageClauses) {
            if (debug)
                console.log("interface: has heritageClauses");
            tsClass.heritageClauses.forEach(element => {
                //if (debug) console.log("element:", element)
                element.types.forEach((type) => {
                    const identifier = type.expression;
                    if (debug)
                        console.log("  Extends  Interface:", identifier.text);
                    returnCallExpression = this.addExtendDeceleration(identifier, returnCallExpression);
                });
            });
        }
        return returnCallExpression;
    }
    _getUpperImportDeclaration(object) {
        if (object === undefined) {
            return undefined;
        }
        else if (TS.isImportDeclaration(object)) {
            return object;
        }
        else if ("parent" in object) {
            return this._getUpperImportDeclaration(object.parent);
        }
        else {
            throw new Error("Not implemented yet 5");
        }
    }
    addExtendDeceleration(identifier, innerCallExpression) {
        var _d;
        const typeChecker = this.context.program.getTypeChecker();
        let interfaceName = identifier.escapedText;
        let symbol = typeChecker.getSymbolAtLocation(identifier);
        let importPath = "";
        let decorator = (_d = symbol === null || symbol === void 0 ? void 0 : symbol.declarations) === null || _d === void 0 ? void 0 : _d[0];
        if (!decorator) {
            return innerCallExpression;
        }
        else if (TS.isImportSpecifier(decorator) || TS.isImportClause(decorator)) {
            let myImport = this._getUpperImportDeclaration(decorator);
            if (myImport && TS.isImportDeclaration(myImport)) {
                importPath = myImport.moduleSpecifier.getText();
            }
            else {
                throw new Error("Not implemented yet 1");
            }
        }
        else if (TS.isClassDeclaration(decorator)) {
            importPath = ".";
        }
        else if (TS.isInterfaceDeclaration(decorator)) {
            importPath = ".";
        }
        else {
            if (debug)
                console.log("Error Symbol " + interfaceName);
            if (debug)
                console.log(symbol);
            throw new Error("Not implemented yet 10");
        }
        if (importPath.startsWith("ior:")) {
            const matchResult = importPath.match(/^ior:esm[^\/]+([^\[]+)\.([^.]+)(\[.+\])?/);
            if (matchResult) {
                return TS.factory.createCallExpression(TS.factory.createPropertyAccessExpression(innerCallExpression, TS.factory.createIdentifier("addExtension")), undefined, [
                    TS.factory.createStringLiteral(matchResult[1]),
                    TS.factory.createStringLiteral(matchResult[2]),
                    TS.factory.createStringLiteral(matchResult[3]),
                    TS.factory.createStringLiteral(interfaceName)
                ]);
            }
            throw new Error("Could not match import String: " + importPath);
        }
        const sourcePath = path.dirname(this.context.sourceFile.fileName) + '/' + path.dirname(importPath);
        const componentDescriptor = ComponentDescriptor.getComponentDescriptor4File(sourcePath);
        return TS.factory.createCallExpression(TS.factory.createPropertyAccessExpression(innerCallExpression, TS.factory.createIdentifier("addExtension")), undefined, [
            TS.factory.createStringLiteral(componentDescriptor.package),
            TS.factory.createStringLiteral(componentDescriptor.name),
            TS.factory.createStringLiteral(componentDescriptor.version),
            TS.factory.createStringLiteral(interfaceName)
        ]);
    }
    getInterfaceDescriptorRegister(node) {
        let interfaceName = node.name.text; //+ "InterfaceDescriptor";
        //let newNode = ts.createSourceFile(interfaceName+"interface.ts","empty file", ts.ScriptTarget.ES5, true ,ts.ScriptKind.TS);
        const cd = TS.factory.createIdentifier('InterfaceDescriptor');
        let componentDescriptor = this.componentDescriptor;
        let call = TS.factory.createCallExpression(TS.factory.createPropertyAccessExpression(cd, "register"), undefined, [
            TS.factory.createStringLiteral(componentDescriptor.package),
            TS.factory.createStringLiteral(componentDescriptor.name),
            TS.factory.createStringLiteral(componentDescriptor.version),
            TS.factory.createStringLiteral(interfaceName)
        ]);
        // Check for extends
        call = this.checkHeritageClause(node, call);
        const variableDeclaration = TS.factory.createVariableDeclaration(interfaceName, 
        /* exclamationToken optional */ undefined, 
        /* type */ undefined, 
        /* initializer */ call);
        const variableDeclarationList = TS.factory.createVariableDeclarationList([variableDeclaration], TS.NodeFlags.Const);
        const exportVariableStatement = TS.factory.createVariableStatement([TS.factory.createModifier(TS.SyntaxKind.ExportKeyword)], variableDeclarationList);
        return variableDeclarationList;
    }
    addImportInterfaceDescriptor() {
        let relativePath = path.relative(path.dirname(this.context.sourceFile.fileName), this.componentDescriptor.packagePath + '/src/2_systems/Things/DefaultClassDescriptor.class') || ".";
        if (!relativePath.startsWith('.'))
            relativePath = './' + relativePath;
        const onceIORModule = relativePath;
        const importNode = TS.factory.createImportDeclaration(undefined, undefined, TS.factory.createImportClause(false, undefined, TS.factory.createNamedImports([TS.factory.createImportSpecifier(false, undefined, TS.factory.createIdentifier("InterfaceDescriptor"))])), TS.factory.createStringLiteral(onceIORModule), undefined);
        //if (debug) console.log(importNode);
        this.context.fileVisitor.add2Header(`InterfaceDescriptor`, importNode);
    }
}
_a = ThinglishInterfaceVisitor;
(() => {
    BaseVisitor.implementations.push(_a);
})();
class ThinglishImportVisitor extends BaseVisitor {
    constructor() {
        super(...arguments);
        // private readonly allowedExtensions = ['.interface', '.class']
        this.allowedExtensions = ['.class'];
    }
    static get validTSSyntaxKind() {
        return TS.SyntaxKind.ImportDeclaration;
    }
    visit(node) {
        // return node;
        // if (this.context.sourceFile.fileName.match('/test/')) {
        //   if (debug) console.log("No update for import on File: " + this.context.sourceFile.fileName)
        //   return node;
        // }
        if (debug)
            console.log("my transformer" + node.kind);
        if (this.shouldMutateModuleSpecifier(node)) {
            if (TS.isImportDeclaration(node)) {
                const newModuleSpecifier = TS.factory.createStringLiteral(`${node.moduleSpecifier.text}.js`);
                return TS.factory.updateImportDeclaration(node, node.decorators, node.modifiers, node.importClause, newModuleSpecifier, undefined);
            }
        }
        return node;
    }
    shouldMutateModuleSpecifier(node) {
        if (!TS.isImportDeclaration(node) && !TS.isExportDeclaration(node))
            return false;
        if (node.moduleSpecifier === undefined)
            return false;
        // only when module specifier is valid
        if (!TS.isStringLiteral(node.moduleSpecifier))
            return false;
        // only when path is relative
        if (!node.moduleSpecifier.text.startsWith('./') && !node.moduleSpecifier.text.startsWith('../'))
            return false;
        // only when module specifier has no extension
        const ext = path.extname(node.moduleSpecifier.text);
        if (ext !== '' && !this.allowedExtensions.includes(ext))
            return false;
        return true;
    }
}
_b = ThinglishImportVisitor;
(() => {
    BaseVisitor.implementations.push(_b);
})();
class ThinglishClassVisitor extends BaseVisitor {
    static get validTSSyntaxKind() {
        return TS.SyntaxKind.ClassDeclaration;
    }
    visit(node) {
        var _d;
        this.addImportClassDescriptor();
        const fileVisitor = this.context.fileVisitor;
        if (debug)
            console.log("Class: " + ((_d = node.name) === null || _d === void 0 ? void 0 : _d.escapedText));
        if (this.context.sourceFile.fileName.match("ClassDescriptor") || this.context.sourceFile.fileName.match("NpmPackage") || this.context.sourceFile.fileName.match("UcpComponentDescriptor")) {
            if (debug)
                console.log("Cancel ClassDescriptor");
            return TS.visitEachChild(node, fileVisitor.visitor.bind(fileVisitor), fileVisitor.context);
        }
        let descriptor = this.checkHeritageClause(node);
        descriptor.push(this.getDecoratorFilename());
        descriptor.push(this.getDecoratorRegister());
        node = TS.factory.updateClassDeclaration(node, descriptor, node.modifiers, node.name, node.typeParameters, node.heritageClauses, node.members);
        return TS.visitEachChild(node, fileVisitor.visitor.bind(fileVisitor), fileVisitor.context);
    }
    getDecoratorRegister() {
        const componentDescriptor = this.componentDescriptor;
        return this.descriptorCreator(["ClassDescriptor", "register"], [componentDescriptor.package, componentDescriptor.name, componentDescriptor.version]);
    }
    getDecoratorFilename() {
        // let fileNameNode = TS.factory.createExpressionStatement(TS.factory.createPropertyAccessExpression(
        //   TS.factory.createMetaProperty(
        //     TS.SyntaxKind.ImportKeyword,
        //     TS.factory.createIdentifier("meta")
        //   ),
        //   TS.factory.createIdentifier("url")
        // ));
        return TS.factory.createDecorator(TS.factory.createCallExpression(TS.factory.createPropertyAccessExpression(TS.factory.createIdentifier("ClassDescriptor"), TS.factory.createIdentifier("setFilePath")), undefined, [TS.factory.createPropertyAccessExpression(TS.factory.createMetaProperty(TS.SyntaxKind.ImportKeyword, TS.factory.createIdentifier("meta")), TS.factory.createIdentifier("url"))]));
        //return this.descriptorCreator(["ClassDescriptor", "setFilePath"], [fileNameNode])
    }
    _getUpperImportDeclaration(object) {
        if (object === undefined) {
            return undefined;
        }
        else if (TS.isImportDeclaration(object)) {
            return object;
        }
        else if ("parent" in object) {
            return this._getUpperImportDeclaration(object.parent);
        }
        else {
            throw new Error("Not implemented yet 5");
        }
    }
    getDecoratorInterface(identifier) {
        var _d;
        const typeChecker = this.context.program.getTypeChecker();
        let interfaceName = identifier.escapedText;
        let symbol = typeChecker.getSymbolAtLocation(identifier);
        let importPath = "";
        let decorator = (_d = symbol === null || symbol === void 0 ? void 0 : symbol.declarations) === null || _d === void 0 ? void 0 : _d[0];
        if (!decorator) {
            return;
        }
        else if (TS.isImportSpecifier(decorator) || TS.isImportClause(decorator)) {
            let myImport = this._getUpperImportDeclaration(decorator);
            if (myImport && TS.isImportDeclaration(myImport)) {
                importPath = myImport.moduleSpecifier.getText();
            }
            else {
                throw new Error("Not implemented yet 1");
            }
        }
        else if (TS.isInterfaceDeclaration(decorator)) {
            importPath = ".";
        }
        else if (TS.isClassDeclaration(decorator)) {
            //Class Declaration
            return;
        }
        else {
            if (debug)
                console.log("Error Symbol " + interfaceName);
            if (debug)
                console.log(symbol);
            throw new Error("Not implemented yet 2");
        }
        if (importPath.startsWith("ior:")) {
            const matchResult = importPath.match(/^ior:esm[^\/]+([^\[]+)\.([^.]+)(\[.+\])?/);
            if (matchResult) {
                return this.descriptorCreator(["ClassDescriptor", "addInterfaces"], [matchResult[1], matchResult[2], matchResult[3], interfaceName]);
            }
            throw new Error("Could not match import String: " + importPath);
        }
        const sourcePath = path.dirname(this.context.sourceFile.fileName) + '/' + path.dirname(importPath);
        const componentDescriptor = ComponentDescriptor.getComponentDescriptor4File(sourcePath);
        return this.descriptorCreator(["ClassDescriptor", "addInterfaces"], [componentDescriptor.package, componentDescriptor.name, componentDescriptor.version, interfaceName]);
    }
    descriptorCreator(propertyAccessExpression, stringLiteral) {
        return TS.factory.createDecorator(TS.factory.createCallExpression(this.nodeIdentifier(propertyAccessExpression), undefined, stringLiteral.map(s => {
            if (typeof s === 'string') {
                return TS.factory.createStringLiteral(s);
            }
            else {
                return s;
            }
        })));
    }
    checkHeritageClause(tsClass) {
        let decorator = Array.from((tsClass === null || tsClass === void 0 ? void 0 : tsClass.decorators) || []);
        if (tsClass.heritageClauses) {
            tsClass.heritageClauses.forEach(element => {
                //if (debug) console.log("element:", element)
                //TODO Find a better way to find out that it is implements
                if (!element.getText().startsWith("implements"))
                    return;
                element.types.forEach((type) => {
                    const identifier = type.expression;
                    if (debug)
                        console.log("   implements Interface:", identifier.text);
                    let innerDecorator = this.getDecoratorInterface(identifier);
                    if (innerDecorator !== undefined)
                        decorator.push(innerDecorator);
                });
            });
        }
        return decorator;
    }
    nodeIdentifier(propertyAccessExpression) {
        if (propertyAccessExpression.length === 1) {
            return TS.factory.createIdentifier(propertyAccessExpression[0]);
        }
        else {
            let expression = this.nodeIdentifier(propertyAccessExpression.splice(0, propertyAccessExpression.length - 1));
            let name = this.nodeIdentifier(propertyAccessExpression.splice(0, 1));
            return TS.factory.createPropertyAccessExpression(expression, name);
        }
    }
    addImportClassDescriptor() {
        if (this.context.sourceFile.fileName.match("ClassDescriptor"))
            return;
        path.dirname(this.context.sourceFile.fileName);
        let relativePath = path.relative(path.dirname(this.context.sourceFile.fileName), this.componentDescriptor.packagePath + '/src/2_systems/Things/DefaultClassDescriptor.class') || ".";
        if (!relativePath.startsWith('.'))
            relativePath = './' + relativePath;
        //if (debug) console.log("FILE: " + this.context.sourceFile.fileName);
        //if (debug) console.log(path.dirname(this.context.sourceFile.fileName), this.componentDescriptor.packagePath + '/src', relativePath);
        const onceIORModule = relativePath;
        const importNode = TS.factory.createImportDeclaration(undefined, undefined, TS.factory.createImportClause(false, TS.factory.createIdentifier("ClassDescriptor"), undefined), TS.factory.createStringLiteral(onceIORModule), undefined);
        this.context.fileVisitor.add2Header(`ClassDescriptor`, importNode);
    }
}
_c = ThinglishClassVisitor;
(() => {
    BaseVisitor.implementations.push(_c);
})();
class ThinglishFileVisitor {
    constructor(program, context, sourceFile) {
        this.program = program;
        this.context = context;
        this.sourceFile = sourceFile;
        this.addItionalHeader = {};
    }
    add2Header(key, node) {
        this.addItionalHeader[key] = node;
    }
    transform() {
        if (debug)
            console.log("myTransformer", this.sourceFile.fileName);
        this.sourceFile = TS.visitNode(this.sourceFile, this.visitor.bind(this));
        let allImportVariables = this.getAllImportedVariables();
        if (debug)
            console.log("existingImports:  " + this.sourceFile.fileName, allImportVariables);
        // let allClasses: string[] = this.getAllClasses();
        let importVariables = Object.keys(this.addItionalHeader).filter(key => !allImportVariables.includes(key));
        let newImports = importVariables.map(key => this.addItionalHeader[key]);
        if (debug)
            console.log("AddImports:  ", importVariables);
        this.sourceFile = TS.factory.updateSourceFile(this.sourceFile, [...newImports, ...this.sourceFile.statements]);
        return this.sourceFile;
    }
    // private getAllClasses(): string[] {
    //   let existingClasses = this.sourceFile.statements.filter(x => TS.isImportDeclaration(x)) as TS.ClassDeclaration[];
    //   return existingClasses.map(x => x.name?.escapedText as string).filter(x => !!x)
    // }
    getAllImportedVariables() {
        let existingImports = this.sourceFile.statements.filter(x => TS.isImportDeclaration(x));
        let allImportVariables = [];
        existingImports.forEach(importDeclaration => {
            var _d, _e, _f, _g;
            const elements = ((_e = (_d = importDeclaration.importClause) === null || _d === void 0 ? void 0 : _d.namedBindings) === null || _e === void 0 ? void 0 : _e.elements) || [];
            for (const element of elements) {
                allImportVariables.push(element.name.escapedText);
            }
            //if (debug) console.log(importDeclaration.importClause?.name);
            const defaultImport = (_g = (_f = importDeclaration.importClause) === null || _f === void 0 ? void 0 : _f.name) === null || _g === void 0 ? void 0 : _g.escapedText;
            if (defaultImport !== undefined)
                allImportVariables.push(defaultImport);
        });
        return allImportVariables;
    }
    visitor(node) {
        let visitorContext = { transformationContext: this.context, sourceFile: this.sourceFile, program: this.program, fileVisitor: this };
        let visitorList = BaseVisitor.implementations.filter(aTSNodeVisitor => aTSNodeVisitor.validTSSyntaxKind === node.kind);
        if (visitorList.length > 1)
            throw new Error("Can not have more then one visitor");
        let myVisitor = visitorList.map(aTSNodeVisitorType => new aTSNodeVisitorType(visitorContext));
        if (TS.isInterfaceDeclaration(node)) {
            if (debug)
                console.log("  Node", TS.SyntaxKind[node.kind], this.sourceFile.text.substring(node.pos, node.end).replace('\n', ''));
        }
        if (myVisitor.length > 0) {
            return myVisitor[0].visit(node);
        }
        return TS.visitEachChild(node, this.visitor.bind(this), this.context);
    }
}
const programTransformer = (program) => {
    return {
        before(context) {
            return (sourceFile) => {
                return new ThinglishFileVisitor(program, context, sourceFile).transform();
            };
        }
    };
};
/**
 * Anything other than a node transformer will need to specifiy its type as an export
 */
exports.type = 'program';
/**
 * The default export should be your transformer
 */
exports.default = programTransformer;
