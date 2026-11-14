// 轻量 GitHub API 客户端：带并发控制、请求计数、ETag 缓存与限流重试
import { API_BASE, LIMITS } from './config.js'

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export interface CollectState {
  etags?: Record<string, string>
  etagBodies?: Record<string, string>
  rawKeys?: Record<string, boolean>
  listedAt?: Record<string, string>
}

type RequestKind = 'core' | 'search' | 'code'

interface RequestOptions {
  kind?: RequestKind
  accept?: string
  allow404?: boolean
  raw?: boolean
}

interface MetaResult {
  data: any
  link: string
}

export class GitHubClient {
  private token: string
  private state: CollectState
  // 按接口类型分别计数与限速，避免用满其中一种配额
  private counters: Record<RequestKind, number> = { core: 0, search: 0, code: 0 }
  private lastRequestAt: Record<RequestKind, number> = { core: 0, search: 0, code: 0 }
  private inFlight = 0
  private queue: Array<() => void> = []

  constructor({ token, state }: { token?: string, state?: CollectState } = {}) {
    this.token = token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || ''
    this.state = state || { etags: {} }
  }

  headers(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'fba-marketplace-collector',
      ...extra,
    }
    if (this.token) headers.authorization = `Bearer ${ this.token }`
    return headers
  }

  private async throttle(kind: RequestKind): Promise<void> {
    const interval =
      kind === 'code'
        ? LIMITS.minCodeIntervalMs
        : kind === 'search'
          ? LIMITS.minSearchIntervalMs
          : LIMITS.minIntervalMs
    const gap = Date.now() - this.lastRequestAt[kind]
    if (gap < interval) await sleep(interval - gap)
    this.lastRequestAt[kind] = Date.now()
  }

  // 简易并发闸门，避免瞬时打满 API
  private async acquire(kind: RequestKind): Promise<void> {
    const limit = kind === 'search' ? LIMITS.searchConcurrency : LIMITS.coreConcurrency
    if (this.inFlight >= limit) await new Promise<void>(resolve => this.queue.push(resolve))
    this.inFlight += 1
  }

  private release(): void {
    this.inFlight -= 1
    const next = this.queue.shift()
    if (next) next()
  }

  async request(path: string, { kind = 'core', accept, allow404 = false, raw = false }: RequestOptions = {}): Promise<any> {
    if (kind === 'core' && this.counters.core >= LIMITS.maxCoreRequests) return null
    if (kind === 'search' && this.counters.search >= LIMITS.maxSearchRequests) return null
    if (kind === 'code' && this.counters.code >= LIMITS.maxCodeRequests) return null

    const etagKey = `${ kind }:${ path }`
    // 检索类接口的响应体积大且变化快，不做 ETag 缓存
    const cacheable = kind === 'core'

    await this.acquire(kind)
    try {
      let attempt = 0
      while (attempt <= LIMITS.maxRetries) {
        await this.throttle(kind)
        const headers = this.headers(accept ? { accept } : {})
        const etag = cacheable ? this.state.etags?.[etagKey] : undefined
        if (etag) headers['if-none-match'] = etag

        let res: Response
        try {
          res = await fetch(`${ API_BASE }${ path }`, { headers })
        } catch {
          // 网络抖动时退避重试
          attempt += 1
          if (attempt > LIMITS.maxRetries) return null
          await sleep(1000 * 2 ** attempt)
          continue
        }

        this.counters[kind] += 1

        // 命中 ETag 时复用上次响应体，避免重复请求浪费配额
        if (res.status === 304) {
          const cached = this.state.etagBodies?.[etagKey]
          if (cached !== undefined) {
            return this.state.rawKeys?.[etagKey] ? cached : JSON.parse(cached)
          }
          // 缓存已被裁剪，丢弃 ETag 后按普通请求重试
          if (this.state.etags) delete this.state.etags[etagKey]
          attempt += 1
          if (attempt > LIMITS.maxRetries) return null
          continue
        }

        if (res.status === 404) {
          if (allow404) return null
          return null
        }

        // 命中限流或服务端错误时退避重试
        if (res.status === 403 || res.status === 429 || res.status >= 500) {
          const remaining = res.headers.get('x-ratelimit-remaining')
          const reset = res.headers.get('x-ratelimit-reset')
          const isRateLimited = remaining === '0'
          if (!isRateLimited && res.status !== 429 && res.status < 500) break

          attempt += 1
          if (attempt > LIMITS.maxRetries) return null

          if (isRateLimited && reset) {
            const waitMs = Math.max(1000, Number(reset) * 1000 - Date.now())
            await sleep(Math.min(waitMs, 60000))
          } else {
            await sleep(1000 * 2 ** attempt)
          }
          continue
        }

        if (!res.ok) return null

        const newEtag = res.headers.get('etag')
        if (newEtag && cacheable) {
          this.state.etags = this.state.etags || {}
          this.state.etags[etagKey] = newEtag
        }

        if (raw) {
          const text = await res.text()
          if (cacheable) {
            this.state.etagBodies = this.state.etagBodies || {}
            this.state.rawKeys = this.state.rawKeys || {}
            this.state.etagBodies[etagKey] = text
            this.state.rawKeys[etagKey] = true
          }
          return text
        }

        const json = await res.json()
        if (cacheable) {
          this.state.etagBodies = this.state.etagBodies || {}
          this.state.rawKeys = this.state.rawKeys || {}
          this.state.etagBodies[etagKey] = JSON.stringify(json)
          this.state.rawKeys[etagKey] = false
        }
        return json
      }
      return null
    } finally {
      this.release()
    }
  }

  repo(owner: string, name: string): Promise<any> {
    return this.request(`/repos/${ owner }/${ name }`)
  }

  // 仓库标签列表，用于识别 fba-plugin 标记
  async repoLabels(owner: string, name: string): Promise<string[]> {
    const labels = await this.request(`/repos/${ owner }/${ name }/labels?per_page=100`)
    if (!Array.isArray(labels)) return []
    return labels.map(item => String(item?.name || '').toLowerCase())
  }

  async repoTopics(owner: string, name: string): Promise<string[]> {
    const repo = await this.repo(owner, name)
    return Array.isArray(repo?.topics) ? repo.topics.map((t: string) => String(t).toLowerCase()) : []
  }

  // 主题检索是唯一可靠的仓库级标记检索方式（label: 检索在仓库搜索中不生效）
  async searchByTopic(topic: string): Promise<any[]> {
    const data = await this.request(
      `/search/repositories?q=topic:${ encodeURIComponent(topic) }&per_page=100`,
      { kind: 'search' },
    )
    return Array.isArray(data?.items) ? data.items : []
  }

  // 通过代码检索发现社区插件仓库
  // 只保留仓库根目录下的 plugin.toml，子目录中的同名文件不是有效的 fba 插件仓库
  async searchCode(query: string, page = 1): Promise<any[]> {
    const data = await this.request(
      `/search/code?q=${ encodeURIComponent(query) }&per_page=100&page=${ page }`,
      { kind: 'code' },
    )
    if (!Array.isArray(data?.items)) return []
    return data.items.filter((item: any) => item?.path === 'plugin.toml')
  }

  // 读取仓库中的文件内容
  async rawFile(owner: string, name: string, filePath: string, ref?: string): Promise<string | null> {
    const query = ref ? `?ref=${ encodeURIComponent(ref) }` : ''
    return this.request(`/repos/${ owner }/${ name }/contents/${ filePath }${ query }`, {
      kind: 'core',
      accept: 'application/vnd.github.raw',
      raw: true,
    })
  }

  // 路径首次出现的提交时间，用于计算插件的上架时间
  // commits 接口按时间倒序返回，需要翻到最后一页才是最早的一次提交
  async firstCommitDate(owner: string, name: string, targetPath: string): Promise<string | null> {
    const query = `path=${ encodeURIComponent(targetPath) }&per_page=1`
    const res = await this.requestWithMeta(
      `/repos/${ owner }/${ name }/commits?${ query }`,
      { kind: 'core', allow404: true },
    )
    if (!res) return null

    // 从 Link 头中取出最后一页
    const link = res.link || ''
    const lastMatch = link.match(/[?&]page=(\d+)>; rel="last"/)
    const lastPage = lastMatch ? Number(lastMatch[1]) : 1

    const commits =
      lastPage > 1
        ? await this.request(
            `/repos/${ owner }/${ name }/commits?${ query }&page=${ lastPage }`,
            { kind: 'core', allow404: true },
          )
        : res.data

    if (!Array.isArray(commits) || !commits.length) return null
    const date = commits[commits.length - 1]?.commit?.committer?.date
    return typeof date === 'string' ? date : null
  }

  // 返回响应体与 Link 头的组合，供需要翻页的场景使用
  private async requestWithMeta(path: string, options: { kind?: RequestKind, allow404?: boolean } = {}): Promise<MetaResult | null> {
    const kind = options.kind || 'core'
    await this.acquire(kind)
    try {
      let attempt = 0
      while (attempt <= LIMITS.maxRetries) {
        await this.throttle(kind)
        const res = await fetch(`${ API_BASE }${ path }`, { headers: this.headers() })

        this.counters[kind] += 1

        if (res.status === 404) return null
        if (res.status === 403 || res.status === 429 || res.status >= 500) {
          attempt += 1
          if (attempt > LIMITS.maxRetries) return null
          await sleep(1000 * 2 ** attempt)
          continue
        }
        if (!res.ok) return null

        return { data: await res.json(), link: res.headers.get('link') || '' }
      }
      return null
    } finally {
      this.release()
    }
  }
}
