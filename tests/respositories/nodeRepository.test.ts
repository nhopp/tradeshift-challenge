import chai from 'chai';
import { Mockgoose } from 'mock-mongoose';
import mongoose from 'mongoose';

import { InvalidStructureError, NotFoundError } from '../../src/errors';
import { NodeRepository } from '../../src/respositories/nodeRepository';

const expect = chai.expect;

describe('NodeRepository', () => {
  const mockgoose = new Mockgoose(mongoose);

  before(async () => {
    await mockgoose.prepareStorage();
    await mongoose.connect('mongodb://localhost/express-mongo', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  });

  after(async () => {
    await mongoose.connection.close();
  });

  afterEach((done) => {
    mockgoose.helper.reset().then(() => {
      done();
    });
  });

  describe('addNode()', () => {
    it('without parentId creates node with parent=undefined', async () => {
      const repository = new NodeRepository();
      const node = await repository.addNode();

      expect(node).to.deep.eq({
        id: node.id,
        parent: undefined,
        children: []
      });
    });

    it('with parentId creates node with parent=parentId', async () => {
      const repository = new NodeRepository();
      const rootNode = await repository.addNode();
      const childNode = await repository.addNode(rootNode.id);

      expect(childNode).to.deep.eq({
        id: childNode.id,
        parent: rootNode.id,
        children: []
      });
    });

    it('with valid parentId adds new node as child of parent', async () => {
      const repository = new NodeRepository();
      const rootNode = await repository.addNode();
      const childNode = await repository.addNode(rootNode.id);

      const newRootNode = await repository.getNode(rootNode.id);

      expect(newRootNode).to.deep.eq({
        id: rootNode.id,
        parent: undefined,
        children: [childNode.id]
      });
    });

    it('add node with invalid parentId promise rejects with InvalidNodeError', async () => {
      const repository = new NodeRepository();
      const addNodeError = await repository
        .addNode('invalidKey')
        .catch((err) => err);

      expect(addNodeError).to.be.an.instanceof(NotFoundError);
    });
  });

  describe('getNode()', () => {
    it('invalid key returns undefined', async () => {
      const repository = new NodeRepository();
      const error = await repository.getNode('invalidKey').catch((err) => err);
      expect(error).to.be.an.instanceof(NotFoundError);
    });

    it('valid key returns node', async () => {
      const repository = new NodeRepository();
      const node = await repository.addNode();
      const fetchedNode = await repository.getNode(node.id);
      expect(node).to.deep.eq(fetchedNode);
    });
  });

  describe('getCount', () => {
    it('empty nodes return 0 count', async () => {
      const repository = new NodeRepository();
      const count = await repository.getNodeCount();

      expect(count).to.be.eq(0);
    });

    it('singe node return 1 count', async () => {
      const repository = new NodeRepository();
      repository.addNode();
      const count = await repository.getNodeCount();

      expect(count).to.be.eq(1);
    });
  });

  describe('setParent', () => {
    it('invalid nodeId rejects NotFoundError', async () => {
      const nodeId = 'invalidNodeId';
      const parentId = 'parentId';
      const repository = new NodeRepository();
      const error = await repository
        .setParent(nodeId, parentId)
        .catch((err) => err);

      expect(error).is.an.instanceof(NotFoundError);
    });

    it('cannot set parent of root rejects InvalidStructureError', async () => {
      const invalidKey = 'invalidKey';
      const repository = new NodeRepository();
      const root = await repository.addNode();

      const error = await repository
        .setParent(root.id, invalidKey)
        .catch((err) => err);

      expect(error).is.an.instanceof(InvalidStructureError);
    });

    it('invalid parentId rejects NotFoundError', async () => {
      const invalidKey = 'invalidKey';
      const repository = new NodeRepository();
      const root = await repository.addNode();
      const child = await repository.addNode(root.id);

      const error = await repository
        .setParent(child.id, invalidKey)
        .catch((err) => err);

      expect(error).is.an.instanceof(NotFoundError);
    });

    it('reparent grandchild to child or root', async () => {
      const repository = new NodeRepository();
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
