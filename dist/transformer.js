"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.type = void 0;
const TS = require("typescript");
const fs_1 = require("fs");
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
    get componentDescriptor() {
        return ComponentDescriptor.getComponentDescriptor4File(this.context.sourceFile);
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
class ComponentDescriptor {
    constructor(packageJson) {
        const packageJsonData = JSON.parse((0, fs_1.readFileSync)(packageJson).toString());
        for (const key of ["package", "name", "version"]) {
            if (packageJsonData[key] === undefined)
                throw new Error("Missing package in the Package Json file");
        }
        this.package = packageJsonData.package;
        this.name = packageJsonData.name;
        this.version = packageJsonData.version;
    }
    static getComponentDescriptor4File(sourceFile) {
        let filename = sourceFile.fileName;
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
        //console.log("Get package 4 Path " + path);
        if (path.length === 1)
            throw new Error("Could not find a package.json File! " + originalFilename);
        const packageFile = path.join('/') + '/package.json';
        //console.log("Check: " + packageFile);
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
class ThinglishInterfaceVisitor extends BaseVisitor {
    static get validTSSyntaxKind() {
        return TS.SyntaxKind.InterfaceDeclaration;
    }
    visit(node) {
        let interfaceName = node.name.text + "InterfaceDescriptor";
        //let newNode = ts.createSourceFile(interfaceName+"interface.ts","empty file", ts.ScriptTarget.ES5, true ,ts.ScriptKind.TS);
        const cd = TS.factory.createIdentifier('InterfaceDescriptor');
        let componentDescriptor = this.componentDescriptor;
        const call = TS.factory.createCallExpression(TS.factory.createPropertyAccessExpression(cd, "register"), undefined, [
            TS.factory.createStringLiteral(componentDescriptor.package),
            TS.factory.createStringLiteral(componentDescriptor.name),
            TS.factory.createStringLiteral(componentDescriptor.version),
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
                    let visitorList = BaseVisitor.implementations.filter(aTSNodeVisitor => aTSNodeVisitor.validTSSyntaxKind === node.kind);
                    let myVisitor = visitorList.map(aTSNodeVisitorType => new aTSNodeVisitorType(visitorContext));
                    // let myVisitor = visitors.filter(aTSNodeVisitor => {
                    //   return aTSNodeVisitor.constructor.validTSSyntaxKind == node.kind
                    // })[0]
                    if (TS.isInterfaceDeclaration(node)) {
                        console.log("  Node", TS.SyntaxKind[node.kind], sourceFile.text.substring(node.pos, node.end).replace('\n', ''));
                    }
                    // if (!myVisitor) {
                    //   myVisitor = visitor;
                    // }
                    // else {
                    if (myVisitor.length > 0) {
                        return myVisitor[0].visit(node);
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
