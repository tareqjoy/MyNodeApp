import express from 'express';

const appport = process.env.PORT || 5002;
const mongouser = process.env.MONGODB_USER || "admin";
const mongoppass = process.env.MONGODB_PASS || "admin";
const mongoport = process.env.MONGODB_PORT || 27017;
const mongohost = process.env.MONGODB_HOST || "127.0.0.1";
const mongodatabase = process.env.MONGODB_DATABASE || "mydatabase";
const api_path_root = process.env.API_PATH_ROOT || '/v1/folower';

// Create an instance of the express application
const app=express();
const bodyParser = require("body-parser")
// Specify a port number for the server
const port= process.env.PORT || 5003;

import { router } from "./routes/follow";

class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode || 500;
  }
}

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(api_path_root, router);

// Start the server and listen to the port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


module.exports = app