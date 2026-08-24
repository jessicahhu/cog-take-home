# Persisting Toolboard data in the cloud

Toolboard runs entirely in the browser, so it never holds cloud credentials. To store form
submissions durably you deploy a small HTTPS endpoint and point the builder's **Backend**
selector at it (`AWS — API Gateway + Lambda` or `Azure — Functions`).

## Endpoint contract

| Method | Path       | Behaviour                                                                 |
| ------ | ---------- | ------------------------------------------------------------------------- |
| `GET`  | `/records` | Return a JSON array of previously stored records; Toolboard hydrates blocks with them on run. |
| `POST` | `/events`  | Store one record. Toolboard sends the record body plus the emitting `blockId`. |

Record shape:

```json
{
  "id": "rec-1717171717-3",
  "blockId": "block-4",
  "at": 1717171717000,
  "source": "Refund Action",
  "title": "Acme Inc",
  "details": "Reason: duplicate charge",
  "amount": 42.5,
  "status": "pending"
}
```

`blockId` is what ties a stored record back to the block that produced it — keep it, and
`GET /records` will repopulate the tool after a reload.

Both handlers must return CORS headers (`Access-Control-Allow-Origin`, plus an `OPTIONS`
preflight response); otherwise the browser blocks the call and Toolboard falls back to
in-memory data with an "API unreachable" banner.

## AWS

`aws-lambda/handler.mjs` is a single Lambda behind an HTTP API (API Gateway v2) that writes
to DynamoDB.

```bash
aws dynamodb create-table --table-name toolboard-records \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH --billing-mode PAY_PER_REQUEST

# deploy handler.mjs as a Node.js 20 Lambda with TABLE_NAME=toolboard-records,
# then create an HTTP API with routes GET /records and POST /events,
# and enable CORS for your Toolboard origin.
```

Give the Lambda role `dynamodb:PutItem` and `dynamodb:Scan` on that table only.

## Azure

`azure-function/` is an Azure Functions v4 (Node.js) app that writes to Azure Table Storage.

```bash
func azure functionapp publish <your-app>
az functionapp config appsettings set -n <your-app> -g <group> \
  --settings TABLES_CONNECTION_STRING="<connection string>"
az functionapp cors add -n <your-app> -g <group> --allowed-origins https://your-toolboard-host
```

The function URL (`https://<your-app>.azurewebsites.net/api`) is what you paste into the
Backend selector. Keep the connection string in app settings / Key Vault — never in the
browser or this repo.
