export const loginSchema = {
  body: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: { type: 'string', minLength: 1 },
      password: { type: 'string', minLength: 1 }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      required: ['code', 'message', 'requestId', 'data'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        requestId: { type: 'string' },
        data: {
          type: 'object',
          required: ['token', 'expiresIn', 'user'],
          properties: {
            token: { type: 'string' },
            expiresIn: { type: 'number' },
            user: {
              type: 'object',
              required: ['username', 'name', 'role'],
              properties: {
                username: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
                divisionId: { type: 'number' },
                departmentId: { type: 'number' },
                noreg: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
} as const;

export const getMenuSchema = {
  querystring: {
    type: 'object',
    properties: { username: { type: 'string' } },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      required: ['statusCode', 'message', 'data'],
      properties: {
        statusCode: { type: 'number' },
        message: { type: 'string' },
        data: { type: 'array' } // tree menu (biarkan generic)
      }
    }
  }
} as const;

export const getProfileSchema = {
  querystring: {
    type: 'object',
    properties: { username: { type: 'string' } },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      required: ['statusCode', 'message', 'data'],
      properties: {
        statusCode: { type: 'number' },
        message: { type: 'string' },
        data: {
          type: 'object',
          required: ['user', 'features', 'functions', 'roles'],
          properties: {
            user: {
              type: 'object',
              required: ['username', 'id'],
              properties: {
                username: { type: 'string' },
                name: { type: 'string' },
                id: { type: 'string' },
                regNo: { type: ['string', 'null'] },
                company: { type: ['string', 'null'] },
                firstName: { type: ['string', 'null'] },
                lastName: { type: ['string', 'null'] },
                birthDate: { type: ['string', 'null'] },
                address: { type: ['string', 'null'] },
                companyInfo: {
                  type: ['object', 'null'],
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: ['string', 'null'] }
                  },
                  additionalProperties: true
                }
              },
              additionalProperties: true
            },
            features: { type: 'array', items: { type: 'string' } },
            functions: { type: 'array', items: { type: 'string' } },
            roles: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    }
  }
} as const;

