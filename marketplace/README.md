# 插件市场数据

`plugins-market.json` 由 `marketplace/collect.ts` 生成，供文档站点 <https://github.com/fastapi-practices/fastapi_best_architecture_docs> 的插件市场页面在运行时读取。

## 数据来源

1. 本仓库的 `plugins-data.json`（PR 合入方式收录的官方插件）
2. GitHub 上带有 `fba-plugin` 主题或同名标签的仓库（无需 PR 即可收录）

## 生成方式

```bash
pnpm collect:marketplace
```

需要 `GITHUB_TOKEN` 环境变量。CI 由 `.github/workflows/collect-marketplace.yml` 每小时执行一次，并在插件清单变更后立即执行。

## 文件说明

| 文件 | 说明 |
| --- | --- |
| `plugins-market.json` | 站点读取的市场数据，包含插件信息与仓库统计（stars、许可证、更新时间、收录时间） |
| `marketplace-state.json` | 采集状态，保存每个插件的首次收录时间，丢失会导致上架时间被重置 |

## 字段结构

```jsonc
{
  "generatedAt": "2026-11-14T08:00:00.000Z",
  "validTags": ["ai", "mcp", "agent"],
  "plugins": [
    {
      "plugin": { "summary": "AI", "version": "1.0.1", "description": "...", "author": "wu-clan", "tags": ["ai"] },
      "git": { "path": "plugins/ai", "url": "https://github.com/fastapi-practices/ai.git", "branch": "master" },
      // registry 为官方仓库收录，marked 为主题/标签收录
      "source": "registry",
      "stats": { "stars": 4, "forks": 2, "watchers": 1, "license": null, "updatedAt": "...", "listedAt": "..." }
    }
  ]
}
```
