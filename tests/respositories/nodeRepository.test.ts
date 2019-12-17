import chai from 'chai';
import { Pool } from 'pg';

import { InvalidStructureError, NotFoundError } from '../../src/errors';
import { INodeRepository } from '../../src/respositories/inodeRepository';
import { NodeRepositoryPostgres } from '../../src/respositories/nodeRepositoryPostgres';

const expect = chai.expect;

describe('NodeRepository', () => {
  let repository: INodeRepository;

  beforeEach(async () => {
    const pool = new Pool({
      user: 'postgres',
      password: 'postgres_pwd',
      host: 'localhost',
      database: 'postgres'
    });
    await pool.query<Node>('TRUNCATE node');
    repository = new NodeRepositoryPostgres(pool);
  });

  describe('addNode()', () => {
    it('without parentId creates node with parent=undefined', async () => {
      const node = await repository.addNode();

      expect(node).to.deep.eq({
        id: node.id,
        parent: undefined,
        children: []
      });
    });

    it('with parentId creates node with parent=parentId', async () => {
      const rootNode = await repository.addNode();
      const childNode = await repository.addNode(rootNode.id);

      expect(childNode).to.deep.eq({
        id: childNode.id,
        parent: rootNode.id,
        children: []
      });
    });

    it('with valid parentId adds new node as child of parent', async () => {
      const rootNode = await repository.addNode();
      const childNode = await repository.addNode(rootNode.id);

      const newRootNode = await repository.getNode(rootNode.id);

      expect(newRootNode).to.deep.eq({
        id: rootNode.id,
        parent: undefined,
        children: [childNode.id]
      });
    });

    it('add node with invalid parentId promise rejects with NotFoundError', async () => {
      const addNodeError = await repository
        .addNode('invalidKey')
        .catch((err) => err);

      expect(addNodeError).to.be.an.instanceof(NotFoundError);
    });
  });

  describe('getNode()', () => {
    it('invalid key returns NotFoundError', async () => {
      const error = await repository.getNode('invalidKey').catch((err) => err);
      expect(error).to.be.an.instanceof(NotFoundError);
    });

    it('valid key returns node', async () => {
      const node = await repository.addNode();
      const fetchedNode = await repository.getNode(node.id);
      expect(node).to.deep.eq(fetchedNode);
    });
  });

  describe('getCount', () => {
    it('empty nodes return 0 count', async () => {
      const count = await repository.getNodeCount();

      expect(count).to.be.eq(0);
    });

    it('single node return 1 count', async () => {
      await repository.addNode();
      const count = await repository.getNodeCount();

      expect(count).to.be.eq(1);
    });
  });

  describe('setParent', () => {
    it('invalid nodeId rejects NotFoundError', async () => {
      const nodeId = 'invalidNodeId';
      const parentId = 'parentId';
      const error = await repository
        .setParent(nodeId, parentId)
        .catch((err) => err);

      expect(error).is.an.instanceof(NotFoundError);
    });

    it('cannot set parent of root rejects InvalidStructureError', async () => {
      const root = await repository.addNode();
      const child = await repository.addNode(root.id);

      const error = await repository
        .setParent(root.id, child.id)
        .catch((err) => err);

      expect(error).is.an.instanceof(InvalidStructureError);
    });

    it('invalid parentId rejects NotFoundError', async () => {
      const invalidKey = 'invalidKey';
      const root = await repository.addNode();
      const child = await repository.addNode(root.id);

      const error = await repository
        .setParent(child.id, invalidKey)
        .catch((err) => err);

      expect(error).is.an.instanceof(NotFoundError);
    });

    it('reparent grandchild to child or root', async () => {
      const nodeA = await repository.addNode();
      const nodeB = await repository.addNode(nodeA.id);
      const nodeC = await repository.addNode(nodeB.id);

      const newNodeC = await repository.setParent(nodeC.id, nodeA.id);
      expect(newNodeC).is.deep.eq({
        id: nodeC.id,
        parent: nodeA.id,
        children: []
      });

      const newNodeA = await repository.getNode(nodeA.id);
      expect(newNodeA).is.deep.eq({
        id: nodeA.id,
        parent: nodeA.parent,
        children: [nodeB.id, nodeC.id]
      });

      const newNodeB = await repository.getNode(nodeB.id);
      expect(newNodeB).is.deep.eq({
        id: nodeB.id,
        parent: nodeB.parent,
        children: []
      });
    });
  });
});
