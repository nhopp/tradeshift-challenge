import { Pool } from 'pg';

import { InvalidStructureError, NotFoundError } from '../errors';
import { Node } from '../models/node';
import { INodeRepository } from './inodeRepository';

interface INodeRow {
  id: number;
  parent_id: number;
}

export class NodeRepositoryPostgres implements INodeRepository {
  private pool: Pool;
  constructor(pool: Pool) {
    this.pool = pool;
  }

  public async addNode(parentId?: string | undefined): Promise<Node> {
    return new Promise((resolve, reject) => {
      this.pool.query<INodeRow>(
        'INSERT INTO node (parent_id) VALUES ($1) RETURNING id, parent_id',
        [parentId],
        (error, results) => {
          if (error) {
            reject(new NotFoundError(`parent node id not found ${parentId}`));
            return;
          }
          const row = results.rows[0];
          const node = this.nodeFromNodeRowAndChildIds(row, []);
          resolve(node);
        }
      );
    });
  }

  public async getNode(id: string): Promise<Node> {
    return new Promise((resolve, reject) => {
      this.pool.query<INodeRow>(
        'SELECT * FROM node WHERE id = $1',
        [id],
        async (error, results) => {
          if (error) {
            reject(new NotFoundError(`id is invalid: ${id}`));
            return;
          }
          const childIds = await this.getChildIds(id);
          const row = results.rows[0];
          const node = this.nodeFromNodeRowAndChildIds(row, childIds);
          resolve(node);
        }
      );
    });
  }

  public async getNodeCount(): Promise<number> {
    // postgres returns count as a string to avoid large number precision loss when
    // the value of count is larger than Number.MAX_VALUE.
    try {
      const results = await this.pool.query<{
        count: string;
      }>('SELECT count(*) from node', []);
      return +results.rows[0].count;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  public async setParent(nodeId: string, parentId: string): Promise<Node> {
    return new Promise((resolve, reject) => {
      this.pool.query<INodeRow>(
        'SELECT * FROM node WHERE id = $1',
        [nodeId],
        (error, result) => {
          if (error) {
            reject(new NotFoundError(`id is invalid: ${nodeId}`));
            return;
          } else if (result.rows[0].parent_id === null) {
            reject(new InvalidStructureError(`node=${nodeId} is the root`));
            return;
          }
          this.pool.query<INodeRow>(
            'UPDATE node SET parent_id = $1 WHERE id = $2 RETURNING id, parent_id',
            [parentId, nodeId],
            async (updateError, updateResult) => {
              if (updateError) {
                reject(new NotFoundError(`id is invalid: ${nodeId}`));
                return;
              }

              if (updateResult.rows[0].parent_id === undefined) {
                reject(new InvalidStructureError(`node=${nodeId} is the root`));
                return;
              }

              const childIds = await this.getChildIds(nodeId);
              resolve(
                this.nodeFromNodeRowAndChildIds(updateResult.rows[0], childIds)
              );
            }
          );
        }
      );
    });
  }

  private async getChildIds(parentId: string): Promise<number[]> {
    return new Promise((resolve, reject) => {
      this.pool.query<INodeRow>(
        'SELECT * FROM node WHERE parent_id = $1',
        [parentId],
        (error, results) => {
          if (error) {
            reject(error);
            return;
          }
          const childIds = results.rows.map((row) => row.id);
          resolve(childIds);
        }
      );
    });
  }

  private nodeFromNodeRowAndChildIds(row: INodeRow, childIds: number[]): Node {
    const parentId = row.parent_id ? row.parent_id.toString() : undefined;
    const childIdsString = childIds.map((childId) => childId.toString());

    return new Node(row.id.toString(), parentId, childIdsString);
  }
}
