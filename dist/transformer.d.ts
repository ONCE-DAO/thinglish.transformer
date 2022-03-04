import * as ts from 'typescript';
declare const programTransformer: (program: ts.Program) => (context: ts.TransformationContext) => (sourceFile: ts.SourceFile) => ts.SourceFile;
/**
 * Anything other than a node transformer will need to specifiy its type as an export
 */
export declare const type = "program";
/**
 * The default export should be your transformer
 */
export default programTransformer;
//# sourceMappingURL=transformer.d.ts.map