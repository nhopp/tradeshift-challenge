import mongoose from 'mongoose';

import { Node } from '../../src/models/node';
import { InvalidStructureError, NotFoundError } from '../errors';

/**
 * Interface for the NodeModel document stored in MongoDB.
 */
interface INodeModel extends mongoose.Document {
  parent: mongoose.Types.ObjectId | undefined;
  children: mongoose.Types.ObjectId[];
}

/**
 * Schema for the Node model.
 * Keeping the list of children in Node model increases the speed of getting
 * the descendants for a given node.
 */
const NodeModelSchema = new mongoose.Schema({
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  children: {
    type: [mongoose.Schema.Types.ObjectId],
    required: true
  }
});

const NodeModel = mongoose.model<INodeModel>('nodeModel', NodeModelSchema);

/**
 * Abstraction above the MongoDB storage.
 */
export class NodeRepository {
  /**
   * Add a node as a child of parentId.
   * @param parentId the parentId to the new node as a child of. If undefined the new node is a
   * root node
   */
  public async addNode(parentId?: string): Promise<Node> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      let mongoNode;
      try {
        mongoNode = await NodeModel.create({
          parent: parentId,
          children: []
        });
      } catch (err) {
        return Promise.reject(
          new NotFoundError(`parent node id not found ${parentId}`)
        );
      }

      if (parentId !== undefined) {
        const mongoParentNode = await NodeModel.findById(parentId);
        if (mongoParentNode === null) {
          return Promise.reject(
            new NotFoundError(`invalid parent=${parentId}`)
          );
        }

        mongoParentNode.children.push(mongoNode._id);
        await mongoParentNode.save();
      }

      const node = this.mongoNodeToNode(mongoNode);
      return node;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  /**
   * Gets the node with identifier id.
   * @param id identifier of the node to get.
   * @return The node or undefined if no node is found.
   */
  public async getNode(id: string): Promise<Node> {
    const mongoNode = await this.findNodeByIdOrReject(id);

    return this.mongoNodeToNode(mongoNode);
  }

  /**
   * Get the current number of nodes.
   */
  public async getNodeCount(): Promise<number> {
    return await NodeModel.countDocuments();
  }

  // TODO - Support setting the parent of a leaf node to undefined. The leaf node would
  //        become the new root and the old root would have the new root as it's parent.

  /**
   * Set the parent of nodeId to parentId.
   * @param nodeId
   * @param parentId
   */
  public async setParent(nodeId: string, parentId: string): Promise<Node> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const mongoNode = await this.findNodeByIdOrReject(nodeId);
      if (mongoNode.parent === undefined) {
        return Promise.reject(
          new InvalidStructureError(`node=${nodeId} is the root`)
        );
      }

      // Remove nodeId from the old parent's children
      const mongoOldParent = await this.findNodeByIdOrReject(
        mongoNode.parent.toHexString()
      );
      mongoOldParent.children = mongoOldParent.children.filter((childId) => {
        return !childId.equals(mongoNode._id);
      });
      await mongoOldParent.save();

      // Add nodeId to the new parent's children
      const newParent = await this.findNodeByIdOrReject(parentId);
      newParent.children.push(mongoNode._id);
      await newParent.save();

      // Update parent of nodeId
      mongoNode.parent = newParent._id;
      await mongoNode.save();

      const node = this.mongoNodeToNode(mongoNode);
      return node;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  /**
   * Wrappere around Model.findById which will reject if no matching id is found
   * instead of returing null.
   * @param id
   */
  private async findNodeByIdOrReject(id: string): Promise<INodeModel> {
    let objectId;
    try {
      objectId = mongoose.Types.ObjectId(id);
    } catch (err) {
      return Promise.reject(new NotFoundError(`id is invalid: ${id}`));
    }

    const mongoNode = await NodeModel.findById(objectId);
    if (mongoNode === null) {
      return Promise.reject(new NotFoundError(`cannot find node=${id}`));
    }

    return mongoNode;
  }

  /**
   * Conveert the mongoose INodeModel item to an storage agnostic object Node.
   * @param mongoNode
   */
  private mongoNodeToNode(mongoNode: INodeModel): Node {
    return new Node(
      mongoNode._id.toHexString(),
      mongoNode.parent ? mongoNode.parent.toHexString() : undefined,
      Array.from(mongoNode.children).map((childId) => childId.toHexString())
    );
  }
}
