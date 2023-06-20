import {default as parse, CellRef, Ast } from './expr-parser.js';

import { Result, okResult, errResult, ErrResult } from 'cs544-js-utils';

//factory method

type Updates = { [cellId: string]: number };

export class Spreadsheet {

  readonly name: string;
  //TODO: add other instance variable declarations  
  private cells: { [cellId: string]: number };
  constructor(name: string) {
    this.name = name;
    //TODO: add initializations for other instance variables
    this.cells = {};
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
      const ast: Result<Ast> = parse(expr);
      const value = evaluateAST(ast, cellId);
 // Evaluate the expression using the eval() function
      if (typeof value !== 'number' || isNaN(value)) {
        throw new Error(); // Throw an error if the evaluated value is not a valid number
      }
      const updates: Updates = { [cellId]: value }; // Create an update object with the cellId and its evaluated value
      return okResult(updates); // Return the updates
    } catch (error) {
      return errResult('SYNTAX', 'Invalid formula syntax'); // Return a syntax error if the expression is not a valid formula
    }
  }
  
  function evaluateAST(ast: Ast, baseCellId: string): number {
    switch (ast.kind) {
      case 'num':
        return ast.value;
      case 'app':
        const args = ast.kids.map((kid) => evaluateAST(kid, baseCellId));
        if (FNS.hasOwnProperty(ast.fn)) {
          const fn = FNS[ast.fn];
          return fn(...args);
        }
        throw new Error(`Unknown function: ${ast.fn}`);
      case 'cell':
        const cellRef: CellRef = CellRef.parse(ast.ref);
        const referencedCellId = cellRef.toCellId(baseCellId);
        if (spreadsheet.cells.hasOwnProperty(referencedCellId)) {
          return spreadsheet.cells[referencedCellId];
        }
        return 0; // Return 0 for an unassigned cell
      default:
        throw new Error(`Invalid AST node kind: ${ast.kind}`);
    }
  }
  
  
}

const spreadsheet = new Spreadsheet('My Spreadsheet');

//TODO: add additional classes and/or functions


const FNS = {
  '+': (a:number, b:number) : number => a + b,
  '-': (a:number, b?:number) : number => b === undefined ? -a : a - b,
  '*': (a:number, b:number) : number => a * b,
  '/': (a:number, b:number) : number => a / b,
  min: (a:number, b:number) : number => Math.min(a, b),
  max: (a:number, b:number) : number => Math.max(a, b),
}

export default async function makeSpreadsheet(name: string) :
  Promise<Result<Spreadsheet>>
{
  return okResult(new Spreadsheet(name));
}