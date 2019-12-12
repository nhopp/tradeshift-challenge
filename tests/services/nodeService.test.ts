import chai from 'chai';
import sinon from 'sinon';

import { DuplicateRootError, InvalidArgumentError, InvalidNodeError, InvalidStructureError } from '../../src/errors';
import { Node } from '../../src/models/node';
import { NodeRepository } from '../../src/respositories/nodeRepository';
import { NodeService } from '../../src/services/nodeService';

const expect = chai.expect;

describe('nodeService', () => {
  let sandbox: sinon.SinonSandbox;
  const repository = new NodeRepository();
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    sandbox.restore();
  });

  describe('addNode', () => {
    it('add root returns root information', async () => {
      const mockRootNode = new Node('nodeId', undefined, []);
      sandbox.stub(repository, 'addNode').resolves(mockRootNode);

      const service = new NodeService(repository);
      const rootNodeInfo = await service.addNode();

      expect(rootNodeInfo).to.deep.eq({
        id: mockRootNode.id,
        parent: mockRootNode.parent,
        depth: 0,
        root: mockRootNode.id
      });
    });

    it('add duplicate rejects DuplicateRootError', async () => {
      sandbox.stub(repository, 'getCount').resolves(1);

      const service = new NodeService(repository);
      const error = await service.addNode().catch((err) => err);

      expect(error).to.be.an.instanceof(DuplicateRootError);
    });

    it('invalid parent id rejects InalidNodeError', async () => {
      sandbox.stub(repository, 'addNode').rejects(new InvalidNodeError());

      const service = new NodeService(repository);
      const error = await service.addNode('invalidKey').catch((err) => err);

      expect(error).to.be.an.instanceof(InvalidNodeError);
    });
  });

  describe('getDescendants', () => {
    it('invalid id rejects InvalidNodeError', async () => {
      sandbox.stub(repository, 'getNode').rejects(new InvalidNodeError());

      const service = new NodeService(repository);
      const error = await service
        .getDescendants('invalidKey')
        .catch((err) => err);

      expect(error).to.be.an.instanceof(InvalidNodeError);
    });

    it('node with no desendants', async () => {
      const mockNode = new Node('mockNode', undefined, []);
      sandbox
        .stub(repository, 'getNode')
        .withArgs(mockNode.id)
        .resolves(mockNode);

      const service = new NodeService(repository);
      const descendants = await service.getDescendants(mockNode.id);

      expect(descendants).to.deep.eq([]);
    });

    it('node with one direct desendant', async () => {
      const rootNodeId = 'rootNode';
      const childNodeId = 'childNode';
      const rootNode = new Node(rootNodeId, undefined, [childNodeId]);
      const childNode = new Node(childNodeId, rootNodeId, []);
      const stub = sandbox.stub(repository, 'getNode');

      stub.withArgs(rootNode.id).resolves(rootNode);
      stub.withArgs(childNode.id).resolves(childNode);

      const service = new NodeService(repository);
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
      const rootId = 'rootNode';
      const childOneId = 'child1';
      const childTwoId = 'child2';
      const root = new Node(rootId, undefined, [childOneId, childTwoId]);
      const childOne = new Node(childOneId, rootId, []);
      const childTwo = new Node(childTwoId, rootId, []);
      const stub = sandbox.stub(repository, 'getNode');

      stub.withArgs(root.id).resolves(root);
      stub.withArgs(childOne.id).resolves(childOne);
      stub.withArgs(childTwo.id).resolves(childTwo);

      const service = new NodeService(repository);
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
          depth: 1,
          root: root.id
        }
      ]);
    });

    it('node with descendant depth of 2', async () => {
      const rootId = 'rootNode';
      const childOneId = 'child1';
      const childTwoId = 'child2';
      const root = new Node(rootId, undefined, [childOneId]);
      const childOne = new Node(childOneId, rootId, [childTwoId]);
      const childTwo = new Node(childTwoId, childOneId, []);
      const stub = sandbox.stub(repository, 'getNode');

      stub.withArgs(root.id).resolves(root);
      stub.withArgs(childOne.id).resolves(childOne);
      stub.withArgs(childTwo.id).resolves(childTwo);

      const service = new NodeService(repository);
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
      const nodeId = 'rootId';
      const parentId = 'parentId';
      sandbox.stub(repository, 'getNode').rejects(new InvalidNodeError());
      const service = new NodeService(repository);
      const error = await service
        .setParent(nodeId, parentId)
        .catch((err) => err);

      expect(error).to.be.an.instanceof(InvalidNodeError);
    });

    it('nodeId cannot equal parentId', async () => {
      const nodeId = 'nodeId';
      const service = new NodeService(repository);
      const error = await service.setParent(nodeId, nodeId).catch((err) => err);

      expect(error).to.be.an.instanceof(InvalidArgumentError);
    });

    it('parentId cannot be a descentant of nodeId', async () => {
      const rootId = 'rootId';
      const childId = 'childId';
      const root = new Node(rootId, undefined, [childId]);
      const child = new Node(childId, rootId, []);
      const stud = sandbox.stub(repository, 'getNode');
      stud.withArgs(rootId).resolves(root);
      stud.withArgs(childId).resolves(child);

      const service = new NodeService(repository);
      const error = await service
        .setParent(rootId, childId)
        .catch((err) => err);

      expect(error).to.be.an.instanceof(InvalidStructureError);
    });

    it('reparent grandchild of root to be child of root', async () => {
      const mockRepository = new NodeRepository();
      const service = new NodeService(mockRepository);
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
