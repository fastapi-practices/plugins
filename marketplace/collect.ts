#!/usr/bin/env tsx
// 插件市场数据采集
//
// 数据来源：
//   1. 本仓库的 plugins-data.json（PR 合入方式收录的官方插件）
//   2. GitHub 上带有 fba-plugin 标签或同名主题的仓库（无需 PR 即可收录）
//
// 采集结果输出为 plugins-market.json，供文档站点运行时直接读取
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseToml } from 'toml'
import { GitHubClient, type CollectState } from './github.js'
import {
  LIMITS,
  MARKERS,
  OUTPUT_FILE,
  RAW_BASE,
  REGISTRY_REPO,
  STATE_FILE,
} from './config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE_DIR = path.resolve(__dirname, '..')

// 通过代码检索发现社区插件仓库
// 检索式覆盖 fba 插件清单的共同特征，命中即为候选，再逐一核对标记
// 检索结果只保留仓库根目录下的 plugin.toml，显著减少无关候选
const CODE_SEARCH_QUERIES = [
  'filename:plugin.toml fba_version',
  'filename:plugin.toml router',
  'filename:plugin.toml depends_on',
  'filename:plugin.toml summary author',
]

// 每个检索式翻页数上限，避免过多消耗搜索接口配额
const CODE_SEARCH_PAGES = 2

const [REGISTRY_OWNER, REGISTRY_NAME] = REGISTRY_REPO.split('/')

interface PluginTomlPlugin {
  icon?: string
  summary: string
  version: string
  description: string
  author: string
  tags?: string[]
}

interface GitModule {
  path: string
  url: string
  branch: string
}

interface PluginStats {
  stars: number
  forks: number
  watchers: number
  license: string | null
  updatedAt: string | null
  listedAt: string | null
}

interface MarketPlugin {
  plugin: PluginTomlPlugin
  git: GitModule
  source: 'registry' | 'marked'
  stats: PluginStats
}

interface RegistryFile {
  validTags?: string[]
  pluginDataList?: Array<{ plugin: PluginTomlPlugin, git: GitModule }>
}

// 读取本仓库生成的插件清单
function loadRegistry(): { validTags: string[], pluginDataList: Array<{ plugin: PluginTomlPlugin, git: GitModule }> } {
  const dataPath = path.join(BASE_DIR, 'plugins-data.json')
  if (!fs.existsSync(dataPath)) {
    throw new Error(`missing ${ dataPath }，请先执行 pnpm generate`)
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as RegistryFile
  return {
    validTags: Array.isArray(data.validTags) ? data.validTags : [],
    pluginDataList: Array.isArray(data.pluginDataList) ? data.pluginDataList : [],
  }
}

// 从 plugin.toml 中提取插件信息
function parsePluginToml(
  content: string | null,
  { owner, repo, branch, gitPath }: { owner: string, repo: string, branch: string, gitPath: string },
): Pick<MarketPlugin, 'plugin' | 'git'> | null {
  if (!content) return null

  let config: any
  try {
    config = parseToml(content)
  } catch {
    return null
  }

  const plugin = config?.plugin
  if (!plugin || typeof plugin !== 'object') return null

  const summary = typeof plugin.summary === 'string' ? plugin.summary.trim() : ''
  const description = typeof plugin.description === 'string' ? plugin.description.trim() : ''
  const author = typeof plugin.author === 'string' ? plugin.author.trim() : ''
  const version = typeof plugin.version === 'string' ? plugin.version.trim() : ''

  // 关键信息缺失或版本号不合法的仓库不予收录
  if (!summary || !description || !author || !version) return null
  if (!/^\d+\.\d+\.\d+$/.test(version)) return null

  const validTags = loadRegistry().validTags
  const tags = Array.isArray(plugin.tags)
    ? [...new Set(plugin.tags.map((tag: unknown) => String(tag).toLowerCase()).filter((tag: string) => validTags.includes(tag)))]
    : []

  let icon = typeof plugin.icon === 'string' ? plugin.icon.trim() : ''
  // 相对路径的图标统一转为 raw 地址，避免浏览器端路径解析差异
  if (icon && !/^https?:\/\//.test(icon)) {
    icon = `${ RAW_BASE }/${ owner }/${ repo }/${ branch }/${ icon.replace(/^\/+/, '') }`
  }

  return {
    plugin: {
      ...(icon ? { icon } : {}),
      summary,
      version,
      description,
      author,
      ...(tags.length ? { tags } : {}),
    },
    git: {
      path: gitPath,
      url: `https://github.com/${ owner }/${ repo }.git`,
      branch,
    },
  }
}

// 提取仓库许可证，没有许可证时返回 null
function getLicense(info: any): string | null {
  const spdx = info?.license?.spdx_id
  if (typeof spdx !== 'string') return null
  if (!spdx || spdx === 'NOASSERTION' || spdx === 'null') return null
  return spdx
}

function repoKey(owner: string, repo: string): string {
  return `${ owner }/${ repo }`.toLowerCase()
}

// 判断仓库是否带有插件标记（标签或主题）
// 标签名统一按小写比较，`FBA-Plugin` 与 `fba-plugin` 视为同一个标记
function hasMarker(labels: string[], topics: string[]): boolean {
  const names = new Set(
    [...labels, ...topics]
      .map(name => String(name || '').trim().toLowerCase())
      .filter(Boolean),
  )
  return MARKERS.some(marker => names.has(marker))
}

// 收集带有插件标记的社区仓库
async function discoverMarkedRepos(client: GitHubClient): Promise<Array<{ owner: string, repo: string }>> {
  const candidates = new Map<string, any>()

  // 主题检索：仓库搜索中唯一可靠的标记检索方式
  for (const marker of MARKERS) {
    const items = await client.searchByTopic(marker)
    for (const item of items) {
      if (item?.full_name) candidates.set(item.full_name, item)
    }
  }

  // 代码检索：补充设置了标签但未设置主题的仓库
  for (const query of CODE_SEARCH_QUERIES) {
    for (let page = 1; page <= CODE_SEARCH_PAGES; page += 1) {
      const items = await client.searchCode(query, page)
      if (!items.length) break
      for (const item of items) {
        const fullName = item?.repository?.full_name
        if (fullName && !candidates.has(fullName)) candidates.set(fullName, item)
      }
    }
  }

  const marked: Array<{ owner: string, repo: string }> = []
  let checked = 0
  for (const [fullName, item] of candidates) {
    // 候选数量有上限，避免单轮核对过多仓库拖垮配额
    if (checked >= LIMITS.maxCandidates) break
    checked += 1
    const [owner, repo] = fullName.split('/')
    if (!owner || !repo) continue

    // 官方插件仓库自身不是插件，跳过
    if (owner === REGISTRY_OWNER && repo === REGISTRY_NAME) continue

    const labels = await client.repoLabels(owner, repo)
    const topics = Array.isArray(item?.topics)
      ? item.topics.map((t: string) => String(t).toLowerCase())
      : await client.repoTopics(owner, repo)

    if (!hasMarker(labels, topics)) continue

    marked.push({ owner, repo })
  }

  return marked
}

// 采集单个仓库的插件信息
async function collectRepoPlugin(
  client: GitHubClient,
  { owner, repo }: { owner: string, repo: string },
): Promise<(Pick<MarketPlugin, 'plugin' | 'git'> & { stats: Omit<PluginStats, 'listedAt'> }) | null> {
  const info = await client.repo(owner, repo)
  if (!info) return null
  if (info.archived || info.disabled) return null

  const branch = info.default_branch || 'master'
  const content = await client.rawFile(owner, repo, 'plugin.toml', branch)
  // 标签收录的仓库不占用官方仓库的 plugins/ 路径，避免与同名插件冲突
  const parsed = parsePluginToml(content, {
    owner,
    repo,
    branch,
    gitPath: `marked/${ owner }/${ repo }`,
  })
  if (!parsed) return null

  return {
    ...parsed,
    stats: {
      stars: Number(info.stargazers_count) || 0,
      forks: Number(info.forks_count) || 0,
      watchers: Number(info.subscribers_count) || 0,
      license: getLicense(info),
      updatedAt: typeof info.pushed_at === 'string' ? info.pushed_at : null,
    },
  }
}

function readState(): CollectState {
  try {
    const state = JSON.parse(fs.readFileSync(path.join(BASE_DIR, STATE_FILE), 'utf-8')) as CollectState
    return { etags: {}, listedAt: state.listedAt || {} }
  } catch {
    return { etags: {}, listedAt: {} }
  }
}

// 记录插件首次被收录的时间，作为其上架时间
function firstSeenAt(state: CollectState, key: string): string {
  state.listedAt = state.listedAt || {}
  if (!state.listedAt[key]) {
    state.listedAt[key] = new Date().toISOString()
  }
  return state.listedAt[key]
}

async function main(): Promise<void> {
  const state = readState()
  const client = new GitHubClient({ state })
  const registry = loadRegistry()

  const plugins: MarketPlugin[] = []
  const seen = new Set<string>()

  // 1. 官方仓库收录的插件
  for (const entry of registry.pluginDataList) {
    const url = entry?.git?.url || ''
    const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i)
    if (!match) continue
    const [, owner, repo] = match
    const key = repoKey(owner, repo)
    if (seen.has(key)) continue
    seen.add(key)

    const info = await client.repo(owner, repo)
    // 上架时间取本仓库中该路径首次出现的提交时间，仅首次计算并长期保留
    if (!state.listedAt?.[key]) {
      const listedAt = await client.firstCommitDate(REGISTRY_OWNER, REGISTRY_NAME, entry?.git?.path || '')
      if (listedAt) state.listedAt = { ...state.listedAt, [key]: listedAt }
    }

    plugins.push({
      plugin: entry.plugin,
      git: entry.git,
      source: 'registry',
      stats: {
        stars: Number(info?.stargazers_count) || 0,
        forks: Number(info?.forks_count) || 0,
        watchers: Number(info?.subscribers_count) || 0,
        license: getLicense(info),
        updatedAt: typeof info?.pushed_at === 'string' ? info.pushed_at : null,
        listedAt: state.listedAt?.[key] || firstSeenAt(state, key),
      },
    })
  }

  // 2. 带有插件标记的社区仓库，无需 PR 即可收录
  const marked = await discoverMarkedRepos(client)
  for (const item of marked) {
    const key = repoKey(item.owner, item.repo)
    if (seen.has(key)) continue

    const collected = await collectRepoPlugin(client, item)
    if (!collected) continue
    seen.add(key)

    plugins.push({
      plugin: collected.plugin,
      git: collected.git,
      source: 'marked',
      stats: {
        ...collected.stats,
        listedAt: firstSeenAt(state, key),
      },
    })
  }

  const output = {
    generatedAt: new Date().toISOString(),
    validTags: registry.validTags,
    plugins,
  }

  fs.writeFileSync(path.join(BASE_DIR, OUTPUT_FILE), `${ JSON.stringify(output, null, 2) }\n`, 'utf-8')
  // 状态文件只保留上架时间，ETag 缓存按运行期临时使用，避免仓库体积膨胀
  fs.writeFileSync(
    path.join(BASE_DIR, STATE_FILE),
    `${ JSON.stringify({ listedAt: state.listedAt || {} }, null, 2) }\n`,
    'utf-8',
  )

  console.log(`collected ${ plugins.length } plugins`)
}

main().catch((error) => {
  console.error('collect failed:', error?.message || error)
  process.exit(1)
})
