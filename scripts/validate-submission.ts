import * as fs from 'node:fs'
import * as path from 'node:path'
import { parse as parseToml } from 'toml'

import { VALID_DATABASES, type ValidDatabase } from '../constants.js'

interface PluginManifest {
    plugin?: {
        database?: string[]
    }
}

const BACKEND_PLUGIN_NAME_PATTERN = /^[a-z0-9_]+$/
const FRONTEND_PLUGIN_NAME_PATTERN = /^[a-z0-9_-]+$/
const REQUIRED_SQL_FILES = ['init.sql', 'destroy.sql', 'init_snowflake.sql', 'destroy_snowflake.sql']

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
    if (!fs.existsSync(modelPath) || !fs.statSync(modelPath).isDirectory()) return

    const manifest = parseToml(fs.readFileSync(path.join(pluginPath, 'plugin.toml'), 'utf-8')) as PluginManifest
    const databases = manifest.plugin?.database
    if (!databases || databases.length === 0) {
        fail('plugins with a model directory must declare plugin.database')
    }

    for (const database of databases) {
        if (!VALID_DATABASES.includes(database as ValidDatabase)) {
            fail(`unsupported database in plugin.database: ${ database }`)
        }

        for (const sqlFile of REQUIRED_SQL_FILES) {
            assertFile(path.join(pluginPath, 'sql', database, sqlFile), `${ database } SQL file`)
        }
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
