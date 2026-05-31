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
    tags?: string[]
    database?: string[]
}

interface PluginToml {
    plugin: PluginTomlPlugin
}

interface ValidationError {
    field: string
    message: string
    invalidValues?: string[]
}

interface ValidationResult {
    plugin: string
    passed: boolean
    config: PluginTomlPlugin | null
    errors: ValidationError[]
}

interface ValidationSelection {
    pluginDirs: string[]
    skippedPlugins: string[]
}

const REQUIRED_FIELDS: (keyof Pick<PluginTomlPlugin, 'summary' | 'version' | 'description' | 'author'>)[] = [
    'summary',
    'version',
    'description',
    'author',
]

const ALL_FIELDS: (keyof PluginTomlPlugin)[] = [...REQUIRED_FIELDS, 'icon', 'tags', 'database']

function validatePluginToml(pluginName: string, pluginPath: string): ValidationResult | null {
    const errors: ValidationError[] = []
    const tomlPath = path.join(pluginPath, 'plugin.toml')

    if (!fs.existsSync(tomlPath)) {
        return null
    }

    let config: PluginToml
    try {
        config = parseToml(fs.readFileSync(tomlPath, 'utf-8')) as PluginToml
    } catch (e) {
        errors.push({
            field: 'plugin.toml',
            message: `Parse failed: ${ e instanceof Error ? e.message : String(e) }`,
        })
        return { plugin: pluginName, passed: false, config: null, errors }
    }

    if (!config.plugin) {
        errors.push({
            field: 'plugin',
            message: 'Missing [plugin] section',
        })
        return { plugin: pluginName, passed: false, config: null, errors }
    }

    // Validate required fields
    for (const field of REQUIRED_FIELDS) {
        const value = config.plugin[field]
        if (!value || (value.trim() === '')) {
            errors.push({
                field,
                message: 'Required field missing',
            })
        }
    }

    // Validate tags
    if (config.plugin.tags && Array.isArray(config.plugin.tags)) {
        const invalidTags = config.plugin.tags.filter(
            tag => !VALID_TAGS.includes(tag.toLowerCase() as ValidTag)
        )
        if (invalidTags.length > 0) {
            errors.push({
                field: 'tags',
                message: 'Invalid values',
                invalidValues: invalidTags,
            })
        }
    }

    // Validate database
    if (config.plugin.database && Array.isArray(config.plugin.database)) {
        const invalidDatabases = config.plugin.database.filter(
            db => !VALID_DATABASES.includes(db.toLowerCase() as ValidDatabase)
        )
        if (invalidDatabases.length > 0) {
            errors.push({
                field: 'database',
                message: 'Invalid values',
                invalidValues: invalidDatabases,
            })
        }
    }

    return {
        plugin: pluginName,
        passed: errors.length === 0,
        config: config.plugin,
        errors,
    }
}

function selectPluginDirs(pluginsDir: string, args: string[]): ValidationSelection {
    const requestedPlugins = args.length > 0
        ? args
        : fs.readdirSync(pluginsDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(entry => entry.name)

    const pluginDirs: string[] = []
    const skippedPlugins: string[] = []

    for (const pluginName of requestedPlugins) {
        const pluginPath = path.join(pluginsDir, pluginName)
        const tomlPath = path.join(pluginPath, 'plugin.toml')

        if (fs.existsSync(tomlPath)) {
            pluginDirs.push(pluginName)
            continue
        }

        skippedPlugins.push(pluginName)
    }

    return { pluginDirs, skippedPlugins }
}

function formatFieldRow(name: string, value: string | string[] | undefined, error?: ValidationError): string {
    if (Array.isArray(value) && value.length > 0) {
        const display = value.map(v => `\`${ v }\``).join(', ')
        const status = error
            ? `❌ ${ error.message }: ${ error.invalidValues!.map(v => `\`${ v }\``).join(', ') }`
            : '✅'
        return `| \`${ name }\` | ${ display } | ${ status } |\n`
    }
    if (typeof value === 'string' && value.trim()) {
        return `| \`${ name }\` | ${ value } | ${ error ? `❌ ${ error.message }` : '✅' } |\n`
    }
    return `| \`${ name }\` | - | ${ error ? `❌ ${ error.message }` : '➖' } |\n`
}

function generateReport(results: ValidationResult[], skippedPlugins: string[] = []): string {
    const allPassed = results.every(r => r.passed)

    let report = `## Plugin TOML Validation Report\n\n`
    report += `**Status**: ${ allPassed ? '✅ All Passed' : '❌ Validation Failed' }\n\n`
    report += `**Summary**: ${ results.length } validated, ${ skippedPlugins.length } skipped\n\n`

    for (const result of results) {
        report += `### ${ result.passed ? '✅' : '❌' } \`${ result.plugin }\`\n\n`

        if (!result.config) {
            result.errors.forEach(e => report += `> ⚠️ \`${ e.field }\`: ${ e.message }\n`)
            report += '\n'
            continue
        }

        const errorMap = new Map(result.errors.map(e => [e.field, e]))
        report += `| Field | Value | Status |\n`
        report += `|-------|-------|--------|\n`
        for (const field of ALL_FIELDS) {
            report += formatFieldRow(field, result.config[field], errorMap.get(field))
        }
        report += '\n'
    }

    if (!allPassed) {
        report += `### Reference\n\n`
        report += `| Type | Allowed Values |\n`
        report += `|------|----------------|\n`
        report += `| Tags | ${ VALID_TAGS.map(t => `\`${ t }\``).join(', ') } |\n`
        report += `| Database | ${ VALID_DATABASES.map(d => `\`${ d }\``).join(', ') } |\n`
    }

    if (skippedPlugins.length > 0) {
        report += `### Skipped\n\n`
        for (const pluginName of skippedPlugins) {
            report += `- \`${ pluginName }\`: missing \`plugin.toml\`\n`
        }
    }

    return report
}

function main() {
    const pluginsDir = path.join(__dirname, 'plugins')
    const results: ValidationResult[] = []

    if (!fs.existsSync(pluginsDir)) {
        console.log('plugins directory not found')
        process.exit(0)
    }

    const args = process.argv.slice(2).filter(arg => arg !== '--')
    const { pluginDirs, skippedPlugins } = selectPluginDirs(pluginsDir, args)

    for (const pluginName of pluginDirs) {
        const pluginPath = path.join(pluginsDir, pluginName)
        const result = validatePluginToml(pluginName, pluginPath)
        if (result) {
            results.push(result)
        }
    }

    const passed = results.filter(r => r.passed).length
    const failed = results.filter(r => !r.passed).length

    // Write report file (for CI)
    const reportPath = process.env.VALIDATION_REPORT_PATH
    if (reportPath) {
        fs.writeFileSync(reportPath, generateReport(results, skippedPlugins), 'utf-8')
        console.log(`Done: ${ passed } passed, ${ failed } failed, ${ skippedPlugins.length } skipped`)
    } else {
        console.log(`Validating ${ pluginDirs.length } plugins...\n`)
        if (skippedPlugins.length > 0) {
            console.warn(`Skipped ${ skippedPlugins.length } plugins without plugin.toml: ${ skippedPlugins.join(', ') }\n`)
        }
        for (const { plugin, passed: ok, errors } of results) {
            if (ok) {
                console.log(`  ✅ ${ plugin }`)
                continue
            }
            console.error(`  ❌ ${ plugin }`)
            errors.forEach(({ field, message, invalidValues }) =>
                console.error(`     - ${ field }: ${ invalidValues ? `${ message }: ${ invalidValues.join(', ') }` : message }`)
            )
        }
        console.log(`\nResult: ${ passed } passed, ${ failed } failed`)
        if (failed > 0) {
            console.error(`\nAllowed tags: ${ VALID_TAGS.join(', ') }`)
            console.error(`Allowed database: ${ VALID_DATABASES.join(', ') }`)
        }
    }

    process.exit(failed > 0 ? 1 : 0)
}

main()
