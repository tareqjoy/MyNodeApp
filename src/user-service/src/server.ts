import express from 'express';
import { router as signupRouter } from "./routes/signup";
import { router as userRouter } from "./routes/user";
import mongoose from 'mongoose';
import bodyParser from "body-parser";
import { UserSchema } from './models/user'


const appport = process.env.PORT || 5000;
const mongoport = process.env.MONGODB_PORT || 27017;
const mongohost = process.env.MONGODB_HOST || "127.0.0.1";
const mongodatabase = process.env.MONGODB_DATABASE || "mydatabase";


const mongoOptions = {
  maxPoolSize: 100,
  minPoolSize: 10
};

const mongoUrl = `mongodb://${mongohost}:${mongoport}/${mongodatabase}`;
mongoose.connect(mongoUrl, mongoOptions);



const app = express();

class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode || 500;
  }
}

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use('/detail', userRouter);
app.use('/signup', signupRouter);


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


module.exports = app