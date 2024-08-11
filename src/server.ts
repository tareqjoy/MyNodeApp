import express from 'express';

// Specify a port number for the server
const appport= process.env.PORT || 5000;

export const app = express();

app.listen(appport, () => {
  console.log(`Server is running on port ${appport}`);
});