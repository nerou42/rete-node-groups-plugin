import { ConnectionId, NodeEditor, NodeId } from "rete";
import { compareControls, findPositions, findUnconnectedOutputs, incrementStringNumber } from "./utils";
import { Node, OutputPosition, Scheme } from "./types";
import { InputsNode } from "./nodes/InputsNode";
import { NodeGroupNode } from "./nodes/NodeGroupNode";
import { GroupEditor } from "./GroupEditor";

/**
 * The definition of a parsable NodeGroup
 */
export type NodeGroupDef = {
  identifier: string;
  editor: NodeEditor<Scheme>;
};

/**
 * Represents all informations neccessary for the transformation of normal nodes into a Node group
 */
interface Transformation {
  nodes: NodeId[]; // NodeIds from the source editor
  connections: ConnectionId[]; // ConnectionIds from the source editor
  groupInputConnections: {
    outsideConnectedNode: NodeId; // the id of the node that will be connected to the nodeGroups input outside the group
    outsideConnectedOutput: string; // the identifier of the output
    groupInput: string; // the identifier of the group input
  }[];
  groupOutputConnections: {
    outsideConnectedNode: NodeId; // the id of the node that will be connected to the nodeGroups output outside the group
    outsideConnectedInput: string; // the identifier of the input
    groupOutput: string; // the identifier of the group output
  }[];
}

export class NodeGroupTransformer {

  private readonly editor: NodeEditor<Scheme>;

  constructor(editor: NodeEditor<Scheme>) {
    this.editor = editor;
  }

  /**
   * Searches for groups of nodes that exactly match the provided nodeGroups and replaces them by a functionally equal nodegroups
   */
  transformNodeGroups(nodeGroupDefs: NodeGroupDef[]): void {
    for (const nodeGroupDef of nodeGroupDefs) {
      this.transformNodeGroup(nodeGroupDef);
    }
  }

  /**
   * Searches for groups of nodes that exactly match the provided nodeGroup and replaces them by a functionally equal nodegroups
   */
  transformNodeGroup(nodeGroupDef: NodeGroupDef): void {
    const nodeGroupOutputPositions = findUnconnectedOutputs(nodeGroupDef.editor);
    for (const nodeGroupOutputPosition of nodeGroupOutputPositions) {
      this.transformGroupsOutput(nodeGroupDef, nodeGroupOutputPosition);
    }
  }

  /**
   * Searches for potential entry points in the source editors and initiates the recursive search
   */
  private transformGroupsOutput(nodeGroupDef: NodeGroupDef, positionInGroup: OutputPosition): void {
    const nodeLabel = nodeGroupDef.editor.getNode(positionInGroup.node).label;
    const potentialPositions = findPositions(this.editor, nodeLabel, positionInGroup.output);
    for (const potentialPosition of potentialPositions) {
      this.startActualTransformation(nodeGroupDef, potentialPosition, positionInGroup);
    }
  }

  /**
   * Starts the transformation at a specific entry point in the source editor
   */
  private startActualTransformation(nodeGroupDef: NodeGroupDef, sourcePosition: OutputPosition, groupPosition: OutputPosition): void {
    const sourceNode = this.editor.getNode(sourcePosition.node);
    const groupNode = nodeGroupDef.editor.getNode(groupPosition.node);
    let transformation: Transformation | null = {
      connections: [],
      groupInputConnections: [],
      groupOutputConnections: [],
      nodes: [],
    }
    transformation = this.traverseNode(nodeGroupDef, sourceNode, groupNode, transformation);
    if (transformation !== null) {
      this.transform(transformation);
    }
  }

  /**
   * Traverses the nodes recursively backwards
   */
  private traverseNode(nodeGroupDef: NodeGroupDef, sourceNode: Node, groupNode: Node, transformation: Transformation): Transformation | null {
    transformation.nodes.push(sourceNode.id);
    if (!compareControls(sourceNode, groupNode)) { // check that controls are identical
      return null;
    }
    for (const inputIdentifier in sourceNode.inputs) {
      if (!Object.prototype.hasOwnProperty.call(sourceNode.inputs, inputIdentifier)) {
        continue;
      }
      const sourceInput = sourceNode.inputs[inputIdentifier];
      const groupInput = groupNode.inputs[inputIdentifier];
      if (sourceInput === undefined || groupInput === undefined) {
        return null;
      }
      const sourceConnection = this.editor.getConnections().find((c) => c.target === sourceNode.id && c.targetInput === inputIdentifier);
      const groupConnection = nodeGroupDef.editor.getConnections().find((c) => c.target === groupNode.id && c.targetInput === inputIdentifier);

      // Case 1: both not connected => do nothing
      if (sourceConnection === undefined && groupConnection === undefined) {
        // do nothing
      }
      // Case 2: group connected but source not => cancel transformation
      if (sourceConnection === undefined && groupConnection !== undefined) {
        return null;
      }
      // case 3: source connected but group not => add NodeGroupInputs input and connect to unconnected input inside node group. Also connect the next left source node to the NodeGroup Input+
      if (sourceConnection !== undefined && groupConnection === undefined) {
        transformation.groupInputConnections.push({
          outsideConnectedNode: sourceConnection.source,
          outsideConnectedOutput: sourceConnection.sourceOutput,
          groupInput: getUniqueNestedIdentifier(transformation.groupInputConnections, 'groupInput', inputIdentifier),
        });
      }
      // case 4: both connected => traverse next Node
      if (sourceConnection !== undefined && groupConnection !== undefined) {
        const sourceNode = this.editor.getNode(sourceConnection.source);
        const groupNode = nodeGroupDef.editor.getNode(groupConnection.source);
        if (groupNode instanceof InputsNode) {
          transformation.groupInputConnections.push({
            outsideConnectedNode: sourceConnection.source,
            outsideConnectedOutput: sourceConnection.sourceOutput,
            groupInput: getUniqueNestedIdentifier(transformation.groupInputConnections, 'groupInput', inputIdentifier),
          });
        } else {
          transformation.connections.push(sourceConnection.id); // add the connection
          const newTransformation = this.traverseNode(nodeGroupDef, sourceNode, groupNode, transformation); // add the node
          if (newTransformation === null) {
            return null; // raise failure to transform
          }
          transformation = newTransformation;
        }
      }
    }
    for (const outputIdentifier in sourceNode.outputs) {
      if (Object.prototype.hasOwnProperty.call(sourceNode.outputs, outputIdentifier)) {
        const sourceOutput = sourceNode.outputs[outputIdentifier];

      }
    }
    return transformation;
  }

  /**
   * Applies a transformation by replacing the nodes by a node group
   */
  private async transform(transformation: Transformation): Promise<void> {
    console.log(transformation);
    const subEditor = new GroupEditor();
    // remove connections
    const removedConnections = [];
    for (const connectionId of transformation.connections) {
      removedConnections.push(this.editor.getConnection(connectionId));
      await this.editor.removeConnection(connectionId);
    }
    // move nodes into subEditor
    for (const nodeId of transformation.nodes) {
      const node = this.editor.getNode(nodeId);
      await this.editor.removeNode(nodeId);
      await subEditor.addNode(node);
    }
    // add back connections
    for (const connection of removedConnections) {
      subEditor.addConnection(connection);
    }
    
    const nodeGroupNode = new NodeGroupNode(subEditor, this.editor);
    this.editor.addNode(nodeGroupNode);
    // for (const iterator of transform) {
      
    // }
  }
}

export function getUniqueNestedIdentifier<T extends string>(list: Record<T, string>[], property: T, identifier: string): string {
  while (list.find((e) => e[property] === identifier)) {
    identifier = incrementStringNumber(identifier);
  }
  return identifier;
}


export function getUniqueIdentifier(list: Record<string, any>, identifier: string): string {
  while (list[identifier] !== undefined) {
    identifier = incrementStringNumber(identifier);
  }
  return identifier;
}
