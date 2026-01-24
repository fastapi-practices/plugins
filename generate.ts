import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import toml from 'toml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const VALID_TAGS = [
    "ai",
    "mcp",
    "agent",
    "rag",
    "permission",
    "sso",
    "rbac",
    "auth",
    "ldap",
    "storage",
    "notification",
    "task",
    "other",
] as const

const VALID_DATABASES = ['mysql', 'postgresql'] as const

interface PluginTomlPlugin {
    icon?: string
    summary: string
    version: string
    description: string
    author: string
    tags?: string[]
    database?: string[]
}

interface PluginToml {
    plugin: PluginTomlPlugin
}

interface GitModule {
    path: string
    url: string
}

interface PluginData {
    plugin: PluginTomlPlugin
    git: GitModule
}

function loadPluginToml(pluginPath: string): PluginToml | null {
    const tomlPath = path.join(pluginPath, 'plugin.toml')
    if (!fs.existsSync(tomlPath)) return null

    try {
        return toml.parse(fs.readFileSync(tomlPath, 'utf-8')) as PluginToml
    } catch {
        return null
    }
}

function parseGitModules(gitmodulesPath: string): Map<string, GitModule> {
    const modules = new Map<string, GitModule>()
    if (!fs.existsSync(gitmodulesPath)) return modules

    const content = fs.readFileSync(gitmodulesPath, 'utf-8')
    const lines = content.split('\n')

    let currentPath = ''
    let currentUrl = ''

    for (const line of lines) {
        const pathMatch = line.match(/path\s*=\s*(.+)/)
        const urlMatch = line.match(/url\s*=\s*(.+)/)

        if (pathMatch) currentPath = pathMatch[1].trim()
        if (urlMatch) currentUrl = urlMatch[1].trim()

        if (currentPath && currentUrl) {
            modules.set(currentPath, { path: currentPath, url: currentUrl })
            currentPath = ''
            currentUrl = ''
        }
    }

    return modules
}

function generatePluginData(pluginsDir: string, gitmodulesPath: string): PluginData[] {
    const gitModules = parseGitModules(gitmodulesPath)
    const pluginDataList: PluginData[] = []

    const pluginDirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(entry => entry.name)
        .sort()

    for (const pluginName of pluginDirs) {
        const pluginPath = path.join(pluginsDir, pluginName)
        const pluginConfig = loadPluginToml(pluginPath)

        if (!pluginConfig?.plugin) {
            console.warn(`警告: ${pluginName} 没有有效的 plugin.toml`)
            continue
        }

        const modulePath = `plugins/${pluginName}`
        const gitModule = gitModules.get(modulePath)

        if (!gitModule) {
            console.warn(`警告: ${pluginName} 没有对应的 git submodule`)
            continue
        }

        const rawPlugin = pluginConfig.plugin
        let database: string[] | undefined
        if (rawPlugin.database && Array.isArray(rawPlugin.database)) {
            const filtered = rawPlugin.database
                .map(db => {
                    const lower = db.toLowerCase()
                    if (lower === 'pgsql') return 'postgresql'
                    return lower
                })
                .filter(db => VALID_DATABASES.includes(db as any))
            if (filtered.length > 0) {
                database = [...new Set(filtered)]
            }
        }

        const plugin: PluginTomlPlugin = {
            summary: rawPlugin.summary,
            version: rawPlugin.version,
            description: rawPlugin.description,
            author: rawPlugin.author,
            ...(rawPlugin.tags && { tags: rawPlugin.tags }),
            ...(database && { database }),
        }

        pluginDataList.push({
            plugin,
            git: gitModule,
        })
    }

    return pluginDataList
}

function generateTypeScriptCode(pluginDataList: PluginData[]): string {
    return `export const validTags = ${JSON.stringify(VALID_TAGS, null, 2)} as const

export interface PluginTomlPlugin {
  summary: string
  version: string
  description: string
  author: string
  tags?: string[]
  database?: string[]
}

export interface GitModule {
  path: string
  url: string
}

export interface PluginData {
  plugin: PluginTomlPlugin
  git: GitModule
}

export const pluginDataList: PluginData[] = ${JSON.stringify(pluginDataList, null, 2)}
`
}

function main() {
    const baseDir = __dirname
    const pluginsDir = path.join(baseDir, 'plugins')
    const gitmodulesPath = path.join(baseDir, '.gitmodules')

    console.log('生成插件数据...')

    const pluginDataList = generatePluginData(pluginsDir, gitmodulesPath)
    console.log(`找到 ${pluginDataList.length} 个插件`)

    fs.writeFileSync(
        path.join(baseDir, 'plugins-data.ts'),
        generateTypeScriptCode(pluginDataList),
        'utf-8'
    )

    fs.writeFileSync(
        path.join(baseDir, 'plugins-data.json'),
        JSON.stringify({ validTags: VALID_TAGS, pluginDataList }, null, 2),
        'utf-8'
    )

    console.log('完成')
}

main()
