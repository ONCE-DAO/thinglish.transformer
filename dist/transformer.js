"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.type = void 0;
const TS = require("typescript");
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
        return TS.SyntaxKind.InterfaceDeclaration;
    }
    visit(node) {
        let interfaceName = node.name.text + "InterfaceDescriptor";
        //let newNode = ts.createSourceFile(interfaceName+"interface.ts","empty file", ts.ScriptTarget.ES5, true ,ts.ScriptKind.TS);
        const cd = TS.factory.createIdentifier('InterfaceDescriptor');
        const call = TS.factory.createCallExpression(TS.factory.createPropertyAccessExpression(cd, "register"), undefined, [
            TS.factory.createStringLiteral("com.some.package"),
            TS.factory.createStringLiteral("SomeComponentName"),
            TS.factory.createStringLiteral("1.0.0"),
            TS.factory.createStringLiteral(interfaceName)
        ]);
        const variableDeclaration = TS.factory.createVariableDeclaration(interfaceName, 
        /* exclamationToken optional */ undefined, 
        /* type */ undefined, 
        /* initializer */ call);
        const variableDeclarationList = TS.factory.createVariableDeclarationList([variableDeclaration], TS.NodeFlags.Const);
        const exportVariableStatement = TS.factory.createVariableStatement([TS.factory.createModifier(TS.SyntaxKind.ExportKeyword)], variableDeclarationList);
        //const dec = ts.factory.createDecorator(call)
        //const classDec = ts.factory.createClassDeclaration([dec], undefined, interfaceName , undefined, undefined, []);
        // ts.factory.createClassDeclaration()
        //     ts.factory.createDecorator()
        // )
        return exportVariableStatement;
    }
}
_a = ThinglishInterfaceVisitor;
(() => {
    BaseVisitor.implementations.push(_a);
})();
const programTransformer = (program) => {
    return {
        before(context) {
            return (sourceFile) => {
                console.log("myTransformer", sourceFile.fileName);
                const visitor = (node) => {
                    let visitorContext = { transformationContext: context, sourceFile, program };
                    let visitors = BaseVisitor.implementations.map(aTSNodeVisitorType => new aTSNodeVisitorType(visitorContext));
                    let myVisitor = visitors.filter(aTSNodeVisitor => {
                        return aTSNodeVisitor.constructor.validTSSyntaxKind == node.kind;
                    })[0];
                    if (TS.isInterfaceDeclaration(node)) {
                        console.log("  Node", TS.SyntaxKind[node.kind], sourceFile.text.substring(node.pos, node.end).replace('\n', ''));
                    }
                    if (!myVisitor) {
                        myVisitor = visitor;
                    }
                    else {
                        node = myVisitor.visit(node);
                        //console.log("Interface declared")
                    }
                    // If it is a expression statement,
                    return TS.visitEachChild(node, visitor, context);
                };
                return TS.visitNode(sourceFile, visitor);
            };
        }
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
