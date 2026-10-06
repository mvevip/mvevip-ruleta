const serverless = require('serverless-http');
const { app } = require('./server');

// Handler para AWS Lambda a través de API Gateway
module.exports.handler = serverless(app);
