import * as ts from 'typescript';


/**
 * When using a basic NodeTransformer some helpful context will be provided as the second parameter
 */
type VisitorContext = {
  //  checker: ts.TypeChecker
  transformationContext: ts.TransformationContext
  program: ts.Program
  sourceFile: ts.SourceFile
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
  visit(node: ts.Node): ts.VisitResult<ts.Node>
  test?(node: ts.Node): boolean
  lift?(node: readonly ts.Node[]): ts.Node
}

class TSTransformerFactory {
  static createProgrammTransformer(thisNodeVisitor: TSNodeVisitor) {
    const programTransformer = (program: ts.Program) => {
      thisNodeVisitor.context.program = program;
      return TSTransformerFactory.createTransformerContext(thisNodeVisitor)

    }
    return programTransformer;
  }


  static createTransformerContext(thisNodeVisitor: TSNodeVisitor) {
    const transformerContext = (context: ts.TransformationContext) => {
      thisNodeVisitor.context.transformationContext = context;
      return TSTransformerFactory.createSourceFileTransformer(thisNodeVisitor)

    }
    return programTransformer;
  }



  static createSourceFileTransformer(thisNodeVisitor: TSNodeVisitor) {
    const sourceFileTransformer = (sourceFile: ts.SourceFile) => {
      thisNodeVisitor.context.sourceFile = sourceFile;

      let nodeVisitor = TSTransformerFactory.createNodeTransformer(thisNodeVisitor)
      
      return ts.visitNode(sourceFile, thisNodeVisitor.visit,thisNodeVisitor.test, thisNodeVisitor.lift);
    }
    return sourceFileTransformer;
  }

  static createNodeTransformer(thisNodeVisitor: TSNodeVisitor) {
    const visitor = (node: ts.Node, { transformationContext: context }: VisitorContext): ts.Node => {
      //checker.typeToString(someTSType,node)
      return ts.visitEachChild(node, thisNodeVisitor.visit, context);
    }
    return visitor;
  }

}






abstract class BaseVisitor implements TSNodeVisitor {
  static implementations = new Array();

  public context: VisitorContext
  constructor(aContext: VisitorContext) {
    this.context = aContext;
  }

  visit(node: ts.Node): ts.VisitResult<ts.Node> {
    return [node, node];
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


class ThinglishInterfaceVisitor extends BaseVisitor implements TSNodeVisitor {

  static get validTSSyntaxKind() {
    return ts.SyntaxKind.InterfaceDeclaration
  }

  static {
    BaseVisitor.implementations.push(this);

  }



  visit(node: ts.Node): ts.VisitResult<ts.Node> {

    let interfaceName = (node as ts.InterfaceDeclaration).name.text + "InterfaceDescriptor";
    //let newNode = ts.createSourceFile(interfaceName+"interface.ts","empty file", ts.ScriptTarget.ES5, true ,ts.ScriptKind.TS);
    const cd = ts.factory.createIdentifier('InterfaceDescriptor');

    const call = ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(
        cd, "register"),
      undefined,
      [
        ts.factory.createStringLiteral("com.some.package"),
        ts.factory.createStringLiteral("SomeComponentName"),
        ts.factory.createStringLiteral("1.0.0"),
        ts.factory.createStringLiteral(interfaceName)
      ]
    )
    //const dec = ts.factory.createDecorator(call)
    //const classDec = ts.factory.createClassDeclaration([dec], undefined, interfaceName , undefined, undefined, []);


    // ts.factory.createClassDeclaration()
    //     ts.factory.createDecorator()
    // )

    return call
  }

}




const programTransformer = (program: ts.Program) => {


  return (context: ts.TransformationContext) => {

      return (sourceFile: ts.SourceFile) => {
        console.log("myTransformer", sourceFile.fileName)

        const visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
          let visitorContext: VisitorContext = { transformationContext: context, sourceFile, program }
          let visitors = BaseVisitor.implementations.map(aTSNodeVisitorType => new aTSNodeVisitorType(visitorContext))

          let myVisitor = visitors.filter(aTSNodeVisitor => {
            return aTSNodeVisitor.constructor.validTSSyntaxKind == node.kind
          })[0]

          if (ts.isInterfaceDeclaration(node)) {
            console.log("  Node", ts.SyntaxKind[node.kind], sourceFile.text.substring(node.pos, node.end).replace('\n', ''))
          }

          if (!myVisitor) {
            myVisitor = visitor;
          }
          else {
            node = myVisitor.visit(node)
            //console.log("Interface declared")
          }

          // If it is a expression statement,


          return ts.visitEachChild(node, visitor, context);
        };
        return ts.visitNode(sourceFile, visitor);
      }
    }
  
}




//const myProgramTransformer = TSTransformerFactory.createProgrammTransformer(new ThinglishInterfaceVisitor());

/**
 * Anything other than a node transformer will need to specifiy its type as an export
 */
export const type = 'program';

/**
 * The default export should be your transformer
 */
export default programTransformer;
