# AI Interview Prep

Node.js + Express app that generates mock interview questions and resume feedback with an LLM API.
Resumes go to S3, session history to DynamoDB (partition key `userId`, sort key `createdAt`).
Without AWS variables it runs fully in memory. If the LLM fails, it retries twice, then falls back to a built-in question bank and a rule-based resume check.

## Run
    npm install
    export ANTHROPIC_API_KEY=...        # optional: fallback mode works without it
    npm start                           # http://localhost:3000
    npm test

## AWS (optional)
    export AWS_BUCKET=my-bucket DDB_TABLE=interview-sessions AWS_REGION=ap-south-1
DynamoDB table: partition key `userId` (String), sort key `createdAt` (String).
Deploy on EC2: install Node 20, clone, `npm ci --omit=dev`, run with pm2, attach an IAM role with S3 PutObject and DynamoDB PutItem/Query.
