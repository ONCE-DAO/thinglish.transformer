/**
 * The playground does not support imports and exports by default.
 * The plugin strips all imports except 'typescript' and makes sure its available for the transformer
 */
import ts from 'typescript';
import * as TSTypes from 'typescript';

/**
 * Any top level block statement with a `@transform` tag will be input for the transformer
 * @transform
 */
{
    interface View {
        name: String
    }
}

/**
 * When using a basic NodeTransformer some helpful context will be provided as the second parameter
 */
type VisitorContext = {
    checker: ts.TypeChecker,
    context: ts.TransformationContext,
    program: ts.Program,
    sourceFile: ts.SourceFile,
};

/**
 * The Node transformer signature is the simplest: it takes a node as argument and returns a node.
 * If you need a more complex transformer you can choose one from the different templates provided by the plugin
 */
const transformer = (node: ts.Node, { checker, context }: VisitorContext): ts.Node => {
    if (ts.isBinaryExpression(node)) {
        if (ts.isNumericLiteral(node.left) && ts.isNumericLiteral(node.right)) {
            // A great way to explore the AST is to use https://ts-ast-viewer.com/
            // It will show you everything you need to know when working with an typescript AST
            // because we checked 'node.left' and 'node.right' we can (somewhat) safely assume the following type assertions
            // this is just an example of how you can use the type checker to hook into the type system
            const lhs = checker.getTypeAtLocation(node.left) as ts.NumberLiteralType;
            const rhs = checker.getTypeAtLocation(node.right) as ts.NumberLiteralType;
            switch (node.operatorToken.kind) {
                case ts.SyntaxKind.PlusToken:
                    return context.factory.createNumericLiteral(lhs.value + rhs.value);
            }
        }
    }
    if (ts.isInterfaceDeclaration(node)) {
        let interfaceName = ((node as TSTypes.InterfaceDeclaration).name).text+"InterfaceDescriptor";
        let newNode = ts.createSourceFile(interfaceName+"interface.ts","empty file", ts.ScriptTarget.ES5, true ,ts.ScriptKind.TS);
        const cd = ts.factory.createIdentifier('InterfaceDescriptor');
        const call = ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
                cd, "declareInterface"),
                undefined,
                [ts.factory.createStringLiteral(interfaceName)]
        )
        const dec = ts.factory.createDecorator(call)
        const classDec = ts.factory.createClassDeclaration([dec], undefined, interfaceName , undefined, undefined, []);

        
        // ts.factory.createClassDeclaration()
        //     ts.factory.createDecorator()
        // )
        
        return classDec
        //return [call,node]

    }
    return node;
}

/**
 * The default export should be your transformer
 */
export default transformer;
