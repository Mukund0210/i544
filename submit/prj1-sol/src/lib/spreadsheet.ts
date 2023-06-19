import { Result, okResult, errResult } from 'cs544-js-utils';
import parse, { CellRef, Ast, NumAst, AppAst, RefAst } from '../lib/expr-parser.js';

type Updates = { [cellId: string]: number };

export class Spreadsheet {
  readonly name: string;
  private cells: { [cellId: string]: number };

  constructor(name: string) {
    this.name = name;
    this.cells = {};
  }

  async eval(cellId: string, expr: string): Promise<Result<Updates>> {
    try {
      const astResult = parse(expr, new CellRef(cellId));
      if (astResult.isErr()) {
        throw new Error(astResult.err());
      }
      const ast = astResult.val();
      const value = this.evaluateExpression(ast);
      if (typeof value !== 'number' || isNaN(value)) {
        throw new Error();
      }
      const updates: Updates = { [cellId]: value };
      return okResult(updates);
    } catch (error) {
      return errResult('SYNTAX', 'Invalid formula syntax');
    }
  }

  private evaluateExpression(ast: Ast): number {
    if (ast instanceof NumAst) {
      return ast.value;
    } else if (ast instanceof AppAst) {
      const operator = ast.operator;
      const operands = ast.operands.map((operand) => this.evaluateExpression(operand));
      const FNS = {
        '+': (a: number, b: number): number => a + b,
        '-': (a: number, b: number): number => a - b,
        '*': (a: number, b: number): number => a * b,
        '/': (a: number, b: number): number => a / b,
      };
      if (operator in FNS) {
        return FNS[operator](...operands);
      } else {
        throw new Error(`Unsupported operator: ${operator}`);
      }
    } else if (ast instanceof RefAst) {
      const cellId = ast.value.toString();
      const cellValue = this.cells[cellId];
      if (cellValue === undefined) {
        throw new Error(`Cell reference not found: ${cellId}`);
      }
      return cellValue;
    } else {
      throw new Error(`Invalid AST node: ${ast}`);
    }
  }
}

export default async function makeSpreadsheet(name: string): Promise<Result<Spreadsheet>> {
  return okResult(new Spreadsheet(name));
}
