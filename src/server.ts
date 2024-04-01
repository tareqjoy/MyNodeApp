import express from 'express';

// Create an instance of the express application
const app=express();
const bodyParser = require("body-parser")
// Specify a port number for the server
const port= process.env.PORT || 5000;

import { router as timelineRoutes } from "./timeline-service/src/routes/timeline";

class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode || 500;
  }
}

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Create a route and a handler for GET /posts
app.get('/posts', (req, res) => {
  // Send the posts array as a JSON response
  res.status(200).json(posts);
});

// Create a route and a handler for GET /posts/:id
app.get('/posts/:id', (req, res) => {
  // Get the id parameter from the request
  const id = req.params.id;

  // Find the post with the given id in the posts array
  const post = posts.find((p) => p.id.toString() == id);

  // If the post exists, send it as a JSON response
  if (post) {
    res.json(post);
  } else {
    // If the post does not exist, send a 404 status code and a message
    res.status(404).send('Post not found');
  }
});



app.use('/timeline', timelineRoutes);


app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const error = new HttpError('Not found', 404);
  next(error);
});

app.use((error: HttpError, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(error.statusCode || 500);
  res.json({
    message: error.message
  })
});

// Define the data function for creating a blog post
function createPost(id: number, title: string, content: string, author: string) {
    return {
      id: id,
      title: title,
      content: content,
      author: author,
    };
  }
  
  // Define the data array for the blog posts
  const posts = [
    createPost(1, 'Hello World', 'This is my first blog post', 'Alice'),
    createPost(2, 'Express JS', 'This is a blog post about Express JS', 'Bob'),
    createPost(3, 'RESTful API', 'This is a blog post about RESTful API', 'Charlie'),
  ];

// Start the server and listen to the port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


module.exports = app