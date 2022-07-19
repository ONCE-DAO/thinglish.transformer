import * as TS from 'typescript';
import { existsSync, readdirSync, readFileSync, writeFileSync, writeSync } from "fs";
import * as path from "path";
const debug: boolean = false;

const jsExtension: boolean = false;

const localInterfaceDescriptorPath: string = '2_systems/Things/InterfaceDescriptor.class.mjs'
const localClassDescriptorPath: string = '2_systems/Things/ClassDescriptor.class.mjs'
const onceIOR = "ior:esm:/tla.EAM.Once[build]";
/**
 * When using a basic NodeTransformer some helpful context will be provided as the second parameter
 */
type VisitorContext = {
  //  checker: ts.TypeChecker
  transformationContext: TS.TransformationContext
  program: TS.Program
  sourceFile: TS.SourceFile,
  fileVisitor: ThinglishFileVisitor,
  componentDescriptor: ComponentDescriptor;
};

interface TSNodeVisitor {
  context: VisitorContext
  componentDescriptor: ComponentDescriptor;
  visit(node: TS.Node): TS.VisitResult<TS.Node>
  test?(node: TS.Node): boolean
  lift?(node: readonly TS.Node[]): TS.Node
}


abstract class BaseVisitor implements TSNodeVisitor {
  static implementations = new Array();

  public context: VisitorContext
  constructor(aContext: VisitorContext) {
    this.context = aContext;
  }

  abstract visit(node: TS.Node): TS.VisitResult<TS.Node>

  get componentDescriptor(): ComponentDescriptor {
    return this.context.componentDescriptor;
  }


  static get validTSSyntaxKind(): TS.SyntaxKind {
    throw new Error("Not implemented yet");
  }

}

var activeProgram: TS.Program;

type exportType = 'class' | 'interface' | 'type' | 'enum' | 'unknown'
type exportFormat = {
  [file: string]: { [objectName: string]: { name: string, defaultExport: boolean, type: exportType } }
}
class ComponentDescriptor {

  private static _store: Record<string, ComponentDescriptor> = {};

  package: string;
  name: string;
  version: string;
  packagePath: any;

  private exportUpdates: boolean = false;


  get exportFilePath(): string {
    let compilerOptions = activeProgram.getCompilerOptions();
    if (!compilerOptions.outDir) throw new Error("Missing compiler option 'outDir'");

    return path.join(compilerOptions.outDir, this.name + '.component.json');
  }

  get rootDir(): string {
    let compilerOptions = activeProgram.getCompilerOptions();
    if (!compilerOptions.rootDir) throw new Error("Missing compiler option 'rootDir'");
    return compilerOptions.rootDir;
  }

  exports: { file: TS.SourceFile, identifier: TS.Identifier }[] = [];

  addExport(file: TS.SourceFile, identifier: TS.Identifier): void {
    // ignore the export File
    if (file.fileName.endsWith('index.export.mts')) return;
    this.exports.push({ file, identifier });
    this.exportUpdates = true;
    // console.log("Add Export " + this.packagePath, ' ', file.fileName, ' ', identifier.text)
  }

  private formatExports(): exportFormat {
    let data: exportFormat = {};
    for (let element of this.exports) {
      let exportName = element.identifier.text;
      let defaultExport: boolean = false;
      if (element.identifier.parent.modifiers)
        defaultExport = element.identifier.parent.modifiers.filter(x => x.kind === TS.SyntaxKind.DefaultKeyword).length === 1

      let type = this.getKindName4Node(element.identifier.parent, element.identifier);

      let relativePath = path.relative(path.join(this.packagePath, this.rootDir), element.file.fileName)
      data[relativePath] = data[relativePath] || {};
      data[relativePath][element.identifier.text] = { name: exportName, defaultExport, type }
    }

    return data;
  }

  getKindName4Node(node: TS.Node, identifier: TS.Identifier): exportType {

    if (TS.isClassDeclaration(node)) return "class";
    if (TS.isInterfaceDeclaration(node)) return "interface";
    if (TS.isEnumDeclaration(node)) return "enum";
    if (TS.isTypeAliasDeclaration(node)) return "type";


    let dd = new DeclarationDescriptor(identifier);
    if (dd.name === DeclarationDescriptor.MISSING_DECLARATION)
      return "unknown"

    throw new Error("Not implemented yet")
  }

  writeExports() {
    if (!this.exportUpdates) return;
    let data = this.formatExports();
    let currentData: any = {};
    if (existsSync(this.exportFilePath)) {
      currentData = JSON.parse(readFileSync(this.exportFilePath, 'utf8').toString());
    }
    currentData.exports = data;
    writeFileSync(this.exportFilePath, JSON.stringify(currentData, null, 2));
    this.exportUpdates = false;
  }

  static getComponentDescriptor(object: TS.SourceFile | string | TS.Node): ComponentDescriptor {
    let filename: string;
    if (typeof object === 'string') {
      filename = object;
    } else if (TS.isSourceFile(object)) {
      filename = object.fileName;
    } else {
      filename = TSAstFactory.getFile4NodeObject(object).fileName;
    }

    let packageFile = this.getPackage4File(path.dirname(filename).split('/'), filename);

    if (this._store[packageFile]) {
      return this._store[packageFile];
    } else {
      const componentDescriptor = new ComponentDescriptor(packageFile);
      this._store[packageFile] = componentDescriptor;
      return componentDescriptor;
    }

  }

  static UNKNOWN_NAME = "Unknown name"
  static UNKNOWN_VERSION = "Unknown version"
  static UNKNOWN_PACKAGE = "Unknown package";

  constructor(packageJson?: string) {
    if (!packageJson) {
      this.package = ComponentDescriptor.UNKNOWN_PACKAGE;
      this.name = ComponentDescriptor.UNKNOWN_NAME;
      this.version = ComponentDescriptor.UNKNOWN_VERSION;
      return this;
    }
    const packageJsonData = JSON.parse(readFileSync(packageJson).toString());

    let path = packageJson.split('/');
    path.pop();
    this.packagePath = path.join('/');

    for (const key of ["namespace", "name", "version"]) {
      if (packageJsonData[key] === undefined) {
        throw new Error(`Missing ${key} in the Package Json file => ${packageJson}`);
      }
    }
    this.package = packageJsonData.namespace;
    this.name = packageJsonData.name;
    this.version = packageJsonData.version;
    return this;
  }


  static getPackage4File(pathArray: string[], originalFilename: string): string {
    //if (debug) console.log("Get package 4 Path " + path);
    if (pathArray.length === 1) throw new Error("Could not find a *.component.json File! " + originalFilename)

    let currentPath = pathArray.join('/')
    let files = readdirSync(currentPath);
    let componentsFile = files.filter(x => x.match(/\.component.json$/));
    if (componentsFile.length > 0) {
      return path.join(currentPath, componentsFile[0]);
    }

    const packageFile = path.join(currentPath, 'package.json');
    if (existsSync(packageFile)) {
      return packageFile;
    }

    pathArray.pop();
    return this.getPackage4File(pathArray, originalFilename);

  }

}

class DeclarationDescriptor {
  path!: string;
  name!: string;
  componentDescriptor!: ComponentDescriptor;

  type!: TS.Type;

  originalNodeObject!: TS.Node;
  get location(): string {
    return this.path.replace(/^\/?src\/?/, '')
  }

  constructor(public identifier: TS.Identifier) {
    this.init();
  }

  get typeChecker() {
    return activeProgram.getTypeChecker();
  }

  static MISSING_DECLARATION = "MissingDeclarations"

  init(): this {
    this.type = this.typeChecker.getTypeAtLocation(this.identifier);
    if (!this.type.symbol?.declarations) {
      this.name = DeclarationDescriptor.MISSING_DECLARATION;
      this.path = DeclarationDescriptor.MISSING_DECLARATION;
      this.componentDescriptor = new ComponentDescriptor();
      return this;
    }

    this.originalNodeObject = this.type.symbol.declarations[0] as TS.Node;

    let sourceFile = TSAstFactory.getFile4NodeObject(this.originalNodeObject);

    this.componentDescriptor = ComponentDescriptor.getComponentDescriptor(sourceFile.fileName);


    if ((TS.isInterfaceDeclaration(this.originalNodeObject) || TS.isClassDeclaration(this.originalNodeObject)) && typeof this.originalNodeObject.name !== "undefined") {
      this.name = this.originalNodeObject.name.escapedText as string;
    } else {
      this.name = this.type.symbol.name;

    }
    this.path = path.relative(this.componentDescriptor.packagePath, sourceFile.fileName)

    return this;
  }


}


class ThinglishInterfaceVisitor extends BaseVisitor implements TSNodeVisitor {

  static get validTSSyntaxKind(): TS.SyntaxKind {
    return TS.SyntaxKind.InterfaceDeclaration
  }

  static {
    BaseVisitor.implementations.push(this);

  }

  visit(node: TS.InterfaceDeclaration): TS.VisitResult<TS.Node> {
    if (this.context.fileVisitor.phase === "after") return node;

    let fileVisitor = this.context.fileVisitor;

    this.addImportInterfaceDescriptor();
    const exportVariableStatement = this.getInterfaceDescriptorRegister(node);

    //if (debug) console.log(node);
    let newNode = TS.visitEachChild(node, fileVisitor.visitor.bind(fileVisitor), fileVisitor.context);

    return [exportVariableStatement, newNode];
  }


  private checkHeritageClause(tsClass: TS.InterfaceDeclaration, innerCallExpression: TS.CallExpression): TS.CallExpression {
    let returnCallExpression: TS.CallExpression = innerCallExpression;

    if (debug) console.log("interface: checkHeritageClause");
    if (tsClass.heritageClauses) {
      if (debug) console.log("interface: has heritageClauses");

      tsClass.heritageClauses.forEach(element => {
        //if (debug) console.log("element:", element)

        element.types.forEach((type: TS.ExpressionWithTypeArguments) => {

          const identifier = type.expression as TS.Identifier;
          if (debug) console.log("  Extends  Interface:", identifier.text)

          returnCallExpression = this.addExtendDeceleration(identifier, returnCallExpression);

        })
      });
    }
    return returnCallExpression;
  }



  private _getUpperImportDeclaration(object: TS.Node | undefined): TS.ImportDeclaration | undefined {
    if (object === undefined) {
      return undefined
    } else if (TS.isImportDeclaration(object)) {
      return object;
    } else if ("parent" in object) {
      return this._getUpperImportDeclaration(object.parent)
    } else {
      throw new Error("Not implemented yet 5");

    }
  }

  addExtendDeceleration(identifier: TS.Identifier, innerCallExpression: TS.CallExpression): TS.CallExpression {

    let descriptor = new DeclarationDescriptor(identifier)

    return TS.factory.createCallExpression(
      TS.factory.createPropertyAccessExpression(
        innerCallExpression,
        TS.factory.createIdentifier("addExtension")
      ),
      undefined,
      [
        TS.factory.createStringLiteral(descriptor.componentDescriptor.package),
        TS.factory.createStringLiteral(descriptor.componentDescriptor.name),
        TS.factory.createStringLiteral(descriptor.componentDescriptor.version),
        TS.factory.createStringLiteral(descriptor.location),
        TS.factory.createStringLiteral(descriptor.name)
      ]
    )
  }

  private getInterfaceDescriptorRegister(node: TS.InterfaceDeclaration) {
    // let interfaceName = node.name.text;//+ "InterfaceDescriptor";
    //let newNode = ts.createSourceFile(interfaceName+"interface.ts","empty file", ts.ScriptTarget.ES5, true ,ts.ScriptKind.TS);
    const cd = TS.factory.createIdentifier('InterfaceDescriptor');

    let declarationDescriptor = new DeclarationDescriptor(node.name);
    //let componentDescriptor = this.componentDescriptor;

    let call = TS.factory.createCallExpression(
      TS.factory.createPropertyAccessExpression(
        cd, "register"),
      undefined,
      [
        TS.factory.createStringLiteral(declarationDescriptor.componentDescriptor.package),
        TS.factory.createStringLiteral(declarationDescriptor.componentDescriptor.name),
        TS.factory.createStringLiteral(declarationDescriptor.componentDescriptor.version),
        TS.factory.createStringLiteral(declarationDescriptor.location),
        TS.factory.createStringLiteral(declarationDescriptor.name)
      ]
    );

    // Check for extends
    call = this.checkHeritageClause(node, call);

    return call;
  }

  private addImportInterfaceDescriptor() {
    let importNode: TS.ImportDeclaration;

    if (TSAstFactory.isOnceFile(this.context.sourceFile)) {
      const dir = path.dirname(this.context.sourceFile.fileName);
      let onceModulePath = dir.replace(/^(.*\/[oO]nce@[^\/]+\/src\/).*/, '$1')
      let relativePath = path.relative(dir, path.join(onceModulePath, localInterfaceDescriptorPath)) || ".";
      if (!relativePath.startsWith('.')) relativePath = './' + relativePath;

      importNode = TSAstFactory.createDefaultImportNode("InterfaceDescriptor", relativePath);
    } else {
      // let onceIOR = this.context.program.getCompilerOptions().onceIOR;
      // if (typeof onceIOR != "string") throw new Error("Missing onceIOR in the CompilerOptions")
      importNode = TSAstFactory.createNamedImportNode("InterfaceDescriptor", onceIOR);

    }

    this.context.fileVisitor.add2Header(`InterfaceDescriptor`, importNode);
  }
}

type descriptorInfos = { package: string, packageName: string, version: string, path: string, name: string }

class TSAstFactory {

  static isOnceFile(file: TS.SourceFile): boolean {
    return file.fileName.toLowerCase().includes("once/once@")
  }

  static getFile4NodeObject(object: TS.Node): TS.SourceFile {
    if (TS.isSourceFile(object)) {
      return object;
    } else if (object.parent) {
      return this.getFile4NodeObject(object.parent);
    } else {
      throw new Error("Missing Parent")
    }
  }

  static createDefaultImportNode(name: string, importPath: string): TS.ImportDeclaration {
    return TS.factory.createImportDeclaration(
      undefined,
      undefined,
      TS.factory.createImportClause(
        false,
        TS.factory.createIdentifier(name),
        undefined
      ),
      TS.factory.createStringLiteral(importPath),
      undefined
    );
  }

  static createNamedImportNode(name: string, importPath: string): TS.ImportDeclaration {
    return TS.factory.createImportDeclaration(
      undefined,
      undefined,
      TS.factory.createImportClause(
        false,
        undefined,
        TS.factory.createNamedImports([TS.factory.createImportSpecifier(
          false,
          undefined,
          TS.factory.createIdentifier(name)
        )])
      ),
      TS.factory.createStringLiteral(importPath),
      undefined
    );
  }

}



class ThinglishExportVisitor extends BaseVisitor implements TSNodeVisitor {

  static get validTSSyntaxKind(): TS.SyntaxKind {
    return TS.SyntaxKind.ExportDeclaration
  }

  static {
    BaseVisitor.implementations.push(this);
  }

  get typeChecker() {
    return this.context.program.getTypeChecker();
  }

  private readonly allowedExtensions = ['.interface', '.class', '.interface.mjs', '.class.mjs']

  visit(node: TS.ExportDeclaration): TS.VisitResult<TS.Node> {

    if (this.context.fileVisitor.phase === "before") {
      if (node.exportClause && "elements" in node.exportClause) {
        let sourceFile = TSAstFactory.getFile4NodeObject(node)
        let cd = ComponentDescriptor.getComponentDescriptor(node);
        for (let element of node.exportClause.elements) {
          //let dd = new DeclarationDescriptor(element.name, this.context);
          cd.addExport(sourceFile, element.name);
        }
      }
      return node;
    }

    // if (this.context.sourceFile.fileName.match('/test/')) {
    //   if (debug) console.log("No update for import on File: " + this.context.sourceFile.fileName)
    //   return node;
    // }

    // if (debug) console.log("my transformer for EXPORT " + node.getFullText())
    const doAddJS = this.shouldMutateModuleSpecifier(node);
    if (doAddJS) {
      const newModuleSpecifier = TS.factory.createStringLiteral(`${node.moduleSpecifier.text}.js`)
      return TS.factory.updateExportDeclaration(node, node.decorators, node.modifiers, node.isTypeOnly, node.exportClause, newModuleSpecifier, node.assertClause)
    }


    return node;

  }

  shouldMutateModuleSpecifier(node: TS.ExportDeclaration): node is (TS.ExportDeclaration) & { moduleSpecifier: TS.StringLiteral } {
    if (jsExtension === false) return false;
    if (node.moduleSpecifier === undefined) return false
    // only when module specifier is valid
    if (!TS.isStringLiteral(node.moduleSpecifier)) return false
    // only when path is relative
    if (!node.moduleSpecifier.text.startsWith('./') && !node.moduleSpecifier.text.startsWith('../')) return false
    // only when module specifier has no extension
    const ext = path.extname(node.moduleSpecifier.text)
    if (ext !== '' && !this.allowedExtensions.includes(ext)) return false
    return true
  }

}



class ThinglishExportKeyword extends BaseVisitor implements TSNodeVisitor {

  static get validTSSyntaxKind(): TS.SyntaxKind {
    return TS.SyntaxKind.ExportKeyword
  }

  static {
    BaseVisitor.implementations.push(this);
  }

  get typeChecker() {
    return this.context.program.getTypeChecker();
  }


  visit(node: TS.ExportKeyword): TS.VisitResult<TS.Node> {
    let parent = node.parent;
    let cd = ComponentDescriptor.getComponentDescriptor(node);

    if (this.context.fileVisitor.phase === "before") {

      if (TS.isInterfaceDeclaration(parent)) {
        cd.addExport(this.context.fileVisitor.sourceFile, parent.name);
      } else if (TS.isClassDeclaration(parent) && parent.name !== undefined) {
        cd.addExport(this.context.fileVisitor.sourceFile, parent.name);
      } else if (TS.isEnumDeclaration(parent) && parent.name !== undefined) {
        cd.addExport(this.context.fileVisitor.sourceFile, parent.name);
      } else if (TS.isTypeAliasDeclaration(parent)) {
        cd.addExport(this.context.fileVisitor.sourceFile, parent.name);
      } else if (TS.isVariableStatement(parent)) {
        // Not implemented Yet
      } else {
        cd
      }
    }
    return node;

  }


}

class ThinglishCallExpressionVisitor extends BaseVisitor implements TSNodeVisitor {

  static get validTSSyntaxKind(): TS.SyntaxKind {
    return TS.SyntaxKind.CallExpression
  }

  static {
    BaseVisitor.implementations.push(this);
  }

  visit(node: TS.CallExpression): TS.VisitResult<TS.Node> {
    let fileVisitor = this.context.fileVisitor;

    if (this.context.fileVisitor.phase === "before") {

      // getInterfaceDescriptor transform Interface to identifier
      if (node.typeArguments !== undefined && node.typeArguments.length === 1 && TS.isTypeReferenceNode(node.typeArguments[0]) &&
        ((node.expression as TS.PropertyAccessExpression)?.expression as TS.Identifier)?.escapedText === 'InterfaceDescriptor' &&
        (node.expression as TS.PropertyAccessExpression)?.name?.escapedText === 'getInterfaceDescriptor') {

        let dd = new DeclarationDescriptor((node.typeArguments[0].typeName as TS.Identifier));
        return TS.factory.updateCallExpression(node, node.expression, node.typeArguments, [
          TS.factory.createStringLiteral(dd.componentDescriptor.package),
          TS.factory.createStringLiteral(dd.componentDescriptor.name),
          TS.factory.createStringLiteral(dd.componentDescriptor.version),
          TS.factory.createStringLiteral(dd.location),
          TS.factory.createStringLiteral(dd.name)
        ])
      }
      return TS.visitEachChild(node, fileVisitor.visitor.bind(fileVisitor), fileVisitor.context);
    } else {

      // Add leading "/" to IOR import
      if (node.expression.kind === TS.SyntaxKind.ImportKeyword) {
        if (node.arguments.length === 1 && node.arguments[0].kind === TS.SyntaxKind.StringLiteral) {
          let arg = node.arguments[0] as TS.StringLiteral;

          if (arg.text.startsWith('ior:esm:')) {
            return TS.factory.updateCallExpression(node, node.expression, node.typeArguments, [TS.factory.createStringLiteral(`/${arg.text}`)])
          }
        }
      }

      return TS.visitEachChild(node, fileVisitor.visitor.bind(fileVisitor), fileVisitor.context);
    }
  }
}


class ThinglishImportVisitor extends BaseVisitor implements TSNodeVisitor {

  static get validTSSyntaxKind(): TS.SyntaxKind {
    return TS.SyntaxKind.ImportDeclaration
  }

  static {
    BaseVisitor.implementations.push(this);
  }

  private readonly allowedExtensions = ['.interface', '.class', '.interface.mjs', '.class.mjs']

  visit(node: TS.ImportDeclaration): TS.VisitResult<TS.Node> {

    if (this.context.fileVisitor.phase === "before") return node;

    // if (this.context.sourceFile.fileName.match('/test/')) {
    //   if (debug) console.log("No update for import on File: " + this.context.sourceFile.fileName)
    //   return node;
    // }

    //@ts-ignore
    if (debug) console.log("my transformer" + node.kind + ' : ' + node.moduleSpecifier.text)


    if (this.shouldMutateModuleSpecifier(node)) {
      if (TS.isImportDeclaration(node)) {
        const newModuleSpecifier = TS.factory.createStringLiteral(`/${node.moduleSpecifier.text}`)
        return TS.factory.updateImportDeclaration(node, node.decorators, node.modifiers, node.importClause, newModuleSpecifier, undefined)
      }
    }
    let fileVisitor = this.context.fileVisitor;
    return TS.visitEachChild(node, fileVisitor.visitor.bind(fileVisitor), fileVisitor.context);

  }

  shouldMutateModuleSpecifier(node: TS.Node): node is (TS.ImportDeclaration | TS.ExportDeclaration) & { moduleSpecifier: TS.StringLiteral } {
    if (!TS.isImportDeclaration(node) && !TS.isExportDeclaration(node)) return false
    if (node.moduleSpecifier === undefined) return false
    // only when module specifier is valid
    if (!TS.isStringLiteral(node.moduleSpecifier)) return false
    // only when path is relative
    if (!node.moduleSpecifier.text.startsWith('ior:esm:')) return false
    return true
  }

}

class ThinglishClassVisitor extends BaseVisitor implements TSNodeVisitor {

  static get validTSSyntaxKind(): TS.SyntaxKind {
    return TS.SyntaxKind.ClassDeclaration
  }

  static {
    BaseVisitor.implementations.push(this);

  }

  visit(node: TS.ClassDeclaration): TS.VisitResult<TS.Node> {
    if (this.context.fileVisitor.phase === "after") return node;

    this.addImportClassDescriptor();
    const fileVisitor = this.context.fileVisitor;

    if (debug) console.log("Class: " + node.name?.escapedText);

    // if (this.context.sourceFile.fileName.match("ClassDescriptor") || this.context.sourceFile.fileName.match("NpmPackage") || this.context.sourceFile.fileName.match("UcpComponentDescriptor") || this.context.sourceFile.fileName.match("OnceZod")) {
    //   if (debug) console.log("Cancel ClassDescriptor");
    //   return TS.visitEachChild(node, fileVisitor.visitor.bind(fileVisitor), fileVisitor.context);
    // }

    let descriptor = this.checkHeritageClause(node);

    //descriptor.push(this.getDecoratorFilename());
    descriptor.push(this.getDecoratorRegister(node));

    node = TS.factory.updateClassDeclaration(
      node,
      descriptor,
      node.modifiers,
      node.name,
      node.typeParameters,
      node.heritageClauses,
      node.members
    );

    return TS.visitEachChild(node, fileVisitor.visitor.bind(fileVisitor), fileVisitor.context);

  }

  getDecoratorRegister(node: TS.ClassDeclaration): TS.Decorator {
    if (!node.name) throw new Error("Missing Class name")
    const declarationDescriptor = new DeclarationDescriptor(node.name);

    return this.descriptorCreator(["ClassDescriptor", "register"],
      [declarationDescriptor.componentDescriptor.package,
      declarationDescriptor.componentDescriptor.name,
      declarationDescriptor.componentDescriptor.version,
      declarationDescriptor.location])
  }


  private _getUpperImportDeclaration(object: TS.Node | undefined): TS.ImportDeclaration | undefined {
    if (object === undefined) {
      return undefined
    } else if (TS.isImportDeclaration(object)) {
      return object;
    } else if ("parent" in object) {
      return this._getUpperImportDeclaration(object.parent)
    } else {
      throw new Error("Not implemented yet 5");

    }
  }

  getDecoratorInterface(identifier: TS.Identifier): TS.Decorator | undefined {

    let declarationDescriptor = new DeclarationDescriptor(identifier)
    return this.descriptorCreator(["ClassDescriptor", "addInterfaces"],
      [declarationDescriptor.componentDescriptor.package,
      declarationDescriptor.componentDescriptor.name,
      declarationDescriptor.componentDescriptor.version,
      declarationDescriptor.location,
      declarationDescriptor.name])

  }

  private descriptorCreator(propertyAccessExpression: string[], stringLiteral: (string | TS.Identifier | TS.ExpressionStatement)[]) {

    return TS.factory.createDecorator(TS.factory.createCallExpression(
      this.nodeIdentifier(propertyAccessExpression),
      undefined,
      stringLiteral.map(s => {
        if (typeof s === 'string') {
          return TS.factory.createStringLiteral(s) as TS.Expression
        } else {
          return s as TS.Expression;
        }
      })

    ))
  }

  private checkHeritageClause(tsClass: TS.ClassDeclaration): TS.Decorator[] {
    let decorator: TS.Decorator[] = Array.from(tsClass?.decorators || []);

    if (tsClass.heritageClauses) {

      tsClass.heritageClauses.forEach(element => {
        //if (debug) console.log("element:", element)

        //TODO Find a better way to find out that it is implements
        if (!element.getText().startsWith("implements")) return;

        element.types.forEach((type: TS.ExpressionWithTypeArguments) => {

          const identifier = type.expression as TS.Identifier;
          if (debug) console.log("   implements Interface:", identifier.text)

          let innerDecorator = this.getDecoratorInterface(identifier)
          if (innerDecorator !== undefined) decorator.push(innerDecorator);

        })
      });
    }
    return decorator;
  }

  private nodeIdentifier(propertyAccessExpression: string[]): TS.Identifier | TS.PropertyAccessExpression {
    if (propertyAccessExpression.length === 1) {
      return TS.factory.createIdentifier(propertyAccessExpression[0])
    } else {
      let expression = this.nodeIdentifier(propertyAccessExpression.splice(0, propertyAccessExpression.length - 1));
      let name = this.nodeIdentifier(propertyAccessExpression.splice(0, 1)) as TS.Identifier;
      return TS.factory.createPropertyAccessExpression(expression, name);
    }
  }



  private addImportClassDescriptor() {

    let importNode: TS.ImportDeclaration;

    if (TSAstFactory.isOnceFile(this.context.sourceFile)) {
      const dir = path.dirname(this.context.sourceFile.fileName);
      let onceModulePath = dir.replace(/^(.*\/[oO]nce@[^\/]+\/src\/).*/, '$1')
      let relativePath = path.relative(dir, path.join(onceModulePath, localClassDescriptorPath)) || ".";
      if (!relativePath.startsWith('.')) relativePath = './' + relativePath;

      importNode = TSAstFactory.createDefaultImportNode("ClassDescriptor", relativePath);
    } else {
      // let onceIOR = this.context.program.getCompilerOptions().onceIOR;
      // if (typeof onceIOR != "string") throw new Error("Missing onceIOR in the CompilerOptions")

      importNode = TSAstFactory.createNamedImportNode("ClassDescriptor", onceIOR);
    }

    this.context.fileVisitor.add2Header(`ClassDescriptor`, importNode);
  }
}

class ThinglishFileVisitor {
  constructor(private program: TS.Program, public context: TS.TransformationContext, public sourceFile: TS.SourceFile, public phase: "before" | "after") {

  }

  add2Header(key: string, node: TS.ImportDeclaration): void {
    this.addItionalHeader[key] = node;
  }


  addItionalHeader: Record<string, TS.ImportDeclaration> = {};

  transform() {
    if (debug) console.log("myTransformer " + this.phase, this.sourceFile.fileName)
    if (this.sourceFile.fileName.match('/zod/')) return this.sourceFile;

    this.sourceFile = TS.visitNode(this.sourceFile, this.visitor.bind(this));

    let allImportVariables: string[] = this.getAllImportedVariables();
    if (debug) console.log("existingImports:  " + this.sourceFile.fileName, allImportVariables);

    // let allClasses: string[] = this.getAllClasses();

    let importVariables = Object.keys(this.addItionalHeader).filter(key => !allImportVariables.includes(key))
    let newImports = importVariables.map(key => this.addItionalHeader[key])
    if (debug) console.log("AddImports:  ", importVariables);

    if (newImports.length > 0) {
      this.sourceFile = TS.factory.updateSourceFile(this.sourceFile, [...newImports, ...this.sourceFile.statements]);
    }

    return this.sourceFile;
  }

  // private getAllClasses(): string[] {
  //   let existingClasses = this.sourceFile.statements.filter(x => TS.isImportDeclaration(x)) as TS.ClassDeclaration[];
  //   return existingClasses.map(x => x.name?.escapedText as string).filter(x => !!x)
  // }

  private getAllImportedVariables(): string[] {
    let existingImports = this.sourceFile.statements.filter(x => TS.isImportDeclaration(x)) as TS.ImportDeclaration[];

    let allImportVariables: string[] = [];

    existingImports.forEach(importDeclaration => {
      const elements = (importDeclaration.importClause?.namedBindings as TS.NamedImports)?.elements || [];
      for (const element of elements) {
        allImportVariables.push(element.name.escapedText as string);
      }
      //if (debug) console.log(importDeclaration.importClause?.name);
      const defaultImport = importDeclaration.importClause?.name?.escapedText;
      if (defaultImport !== undefined)
        //@ts-ignore
        allImportVariables.push(defaultImport);
    });
    return allImportVariables;
  }

  visitor(node: TS.Node): TS.VisitResult<TS.Node> {

    let componentDescriptor = ComponentDescriptor.getComponentDescriptor(this.sourceFile);

    let visitorContext: VisitorContext = { transformationContext: this.context, sourceFile: this.sourceFile, program: this.program, fileVisitor: this, componentDescriptor }
    let visitorList = BaseVisitor.implementations.filter(aTSNodeVisitor => aTSNodeVisitor.validTSSyntaxKind === node.kind);
    if (visitorList.length > 1) throw new Error("Can not have more then one visitor");

    let myVisitor = visitorList.map(aTSNodeVisitorType => new aTSNodeVisitorType(visitorContext))

    if (TS.isInterfaceDeclaration(node)) {
      if (debug) console.log("  Node", TS.SyntaxKind[node.kind], this.sourceFile.text.substring(node.pos, node.end).replace('\n', ''))
    }

    if (myVisitor.length > 0) {
      return myVisitor[0].visit(node)
    }

    let result = TS.visitEachChild(node, this.visitor.bind(this), this.context);
    if (visitorContext.fileVisitor.phase === "before") componentDescriptor.writeExports();
    return result;
  }

}

const programTransformer = (program: TS.Program) => {
  activeProgram = program;

  return {

    before(context: TS.TransformationContext) {
      return (sourceFile: TS.SourceFile): TS.SourceFile => {
        if (sourceFile.getFullText().match(/\/\/ *##IGNORE_TRANSFORMER##/)) {
          if (debug) console.log("Ignore file:  " + sourceFile.fileName);
          return sourceFile;
        }

        return new ThinglishFileVisitor(program, context, sourceFile, "before").transform();

      }
    },
    after(context: TS.TransformationContext) {

      return (sourceFile: TS.SourceFile): TS.SourceFile => {
        if (sourceFile.getFullText().match(/\/\/ *##IGNORE_TRANSFORMER##/)) {
          if (debug) console.log("Ignore file: " + sourceFile.fileName);
          return sourceFile;
        }

        return new ThinglishFileVisitor(program, context, sourceFile, "after").transform();

      }
    },
  }
}


/**
 * Anything other than a node transformer will need to specifiy its type as an export
 */
export const type = 'program';

/**
 * The default export should be your transformer
 */
export default programTransformer;
