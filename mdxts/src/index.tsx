import parseTitle from 'title'
import Slugger from 'github-slugger'
import type { ComponentType } from 'react'
import { join, resolve, sep } from 'node:path'
import 'server-only'

import type { CodeBlocks } from './remark/add-code-blocks'
import type { Headings } from './remark/add-headings'
import { getAllData, type AllModules } from './utils/get-all-data'
import { getExportedTypes } from './utils/get-exported-types'

const typeSlugs = new Slugger()

export type Module = {
  Content?: ComponentType
  title: string
  label: string
  description: string
  summary: string
  frontMatter?: Record<string, any>
  headings: Headings
  codeBlocks: CodeBlocks
  pathname: string
  sourcePath: string
  isServerOnly: boolean
  slug: string
  types?: (ReturnType<typeof getExportedTypes>[number] & {
    pathname: string
    sourcePath: string
  })[]
  examples?: {
    name: string
    slug: string
    module: Promise<Record<string, any>>
    pathname: string
    sourcePath: string
  }[]
  metadata?: { title: string; description: string }
}

/**
 * Loads content and metadata related to MDX and TypeScript files.
 *
 * @example
 * export const allDocs = createDataSource('./docs/*.mdx', { baseDirectory: 'docs' })
 * export const allComponents = createDataSource('./components/**\/index.ts')
 */
export function createDataSource<Type>(
  /** A glob pattern to match files. */
  pattern: string,

  /** Options for configuring the data source. */
  options: {
    /** The base directory to use for calculating source paths. */
    baseDirectory?: string

    /** The base path to use for calculating navigation paths. */
    basePath?: string
  } = {}
) {
  let allModules = pattern as unknown as AllModules

  if (typeof allModules === 'string') {
    throw new Error(
      'mdxts: createDataSource requires that the mdxts/loader package is configured as a Webpack loader.'
    )
  }

  /** Convert all modules to absolute paths. */
  allModules = Object.fromEntries(
    Object.entries(allModules).map(([pathname, moduleImport]) => [
      resolve(process.cwd(), pathname),
      moduleImport,
    ])
  )

  const globPattern = options as unknown as string
  const { baseDirectory = '', basePath = '' } = (arguments[2] ||
    {}) as unknown as {
    baseDirectory: string
    basePath: string
  }
  const allData = getAllData({
    allModules,
    globPattern,
    baseDirectory,
    basePath,
  })

  /** Parses and attaches metadata to a module. */
  async function getModule(pathname?: string) {
    if (pathname === undefined) {
      return null
    }

    const data = allData[pathname]

    if (data === undefined) {
      return null
    }

    let {
      default: Content,
      headings = [],
      metadata,
      frontMatter,
      ...exports
    } = data.mdxPath
      ? await allModules[data.mdxPath]
      : { default: undefined, metadata: undefined, frontMatter: undefined }

    /** Append component prop type links to headings data. */
    if (data.types && data.types.length > 0) {
      typeSlugs.reset()

      headings = [
        ...(headings || []),
        {
          text: 'Exports',
          id: 'exports',
          depth: 2,
        },
        ...data.types.map((type) => ({
          text: type.name,
          id: typeSlugs.slug(type.name),
          depth: 3,
        })),
      ]
    }

    /** Merge front matter data into metadata. */
    if (frontMatter) {
      Object.assign(metadata, frontMatter)
    }

    return {
      Content,
      isServerOnly: data.isServerOnly,
      title: data.title,
      label: data.label,
      description: data.description,
      types: data.types,
      examples: data.examples,
      sourcePath: data.sourcePath,
      pathname:
        basePath === pathname
          ? join(sep, basePath)
          : join(sep, basePath, pathname),
      headings,
      frontMatter,
      metadata,
      ...exports,
    } as Module & Type
  }

  async function getPathData(
    /** The pathname of the active page. */
    pathname: string | string[]
  ): Promise<(Module & { previous?: Module; next?: Module }) | null> {
    const stringPathname = Array.isArray(pathname)
      ? pathname.join(sep)
      : pathname
    const activeIndex = Object.keys(allData).findIndex((dataPathname) =>
      dataPathname.includes(stringPathname)
    )

    function getSiblingPathname(startIndex: number, direction: number) {
      const siblingIndex = startIndex + direction
      const siblingPathname = Object.keys(allData)[siblingIndex]

      if (siblingPathname === null) {
        return getSiblingPathname(siblingIndex, direction)
      }
      return siblingPathname
    }

    const [active, previous, next] = await Promise.all([
      getModule(stringPathname),
      getModule(getSiblingPathname(activeIndex, -1)),
      getModule(getSiblingPathname(activeIndex, 1)),
    ])

    if (active === null) {
      return null
    }

    return Object.assign(active, { previous, next }) as Module &
      Type & {
        previous?: Module & Type
        next?: Module & Type
      }
  }

  return {
    /** Returns all modules. */
    async all(): Promise<any> {
      return allData
    },

    /** Returns a tree of all modules. */
    async tree(): Promise<any[]> {
      return sourceFilesToTree(allData, basePath)
    },

    /** Returns a module by pathname including metadata, examples, and previous/next modules. Defaults to `basePath` if `pathname` is undefined. */
    async get(pathname: string | string[] | undefined) {
      if (pathname === undefined) {
        pathname = basePath
      }

      const data = await getPathData(pathname)
      return data
    },

    /** Returns paths for all modules calculated from file system paths. */
    paths(): string[][] {
      return Object.keys(allData).map((pathname) =>
        pathname
          // Split pathname into an array
          .split(sep)
          // Remove empty strings
          .filter(Boolean)
      )
    },
  }
}

type AllSourceFiles = Awaited<
  ReturnType<ReturnType<typeof createDataSource>['all']>
>

/** Turns a collection of source files into a tree. */
function sourceFilesToTree(sourceFiles: AllSourceFiles, basePath: string) {
  const paths = Object.keys(sourceFiles)
  const tree: any[] = []

  for (let pathIndex = 0; pathIndex < paths.length; pathIndex++) {
    const currentPath = paths[pathIndex]
    const pathParts = currentPath.split(sep)
    const allPaths: Record<string, any> = {}
    let nodes = tree

    for (
      let pathPartIndex = 0;
      pathPartIndex < pathParts.length;
      pathPartIndex++
    ) {
      const pathname = pathParts.slice(0, pathPartIndex + 1).join(sep)
      const segment = pathParts[pathPartIndex]
      let node = nodes.find((node) => node.segment === segment)

      if (!node) {
        node = {
          segment,
          pathname: join(sep, basePath, pathname),
          label: parseTitle(segment),
          children: [],
        }

        const sourceFile = sourceFiles[pathname]

        if (sourceFile) {
          Object.assign(node, sourceFile)
        }

        nodes.push(node)
      }

      allPaths[pathname] = node
      nodes = node.children
    }
  }

  return tree
}

let theme: any = null

/** Sets the current theme. */
export function setTheme(newTheme: any) {
  theme = newTheme
}

/** Returns the current theme. */
export function getTheme() {
  return theme
}
