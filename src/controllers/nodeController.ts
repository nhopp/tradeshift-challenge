import express from 'express';

import { DuplicateRootError, NotFoundError } from '../errors';
import { NodeService } from '../services/nodeService';

export class NodeController {
  public readonly router = express.Router();

  constructor(private nodeService: NodeService) {
    this.router.post('/nodes', this.postNodeHandler.bind(this));
    this.router.patch('/nodes/:id', this.patchNodeHandler.bind(this));
    this.router.get(
      '/nodes/:id/descendants',
      this.getDescendantsHander.bind(this)
    );
  }

  private async postNodeHandler(req: express.Request, res: express.Response) {
    try {
      const parent = req.query.parent;
      const nodeInfo = await this.nodeService.addNode(parent);
      res.status(201).json(nodeInfo);
    } catch (err) {
      if (err instanceof DuplicateRootError) {
        res.status(405).json({ message: err.message });
      } else if (err instanceof NotFoundError) {
        res.status(406).json({ message: err.message });
      } else if (err instanceof Error) {
        res.status(500).json({ message: err.message });
      } else {
        res.status(500).send(err);
      }
    }
  }

  private async patchNodeHandler(req: express.Request, res: express.Response) {
    try {
      const nodeInfo = await this.nodeService.setParent(
        req.params.id,
        req.query.parent
      );
      res.status(200).json(nodeInfo);
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ message: err.message });
      } else {
        res.status(500).send(err);
      }
    }
  }

  private async getDescendantsHander(
    req: express.Request,
    res: express.Response
  ) {
    try {
      const descendants = await this.nodeService.getDescendants(req.params.id);
      res.json(descendants);
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ message: err.message });
      } else {
        res.status(500).send(err);
      }
    }
  }
}
