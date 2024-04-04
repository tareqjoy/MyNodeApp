import express from 'express';
import { router as signupRouter } from "./routes/signup";
import { router as userRouter } from "./routes/user";
import { router as userInternalRouter } from "./routes/user-internal";
import mongoose from 'mongoose';
import bodyParser from "body-parser";


const appport = process.env.PORT || 5002;
const mongouser = process.env.MONGODB_USER || "admin";
const mongoppass = process.env.MONGODB_PASS || "admin";
const mongoport = process.env.MONGODB_PORT || 27017;
const mongohost = process.env.MONGODB_HOST || "127.0.0.1";
const mongodatabase = process.env.MONGODB_DATABASE || "mydatabase";
const api_path_detail = process.env.API_PATH_DETAIL || '/v1/user/detail';
const api_path_signup = process.env.API_PATH_SIGNUP || '/v1/user/signup';
const api_path_userid = process.env.API_PATH_USERID || '/v1/user/userid';

const mongoOptions = {
  maxPoolSize: 100,
  minPoolSize: 10
};

const mongoUrl = `mongodb://${mongouser}:${mongoppass}@${mongohost}:${mongoport}/${mongodatabase}`;
mongoose.connect(mongoUrl, mongoOptions);


export const app = express();

class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode || 500;
  }
}

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(api_path_detail, userRouter);
app.use(api_path_signup, signupRouter);
app.use(api_path_userid, userInternalRouter);


app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const error = new HttpError('Not found', 404);
  next(error);
});

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(error.statusCode || 500);
  res.json({
    message: error,
    path: req.url
  })
});


// Start the server and listen to the port
app.listen(appport, () => {
  console.log(`Server is running on port ${appport}`);
});