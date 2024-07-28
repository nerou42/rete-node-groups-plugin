import { ConnectionId, NodeEditor } from 'rete';
import { DataflowEngine } from 'rete-engine';
import { Connection, Node, Scheme } from '../types';
import { GroupEditor } from '../GroupEditor';

export interface NodeGroupNodeDependencies {
  getConnections(): Connection[];
  removeConnection(id: ConnectionId): Promise<boolean>;
}

export class NodeGroupNode extends Node {

  private engine: DataflowEngine<any>;

  private readonly subEditor: GroupEditor<Scheme>;

  private editor: NodeGroupNodeDependencies;

  constructor(subEditor: GroupEditor<Scheme>, editor: NodeGroupNodeDependencies) {
    super('NodeGroup');
    this.editor = editor;
    this.engine = new DataflowEngine();
    this.subEditor = subEditor;
    subEditor.use(this.engine);
    this.updateIO();
  }

  async inputConnectionCreated(connection: Connection) {
    await this.subEditor.outerInputConnected(connection.targetInput);
    this.updateIO();
  }

  async inputconnectionRemoved(connection: Connection) {
    await this.subEditor.outerInputDisconnected(connection.targetInput);
    this.updateIO();
  }

  private async updateIO() {
    // remove all inputs and outputs
    this.removeAllInputs();
    this.removeAllOutputs();
    // add back inputs
    const inputs = this.subEditor.getOuterInputs();
    for (const identifier in inputs) {
      if (Object.prototype.hasOwnProperty.call(inputs, identifier)) {
        this.addInput(identifier, inputs[identifier]);
      }
    }
    // and outputs
    const outputs = this.subEditor.getOuterOutputs();
    for (const identifier in outputs) {
      if (Object.prototype.hasOwnProperty.call(outputs, identifier)) {
        this.addOutput(identifier, outputs[identifier]);
      }
    }
    // remove dead connections
    const removals = this.editor.getConnections().filter((c) => (c.target === this.id && inputs[c.targetInput] === undefined) || (c.source === this.id && outputs[c.sourceOutput] === undefined));
    for (const removal of removals) {
      await this.editor.removeConnection(removal.id);
    }
  }

  private removeAllInputs(): void {
    for (const identifier in this.inputs) {
      if (Object.prototype.hasOwnProperty.call(this.inputs, identifier)) {
        this.removeInput(identifier);
      }
    }
  }

  private removeAllOutputs(): void {
    for (const identifier in this.inputs) {
      if (Object.prototype.hasOwnProperty.call(this.inputs, identifier)) {
        this.removeOutput(identifier);
      }
    }
  }

  data(inputs: Record<string, any>): Promise<Record<string, any>> {
    this.subEditor.inputsNode.setValues(inputs);
    this.engine.reset();
    return this.engine.fetchInputs(this.subEditor.outputsNode.id);
  }
}
