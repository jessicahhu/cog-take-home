/**
 * Toolboard persistence endpoint for Azure (Functions v4 + Table Storage).
 *
 * Routes: GET /api/records -> stored records, POST /api/events -> store one record.
 * Env: TABLES_CONNECTION_STRING (storage account connection string).
 */
import { app } from '@azure/functions'
import { TableClient } from '@azure/data-tables'

const TABLE = 'toolboardRecords'
const PARTITION = 'records'

let clientPromise
const table = async () => {
  if (!clientPromise) {
    const client = TableClient.fromConnectionString(process.env.TABLES_CONNECTION_STRING, TABLE)
    clientPromise = client.createTable().catch(() => {}).then(() => client)
  }
  return clientPromise
}

const CORS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN ?? '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

app.http('records', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'records',
  handler: async (request) => {
    if (request.method === 'OPTIONS') return { status: 204, headers: CORS }
    const client = await table()
    const records = []
    for await (const entity of client.listEntities()) {
      records.push({
        id: entity.rowKey,
        blockId: entity.blockId ?? undefined,
        at: entity.at ?? 0,
        source: entity.source ?? 'unknown',
        title: entity.title ?? '',
        details: entity.details ?? undefined,
        amount: entity.amount ?? undefined,
        status: entity.status ?? undefined,
      })
    }
    records.sort((a, b) => a.at - b.at)
    return { status: 200, headers: CORS, jsonBody: records }
  },
})

app.http('events', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'events',
  handler: async (request) => {
    if (request.method === 'OPTIONS') return { status: 204, headers: CORS }
    const record = await request.json()
    if (typeof record.id !== 'string' || typeof record.title !== 'string') {
      return { status: 400, headers: CORS, jsonBody: { message: 'id and title are required' } }
    }
    const client = await table()
    await client.upsertEntity({
      partitionKey: PARTITION,
      rowKey: record.id,
      blockId: record.blockId ?? '',
      at: record.at ?? Date.now(),
      source: record.source ?? 'unknown',
      title: record.title,
      details: record.details ?? '',
      amount: record.amount ?? null,
      status: record.status ?? '',
    })
    return { status: 201, headers: CORS, jsonBody: { ok: true } }
  },
})
