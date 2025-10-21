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
                role: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
} as const;
