import { ClassicPreset, NodeEditor } from "rete";
import { InputsNode } from "./nodes/InputsNode";
import { OutputsNode } from "./nodes/OutputsNode";
import { findUnconnectedInputs, findUnconnectedOutputs } from "./utils";
import { Connection, InputPosition, Node, Scheme, Socket } from "./types";
import { getUniqueIdentifier, getUniqueNestedIdentifier } from "./NodeGroupsHelper";

export class GroupEditor<Schemes extends Scheme> extends NodeEditor<Schemes> {
  public readonly inputsNode: InputsNode;
  public readonly outputsNode: OutputsNode;

  /**
   * Maps outputs in inputsNode to their corresponding targets
   */
  private inputsNodeMap: Record<string, InputPosition> = {};

  private outsideConnectedInputs: string[] = [];

  constructor() {
    super();
    this.inputsNode = new InputsNode();
    this.outputsNode = new OutputsNode();
    this.addNode(this.inputsNode);
    this.addNode(this.outputsNode);
  }

  override async addNode(data: Schemes["Node"]): Promise<boolean> {
    const out = await super.addNode(data);
    if (out) this.updateIO();
    return out;
  }

  override async removeNode(id: Schemes["Node"]["id"]): Promise<boolean> {
    const out = await super.removeNode(id);
    if (out) this.updateIO();
    return out;
  }

  override async addConnection(data: Schemes["Connection"], updateIO?: boolean): Promise<boolean> {
    const out = await super.addConnection(data);
    if (out && updateIO) this.updateIO();
    return out;
  }

  override async removeConnection(id: Schemes["Connection"]["id"], updateIO?: boolean): Promise<boolean> {
    const out = await super.removeConnection(id);
    if (out && updateIO) this.updateIO();
    return out;
  }

  override async clear(): Promise<boolean> {
    const out = await super.clear();
    if (out) {
      this.addNode(this.inputsNode);
      this.addNode(this.outputsNode);
      this.updateIO();
    }
    return out;
  }

  /**
   * Gets called by NodeGroupPlugin
   */
  async outerInputConnected(identifier: string) {
    await this.connectInputsNode(identifier);
    this.outsideConnectedInputs.push(identifier);
    await this.updateIO();
  }

  /**
   * Gets called by NodeGroupPlugin
   */
  async outerInputDisconnected(identifier: string) {
    if (!this.inputsNode.hasOutput(identifier) || this.inputsNodeMap[identifier] === undefined) {
      throw new Error('Invalid identifier ' + identifier);
    }
    const targetPosition = this.inputsNodeMap[identifier];
    const targetNode = this.getNode(targetPosition.node);
    const innerConnection = this.getConnections().find((c) => c.source === this.inputsNode.id && c.sourceOutput === identifier && c.target === targetNode.id && c.targetInput === targetPosition.input);
    if (innerConnection === undefined) {
      throw new Error('Inner connection doesn\'t exist');
    }
    await this.removeConnection(innerConnection.id);
    this.outsideConnectedInputs.push(identifier);
    await this.updateIO();
  }

  getOuterInputs(): Record<string, ClassicPreset.Input<Socket>> {
    const outerInputs: Record<string, ClassicPreset.Input<Socket>> = {};
    for (const identifier in this.inputsNode.outputs) {
      if (Object.prototype.hasOwnProperty.call(this.inputsNode.outputs, identifier)) {
        const output = this.inputsNode.outputs[identifier];
        outerInputs[identifier] = new ClassicPreset.Input(output!.socket, output!.label);
      }
    }
    return outerInputs;
  }

  getOuterOutputs(): Record<string, ClassicPreset.Output<Socket>> {
    const outerOutputs: Record<string, ClassicPreset.Output<Socket>> = {};
    for (const identifier in this.outputsNode.inputs) {
      if (Object.prototype.hasOwnProperty.call(this.outputsNode.inputs, identifier)) {
        const input = this.outputsNode.inputs[identifier];
        outerOutputs[identifier] = new ClassicPreset.Output(input!.socket, input!.label);
      }
    }
    return outerOutputs;
  }

  private async connectInputsNode(outputIdentifier: string) {
    if (!this.inputsNode.hasOutput(outputIdentifier) || this.inputsNodeMap[outputIdentifier] === undefined) {
      throw new Error('Invalid identifier ' + outputIdentifier);
    }
    const targetPosition = this.inputsNodeMap[outputIdentifier];
    const targetNode = this.getNode(targetPosition.node);
    const innerConnection = new Connection<Node, Node>(this.inputsNode, outputIdentifier, targetNode, targetPosition.input);
    await this.addConnection(innerConnection);
  }

  private async updateIO() {
    // remove all connections from inputsNode as outputs and outputsNode
    const removals = this.getConnections().filter((c) => c.source === this.inputsNode.id || c.target === this.outputsNode.id);
    for (const removal of removals) {
      await this.removeConnection(removal.id, false);
    }

    // find unconnected inputs and add them to inputsNode
    const unconnectedInputs = findUnconnectedInputs(this, [this.outputsNode]);
    for (const unconnectedInput of unconnectedInputs) {

      const identifier = getUniqueIdentifier(this.inputsNode.outputs, unconnectedInput.input);
      if (!this.inputsNode.hasOutput(identifier)) {
        const input = this.getNode(unconnectedInput.node).inputs[unconnectedInput.input];
        const output = new ClassicPreset.Output(input!.socket, input!.label);
        this.inputsNode.addOutput(identifier, output);
      }
    }

    // restore inputsNode connections
    for (const outsideConnectedInput of this.outsideConnectedInputs) {
      await this.connectInputsNode(outsideConnectedInput);
    }
    // find unconnected outputs and add them as inputs to outputsNode and add the connections
    const unconnectedOutputs = findUnconnectedOutputs(this, [this.inputsNode]);
    for (const unconnectedOutput of unconnectedOutputs) {
      const identifier = getUniqueIdentifier(this.outputsNode.inputs, unconnectedOutput.output);
      const output = this.getNode(unconnectedOutput.node).outputs[unconnectedOutput.output];
      const input = new ClassicPreset.Input(output!.socket, output!.label);
      this.outputsNode.addInput(identifier, input);
      const connection = new Connection<Node, Node>(this.getNode(unconnectedOutput.node), unconnectedOutput.output, this.outputsNode, identifier);
      await this.addConnection(connection, false);
      return;
    }
  }
}
