// Resume files -> S3, session history -> DynamoDB (partition key: userId, sort key: createdAt).
// Falls back to memory when AWS_BUCKET / DDB_TABLE are not set, so it runs locally.
const mem = { sessions: [], files: new Map() };
let s3, ddb, cmds;

if (process.env.AWS_BUCKET && process.env.DDB_TABLE) {
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
  s3 = new S3Client({});
  ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  cmds = { PutObjectCommand, PutCommand, QueryCommand };
}

async function saveResume(userId, text) {
  const key = `${userId}/${Date.now()}.txt`;
  if (s3) await s3.send(new cmds.PutObjectCommand({ Bucket: process.env.AWS_BUCKET, Key: key, Body: text }));
  else mem.files.set(key, text);
  return key;
}

async function saveSession(userId, session) {
  const item = { userId, createdAt: new Date().toISOString(), ...session };
  if (ddb) await ddb.send(new cmds.PutCommand({ TableName: process.env.DDB_TABLE, Item: item }));
  else mem.sessions.push(item);
  return item;
}

async function listSessions(userId) {
  if (ddb) {
    const r = await ddb.send(new cmds.QueryCommand({
      TableName: process.env.DDB_TABLE,
      KeyConditionExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': userId },
      ScanIndexForward: false, Limit: 20,
    }));
    return r.Items;
  }
  return mem.sessions.filter((s) => s.userId === userId).reverse().slice(0, 20);
}

module.exports = { saveResume, saveSession, listSessions };
