import * as ts from 'typescript';
import * as TSTypes from 'typescript';
// import * as pack from "./package.json"
import { VisitResult } from 'typescript';



export interface MyPluginOptions {
    some?: string
}

function checkClassDeclaration(tsClass: TSTypes.ClassDeclaration): ts.Decorator[] {
    console.log("=================================================")
    console.log("class", tsClass.name?.text)
    console.log("  implements")
    if (tsClass.heritageClauses)
        return checkHeritageClause(tsClass.heritageClauses, tsClass);
    else 
        return Array.from(tsClass.decorators);

}

function checkHeritageClause(tsHeritage: TSTypes.NodeArray<TSTypes.HeritageClause>, tsClass: TSTypes.ClassDeclaration) {
    let decos = ts.factory.createNodeArray(tsClass.decorators)
    let newDecorator = tsHeritage.map(element => {
        console.log(element.getText())
        let newDecos = element.types.map((type: TSTypes.ExpressionWithTypeArguments) => {
            let interfaceName = (type.expression as TSTypes.Identifier).text
            console.log("    Interface:", interfaceName)



            return ts.factory.createDecorator(
                ts.factory.createCallExpression(
                    ts.factory.createPropertyAccessExpression(
                        ts.factory.createIdentifier("DefaultClassDeclaration"),
                        "addInterface"
                    ),
                    undefined,
                    [
                        ts.factory.createStringLiteral(interfaceName)
                    ]
                )
            )
        })
    
        return newDecos;
    });
    let concatDecorator = decos.concat(newDecorator.flat())
    return concatDecorator;
}



export default function myTransformerPlugin(program: ts.Program, opts: MyPluginOptions) {
    return {
        before(ctx: ts.TransformationContext) {
            console.log("bar")
            //throw "foo"
            return (sourceFile: ts.SourceFile) => {
                console.log("myTransformer", sourceFile.fileName)
                function visitor(node: ts.Node): ts.Node {

                    console.log("  Node", ts.SyntaxKind[node.kind], sourceFile.text.substring(node.pos, node.end).replace('\n', ''))

                    // if (ts.isCallExpression(node) && node.expression.getText() === 'safely') {
                    //     const target = node.arguments[0]
                    //     if (ts.isPropertyAccessExpression(target)) {
                    //         return ts.createBinary(
                    //             target.expression,
                    //             ts.SyntaxKind.AmpersandAmpersandToken,
                    //             target
                    //         )
                    //     }
                    // }
                    if (ts.isClassDeclaration(node)) {
                        //const allDecorators = ts.getAllDecoratorsOfClassElement(node, member);
                        let newDecos = checkClassDeclaration(node);


                        return ts.factory.updateClassDeclaration(
                            node,
                            newDecos,
                            node.modifiers,
                            node.name,
                            node.typeParameters,
                            node.heritageClauses,
                            node.members
                        )

                    }
                    if (ts.isInterfaceDeclaration(node)) {
                        let interfaceName = ((node as TSTypes.InterfaceDeclaration).name).text + "RuntimeInterface";
                        //let newNode = ts.createSourceFile(interfaceName+"interface.ts","empty file", ts.ScriptTarget.ES5, true ,ts.ScriptKind.TS);
                        const cd = ts.factory.createIdentifier('InterfaceDescriptor');

                        const call = ts.factory.createCallExpression(
                            ts.factory.createPropertyAccessExpression(
                                cd, "register"),
                            undefined,
                            [
                                // ts.factory.createStringLiteral(pack.package),
                                // ts.factory.createStringLiteral(pack.name),
                                // ts.factory.createStringLiteral(pack.version),
                                ts.factory.createStringLiteral(interfaceName)
                            ]
                        )
                        //const dec = ts.factory.createDecorator(call)
                        //const classDec = ts.factory.createClassDeclaration([dec], undefined, interfaceName , undefined, undefined, []);


                        // ts.factory.createClassDeclaration()
                        //     ts.factory.createDecorator()
                        // )

                        return call
                        //return [call,node]

                    }

                    return ts.visitEachChild(node, visitor, ctx)
                }
                return ts.visitEachChild(sourceFile, visitor, ctx)
            }
        }
    }
}



// ts.js 1304 write Reflect metaData __decorators
// ts.js 4

// function getKindNamesForApi() {
//     // some SyntaxKinds are repeated, so only use the first one
//     const kindNames: { [kind: number]: string } = {};
//     for (const name of Object.keys(ts.SyntaxKind).filter(k => isNaN(parseInt(k, 10)))) {
//       const value = (ts.SyntaxKind as any)[name] as number;
//       if (kindNames[value] == null) {
//         kindNames[value] = name;
//       }
//     }
//     return kindNames;
//   }

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


// let test = {
//     before(ctx: ts.TransformationContext) {
//         console.log("bar")
//         //throw "foo"
//         return (sourceFile: ts.SourceFile) => {
//             console.log("myTransformer", sourceFile.fileName)
//             function visitor(node: ts.Node): ts.Node {

//                 console.log("  Node", ts.SyntaxKind[node.kind], sourceFile.text.substring(node.pos, node.end).replace('\n', ''))



//                 return ts.visitEachChild(node, visitor, ctx)
//             }
//             return ts.visitEachChild(sourceFile, visitor, ctx)
//         }
//     }
// }
//     test.before(ctx);

// class ThinglishInterfaceTransformer implements ts.CustomTransformer {
//     protected transformationContext: ts.TransformationContext;
//     constructor(ctx: ts.TransformationContext) {
//         this.transformationContext = ctx;
//     }

//     transformSourceFile(sourceFileNode: ts.SourceFile): ts.SourceFile {
//         return new ThinglishNodeVisitor(sourceFileNode)
//     }
//     transformBundle(node: ts.Bundle): ts.Bundle {
//         throw new Error('Method not implemented.');
//     }

// }

// class ThinglishNodeVisitor implements ts.Visitor {
//     protected transformationContext: ts.TransformationContext;
//     protected sourceFileNode: ts.SourceFile;
//     constructor(ctx: ts.TransformationContext, sourceFileNode: ts.SourceFile) {
//         this.transformationContext = ctx;
//         this.sourceFileNode = sourceFileNode;
//     }

//     visitor(node: ts.Node): ts.VisitResult<ts.Node> {
//         return ts.visitEachChild(node,this.visitor,this.transformationContext) as ts.VisitResult<ts.Node>;
//     };
// }