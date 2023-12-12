import { notFound } from 'next/navigation'
import { allComponents } from 'data'

export const dynamic = 'force-static'

export async function generateStaticParams() {
  const sourceFiles = await allComponents.all()

  return Object.entries(sourceFiles)
    .filter(([, component]) => component.examples?.length > 0)
    .flatMap(([pathname, component]) => {
      return component.examples.map((example) => ({
        component: pathname,
        example: example.slug,
      }))
    })
}

export default async function Page({
  params,
}: {
  params: { component: string; example: string }
}) {
  const component = await allComponents.get(params.component)

  if (component === null) {
    return notFound()
  }

  const example = component.examples?.find(
    (example) => example.slug === params.example
  )

  if (example === undefined) {
    return notFound()
  }

  const { default: Component } = await example.module

  return <Component />
}