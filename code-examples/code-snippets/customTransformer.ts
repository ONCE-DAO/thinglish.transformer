import * as ts from 'typescript';

public makeTransformers(): ts.CustomTransformers {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    const transformerFactory = (ctx: ts.TransformationContext) => {
      return <T extends ts.Bundle | ts.SourceFile>(input: T): T => {
        if (ts.isSourceFile(input)) {
          return replaceSourceFile(input) as T;
        }
        // I don't know what a Bundle is but seems we don't need it
        return input;
      };

      function replaceSourceFile(source: ts.SourceFile): ts.SourceFile {
        return ts.visitEachChild(source, visitor, ctx);

        function visitor(node: ts.Node): ts.Node {
          const handled = self.handleNode(node, source);
          return ts.visitEachChild(handled, visitor, ctx);
        }
      }
    };