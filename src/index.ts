import express from 'express';
import mongoose from 'mongoose';

import { NodeController } from './controllers/nodeController';
import { NodeRepository } from './respositories/nodeRepository';
import { NodeService } from './services/nodeService';

const app = express();
const port = 8080;
const repository = new NodeRepository();
const service = new NodeService(repository);
const controller = new NodeController(service);

mongoose
  .connect('mongodb://mongo/express-mongo', {
    useUnifiedTopology: true,
    useNewUrlParser: true
  })
  .then(() => {
    console.log('MongoDB connected');
    app.use('/api/v1/', controller.router);
    app.listen(port, () => {
      console.log(`Server started at http://localhost:${port}`);
    });
  })
  .catch((err) => console.log(err));
