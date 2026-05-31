import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseToml } from 'toml'
import { VALID_TAGS, VALID_DATABASES, ValidTag, ValidDatabase } from './constants.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface PluginTomlPlugin {
    icon?: string
    summary: string
    version: string
    description: string
    author: string
    tags?: ValidTag[]
    database?: ValidDatabase[]
}

interface PluginToml {
    plugin: PluginTomlPlugin
}

interface GitModule {
    path: string
    url: string
    branch: string
}

interface PluginData {
    plugin: PluginTomlPlugin
    git: GitModule
}

interface PluginDataFile {
    pluginDataList?: PluginData[]
}

type PluginTomlLoadResult =
    | { status: 'loaded'; config: PluginToml }
    | { status: 'missing' }
    | { status: 'invalid'; error: string }


function resolveIconUrl(iconPath: string | undefined, gitUrl: string, branch: string): string | undefined {
    if (!iconPath) return undefined

    if (iconPath.startsWith('http://') || iconPath.startsWith('https://')) {
        return iconPath
    }

    const match = gitUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/)
    if (!match) return iconPath

    const [, owner, repo] = match
    return `https://raw.githubusercontent.com/${ owner }/${ repo }/${ branch }/${ iconPath }`
}

function loadPluginToml(pluginPath: string): PluginTomlLoadResult {
    const tomlPath = path.join(pluginPath, 'plugin.toml')
    if (!fs.existsSync(tomlPath)) return { status: 'missing' }

    try {
        const config = parseToml(fs.readFileSync(tomlPath, 'utf-8')) as PluginToml
        if (!config.plugin) {
            return { status: 'invalid', error: 'Missing [plugin] section' }
        }
        return { status: 'loaded', config }
    } catch (e) {
        return { status: 'invalid', error: e instanceof Error ? e.message : String(e) }
    }
}

function parseGitModules(gitmodulesPath: string): Map<string, GitModule> {
    const modules = new Map<string, GitModule>()
    if (!fs.existsSync(gitmodulesPath)) return modules

    const content = fs.readFileSync(gitmodulesPath, 'utf-8')
    let current: Partial<GitModule> = {}

    const commitCurrent = () => {
        if (!current.path || !current.url) {
            current = {}
            return
        }

        modules.set(current.path, {
            path: current.path,
            url: current.url,
            branch: current.branch || 'master',
        })
        current = {}
    }

    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue

        if (line.startsWith('[submodule ')) {
            commitCurrent()
            continue
        }

        const match = line.match(/^(path|url|branch)\s*=\s*(.+)$/)
        if (!match) continue

        const [, key, value] = match
        if (key === 'path') current.path = value.trim()
        if (key === 'url') current.url = value.trim()
        if (key === 'branch') current.branch = value.trim()
    }

    commitCurrent()

    return modules
}

function loadExistingPluginData(baseDir: string): Map<string, PluginData> {
    const existing = new Map<string, PluginData>()
    const dataPath = path.join(baseDir, 'plugins-data.json')
    if (!fs.existsSync(dataPath)) return existing

    try {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as PluginDataFile
        if (!Array.isArray(data.pluginDataList)) return existing

        for (const item of data.pluginDataList) {
            if (item?.git?.path && item.plugin) {
                existing.set(item.git.path, item)
            }
        }
    } catch {
        console.warn('Warning: failed to read existing plugins-data.json')
    }

    return existing
}

function generatePluginData(pluginsDir: string, gitmodulesPath: string, existingData: Map<string, PluginData>): PluginData[] {
    const gitModules = parseGitModules(gitmodulesPath)
    const pluginDataListByPath = new Map<string, PluginData>()

    const pluginDirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => `plugins/${ entry.name }`)

    for (const gitModule of [...gitModules.values()].sort((a, b) => a.path.localeCompare(b.path))) {
        const pluginName = path.basename(gitModule.path)
        const pluginPath = path.join(path.dirname(gitmodulesPath), gitModule.path)
        const pluginConfig = fs.existsSync(pluginPath) ? loadPluginToml(pluginPath) : { status: 'missing' } as const
        const existing = existingData.get(gitModule.path)

        if (pluginConfig.status === 'invalid') {
            throw new Error(`${ pluginName } has invalid plugin.toml: ${ pluginConfig.error }`)
        }

        if (pluginConfig.status === 'missing') {
            if (existing) {
                console.warn(`Warning: ${ pluginName } has no valid plugin.toml; keeping existing generated data`)
                pluginDataListByPath.set(gitModule.path, {
                    ...existing,
                    git: gitModule,
                })
            } else {
                console.warn(`Warning: ${ pluginName } has no valid plugin.toml`)
            }
            continue
        }

        const rawPlugin = pluginConfig.config.plugin

        // Validate and filter tags
        let tags: ValidTag[] | undefined
        if (rawPlugin.tags && Array.isArray(rawPlugin.tags)) {
            const filtered = rawPlugin.tags
            .map(tag => tag.toLowerCase())
            .filter((tag): tag is ValidTag => VALID_TAGS.includes(tag as ValidTag))
            if (filtered.length > 0) {
                // @ts-ignore
                tags = [...new Set(filtered)]
            }
        }

        // Validate and filter database
        let database: ValidDatabase[] | undefined
        if (rawPlugin.database && Array.isArray(rawPlugin.database)) {
            const filtered = rawPlugin.database
            .map(db => db.toLowerCase() as ValidDatabase)
            .filter((db): db is ValidDatabase => VALID_DATABASES.includes(db))
            if (filtered.length > 0) {
                // @ts-ignore
                database = [...new Set(filtered)]
            }
        }

        const icon = resolveIconUrl(rawPlugin.icon, gitModule.url, gitModule.branch)
        const plugin: PluginTomlPlugin = {
            ...(icon && { icon }),
            summary: rawPlugin.summary,
            version: rawPlugin.version,
            description: rawPlugin.description,
            author: rawPlugin.author,
            ...(tags && { tags }),
            ...(database && { database }),
        }

        pluginDataListByPath.set(gitModule.path, {
            plugin,
            git: gitModule,
        })
    }

    for (const pluginPath of pluginDirs) {
        if (!gitModules.has(pluginPath)) {
            console.warn(`Warning: ${ path.basename(pluginPath) } has no matching git submodule`)
        }
    }

    return [...pluginDataListByPath.values()]
}

function generateTypeScriptCode(pluginDataList: PluginData[]): string {
    return `export const validTags = ${ JSON.stringify(VALID_TAGS, null, 2) } as const
export const validDatabases = ${ JSON.stringify(VALID_DATABASES, null, 2) } as const

export type ValidTag = typeof validTags[number]
export type ValidDatabase = typeof validDatabases[number]

export interface PluginTomlPlugin {
  icon?: string
  summary: string
  version: string
  description: string
  author: string
  tags?: ValidTag[]
  database?: ValidDatabase[]
}

export interface GitModule {
  path: string
  url: string
  branch: string
}

export interface PluginData {
  plugin: PluginTomlPlugin
  git: GitModule
}

export const pluginDataList: PluginData[] = ${ JSON.stringify(pluginDataList, null, 2) }
`
}

function main() {
    const baseDir = __dirname
    const pluginsDir = path.join(baseDir, 'plugins')
    const gitmodulesPath = path.join(baseDir, '.gitmodules')

    console.log('Generating plugins data...')

    const pluginDataList = generatePluginData(pluginsDir, gitmodulesPath, loadExistingPluginData(baseDir))
    console.log(`Found ${ pluginDataList.length } plugins`)

    fs.writeFileSync(
        path.join(baseDir, 'plugins-data.ts'),
        generateTypeScriptCode(pluginDataList),
        'utf-8'
    )

    fs.writeFileSync(
        path.join(baseDir, 'plugins-data.json'),
        JSON.stringify({ validTags: VALID_TAGS, validDatabases: VALID_DATABASES, pluginDataList }, null, 2),
        'utf-8'
    )

    console.log('Done')
}

main()
