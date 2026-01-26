export const validTags = [
  "ai",
  "mcp",
  "agent",
  "auth",
  "storage",
  "notification",
  "task",
  "payment",
  "other"
] as const
export const validDatabases = [
  "mysql",
  "postgresql"
] as const

export type ValidTag = typeof validTags[number]
export type ValidDatabase = typeof validDatabases[number]

export interface PluginTomlPlugin {
  icon: string
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

export const pluginDataList: PluginData[] = [
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "AI 工具",
      "version": "0.0.1",
      "description": "为系统提供 AI 赋能",
      "author": "wu-clan"
    },
    "git": {
      "path": "plugins/ai",
      "url": "https://github.com/fastapi-practices/ai.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "API Key",
      "version": "0.0.1",
      "description": "用户自定义 API Key 管理，支持生成、管理和使用 API Key 进行接口认证",
      "author": "wu-clan"
    },
    "git": {
      "path": "plugins/api_key",
      "url": "https://github.com/fastapi-practices/api_key.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "Casbin RBAC",
      "version": "0.0.1",
      "description": "基于 Casbin 实现的 RBAC 访问控制",
      "author": "wu-clan",
      "tags": [
        "auth"
      ],
      "database": [
        "mysql"
      ]
    },
    "git": {
      "path": "plugins/casbin_rbac",
      "url": "https://github.com/fastapi-practices/casbin_rbac.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "Casdoor SSO",
      "version": "0.0.3",
      "description": "通过 Casdoor 实现 SSO 单点登录集成",
      "author": "wu-clan",
      "tags": [
        "auth"
      ],
      "database": [
        "mysql"
      ]
    },
    "git": {
      "path": "plugins/casdoor_sso",
      "url": "https://github.com/fastapi-practices/casdoor_sso.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "LDAP",
      "version": "0.0.1",
      "description": "通过 LDAP 的方式登录系统",
      "author": "DAVID"
    },
    "git": {
      "path": "plugins/ldap_auth",
      "url": "https://github.com/dividduang/ldap_auth.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "MCP",
      "version": "0.0.3",
      "description": "MCP 服务器管理",
      "author": "wu-clan"
    },
    "git": {
      "path": "plugins/mcp",
      "url": "https://github.com/fastapi-practices/mcp.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "OSS",
      "version": "0.0.5",
      "description": "阿里云 OSS 文件上传",
      "author": "wu-clan",
      "tags": [
        "notification"
      ],
      "database": [
        "mysql"
      ]
    },
    "git": {
      "path": "plugins/oss",
      "url": "https://github.com/fastapi-practices/oss.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "S3",
      "version": "0.0.1",
      "description": "提供兼容 S3 协议的对象存储能力",
      "author": "wu-clan"
    },
    "git": {
      "path": "plugins/s3",
      "url": "https://github.com/fastapi-practices/s3.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "腾讯云短信服务",
      "version": "0.0.2",
      "description": "使用腾讯云短信服务发送短信验证码",
      "author": "ranyong"
    },
    "git": {
      "path": "plugins/sms",
      "url": "https://github.com/RanY-Luck/sms.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "Task",
      "version": "0.0.1",
      "description": "基于 taskiq 的异步任务队列插件",
      "author": "wu-clan",
      "tags": [
        "task"
      ],
      "database": [
        "mysql"
      ]
    },
    "git": {
      "path": "plugins/task",
      "url": "https://github.com/fastapi-practices/task.git",
      "branch": "master"
    }
  }
]
