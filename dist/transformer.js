"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.type = void 0;
const ts = require("typescript");
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
class BaseVisitor {
    constructor(aContext) {
        this.context = aContext;
    }
    visit(node) {
        return [node, node];
    }
}
BaseVisitor.implementations = new Array();
// class MyCustomTransformer implements ts.CustomTransformer {
//   transformSourceFile(node: ts.SourceFile): ts.SourceFile {
//     return TSTransformerFactory.createSourceFileTransformer(new NodeDuplicationVisitor())
//   }
//   transformBundle(node: ts.Bundle): ts.Bundle {
//     throw new Error('Method not implemented.');
//   }
// }
class ThinglishInterfaceVisitor extends BaseVisitor {
    static get validTSSyntaxKind() {
        return ts.SyntaxKind.InterfaceDeclaration;
    }
    visit(node) {
        let interfaceName = node.name.text + "InterfaceDescriptor";
        //let newNode = ts.createSourceFile(interfaceName+"interface.ts","empty file", ts.ScriptTarget.ES5, true ,ts.ScriptKind.TS);
        const cd = ts.factory.createIdentifier('InterfaceDescriptor');
        const call = ts.factory.createCallExpression(ts.factory.createPropertyAccessExpression(cd, "register"), undefined, [
            ts.factory.createStringLiteral("com.some.package"),
            ts.factory.createStringLiteral("SomeComponentName"),
            ts.factory.createStringLiteral("1.0.0"),
            ts.factory.createStringLiteral(interfaceName)
        ]);
        //const dec = ts.factory.createDecorator(call)
        //const classDec = ts.factory.createClassDeclaration([dec], undefined, interfaceName , undefined, undefined, []);
        // ts.factory.createClassDeclaration()
        //     ts.factory.createDecorator()
        // )
        return call;
    }
}
_a = ThinglishInterfaceVisitor;
(() => {
    BaseVisitor.implementations.push(_a);
})();
const programTransformer = (program) => {
    return (context) => {
        return (sourceFile) => {
            console.log("myTransformer", sourceFile.fileName);
            const visitor = (node) => {
                let visitorContext = { transformationContext: context, sourceFile, program };
                let visitors = BaseVisitor.implementations.map(aTSNodeVisitorType => new aTSNodeVisitorType(visitorContext));
                let myVisitor = visitors.filter(aTSNodeVisitor => {
                    return aTSNodeVisitor.constructor.validTSSyntaxKind == node.kind;
                })[0];
                console.log("  Node", ts.SyntaxKind[node.kind], sourceFile.text.substring(node.pos, node.end).replace('\n', ''));
                if (!myVisitor) {
                    myVisitor = visitor;
                }
                else {
                    node = myVisitor.visit(node);
                }
                // If it is a expression statement,
                // if (ts.isInterfaceDeclaration(node)) {
                //   // Return it twice.
                //   // Effectively duplicating the statement
                //   return [node, node];
                // }
                return ts.visitEachChild(node, visitor, context);
            };
            return ts.visitNode(sourceFile, visitor);
        };
    };
};
//const myProgramTransformer = TSTransformerFactory.createProgrammTransformer(new NodeDuplicationVisitor());
/**
 * Anything other than a node transformer will need to specifiy its type as an export
 */
exports.type = 'program';
/**
 * The default export should be your transformer
 */
exports.default = programTransformer;
