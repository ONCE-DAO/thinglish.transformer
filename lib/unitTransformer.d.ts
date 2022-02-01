import * as ts from 'typescript';
export default function (program: ts.Program, pluginOptions: any): (ctx: ts.TransformationContext) => (sourceFile: ts.SourceFile) => ts.SourceFile;
