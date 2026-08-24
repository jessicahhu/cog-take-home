/**
 * Toolboard persistence endpoint for AWS (Lambda + DynamoDB, HTTP API v2 payload).
 *
 * Routes: GET /records -> stored records, POST /events -> store one record.
 * Env: TABLE_NAME (DynamoDB table with string partition key `id`).
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.TABLE_NAME

const CORS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN ?? '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

const reply = (statusCode, body) => ({ statusCode, headers: CORS, body: JSON.stringify(body) })

export const handler = async (event) => {
  const method = event.requestContext?.http?.method ?? 'GET'
  const path = event.rawPath ?? '/'

  if (method === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }

  if (method === 'GET' && path.endsWith('/records')) {
    const result = await db.send(new ScanCommand({ TableName: TABLE_NAME }))
    const records = (result.Items ?? []).sort((a, b) => (a.at ?? 0) - (b.at ?? 0))
    return reply(200, records)
  }

  if (method === 'POST' && path.endsWith('/events')) {
    const record = JSON.parse(event.body ?? '{}')
    if (typeof record.id !== 'string' || typeof record.title !== 'string') {
      return reply(400, { message: 'id and title are required' })
    }
    await db.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          id: record.id,
          blockId: record.blockId ?? null,
          at: record.at ?? Date.now(),
          source: record.source ?? 'unknown',
          title: record.title,
          details: record.details ?? null,
          amount: record.amount ?? null,
          status: record.status ?? null,
        },
      }),
    )
    return reply(201, { ok: true })
  }

  return reply(404, { message: 'Not found' })
}
