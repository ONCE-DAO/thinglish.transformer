import * as ts from 'typescript';


const programTransformer = (program: ts.Program) => {
    return (context: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
            const visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
                // If it is a expression statement,
                if (ts.isExpressionStatement(node)) {
                  // Return it twice.
                  // Effectively duplicating the statement
                  return [node, node];
                }
          
                return ts.visitEachChild(node, visitor, context);
              };
            return ts.visitNode(sourceFile, visitor);
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




static async test() {
  this.pakage = await import("../2_systems/Once/OnceNodeImportLoader.class.js")
}