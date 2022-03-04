/**
 * The playground does not support imports and exports by default.
 * The plugin strips all imports except 'typescript' and makes sure its available for the transformer
 */
import ts from 'typescript';


/**
 * The Program transformer signature is based on https://github.com/cevek/ttypescript#program
 */
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
