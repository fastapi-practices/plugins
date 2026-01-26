// Data sync from: https://github.com/fastapi-practices/fastapi_best_architecture/blob/master/backend/plugin/validator.py
export const VALID_TAGS = [
    "ai",
    "mcp",
    "agent",
    "auth",
    "storage",
    "notification",
    "task",
    "payment",
    "other",
] as const

export const VALID_DATABASES = ['mysql', 'postgresql'] as const

export type ValidTag = typeof VALID_TAGS[number]
export type ValidDatabase = typeof VALID_DATABASES[number]
