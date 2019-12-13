import chai from 'chai';
import { Mockgoose } from 'mock-mongoose';
import mongoose from 'mongoose';

import { DuplicateRootError, InvalidArgumentError, InvalidStructureError, NotFoundError } from '../../src/errors';
import { NodeRepository } from '../../src/respositories/nodeRepository';
import { NodeService } from '../../src/services/nodeService';

const expect = chai.expect;

describe('nodeService', () => {
  const mockgoose = new Mockgoose(mongoose);
  let repository: NodeRepository;
  let service: NodeService;

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

  beforeEach(() => {
    repository = new NodeRepository();
    service = new NodeService(repository);
  });
  afterEach(async () => {
    await mockgoose.helper.reset();
  });

  describe('addNode', () => {
    it('add root returns root information', async () => {
      const rootNodeInfo = await service.addNode();

      expect(rootNodeInfo).to.deep.eq({
        id: rootNodeInfo.id,
        parent: undefined,
        depth: 0,
        root: rootNodeInfo.id
      });
    });

    it('add duplicate rejects DuplicateRootError', async () => {
      await service.addNode();
      const error = await service.addNode().catch((err) => err);

      expect(error).to.be.an.instanceof(DuplicateRootError);
    });

    it('invalid parent id rejects InalidNodeError', async () => {
      const error = await service.addNode('invalidKey').catch((err) => err);

      expect(error).to.be.an.instanceof(NotFoundError);
    });
  });

  describe('getDescendants', () => {
    it('invalid id rejects InvalidNodeError', async () => {
      const error = await service
        .getDescendants('invalidKey')
        .catch((err) => err);

      expect(error).to.be.an.instanceof(NotFoundError);
    });

    it('node with no desendants', async () => {
      const node = await service.addNode();
      const descendants = await service.getDescendants(node.id);

      expect(descendants).to.deep.eq([]);
    });

    it('node with one direct desendant', async () => {
      const rootNode = await service.addNode();
      const childNode = await service.addNode(rootNode.id);
      const descendants = await service.getDescendants(rootNode.id);

      expect(descendants).to.deep.eq([
        {
          id: childNode.id,
          parent: childNode.parent,
          depth: 1,
          root: rootNode.id
        }
      ]);
    });

    it('node with two direct desendant', async () => {
      const rootNode = await service.addNode();
      const childOne = await service.addNode(rootNode.id);
      const childTwo = await service.addNode(rootNode.id);
      const descendants = await service.getDescendants(rootNode.id);

      expect(descendants).to.deep.eq([
        {
          id: childOne.id,
          parent: childOne.parent,
          depth: 1,
          root: rootNode.id
        },
        {
          id: childTwo.id,
          parent: childTwo.parent,
          depth: 1,
          root: rootNode.id
        }
      ]);
    });

    it('node with descendant depth of 2', async () => {
      const root = await service.addNode();
      const childOne = await service.addNode(root.id);
      const childTwo = await service.addNode(childOne.id);
      const descendants = await service.getDescendants(root.id);

      expect(descendants).to.deep.eq([
        {
          id: childOne.id,
          parent: childOne.parent,
          depth: 1,
          root: root.id
        },
        {
          id: childTwo.id,
          parent: childTwo.parent,
          depth: 2,
          root: root.id
        }
      ]);
    });
  });

  describe('setParent', () => {
    it('invalidId rejects InvalidNodeId', async () => {
      const root = await service.addNode();
      const child = await service.addNode(root.id);
      const error = await service
        .setParent(child.id, 'invalidKey')
        .catch((err) => err);

      expect(error).to.be.an.instanceof(NotFoundError);
    });

    it('nodeId cannot equal parentId', async () => {
      const root = await service.addNode();
      const child = await service.addNode(root.id);
      const error = await service
        .setParent(child.id, child.id)
        .catch((err) => err);

      expect(error).to.be.an.instanceof(InvalidArgumentError);
    });

    it('parentId cannot be a descentant of nodeId', async () => {
      const root = await service.addNode();
      const child = await service.addNode(root.id);
      const grandchild = await service.addNode(child.id);
      const error = await service
        .setParent(child.id, grandchild.id)
        .catch((err) => err);

      expect(error).to.be.an.instanceof(InvalidStructureError);
    });

    it('reparent grandchild of root to be child of root', async () => {
      const root = await service.addNode();
      const child = await service.addNode(root.id);
      const grandchild = await service.addNode(child.id);

      const newGrandchild = await service.setParent(grandchild.id, root.id);

      expect(newGrandchild).to.deep.eq({
        id: grandchild.id,
        parent: root.id,
        depth: 1,
        root: root.id
      });
    });
  });
});
