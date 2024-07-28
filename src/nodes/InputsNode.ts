import { Type } from 'formula-ts-helper';
import { ClassicPreset } from 'rete';
import { Node } from '../types';

export type InputMeta = Record<string, Type>;

export class InputsNode extends Node {

  private values?: Record<string, any>;

  constructor() {
    super('Inputs');
  }

  override addInput<K extends string>(key: K, input: ClassicPreset.Input<ClassicPreset.Socket>): void {
    throw new Error('InputsNode can\'t have inputs');
  }

  setValues(values: Record<string, any>): void {
    this.values = values;
  }

  data(inputs: Record<string, any>): Record<string, any> {
    if(this.values === undefined) {
      throw new Error('Values of inputs are not yet set');
    }
    return this.values;
  }
}
