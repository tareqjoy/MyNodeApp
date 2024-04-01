import express from 'express';
import mongoose from 'mongoose';
import bodyParser from "body-parser";
import { router } from "./routes/timeline";


const appport = process.env.PORT || 5001;
const mongouser = process.env.MONGODB_USER || "admin";
const mongoppass = process.env.MONGODB_PASS || "admin";
const mongoport = process.env.MONGODB_PORT || 27017;
const mongohost = process.env.MONGODB_HOST || "127.0.0.1";
const mongodatabase = process.env.MONGODB_DATABASE || "mydatabase";


const mongoOptions = {
  maxPoolSize: 100,
  minPoolSize: 10
};

const mongoUrl = `mongodb://${mongouser}:${mongoppass}@${mongohost}:${mongoport}/${mongodatabase}`;
mongoose.connect(mongoUrl, mongoOptions);

export const app=express(); 

class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode || 500;
  }
}


app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use('/v1', router);

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const error = new HttpError('Not found', 404);
  next(error);
});

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(error.statusCode || 500);
  res.json({
    message: error
  })
});

// Start the server and listen to the port
app.listen(appport, () => {
  console.log(`Server is running on port ${appport}`);
});