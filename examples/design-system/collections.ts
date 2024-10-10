import { Collection, type FileSystemSource } from 'renoun/collections'

type ComponentSchema = Record<string, React.ComponentType>

export type ComponentSource = FileSystemSource<ComponentSchema>

export const ComponentsCollection = new Collection<ComponentSchema>(
  {
    baseDirectory: 'components',
    basePath: 'components',
    filePattern: '@/components/**/{index,*.examples,examples/*}.{ts,tsx}',
  },
  [
    (slug) => import(`./components/${slug}.ts`),
    (slug) => import(`./components/${slug}.tsx`),
  ]
)
