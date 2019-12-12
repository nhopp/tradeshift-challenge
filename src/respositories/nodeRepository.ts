import uuid from 'uuid';

import { Node } from '../../src/models/node';
import { InvalidNodeError, InvalidStructureError, NotFoundError } from '../errors';

const uuidV4 = uuid.v4;

class NodeRow {
  public readonly id: string;
  public readonly parent: string;

  constructor(id: string, parent: string) {
    this.id = id;
    this.parent = parent;
  }
}

export class NodeRepository {
  private nodes: Map<string, Node> = new Map<string, Node>();

  /**
   * Add a node as a child of parentId.
   * @param parentId the parentId to the new node as a child of. If undefined the new node is a
   * root node
   */
  public async addNode(parentId?: string): Promise<Node> {
    const node = new Node(uuidV4(), parentId, []);

    if (parentId !== undefined) {
      try {
        const parentNode = await this.getNode(parentId);
        parentNode.children.push(node.id);
      } catch (err) {
        return Promise.reject(new InvalidNodeError(`nodeId=${parentId}`));
      }
    }

    this.nodes.set(node.id, node);
    return Promise.resolve(node);
  }

  /**
   * Gets the node with identifier id.
   * @param id identifier of the node to get.
   * @return The node or undefined if no node is found.
   */
  public async getNode(id: string): Promise<Node> {
    const node = this.nodes.get(id);
    if (node === undefined) {
      return Promise.reject(new NotFoundError(`${id} was not found`));
    }

    return Promise.resolve(node as Node);
  }

  public async getRoot(): Promise<Node> {
    const node = Array.from(this.nodes.values()).find(
      (value) => value.parent === undefined
    );

    if (node === undefined) {
      return Promise.reject(new InvalidNodeError());
    }

    return Promise.resolve(node);
  }

  public async getCount(): Promise<number> {
    return Promise.resolve(this.nodes.size);
  }

  public async setParent(nodeId: string, parentId: string): Promise<Node> {
    const oldNode = await this.getNode(nodeId);
    if (oldNode.parent === undefined) {
      return Promise.reject(new InvalidStructureError());
    }
    // Remove nodeId from the old parent's children
    const oldParent = await this.getNode(oldNode.parent);
    this.nodes.set(
      oldNode.parent,
      new Node(
        oldParent.id,
        oldParent.parent,
        oldParent.children.filter((child) => child !== nodeId)
      )
    );

    // Update parent of nodeId
    const newNode = new Node(nodeId, parentId, oldNode.children);
    this.nodes.set(newNode.id, newNode);

    // Add nodeId to the new parent's children
    const newParent = await this.getNode(parentId);
    this.nodes.set(
      parentId,
      new Node(parentId, newParent.parent, newParent.children.concat([nodeId]))
    );

    return newNode;
  }
}
