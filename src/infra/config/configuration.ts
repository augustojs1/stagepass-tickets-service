export const configuration = () => ({
  NODE_ENV: process.env.NODE_ENV,
  port: parseInt(process.env.PORT, 10) || 8080,
  database: {
    tag: process.env.DB_TAG,
    url: process.env.DB_URL,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  },
  aws: {
    region: process.env.AWS_REGION,
    s3: {
      bucket: process.env.AWS_S3_BUCKET,
    },
    sqs: {
      tickets_generate_queue_url: process.env.AWS_SQS_TICKETS_QUEUE_URL,
      emails_queue_url: process.env.AWS_SQS_EMAIL_QUEUE_URL,
    },
  },
});
