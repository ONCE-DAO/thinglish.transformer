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

// class ThinglishTransformerFactory implements ts.CustomTransformers {
//     //getTransformer(context: ts.TransformationContext): ts.CustomTransformer { return new ThinglishInterfaceTransformer() }
//         /** Custom transformers to evaluate before built-in .js transformations. */

//         before(ctx: ts.TransformationContext) {
//             return TSTransformerFactory.createNodeTransformer(new NodeDuplicationVisitor())
//         }
//         /** Custom transformers to evaluate after built-in .js transformations. */
//         after(): (TransformerFactory<SourceFile> | CustomTransformerFactory)[];
//         /** Custom transformers to evaluate after built-in .d.ts transformations. */
//         afterDeclarations(): (TransformerFactory<Bundle | SourceFile> | CustomTransformerFactory)[];
// }

interface TSNodeVisitor {
  context: VisitorContext
  visit(node: TS.Node): TS.VisitResult<TS.Node>
  test?(node: TS.Node): boolean
  lift?(node: readonly TS.Node[]): TS.Node
}

// class TSTransformerFactory {
//   static createProgrammTransformer(thisNodeVisitor: TSNodeVisitor) {
//     const programTransformer = (program: ts.Program) => {
//       thisNodeVisitor.context.program = program;
//       return TSTransformerFactory.createTransformerContext(thisNodeVisitor)

//     }
//     return programTransformer;
//   }


//   static createTransformerContext(thisNodeVisitor: TSNodeVisitor) {
//     const transformerContext = (context: ts.TransformationContext) => {
//       thisNodeVisitor.context.transformationContext = context;
//       return TSTransformerFactory.createSourceFileTransformer(thisNodeVisitor)

//     }
//     return programTransformer;
//   }



//   static createSourceFileTransformer(thisNodeVisitor: TSNodeVisitor) {
//     const sourceFileTransformer = (sourceFile: ts.SourceFile) => {
//       thisNodeVisitor.context.sourceFile = sourceFile;

//       let nodeVisitor = TSTransformerFactory.createNodeTransformer(thisNodeVisitor)

//       return ts.visitNode(sourceFile, thisNodeVisitor.visit,thisNodeVisitor.test, thisNodeVisitor.lift);
//     }
//     return sourceFileTransformer;
//   }

//   static createNodeTransformer(thisNodeVisitor: TSNodeVisitor) {
//     const visitor = (node: ts.Node, { checker, transformationContext: context }: VisitorContext): ts.Node => {
//       //checker.typeToString(someTSType,node)
//       return ts.visitEachChild(node, thisNodeVisitor.visit, context);
//     }
//     return visitor;
//   }

// }

// class ThinglishTransformerFactory implements ts.CustomTransformers {
//     //getTransformer(context: ts.TransformationContext): ts.CustomTransformer { return new ThinglishInterfaceTransformer() }
//         /** Custom transformers to evaluate before built-in .js transformations. */

//         before(ctx: ts.TransformationContext) {
//             let transformer: ts.CustomTransformer = new ThinglishInterfaceTransformer(ctx: ts.TransformationContext);
//             console.log("bar")
//             //throw "foo"
//             this.transformer.transformSourceFile(node: ts.SourceFile)
//             }
//         }
//         /** Custom transformers to evaluate after built-in .js transformations. */
//         after(): (TransformerFactory<SourceFile> | CustomTransformerFactory)[];
//         /** Custom transformers to evaluate after built-in .d.ts transformations. */
//         afterDeclarations(): (TransformerFactory<Bundle | SourceFile> | CustomTransformerFactory)[];
// }





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
  // test(node: ts.Node): boolean {
  //   return true;
  // }
  // lift(nodes: readonly ts.Node[]): ts.Node  {
  //   return nodes.reduce((previousValue, currentValue, currentIndex, nodes) => { 
  //     let node:ts.Node = currentValue
  //     return node
  //   });
  // }

}


// class MyCustomTransformer implements ts.CustomTransformer {
//   transformSourceFile(node: ts.SourceFile): ts.SourceFile {
//     return TSTransformerFactory.createSourceFileTransformer(new NodeDuplicationVisitor())
//   }
//   transformBundle(node: ts.Bundle): ts.Bundle {
//     throw new Error('Method not implemented.');
//   }

// }



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

    return exportVariableStatement;
  }

  private getInterfaceDescriptorRegister(node: TS.InterfaceDeclaration) {
    let interfaceName = node.name.text + "InterfaceDescriptor";
    //let newNode = ts.createSourceFile(interfaceName+"interface.ts","empty file", ts.ScriptTarget.ES5, true ,ts.ScriptKind.TS);
    const cd = TS.factory.createIdentifier('InterfaceDescriptor');

    let componentDescriptor = this.componentDescriptor;

    const call = TS.factory.createCallExpression(
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
    console.log(importNode);

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

    let fileVisitor = this.context.fileVisitor;

    let descriptor = this.checkHeritageClause(node);

    descriptor.push(this.getDecoratorFilename());
    descriptor.push(this.getDecoratorRegister());

    if (node.heritageClauses) {

      node = TS.factory.updateClassDeclaration(
        node,
        descriptor,
        node.modifiers,
        node.name,
        node.typeParameters,
        node.heritageClauses,
        node.members
      );
    }

    const childResult = TS.visitEachChild(node, fileVisitor.visitor.bind(fileVisitor), fileVisitor.context);

    return [childResult];

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


    } else if (decorator && TS.isClassDeclaration(decorator)) {
      //Class Declaration
      return;
    } else {
      console.log("Error Symbol " + interfaceName)
      console.log(symbol);
      throw new Error("Not implemented yet 2");

    }

    if (importPath.startsWith("ior:")) {
      let matchResult = importPath.match(/^ior:esm[^\/]+([^\[]+)\.([^.]+)(\[.+\])?/)
      if (matchResult) {
        matchResult[1], matchResult[2], matchResult[3]
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

    if (tsClass.heritageClauses) {
      let decorator: TS.Decorator[] = tsClass.decorators?.concat([]) || []

      tsClass.heritageClauses.forEach(element => {
        console.log("element:");

        console.log(element)
        console.log(element.getText())
        //TODO Find a better way to find out that it is implements
        if (!element.getText().startsWith("implements")) return;

        element.types.forEach((type: TS.ExpressionWithTypeArguments) => {


          const identifier = type.expression as TS.Identifier;
          let interfaceName = identifier.text
          console.log("    Interface:", interfaceName)

          //const typeChecker = this.context.program.getTypeChecker();
          // let symbol = typeChecker.getSymbolAtLocation(type.expression);

          // if (symbol?.declarations?.[0].kind === TS.SyntaxKind.ImportSpecifier) {
          //   let myImport = symbol?.declarations?.[0]?.parent?.parent?.parent;
          //   console.log("is Import !!!!!!");
          //   console.log("symbol:");

          //   if (TS.isImportDeclaration(myImport)) {
          //     console.log("isImportDeclaration !!!!!!");

          //     console.log(myImport.moduleSpecifier.getText())
          //   }


          // }
          //console.log(type.expression);
          let innerDecorator = this.getDecoratorInterface(identifier)
          if (innerDecorator) decorator.push(innerDecorator);

        })
      });
      return decorator;
    } else {
      if (tsClass.decorators) {
        return Array.from(tsClass.decorators);
      }
      return [];

    }
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


    // if (TS.isImportDeclaration(node) && TS.isStringLiteral(node.moduleSpecifier)) {
    //   const typeChecker = this.program.getTypeChecker();
    //   const importSymbol = typeChecker.getSymbolAtLocation(node.moduleSpecifier);
    //   if (importSymbol) {
    //     const exportSymbols = typeChecker.getExportsOfModule(importSymbol);

    //     exportSymbols.forEach(symbol =>
    //       console.log(
    //         `found "${symbol.escapedName
    //         }" export with value "${symbol.valueDeclaration?.getText()}"`
    //       )

    //     );
    //   }

    //   return node;
    // }


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




//const myProgramTransformer = TSTransformerFactory.createProgrammTransformer(new NodeDuplicationVisitor());

/**
 * Anything other than a node transformer will need to specifiy its type as an export
 */
export const type = 'program';

/**
 * The default export should be your transformer
 */
export default programTransformer;
