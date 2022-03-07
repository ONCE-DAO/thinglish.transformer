import * as TS from 'typescript';
import { existsSync, readFileSync, writeFileSync } from "fs";


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

  visit(node: TS.Node): TS.VisitResult<TS.Node> {
    return [node, node];
  }

  get componentDescriptor(): ComponentDescriptor {
    return ComponentDescriptor.getComponentDescriptor4File(this.context.sourceFile)
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

  static getComponentDescriptor4File(sourceFile: TS.SourceFile): ComponentDescriptor {
    let filename = sourceFile.fileName;

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

  static get validTSSyntaxKind() {
    return TS.SyntaxKind.InterfaceDeclaration
  }

  static {
    BaseVisitor.implementations.push(this);

  }



  visit(node: TS.Node): TS.VisitResult<TS.Node> {


    this.addImportInterfaceDescriptor();

    const exportVariableStatement = this.getInterfaceDescriptorRegister(node);




    //const dec = ts.factory.createDecorator(call)
    //const classDec = ts.factory.createClassDeclaration([dec], undefined, interfaceName , undefined, undefined, []);


    // ts.factory.createClassDeclaration()
    //     ts.factory.createDecorator()
    // )

    return exportVariableStatement;
  }





  private getInterfaceDescriptorRegister(node: TS.Node) {
    let interfaceName = (node as TS.InterfaceDeclaration).name.text + "InterfaceDescriptor";
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
      TS.factory.createParenthesizedExpression(TS.factory.createStringLiteral(onceIORModule)),
      undefined
    );
    console.log(importNode);

    this.context.fileVisitor.add2Header(`import InterfaceDescriptor ${onceIORModule}`, importNode);
  }
}


class ThinglishFileVisitor {
  constructor(private program: TS.Program, private context: TS.TransformationContext, public sourceFile: TS.SourceFile) {

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




//const myProgramTransformer = TSTransformerFactory.createProgrammTransformer(new NodeDuplicationVisitor());

/**
 * Anything other than a node transformer will need to specifiy its type as an export
 */
export const type = 'program';

/**
 * The default export should be your transformer
 */
export default programTransformer;
