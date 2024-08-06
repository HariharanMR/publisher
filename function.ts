import topicGenerate from "./config/constant_function";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import "dotenv/config";
import { ENV } from "./config/constant";
import moment from "moment";
import fs from "fs";
import path from 'path';

const PROTO_FILE: any = ENV.PROTO_FILE
const PROJECT_ID: any = process.env.PROJECT_ID;

const TOPIC_NAME: any = process.env.TOPIC_NAME;
const SERVER_URL: any = ENV.SERVER_URL;
const MAX_RECEIVE_MESSAGE_LENGTH: number = ENV.MAX_RECEIVE_MESSAGE_LENGTH;

// Load the protobuf dynamically
const packageDefinition = protoLoader.loadSync(PROTO_FILE, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// Read the SSL/TLS credentials from environment variables
const CLIENT_CERT_PATH = path.resolve(process.env.CLIENT_CERT as string);
const CLIENT_KEY_PATH = path.resolve(process.env.CLIENT_KEY as string);
const CA_CERT_PATH = path.resolve(process.env.CA_CERT as string);

const clientCert = fs.readFileSync(CLIENT_CERT_PATH);
const clientKey = fs.readFileSync(CLIENT_KEY_PATH);
const caCert = fs.readFileSync(CA_CERT_PATH);


// Load the service definition
const protoDescriptor: any = grpc.loadPackageDefinition(packageDefinition).publish;

// Publish the topics
const getMethod = async (req: any, res: any) => {
  try {
    res(null, { statusCode: 200, status: "success", message: "First Method" });
  } catch (error: any) {
    res(null, { statusCode: 500, status: 'error', message: error.message, });
  }
}

// Health Check Function
const healthCheck = async (req: any, res: any) => {
  try {
    res(null, { statusCode: 200, status: "success", message: "Service Ok" });
  } catch (error: any) {
    res(null, { statusCode: 500, status: 'error', message: error.message });
  }
}

// Publish the topics
const uploadExcelMethod = async (req: any, res: any) => {
  try {
    // Create the topic
    const topic: any = await topicGenerate(PROJECT_ID, TOPIC_NAME);
    req.request.uploadDate = moment.utc().toISOString();
    const files = Buffer.from(JSON.stringify(req.request));

    if (files) {
      // Publish the request data using topic
      await topic.publish(files);
      res(null, { statusCode: 200, status: "success", message: "File uploaded successfully" });
    } else {
      res(null, { statusCode: 400, status: 'error', message: 'File is invalid', });
    }
  } catch (error: any) {
    res(null, { statusCode: 500, status: 'error', message: error.message, });
  }
}

// Create a gRPC server
const server = new grpc.Server({
  'grpc.max_receive_message_length': -1,
  'grpc.max_send_message_length': -1
});
server.addService(protoDescriptor.publishService.service, {
  uploadExcelMethod: uploadExcelMethod,
  getMethod: getMethod,
  healthCheck: healthCheck
});

// GRPC server starting
// server.bindAsync(SERVER_URL, grpc.ServerCredentials.createSsl(caCert, [{
//   cert_chain: clientCert,
//   private_key: clientKey
// }], true), (error: any, port: any) => {
//   if (error) {
//     console.error(`Server failed to start: ${error.message}`);
//     return;
//   }
//   console.log(`Server running at ${SERVER_URL}`);
//   server.start();
// });
const serverCredentials = grpc.ServerCredentials.createSsl(
  caCert, // CA certificate
  [{
    cert_chain: clientCert, // Server certificate
    private_key: clientKey // Server private key
  }],
  false // Require client certificate
);

server.bindAsync(SERVER_URL, serverCredentials, (error: any, port: any) => {
  if (error) {
    console.error(`Server failed to start: ${error.message}`);
    return;
  }
  console.log(`Server running at ${SERVER_URL}`);
  console.log(`Port ${port}`);
  server.start();
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal');
  server.tryShutdown((error) => {
      if (error) {
          console.error('Server shutdown failed:', error);
      } else {
          console.log('Server shut down gracefully');
      }
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT signal');
  server.tryShutdown((error) => {
      if (error) {
          console.error('Server shutdown failed:', error);
      } else {
          console.log('Server shut down gracefully');
      }
  });
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});