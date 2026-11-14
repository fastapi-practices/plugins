// 插件市场数据采集配置

// 官方插件仓库自身，收录数据来自同仓库的 plugins-data.json
export const REGISTRY_REPO = 'fastapi-practices/plugins'
export const REGISTRY_BRANCH = 'master'

// 收录标记：仓库拥有该主题或同名标签，即视为「主题收录」插件
export const MARKERS = ['fba-plugin']

// GitHub API
export const API_BASE = 'https://api.github.com'
export const RAW_BASE = 'https://raw.githubusercontent.com'

// 限流控制：搜索类接口配额远低于核心接口，按接口类型分别收紧
export const LIMITS = {
  // 核心接口并发数
  coreConcurrency: 4,
  // 搜索类接口并发数
  searchConcurrency: 1,
  // 单次运行内最多发起的核心请求数，超出即跳过本轮
  maxCoreRequests: 900,
  // 单次运行内最多发起的仓库搜索请求数
  maxSearchRequests: 12,
  // 单次运行内最多发起的代码搜索请求数
  maxCodeRequests: 12,
  // 两次核心请求之间的最小间隔（毫秒）
  minIntervalMs: 120,
  // 两次仓库搜索请求之间的最小间隔（毫秒）
  // 仓库搜索配额为 30 次/分钟，远低于核心接口，需单独限速
  minSearchIntervalMs: 2200,
  // 两次代码搜索请求之间的最小间隔（毫秒）
  // 代码搜索配额仅为 10 次/分钟，必须单独限速
  minCodeIntervalMs: 7000,
  // 单次运行内最多核对的候选仓库数量
  maxCandidates: 200,
  // 命中二级限流后的重试次数
  maxRetries: 3,
}

// 采集结果文件，供文档站点运行时读取
export const OUTPUT_FILE = 'plugins-market.json'
// 采集状态：ETag 缓存与插件首次收录时间
export const STATE_FILE = 'marketplace-state.json'
