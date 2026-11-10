import * as fs from 'node:fs'
import * as path from 'node:path'

const BACKEND_PLUGIN_NAME_PATTERN = /^[a-z0-9_]+$/
const FRONTEND_PLUGIN_NAME_PATTERN = /^[a-z0-9_-]+$/
const REQUIRED_SQL_FILES = ['init.sql', 'destroy.sql', 'init_snowflake.sql', 'destroy_snowflake.sql']
const DATABASE_DIR = 'postgresql'

function fail(message: string): never {
    throw new Error(message)
}

function assertFile(filePath: string, label: string): void {
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        fail(`missing ${ label }: ${ filePath }`)
    }
}

function isFrontendPlugin(pluginName: string): boolean {
    return pluginName.endsWith('_ui') || pluginName.endsWith('-ui')
}

function validateName(pluginName: string, expectedType: 'backend' | 'frontend'): void {
    if (expectedType === 'backend') {
        if (!BACKEND_PLUGIN_NAME_PATTERN.test(pluginName)) {
            fail('backend plugin names may only contain lowercase letters, numbers, and underscores')
        }
        if (isFrontendPlugin(pluginName)) {
            fail('backend plugin names must not use the frontend _ui or -ui suffix')
        }
        return
    }

    if (!FRONTEND_PLUGIN_NAME_PATTERN.test(pluginName)) {
        fail('frontend plugin names may only contain lowercase letters, numbers, underscores, and hyphens')
    }
    if (!isFrontendPlugin(pluginName)) {
        fail('frontend plugin names must end with _ui or -ui')
    }
}

function validateBackendStructure(pluginName: string, pluginPath: string): void {
    assertFile(path.join(pluginPath, 'plugin.toml'), 'plugin.toml')
    assertFile(path.join(pluginPath, 'README.md'), 'README.md')
    assertFile(path.join(pluginPath, '__init__.py'), '__init__.py')

    const modelPath = path.join(pluginPath, 'model')
    const sqlPath = path.join(pluginPath, 'sql')
    const hasModel = fs.existsSync(modelPath) && fs.statSync(modelPath).isDirectory()
    const hasSql = fs.existsSync(sqlPath) && fs.statSync(sqlPath).isDirectory()
    if (!hasModel && !hasSql) return

    for (const sqlFile of REQUIRED_SQL_FILES) {
        assertFile(path.join(pluginPath, 'sql', DATABASE_DIR, sqlFile), `${ DATABASE_DIR } SQL file`)
    }

    if (!pluginName) {
        fail('plugin name must not be empty')
    }
}

function main(): void {
    const [pluginName, rawPluginType] = process.argv.slice(2)
    if (!pluginName || !rawPluginType) {
        fail('usage: pnpm validate:submission <plugin-name> <backend|frontend>')
    }

    const expectedType = rawPluginType === 'backend' || rawPluginType === 'frontend'
        ? rawPluginType
        : fail('plugin type must be backend or frontend')

    validateName(pluginName, expectedType)

    const pluginPath = path.join(process.cwd(), 'plugins', pluginName)
    if (!fs.existsSync(pluginPath) || !fs.statSync(pluginPath).isDirectory()) {
        fail(`plugin directory not found: ${ pluginPath }`)
    }

    assertFile(path.join(pluginPath, 'plugin.toml'), 'plugin.toml')
    if (expectedType === 'backend') {
        validateBackendStructure(pluginName, pluginPath)
    }

    console.log(`Submission structure passed: ${ pluginName } (${ expectedType })`)
}

try {
    main()
} catch (error) {
    console.error(`Submission structure failed: ${ error instanceof Error ? error.message : String(error) }`)
    process.exit(1)
}
