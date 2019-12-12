export class Node {
  /**
   *
   * @param id id of the node
   * @param parent id of the parent node. If parent === undefined this node is the root node.
   * @param children list of child node ids
   */
  constructor(
    public readonly id: string,
    public readonly parent: string | undefined,
    public readonly children: string[]
  ) {}
}
