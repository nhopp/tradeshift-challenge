import { Node } from '../models/node';

/**
 * Interface for concrete implemenations of NodeRepositories
 */
export interface INodeRepository {
  /**
   * Add a node as a child of and existing node.
   * @param parentId the parentId to the new node as a child of. If undefined the new node is a
   * root node
   */
  addNode(parentId?: string): Promise<Node>;

  /**
   * Gets the node with identifier id.
   * @param id identifier of the node to get.
   * @return The node or undefined if no node is found.
   */
  getNode(id: string): Promise<Node>;

  /**
   * Get the current number of nodes.
   */
  getNodeCount(): Promise<number>;

  /**
   * Set the parent of nodeId to parentId. Setting the parent must not result in a non-tree structure
   * Graphs with multiple root nodes or loops are not permitted
   * 1. parentId may not be a descenant of nodeid.
   * 2. nodeId may not the root node.
   * @param nodeId
   * @param parentId
   */
  setParent(nodeId: string, parentId: string): Promise<Node>;
}
