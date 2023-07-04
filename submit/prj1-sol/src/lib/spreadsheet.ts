import { default as parse, CellRef, Ast } from './expr-parser.js';
import { Result, okResult, errResult } from 'cs544-js-utils';

const FNS = {
  '+': (a: number, b: number): number => a + b,
  '-': (a: number, b?: number): number => (b === undefined ? -a : a - b),
  '*': (a: number, b: number): number => a * b,
  '/': (a: number, b: number): number => a / b,
  min: (a: number, b: number): number => Math.min(a, b),
  max: (a: number, b: number): number => Math.max(a, b),
};

type Updates = { [cellId: string]: number };

export class Spreadsheet {
  readonly name: string;
  private cells: { [cellId: string]: Ast | null } = {}; // Map cellId to its AST representation

  constructor(name: string) {
    this.name = name;
  }

  /** Set cell with id cellId to result of evaluating formula
   *  specified by the string expr.  Update all cells which are
   *  directly or indirectly dependent on the base cell cellId.
   *  Return an object mapping the id's of all updated cells to
   *  their updated values.
   *
   *  Errors must be reported by returning an error Result having its
   *  code options property set to `SYNTAX` for a syntax error and
   *  `CIRCULAR_REF` for a circular reference and message property set
   *  to a suitable error message.
   */
  async eval(cellId: string, expr: string): Promise<Result<Updates>> {
    try {
      const ast = parse(expr); // Parse the expression string into an AST
      this.cells[cellId] = ast; // Store the AST for the given cellId
      const updatedCells: Updates = {}; // Map to store updated cell values

      // Evaluate the AST of the current cell and its dependencies
      this.evaluateCell(cellId, updatedCells);

      return okResult(updatedCells);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return errResult({ code: 'SYNTAX', message: error.message });
      } else {
        return errResult({ code: 'CIRCULAR_REF', message: 'Circular reference detected' });
      }
    }
  }

  private evaluateCell(cellId: string, updatedCells: Updates): number {
    // If the cell is already evaluated, return its value
    if (cellId in updatedCells) {
      return updatedCells[cellId];
    }

    // If the cell has a circular reference, throw an error
    if (cellId in this.cells && this.cells[cellId] === null) {
      throw new Error('Circular reference detected');
    }

    // Mark the current cell as being evaluated to detect circular references
    this.cells[cellId] = null;

    const ast = this.cells[cellId]; // Get the AST for the current cell

    // Evaluate the AST based on the node type
    let value: number;
    if (ast && ast.type === 'number') {
      value = ast.value; // Numeric value
    } else if (ast && ast.type === 'ref') {
      value = this.evaluateCell(ast.id, updatedCells); // Reference to another cell
    } else if (ast && ast.type === 'binop') {
      const left = this.evaluateCell(ast.left, updatedCells); // Evaluate the left operand
      const right = this.evaluateCell(ast.right, updatedCells); // Evaluate the right operand

      // Check if the operator is a valid function
      if (!(ast.op in FNS)) {
        throw new Error(`Invalid operator: ${ast.op}`);
      }

      // Apply the operator function to the operands
      value = FNS[ast.op](left, right);
    } else {
      throw new Error(`Invalid AST: ${ast}`);
    }

    // Update the value of the current cell
    updatedCells[cellId] = value;

    return value;
  }
}

// Usage example
const spreadsheet = new Spreadsheet('My Spreadsheet');
await spreadsheet.eval('A1', '42');
await spreadsheet.eval('B1', 'A1 * 2');
const result = await spreadsheet.eval('B1', 'A1 * 2');

if (result.isOk()) {
  console.log(result.value); // Output: { B1: 84 }
} else {
  console.log(result.error.message);
}
