export class NodeInfo {
  /**
   *
   * @param id id of the node
   * @param parent id of the parent node. If parent === undefined this node is the root node.
   * @param depth depth of the node. The root node depth is 0.
   * @param root id of the root node.
   */
  constructor(
    public id: string,
    public parent: string | undefined,
    public depth: number,
    public root: string
  ) {}
}
