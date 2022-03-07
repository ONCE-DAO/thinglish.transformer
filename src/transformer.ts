import * as TS from 'typescript';


/**
 * When using a basic NodeTransformer some helpful context will be provided as the second parameter
 */
type VisitorContext = {
  //  checker: ts.TypeChecker
  transformationContext: TS.TransformationContext
  program: TS.Program
  sourceFile: TS.SourceFile
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
    return TS.SyntaxKind.InterfaceDeclaration
  }

  static {
    BaseVisitor.implementations.push(this);

  }



  visit(node: TS.Node): TS.VisitResult<TS.Node> {

    let interfaceName = (node as TS.InterfaceDeclaration).name.text + "InterfaceDescriptor";
    //let newNode = ts.createSourceFile(interfaceName+"interface.ts","empty file", ts.ScriptTarget.ES5, true ,ts.ScriptKind.TS);
    const cd = TS.factory.createIdentifier('InterfaceDescriptor');

    const call = TS.factory.createCallExpression(
      TS.factory.createPropertyAccessExpression(
        cd, "register"),
      undefined,
      [
        TS.factory.createStringLiteral("com.some.package"),
        TS.factory.createStringLiteral("SomeComponentName"),
        TS.factory.createStringLiteral("1.0.0"),
        TS.factory.createStringLiteral(interfaceName)
      
        
      ]
    )
    const variableDeclaration = TS.factory.createVariableDeclaration(
      interfaceName,
      /* exclamationToken optional */ undefined,
      /* type */ undefined,
      /* initializer */call
    )
    const variableDeclarationList = TS.factory.createVariableDeclarationList(
      [variableDeclaration], TS.NodeFlags.Const 
    )
    const exportVariableStatement = TS.factory.createVariableStatement([TS.factory.createModifier(TS.SyntaxKind.ExportKeyword)],variableDeclarationList)




    //const dec = ts.factory.createDecorator(call)
    //const classDec = ts.factory.createClassDeclaration([dec], undefined, interfaceName , undefined, undefined, []);


    // ts.factory.createClassDeclaration()
    //     ts.factory.createDecorator()
    // )

    return exportVariableStatement
  }



  
}




const programTransformer = (program: TS.Program) => {


  return {

    before(context: TS.TransformationContext) {

      return (sourceFile: TS.SourceFile) => {
        console.log("myTransformer", sourceFile.fileName)

        const visitor = (node: TS.Node): TS.VisitResult<TS.Node> => {
          let visitorContext: VisitorContext = { transformationContext: context, sourceFile, program }
          let visitors = BaseVisitor.implementations.map(aTSNodeVisitorType => new aTSNodeVisitorType(visitorContext))

          let myVisitor = visitors.filter(aTSNodeVisitor => {
            return aTSNodeVisitor.constructor.validTSSyntaxKind == node.kind
          })[0]

          if (TS.isInterfaceDeclaration(node)) {
            console.log("  Node", TS.SyntaxKind[node.kind], sourceFile.text.substring(node.pos, node.end).replace('\n', ''))
          }

          if (!myVisitor) {
            myVisitor = visitor;
          }
          else {
            node = myVisitor.visit(node)
            //console.log("Interface declared")
          }

          // If it is a expression statement,



          return TS.visitEachChild(node, visitor, context);
        };
        return TS.visitNode(sourceFile, visitor);
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
