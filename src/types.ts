import { ClassicPreset, GetSchemes, NodeId } from "rete";

export type Control = ClassicPreset.Control & { getValue(): any };

export type Socket = ClassicPreset.Socket;

export abstract class Node extends ClassicPreset.Node<{
  [key in string]?: Socket;
}, {
    [key in string]?: Socket;
  }, {
    [key in string]?: Control;
  }> {
  abstract data(inputs: Record<string, any>): Promise<Record<string, any>> | Record<string, any>;
}

export class Connection<A extends Node = Node, B extends Node = Node> extends ClassicPreset.Connection<A, B> {}

export type Scheme = GetSchemes<Node, Connection>;

export interface OutputPosition {
  node: NodeId;
  output: string;
}

export interface InputPosition {
  node: NodeId;
  input: string;
}