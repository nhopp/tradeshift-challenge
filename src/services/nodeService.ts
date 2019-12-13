import { DuplicateRootError, InvalidArgumentError, InvalidStructureError } from '../errors';
import { Node } from '../models/node';
import { NodeInfo } from '../models/nodeInfo';
import { NodeRepository } from '../respositories/nodeRepository';

export class NodeService {
  constructor(private repository: NodeRepository) {}

  /**
   * Add a node to the tree.
   * @param parentId id of the node which will be the parent of the newly added node.
   * @returns information aobut the node that was aadded.
   */
  public async addNode(parentId?: string): Promise<NodeInfo> {
    if (parentId === undefined && (await this.repository.getNodeCount()) > 0) {
      return Promise.reject(
        new DuplicateRootError('cannot create multiple roots')
      );
    }

    const node = await this.repository.addNode(parentId);
    const nodeInfo = await this.getNodeInfo(node);
    return nodeInfo;
  }

  /**
   * Get all the descendants of a given node. The requested node id is not listed in it's own descendants.
   * @param id id of the node to list the descendants.
   * @returns all the desendant nodes.
   */
  public async getDescendants(id: string): Promise<NodeInfo[]> {
    const descendants: NodeInfo[] = [];

    // TODO - This implementation is not safe for concurrent actions from different instances. Support can be added
    //        for this by implementing a version check on each nodeInfo object, mismatching versions would trigger
    //        a retry.
    const node = await this.repository.getNode(id);
    const queue: string[] = [];
    queue.push(...node.children);
    while (queue.length > 0) {
      const queuedId = queue.shift() as string;
      const queuedNode = await this.repository.getNode(queuedId);
      const nodeInfo = await this.getNodeInfo(queuedNode);
      descendants.push(nodeInfo);
      queue.push(...queuedNode.children);
    }

    return descendants;
  }

  /**
   * Set a new parent for an existing node.
   * - The new parent must not be the current node.
   * - The new parent must not be a descendant of the current node.
   * @param nodeId id of the node to set the new partent.
   * @param parentId id of the new parent node.
   * @returns updated information about the current node.
   */
  public async setParent(nodeId: string, parentId: string): Promise<NodeInfo> {
    if (nodeId === parentId) {
      return Promise.reject(
        new InvalidArgumentError('node cannot equal parent')
      );
    }

    // parentId cannot be a descendant of nodeId, setting a descendant of nodeId as the parent
    // would cause the structure to be a graph, with a loop instead of a tree.
    const descendants = await this.getDescendants(nodeId);
    const parentIsDescentantOfNode = descendants.some(
      (descendant) => descendant.id === parentId
    );

    if (parentIsDescentantOfNode) {
      return Promise.reject(
        new InvalidStructureError('parent cannnot be a descendant of node')
      );
    }

    const node = await this.repository.setParent(nodeId, parentId);
    return await this.getNodeInfo(node);
  }

  /**
   *
   * @param node id of the node to get the info for.
   */
  private async getNodeInfo(node: Node): Promise<NodeInfo> {
    let depth = 0;
    let parentNode = node;

    while (parentNode.parent !== undefined) {
      depth++;
      parentNode = await this.repository.getNode(parentNode.parent);
    }

    return new NodeInfo(node.id, node.parent, depth, parentNode.id);
  }
}
