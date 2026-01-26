import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import toml from 'toml'
import { VALID_TAGS, VALID_DATABASES, ValidTag, ValidDatabase } from './constants.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

interface ValidationError {
    plugin: string
    field: string
    message: string
    invalidValues?: string[]
}

function validatePluginToml(pluginName: string, pluginPath: string): ValidationError[] {
    const errors: ValidationError[] = []
    const tomlPath = path.join(pluginPath, 'plugin.toml')

    if (!fs.existsSync(tomlPath)) {
        return errors
    }

    let config: PluginToml
    try {
        config = toml.parse(fs.readFileSync(tomlPath, 'utf-8')) as PluginToml
    } catch (e) {
        errors.push({
            plugin: pluginName,
            field: 'plugin.toml',
            message: `解析失败: ${e instanceof Error ? e.message : String(e)}`,
        })
        return errors
    }

    if (!config.plugin) {
        errors.push({
            plugin: pluginName,
            field: 'plugin',
            message: '缺少 [plugin] 配置块',
        })
        return errors
    }

    // 验证 tags
    if (config.plugin.tags && Array.isArray(config.plugin.tags)) {
        const invalidTags = config.plugin.tags.filter(
            tag => !VALID_TAGS.includes(tag.toLowerCase() as ValidTag)
        )
        if (invalidTags.length > 0) {
            errors.push({
                plugin: pluginName,
                field: 'tags',
                message: `包含无效的 tags 值`,
                invalidValues: invalidTags,
            })
        }
    }

    // 验证 database
    if (config.plugin.database && Array.isArray(config.plugin.database)) {
        const invalidDatabases = config.plugin.database.filter(
            db => !VALID_DATABASES.includes(db.toLowerCase() as ValidDatabase)
        )
        if (invalidDatabases.length > 0) {
            errors.push({
                plugin: pluginName,
                field: 'database',
                message: `包含无效的 database 值`,
                invalidValues: invalidDatabases,
            })
        }
    }

    return errors
}

function main() {
    const pluginsDir = path.join(__dirname, 'plugins')
    const allErrors: ValidationError[] = []

    if (!fs.existsSync(pluginsDir)) {
        console.log('plugins 目录不存在')
        process.exit(0)
    }

    const pluginDirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(entry => entry.name)

    console.log(`验证 ${pluginDirs.length} 个插件...\n`)

    for (const pluginName of pluginDirs) {
        const pluginPath = path.join(pluginsDir, pluginName)
        const errors = validatePluginToml(pluginName, pluginPath)
        allErrors.push(...errors)
    }

    if (allErrors.length === 0) {
        console.log('所有插件验证通过')
        console.log(`\n允许的 tags: ${VALID_TAGS.join(', ')}`)
        console.log(`允许的 database: ${VALID_DATABASES.join(', ')}`)
        process.exit(0)
    }

    console.error('验证失败:\n')
    for (const error of allErrors) {
        console.error(`[${error.plugin}] ${error.field}: ${error.message}`)
        if (error.invalidValues) {
            console.error(`  无效值: ${error.invalidValues.join(', ')}`)
        }
    }

    console.error(`\n允许的 tags: ${VALID_TAGS.join(', ')}`)
    console.error(`允许的 database: ${VALID_DATABASES.join(', ')}`)
    process.exit(1)
}

main()
