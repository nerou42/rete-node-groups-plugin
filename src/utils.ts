import { NodeEditor } from "rete";
import { InputPosition, Node, OutputPosition, Scheme } from "./types";

export function findPositions(editor: NodeEditor<Scheme>, nodeLabel: string, output: string): OutputPosition[] {
  const positions: OutputPosition[] = [];
  for (const node of editor.getNodes().filter((node) => node.label === nodeLabel)) {
    if (node.hasOutput(output)) {
      positions.push({
        node: node.id,
        output: output,
      });
    }
  }
  return positions;
}

export function compareControls(nodeA: Node, nodeB: Node): boolean {
  for (const identifier in nodeA.controls) {
    if (Object.prototype.hasOwnProperty.call(nodeA.controls, identifier)) {
      const controlA = nodeA.controls[identifier];
      if (nodeB.controls[identifier] === undefined) {
        return false;
      }
      const controlB = nodeB.controls[identifier];
      if (controlA === undefined && controlB === undefined) {
        return true;
      }
      if (controlA === undefined || controlB === undefined) {
        return false;
      }
      if (controlA.getValue() !== controlB.getValue()) {
        return false;
      }
    }
  }
  return true;
}

export function findUnconnectedOutputs(editor: NodeEditor<Scheme>, exclude?: Node[]): OutputPosition[] {
  const unconnected: OutputPosition[] = [];
  for (const node of editor.getNodes()) {
    if(exclude !== undefined && exclude.includes(node)) {
      continue;
    }
    for (const output in node.outputs) {
      if (Object.prototype.hasOwnProperty.call(node.outputs, output)) {
        const connection = editor.getConnections().find((c) => c.source === node.id && c.sourceOutput === output);
        if (connection === undefined) { // no connection found
          unconnected.push({ node: node.id, output: output });
        }
      }
    }
  }
  return unconnected;
}

export function findUnconnectedInputs(editor: NodeEditor<Scheme>, exclude?: Node[]): InputPosition[] {
  const unconnected: InputPosition[] = [];
  for (const node of editor.getNodes()) {
    if(exclude !== undefined && exclude.includes(node)) {
      continue;
    }
    for (const input in node.inputs) {
      if (Object.prototype.hasOwnProperty.call(node.inputs, input)) {
        const connection = editor.getConnections().find((c) => c.target === node.id && c.targetInput === input);
        if (connection === undefined) { // no connection found
          unconnected.push({ node: node.id, input: input });
        }
      }
    }
  }
  return unconnected;
}

export function incrementStringNumber(input: string): string {
  // Regular expression to find the trailing number in the string
  const regex = /(.*?)(\d+)?$/;
  
  // Executing the regex on the input string
  const match = input.match(regex);

  if (!match) {
    // If there is no match (although it should always match), return the input appended with " 2"
    return `${input} 2`;
  }

  // Extracting the different parts from the regex match
  const baseString = match[1]; // This is the base part of the string without the number
  const numberPart = match[2]; // This is the trailing number part (if any)

  if (numberPart) {
    // If a number part exists, increment it by 1
    const incrementedNumber = parseInt(numberPart) + 1;
    return `${baseString}${incrementedNumber}`;
  } else {
    // If no number part exists, append " 2"
    return `${baseString}2`;
  }
}
