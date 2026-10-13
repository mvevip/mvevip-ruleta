const serverless = require('serverless-http');
const { app } = require('./server');

let isDbInitialized = false;
const serverlessHandler = serverless(app);

// Handler para AWS Lambda a través de API Gateway
module.exports.handler = async (event, context) => {
  if (!isDbInitialized) {
    try {
      const { checkConnection } = require('./config/db');
      await checkConnection();
      isDbInitialized = true;
    } catch (e) {
      console.error('[Lambda] Error inicializando DB:', e.message);
    }
  }
  return serverlessHandler(event, context);
};
