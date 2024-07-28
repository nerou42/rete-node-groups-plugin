import { ClassicPreset } from 'rete';
import { Node } from '../types';
import { Type } from 'formula-ts-helper';
import { AdvancedSocket } from 'rete-advanced-sockets-plugin';

export class OutputsNode extends Node {

  constructor() {
    super('Outputs');
  }

  override addOutput<K extends string>(key: K, output: ClassicPreset.Output<AdvancedSocket<Type>>): void {
    throw new Error('OutputsNode cant have outputs');
  }

  /**
   * Node has no outputs. Use engine.fetchInputs() instead
   */
  override data() {
    return {};
  }
}
