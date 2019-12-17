import express from 'express';
import { Pool } from 'pg';

import { NodeController } from './controllers/nodeController';
import { NodeRepositoryPostgres } from './respositories/nodeRepositoryPostgres';
import { NodeService } from './services/nodeService';

const pool = new Pool({
  user: 'postgres',
  password: 'postgres_pwd',
  host: 'postgres',
  database: 'postgres'
});

const repository = new NodeRepositoryPostgres(pool);
const service = new NodeService(repository);
const controller = new NodeController(service);

const app = express();
const port = 8080;

app.use('/api/v1/', controller.router);
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
