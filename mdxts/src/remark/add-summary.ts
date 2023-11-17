import type { Root, Paragraph } from 'mdast'

/** Eexports a `summary` constant based on the first paragraph. */
export function addSummary() {
  return async function (tree: Root) {
    const { visit, EXIT } = await import('unist-util-visit')
    const { toString } = await import('mdast-util-to-string')
    let summary = null

    visit(tree, 'paragraph', (node: Paragraph) => {
      if (summary) return EXIT
      summary = node.children
        .map((child) => toString(child))
        .join('')
        .replace(/\n/g, '')
    })

    tree.children.unshift({
      // @ts-expect-error
      type: 'mdxjsEsm',
      data: {
        // @ts-expect-error
        estree: {
          type: 'Program',
          body: [
            {
              type: 'ExportNamedDeclaration',
              declaration: {
                type: 'VariableDeclaration',
                declarations: [
                  {
                    type: 'VariableDeclarator',
                    id: {
                      type: 'Identifier',
                      name: 'summary',
                    },
                    init: {
                      type: 'Literal',
                      value: summary,
                      raw: `"${summary}"`,
                    },
                  },
                ],
                kind: 'const',
              },
              specifiers: [],
              source: null,
            },
          ],
          sourceType: 'module',
          comments: [],
        },
      },
    })
  }
}