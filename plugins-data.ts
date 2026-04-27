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
      "summary": "AI",
      "version": "0.1.2",
      "description": "为系统提供 AI 赋能",
      "author": "wu-clan",
      "tags": [
        "agent",
        "ai",
        "mcp"
      ],
      "database": [
        "mysql",
        "postgresql"
      ]
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
      "summary": "AI UI",
      "version": "0.1.0",
      "description": "为系统提供 AI 对话、话题历史、快捷短语、供应商、模型和 MCP 管理能力",
      "author": "wu-clan",
      "tags": [
        "ai",
        "mcp",
        "agent"
      ]
    },
    "git": {
      "path": "plugins/ai_ui",
      "url": "https://github.com/fastapi-practices/ai_ui.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "API Key",
      "version": "0.0.3",
      "description": "用户自定义 API Key 管理，支持生成、管理和使用 API Key 进行接口认证",
      "author": "wu-clan",
      "tags": [
        "auth"
      ],
      "database": [
        "mysql",
        "postgresql"
      ]
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
      "summary": "API Key UI",
      "version": "0.0.1",
      "description": "API Key 前端管理插件，提供列表、搜索、新增、编辑、启停与复制能力",
      "author": "yzbf-lin",
      "tags": [
        "auth"
      ]
    },
    "git": {
      "path": "plugins/api_key_ui",
      "url": "https://github.com/yzbf-lin/api_key_ui.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "Casbin RBAC",
      "version": "0.0.2",
      "description": "基于 Casbin 实现的 RBAC 访问控制",
      "author": "wu-clan",
      "tags": [
        "auth"
      ],
      "database": [
        "mysql",
        "postgresql"
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
      "version": "0.0.4",
      "description": "通过 Casdoor 实现 SSO 单点登录集成",
      "author": "wu-clan",
      "tags": [
        "auth"
      ],
      "database": [
        "mysql",
        "postgresql"
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
      "author": "wu-clan",
      "tags": [
        "ai",
        "mcp"
      ],
      "database": [
        "mysql",
        "postgresql"
      ]
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
        "storage"
      ],
      "database": [
        "mysql",
        "postgresql"
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
      "author": "wu-clan",
      "tags": [
        "storage"
      ],
      "database": [
        "mysql",
        "postgresql"
      ]
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
      "version": "0.0.2",
      "description": "基于 taskiq 的异步任务队列插件",
      "author": "wu-clan",
      "tags": [
        "task"
      ],
      "database": [
        "mysql",
        "postgresql"
      ]
    },
    "git": {
      "path": "plugins/task",
      "url": "https://github.com/fastapi-practices/task.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "多租户",
      "version": "0.0.1",
      "description": "为系统提供多租户能力，包括租户管理、套餐管理、行级数据隔离",
      "author": "wu-clan",
      "tags": [
        "other"
      ],
      "database": [
        "mysql",
        "postgresql"
      ]
    },
    "git": {
      "path": "plugins/tenant",
      "url": "https://github.com/fastapi-practices/tenant.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "workflow审批流",
      "version": "0.1.0",
      "description": "基于 SnakerFlow 扩展的后端审批流引擎，提供流程定义管理、任务流转控制与实例状态维护功能",
      "author": "shj366",
      "tags": [
        "task",
        "notification",
        "other"
      ],
      "database": [
        "mysql"
      ]
    },
    "git": {
      "path": "plugins/wf",
      "url": "https://github.com/shj366/workflow.git",
      "branch": "main"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "workflow审批流UI",
      "version": "0.1.0",
      "description": "基于 snakerflow-designer-vue 构建的前端审批流引擎，提供可视化流程设计与展示能力",
      "author": "shj366",
      "tags": [
        "task",
        "notification",
        "other"
      ]
    },
    "git": {
      "path": "plugins/wf_ui",
      "url": "https://github.com/shj366/workflow_ui.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "企业审批流",
      "version": "0.1.0",
      "description": "流程定义、审批实例、审批任务与消息通知",
      "author": "Albert",
      "tags": [
        "task",
        "notification"
      ],
      "database": [
        "mysql",
        "postgresql"
      ]
    },
    "git": {
      "path": "plugins/workflow",
      "url": "https://github.com/eginner01/workflow.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "Workflow UI",
      "version": "0.1.0",
      "description": "企业审批流前端页面、流程设计器与申请侧视图",
      "author": "Albert",
      "tags": [
        "task",
        "notification"
      ]
    },
    "git": {
      "path": "plugins/workflow_ui",
      "url": "https://github.com/eginner01/workflow_ui.git",
      "branch": "main"
    }
  }
]
