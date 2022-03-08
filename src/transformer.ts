import * as TS from 'typescript';
import { existsSync, readFileSync, writeFileSync } from "fs";
import path = require('path');



/**
 * When using a basic NodeTransformer some helpful context will be provided as the second parameter
 */
type VisitorContext = {
  //  checker: ts.TypeChecker
  transformationContext: TS.TransformationContext
  program: TS.Program
  sourceFile: TS.SourceFile,
  fileVisitor: ThinglishFileVisitor
};

interface TSNodeVisitor {
  context: VisitorContext
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
    return ComponentDescriptor.getComponentDescriptor4File(this.context.sourceFile)
  }


  static get validTSSyntaxKind(): TS.SyntaxKind {
    throw new Error("Not implemented yet");
  }

}

class ComponentDescriptor {

  private static _store: Record<string, ComponentDescriptor> = {};

  package: string;
  name: string;
  version: string;
  packagePath: any;

  static getComponentDescriptor4File(sourceFile: TS.SourceFile | string): ComponentDescriptor {
    let filename: string;
    if (typeof sourceFile === 'string') {
      filename = sourceFile;
    } else {
      filename = sourceFile.fileName;
    }

    let packageFile = this.getPackage4File(filename.split('/'), filename);

    if (this._store[packageFile]) {
      return this._store[packageFile];
    } else {
      const componentDescriptor = new ComponentDescriptor(packageFile);
      this._store[packageFile] = componentDescriptor;
      return componentDescriptor;
    }

  }

  constructor(packageJson: string) {
    const packageJsonData = JSON.parse(readFileSync(packageJson).toString());

    let path = packageJson.split('/');
    path.pop();
    this.packagePath = path.join('/');

    for (const key of ["package", "name", "version"]) {
      if (packageJsonData[key] === undefined) throw new Error(`Missing ${key} in the Package Json file => ${packageJson}`);
    }
    this.package = packageJsonData.package
    this.name = packageJsonData.name;
    this.version = packageJsonData.version;

  }


  static getPackage4File(path: string[], originalFilename: string): string {
    //console.log("Get package 4 Path " + path);
    if (path.length === 1) throw new Error("Could not find a package.json File! " + originalFilename)
    const packageFile = path.join('/') + '/package.json';
    //console.log("Check: " + packageFile);
    if (existsSync(packageFile)) {
      return packageFile;
    } else {
      path.pop()
      return this.getPackage4File(path, originalFilename);
    }
  }

}

const onceIORModule = "ior:esm:git:tla.EAM.Once";



class ThinglishInterfaceVisitor extends BaseVisitor implements TSNodeVisitor {

  static get validTSSyntaxKind(): TS.SyntaxKind {
    return TS.SyntaxKind.InterfaceDeclaration
  }

  static {
    BaseVisitor.implementations.push(this);

  }

  visit(node: TS.InterfaceDeclaration): TS.VisitResult<TS.Node> {
    this.addImportInterfaceDescriptor();
    const exportVariableStatement = this.getInterfaceDescriptorRegister(node);

    //console.log(node);

    return exportVariableStatement;
  }


  private checkHeritageClause(tsClass: TS.InterfaceDeclaration, innerCallExpression: TS.CallExpression): TS.CallExpression {
    let returnCallExpression: TS.CallExpression = innerCallExpression;

    console.log("interface: checkHeritageClause");
    if (tsClass.heritageClauses) {
      console.log("interface: has heritageClauses");

      tsClass.heritageClauses.forEach(element => {
        console.log("element:", element)

        element.types.forEach((type: TS.ExpressionWithTypeArguments) => {

          const identifier = type.expression as TS.Identifier;
          console.log("  Extends  Interface:", identifier.text)

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

    const typeChecker = this.context.program.getTypeChecker();
    let interfaceName = identifier.escapedText as string;

    let symbol = typeChecker.getSymbolAtLocation(identifier);
    let importPath = "";


    let decorator = symbol?.declarations?.[0];
    if (!decorator) {
      return innerCallExpression;
    } else if (TS.isImportSpecifier(decorator)) {
      let myImport = this._getUpperImportDeclaration(decorator);

      if (myImport && TS.isImportDeclaration(myImport)) {
        importPath = myImport.moduleSpecifier.getText();
      } else {
        throw new Error("Not implemented yet 1");
      }

    } else if (TS.isClassDeclaration(decorator)) {
      importPath = ".";
    } else if (TS.isInterfaceDeclaration(decorator)) {
      importPath = ".";

    } else {
      console.log("Error Symbol " + interfaceName)
      console.log(symbol);
      throw new Error("Not implemented yet 10");

    }

    if (importPath.startsWith("ior:")) {
      const matchResult = importPath.match(/^ior:esm[^\/]+([^\[]+)\.([^.]+)(\[.+\])?/)
      if (matchResult) {
        return TS.factory.createCallExpression(
          TS.factory.createPropertyAccessExpression(
            innerCallExpression,
            TS.factory.createIdentifier("addExtension")
          ),
          undefined,
          [
            TS.factory.createStringLiteral(matchResult[1]),
            TS.factory.createStringLiteral(matchResult[2]),
            TS.factory.createStringLiteral(matchResult[3]),
            TS.factory.createStringLiteral(interfaceName)

          ]
        )

      }
      throw new Error("Could not match import String: " + importPath);

    }
    const sourcePath = path.dirname(this.context.sourceFile.fileName) + '/' + path.dirname(importPath);
    const componentDescriptor = ComponentDescriptor.getComponentDescriptor4File(sourcePath);

    return TS.factory.createCallExpression(
      TS.factory.createPropertyAccessExpression(
        innerCallExpression,
        TS.factory.createIdentifier("addExtension")
      ),
      undefined,
      [
        TS.factory.createStringLiteral(componentDescriptor.package),
        TS.factory.createStringLiteral(componentDescriptor.name),
        TS.factory.createStringLiteral(componentDescriptor.version),
        TS.factory.createStringLiteral(interfaceName)

      ]
    )
  }

  private getInterfaceDescriptorRegister(node: TS.InterfaceDeclaration) {
    let interfaceName = node.name.text + "InterfaceDescriptor";
    //let newNode = ts.createSourceFile(interfaceName+"interface.ts","empty file", ts.ScriptTarget.ES5, true ,ts.ScriptKind.TS);
    const cd = TS.factory.createIdentifier('InterfaceDescriptor');

    let componentDescriptor = this.componentDescriptor;

    let call = TS.factory.createCallExpression(
      TS.factory.createPropertyAccessExpression(
        cd, "register"),
      undefined,
      [
        TS.factory.createStringLiteral(componentDescriptor.package),
        TS.factory.createStringLiteral(componentDescriptor.name),
        TS.factory.createStringLiteral(componentDescriptor.version),
        TS.factory.createStringLiteral(interfaceName)
      ]
    );

    // Check for extends
    call = this.checkHeritageClause(node, call);

    const variableDeclaration = TS.factory.createVariableDeclaration(
      interfaceName,
        /* exclamationToken optional */ undefined,
        /* type */ undefined,
        /* initializer */ call
    );
    const variableDeclarationList = TS.factory.createVariableDeclarationList(
      [variableDeclaration], TS.NodeFlags.Const
    );
    const exportVariableStatement = TS.factory.createVariableStatement([TS.factory.createModifier(TS.SyntaxKind.ExportKeyword)], variableDeclarationList);
    return exportVariableStatement;
  }

  private addImportInterfaceDescriptor() {
    let relativePath = path.relative(path.dirname(this.context.sourceFile.fileName), this.componentDescriptor.packagePath + '/src') || ".";

    const onceIORModule = relativePath;
    const importNode: TS.ImportDeclaration = TS.factory.createImportDeclaration(
      undefined,
      undefined,
      TS.factory.createImportClause(
        false,
        undefined,
        TS.factory.createNamedImports([TS.factory.createImportSpecifier(
          false,
          undefined,
          TS.factory.createIdentifier("InterfaceDescriptor")
        )])
      ),
      TS.factory.createStringLiteral(onceIORModule),
      undefined
    );
    //console.log(importNode);

    this.context.fileVisitor.add2Header(`import InterfaceDescriptor ${onceIORModule}`, importNode);
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
    this.addImportClassDescriptor();

    let descriptor = this.checkHeritageClause(node);

    descriptor.push(this.getDecoratorFilename());
    descriptor.push(this.getDecoratorRegister());

    node = TS.factory.updateClassDeclaration(
      node,
      descriptor,
      node.modifiers,
      node.name,
      node.typeParameters,
      node.heritageClauses,
      node.members
    );

    const fileVisitor = this.context.fileVisitor;
    return TS.visitEachChild(node, fileVisitor.visitor.bind(fileVisitor), fileVisitor.context);

  }

  getDecoratorRegister(): TS.Decorator {
    const componentDescriptor = this.componentDescriptor;
    return this.descriptorCreator(["ClassDescriptor", "register"], [componentDescriptor.package, componentDescriptor.name, componentDescriptor.version])
  }


  getDecoratorFilename(): TS.Decorator {
    return this.descriptorCreator(["ClassDescriptor", "setFilePath"], [TS.factory.createIdentifier("__filename")])
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

    const typeChecker = this.context.program.getTypeChecker();
    let interfaceName = identifier.escapedText as string;

    let symbol = typeChecker.getSymbolAtLocation(identifier);
    let importPath = "";


    let decorator = symbol?.declarations?.[0];
    if (decorator && TS.isImportSpecifier(decorator)) {
      let myImport = this._getUpperImportDeclaration(decorator);

      if (myImport && TS.isImportDeclaration(myImport)) {
        importPath = myImport.moduleSpecifier.getText();
      } else {
        throw new Error("Not implemented yet 1");

      }

    } else if (decorator && TS.isInterfaceDeclaration(decorator)) {
      importPath = ".";
    } else if (decorator && TS.isClassDeclaration(decorator)) {
      //Class Declaration
      return;
    } else {
      console.log("Error Symbol " + interfaceName)
      console.log(symbol);
      throw new Error("Not implemented yet 2");

    }

    if (importPath.startsWith("ior:")) {
      const matchResult = importPath.match(/^ior:esm[^\/]+([^\[]+)\.([^.]+)(\[.+\])?/)
      if (matchResult) {
        return this.descriptorCreator(["ClassDescriptor", "addInterfaces"], [matchResult[1], matchResult[2], matchResult[3], interfaceName])

      }
      throw new Error("Could not match import String: " + importPath);

    }

    const sourcePath = path.dirname(this.context.sourceFile.fileName) + '/' + path.dirname(importPath);
    const componentDescriptor = ComponentDescriptor.getComponentDescriptor4File(sourcePath);

    return this.descriptorCreator(["ClassDescriptor", "addInterfaces"], [componentDescriptor.package, componentDescriptor.name, componentDescriptor.version, interfaceName])
  }

  private descriptorCreator(propertyAccessExpression: string[], stringLiteral: (string | TS.Identifier)[]) {

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
        //console.log("element:", element)

        //TODO Find a better way to find out that it is implements
        if (!element.getText().startsWith("implements")) return;

        element.types.forEach((type: TS.ExpressionWithTypeArguments) => {

          const identifier = type.expression as TS.Identifier;
          console.log("    Interface:", identifier.text)

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
    path.dirname(this.context.sourceFile.fileName)
    let relativePath = path.relative(path.dirname(this.context.sourceFile.fileName), this.componentDescriptor.packagePath + '/src') || ".";

    //console.log("FILE: " + this.context.sourceFile.fileName);
    //console.log(path.dirname(this.context.sourceFile.fileName), this.componentDescriptor.packagePath + '/src', relativePath);
    const onceIORModule = relativePath

    const importNode: TS.ImportDeclaration = TS.factory.createImportDeclaration(
      undefined,
      undefined,
      TS.factory.createImportClause(
        false,
        undefined,
        TS.factory.createNamedImports([TS.factory.createImportSpecifier(
          false,
          undefined,
          TS.factory.createIdentifier("ClassDescriptor")
        )])
      ),
      TS.factory.createStringLiteral(onceIORModule),
      undefined
    );

    this.context.fileVisitor.add2Header(`import ClassDescriptor ${onceIORModule}`, importNode);
  }
}


class ThinglishFileVisitor {
  constructor(private program: TS.Program, public context: TS.TransformationContext, public sourceFile: TS.SourceFile) {

  }

  add2Header(key: string, node: TS.ImportDeclaration | TS.ExportDeclaration): void {
    this.addItionalHeader[key] = node;
  }


  addItionalHeader: Record<string, TS.ImportDeclaration | TS.ExportDeclaration> = {};

  transform() {
    console.log("myTransformer", this.sourceFile.fileName)

    this.sourceFile = TS.visitNode(this.sourceFile, this.visitor.bind(this));
    const header = Object.values(this.addItionalHeader);

    this.sourceFile = TS.factory.updateSourceFile(this.sourceFile, [...header, ...this.sourceFile.statements]);
    return this.sourceFile;
  }

  visitor(node: TS.Node): TS.VisitResult<TS.Node> {

    let visitorContext: VisitorContext = { transformationContext: this.context, sourceFile: this.sourceFile, program: this.program, fileVisitor: this }
    let visitorList = BaseVisitor.implementations.filter(aTSNodeVisitor => aTSNodeVisitor.validTSSyntaxKind === node.kind);
    if (visitorList.length > 1) throw new Error("Can not have more then one visitor");

    let myVisitor = visitorList.map(aTSNodeVisitorType => new aTSNodeVisitorType(visitorContext))

    if (TS.isInterfaceDeclaration(node)) {
      console.log("  Node", TS.SyntaxKind[node.kind], this.sourceFile.text.substring(node.pos, node.end).replace('\n', ''))
    }

    if (myVisitor.length > 0) {
      return myVisitor[0].visit(node)
    }

    return TS.visitEachChild(node, this.visitor.bind(this), this.context);
  }

}

const programTransformer = (program: TS.Program) => {

  return {

    before(context: TS.TransformationContext) {

      return (sourceFile: TS.SourceFile): TS.SourceFile => {

        return new ThinglishFileVisitor(program, context, sourceFile).transform();

      }
    }
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
