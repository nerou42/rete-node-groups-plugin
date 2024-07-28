import { NodeEditor, Root, Scope } from "rete";
import { Scheme } from "./types";
import { NodeGroupNode } from "./nodes/NodeGroupNode";

export class NodeGroupPlugin extends Scope<Root<Scheme>, []> {

  constructor() {
    super('NodeGroupPlugin');
  }

  override setParent(scope: Scope<undefined, []>): void {
    super.setParent(scope);
    const editor = this.parentScope<NodeEditor<Scheme>>(NodeEditor<Scheme>);
    editor.addPipe(async (message) => {
      switch (message.type) {
        case 'connectioncreated':
          const targetNode = editor.getNode(message.data.target);
          if (targetNode instanceof NodeGroupNode) {
            await targetNode.inputConnectionCreated(message.data);
          }
          break;
        case 'connectionremoved':
          const targetNode1 = editor.getNode(message.data.target);
          if (targetNode1 instanceof NodeGroupNode) {
            await targetNode1.inputconnectionRemoved(message.data);
          }
          break;
        // case 'nodecreated':
        //   if (message.data instanceof NodeGroupNode) {
        //     message.data.setEditor(editor);
        //   }
        //   break;
        // case 'noderemoved':
        //   if (message.data instanceof NodeGroupNode) {
        //     message.data.setEditor(undefined);
        //   }
        //   break;
      }
      return message;
    });
  }
}