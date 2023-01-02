import type { FunctionLikeDeclaration, SourceFile } from 'ts-morph'
import { extractExportByIdentifier } from './extract-export-by-identifier'

/** Gathers examples from a declaration's JSDoc example tags. */
export function getExamplesFromComments(declaration: FunctionLikeDeclaration) {
  const docs = declaration.getJsDocs()

  return docs.flatMap((doc) =>
    doc
      .getTags()
      .filter((tag) => tag.getTagName() === 'example')
      .map((tag) => tag.getCommentText())
      .filter(Boolean)
  )
}

/** Gathers examples from a source file with the same base name and `.examples` extension. */
export function getExamplesFromExtension(sourceFile: SourceFile) {
  const exampleSourceFile = sourceFile
    .getDirectory()
    .getSourceFile(
      `${sourceFile.getBaseNameWithoutExtension()}.examples.${sourceFile.getExtension()}`
    )

  if (!exampleSourceFile) {
    return []
  }

  const exportedDeclarations = exampleSourceFile.getExportedDeclarations()

  return Object.values(exportedDeclarations).map((declaration) =>
    extractExportByIdentifier(exampleSourceFile, declaration.getName())
  )
}

/** Gathers examples from a source file's examples directory. */
export function getExamplesFromDirectory(sourceFile: SourceFile) {
  const examplesDirectory = sourceFile.getDirectory().getDirectory('examples')

  if (!examplesDirectory) {
    return []
  }

  return examplesDirectory.getSourceFiles().flatMap((exampleSourceFile) => {
    const exportedDeclarations = exampleSourceFile.getExportedDeclarations()

    return Object.values(exportedDeclarations).map((declaration) => {
      return extractExportByIdentifier(exampleSourceFile, declaration.getName())
    })
  })
}
