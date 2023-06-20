import { default as parse, CellRef, Ast } from './expr-parser.js';
import { Result, okResult, errResult } from 'cs544-js-utils';

// Factory method
export default async function makeSpreadsheet(name: string): Promise<Result<Spreadsheet>> {
  return okResult(new Spreadsheet(name));
}

type Updates = { [cellId: string]: number };

export class Spreadsheet {
  readonly name: string;
  private cells: Map<string, number>;
  private dependencies: Map<string, Set<string>>;

  constructor(name: string) {
    this.name = name;
    this.cells = new Map<string, number>();
    this.dependencies = new Map<string, Set<string>>();
  }

  async eval(cellId: string, expr: string): Promise<Result<Updates>> {
    try {
      const ast: Ast = parse(expr);
      const baseCellRef: CellRef = CellRef.parse(cellId);
      const result = this.evaluateAST(ast, baseCellRef);
      this.updateCells(cellId, result.updatedCells);
      return okResult(result.updatedCells);
    } catch (error) {
      return errResult({ code: 'SYNTAX', message: error.message });
    }
  }

  private evaluateAST(ast: Ast, baseCellRef: CellRef): EvaluationResult {
    switch (ast.kind) {
      case 'num':
        return { value: ast.value, updatedCells: {} };
      case 'app':
        const fn = FNS[ast.fn];
        const args = ast.kids.map((kid) => this.evaluateAST(kid, baseCellRef));
        const argValues = args.map((arg) => arg.value);
        const resultValue = fn(...argValues);
        const updatedCells = args.reduce(
          (acc, arg) => Object.assign(acc, arg.updatedCells),
          {}
        );
        return { value: resultValue, updatedCells };
      case 'cell':
        const cellId = ast.toText(baseCellRef);
        if (this.isCircularReference(baseCellRef, ast)) {
          throw new Error('Circular reference detected');
        }
        const cellValue = this.cells.get(cellId) || 0;
        return { value: cellValue, updatedCells: { [cellId]: cellValue } };
      default:
        throw new Error(`Unsupported AST kind: ${ast.kind}`);
    }
  }

  private updateCells(baseCellId: string, updatedCells: Updates): void {
    this.cells.set(baseCellId, updatedCells[baseCellId]);
    const dependents = this.dependencies.get(baseCellId) || new Set<string>();
    dependents.forEach((dependentCellId) => {
      const dependentCellValue = this.evaluateCell(dependentCellId);
      this.cells.set(dependentCellId, dependentCellValue);
    });
  }

  private evaluateCell(cellId: string): number {
    const cellValue = this.cells.get(cellId) || 0;
    const ast = parse(cellValue.toString());
    const baseCellRef = CellRef.parse(cellId);
    return this.evaluateAST(ast, baseCellRef).value;
  }

  private isCircularReference(baseCellRef: CellRef, targetCell: Ast): boolean {
    const stack: string[] = [];
    const targetCellId = targetCell.toText(baseCellRef);

    const dfs = (cellRef: CellRef): boolean => {
      const cellId = cellRef.toText();
      if (cellId === targetCellId) {
        return true; // Circular reference detected
      }
      if (stack.includes(cellId)) {
        return false; // Not a circular reference in this path
      }
      stack.push(cellId);
      const dependencies = this.dependencies.get(cellId);
      if (dependencies) {
        for (const dependency of dependencies) {
          const dependentCellRef = CellRef.parse(dependency);
          if (dfs(dependentCellRef)) {
            return true; // Circular reference detected in a dependent cell
          }
        }
      }
      stack.pop();
      return false;
    };

    return dfs(baseCellRef);
  }

  // Additional methods (if needed)
}

// Additional classes and/or functions (if needed)

const FNS = {
  '+': (a: number, b: number): number => a + b,
  '-': (a: number, b?: number): number => (b === undefined ? -a : a - b),
  '*': (a: number, b: number): number => a * b,
  '/': (a: number, b: number): number => a / b,
  min: (a: number, b: number): number => Math.min(a, b),
  max: (a: number, b: number): number => Math.max(a, b),
};

interface EvaluationResult {
  value: number;
  updatedCells: Updates;
}