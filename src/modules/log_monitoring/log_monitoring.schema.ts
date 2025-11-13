export const listLogsSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
      status: { type: 'string', enum: ['Success', 'Error', 'Warning', 'InProgress'] },
      module: { type: 'string' },
      userId: { type: 'string' },
      q: { type: 'string' },
      startDate: { type: 'string' }, // "DD-MM-YYYY HH:mm:ss"
      endDate: { type: 'string' },
      sortBy: { type: 'string', enum: ['NO', 'START_DATE', 'END_DATE'], default: 'START_DATE' },
      order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
    },
    additionalProperties: false
  }
} as const;

export const getLogSchema = {
  params: {
    type: 'object',
    properties: {
      processId: { type: 'string' }
    },
    required: ['processId']
  }
} as const;

export const listDetailsSchema = {
  params: {
    type: 'object',
    properties: {
      processId: { type: 'string' }
    },
    required: ['processId']
  },
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 200, default: 20 }
    },
    additionalProperties: false
  }
} as const;

export const exportExcelSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 1000, default: 1000 }, // default besar biar semua kebawa
      status: { type: 'string', enum: ['Success', 'Error', 'Warning', 'InProgress'] },
      module: { type: 'string' },
      userId: { type: 'string' },
      q: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      sortBy: { type: 'string', enum: ['NO', 'START_DATE', 'END_DATE'], default: 'START_DATE' },
      order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
      includeDetails: { type: 'boolean', default: false } // kalau true, bikin sheet LogDetails juga
    },
    additionalProperties: false
  }
} as const;

