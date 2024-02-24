import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { homedir } from 'node:os'

const packageJsonPath = resolve(__dirname, '../package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
const cacheDirectory = resolve(homedir(), '.config', 'create-mdxts')
const cacheFilePath = resolve(cacheDirectory, 'version.json')

if (!existsSync(cacheDirectory)) {
  mkdirSync(cacheDirectory, { recursive: true })
}

async function fetchPackageVersion() {
  try {
    const response = await fetch(
      'https://registry.npmjs.org/-/package/create-mdxts/dist-tags'
    )
    const data = await response.json()
    return data.latest
  } catch (error) {
    console.error('Error fetching package version: ', error)
    return packageJson.version
  }
}

function saveVersionToCache(version: string) {
  writeFileSync(
    cacheFilePath,
    JSON.stringify({ version, cachedAt: Date.now() }, null, 2),
    'utf-8'
  )
}

function getVersionFromCache() {
  if (existsSync(cacheFilePath)) {
    const cacheContent = JSON.parse(readFileSync(cacheFilePath, 'utf-8'))
    return cacheContent
  }
  return null
}

function shouldRefreshCache() {
  const cacheContent = getVersionFromCache()
  if (!cacheContent) {
    return true
  }
  const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000
  const now = Date.now()
  return now - cacheContent.cachedAt > DAY_IN_MILLISECONDS
}

async function getCurrentVersion() {
  if (shouldRefreshCache()) {
    const version = await fetchPackageVersion()
    saveVersionToCache(version)
    return version
  } else {
    const cacheContent = getVersionFromCache()
    return cacheContent.version
  }
}

export async function isPackageOutdated() {
  const currentVersion = await getCurrentVersion()
  return currentVersion !== packageJson.version
}
