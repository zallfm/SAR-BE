export const uarPicSchema = {
  body: {
    type: 'object',
    required: [
      'PIC_NAME',
      'DIVISION_ID',
      'MAIL',
      'CREATED_BY',
      'CREATED_DT'
    ],
    properties: {
      ID: { type: 'number' },
      PIC_NAME: { type: 'string', maxLength: 30 },
      DIVISION_ID: { type: 'number' },
      MAIL: { type: 'string', maxLength: 50 },
      CREATED_BY: { type: 'string', maxLength: 20 },
      CREATED_DT: { type: 'string', format: 'date-time' },
      CHANGED_BY: { type: 'string', maxLength: 20 },
      CHANGED_DT: { type: 'string', format: 'date-time' }
    },
    additionalProperties: false
  }
} as const


export const initialUarPic = [
  {
    ID: 1,
    PIC_NAME: 'Hesti',
    DIVISION_ID: 1,
    MAIL: 'hesti@toyota.co.id',
    CREATED_BY: 'system',
    CREATED_DT: new Date().toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  {
    ID: 2,
    PIC_NAME: 'Budi',
    DIVISION_ID: 2,
    MAIL: 'budi@toyota.co.id',
    CREATED_BY: 'system',
    CREATED_DT: new Date().toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  },
  {
    ID: 3,
    PIC_NAME: 'Citra',
    DIVISION_ID: 3,
    MAIL: 'citra@toyota.co.id',
    CREATED_BY: 'system',
    CREATED_DT: new Date().toISOString(),
    CHANGED_BY: null,
    CHANGED_DT: null
  }
] as const

