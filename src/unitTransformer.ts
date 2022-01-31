import * as fs from 'fs'
import * as path from 'path'
import * as ts from 'typescript'
function finish () {
  return (ctx: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      function visitor (node: ts.Node): ts.Node {
        return ts.visitEachChild(node, visitor, ctx)
      }
      return ts.visitEachChild(sourceFile, visitor, ctx)
    }
  }
}

export default function (program: ts.Program, pluginOptions: any) {
  // console.log(program.getRootFileNames())

  const rootDir = program.getCompilerOptions().rootDir
  const outDir = program.getCompilerOptions().outDir
  const extensions = pluginOptions.extensions

  if (!rootDir) throw new Error('ERROR: UnitTransformer: No root dir found')
  if (!outDir) throw new Error('ERROR: UnitTransformer: No out dir found')
  if (!extensions) throw new Error('ERROR: UnitTransformer: no extensions in config')
  if (!Array.isArray(extensions)) { throw new Error('ERROR: UnitTransformer: extension is expected to be an array') }
  fs.cpSync(rootDir, outDir, {
    recursive: true,
    filter: (source, dest) => {
      if (path.basename(source) === 'assets') {
        fs.cpSync(source, dest, { recursive: true })
        return false
      }

      return (
        path.basename(source) !== 'node_modules' &&
        (fs.lstatSync(source).isDirectory() ||
          extensions.includes(path.extname(source)))
      )
    }
  })

  return finish()
}
