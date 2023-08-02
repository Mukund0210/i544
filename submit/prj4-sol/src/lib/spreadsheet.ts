import SpreadsheetWs from './ss-ws.js';

import { Result, okResult, errResult } from 'cs544-js-utils';

import { Errors, makeElement } from './utils.js';

const [N_ROWS, N_COLS] = [10, 10];

export default async function make(ws: SpreadsheetWs, ssName: string) {
  return await Spreadsheet.make(ws, ssName);
}


class Spreadsheet {

  private readonly ws: SpreadsheetWs;
  private readonly ssName: string;
  private readonly errors: Errors;
  focusedCellId: string;
  //TODO: add more instance variables
  private copySourceCellId: string | null = null;
  
  constructor(ws: SpreadsheetWs, ssName: string) {
    this.ws = ws; this.ssName = ssName;
    this.errors = new Errors();
    this.makeEmptySS();
    this.addListeners();
    //TODO: initialize added instance variables
  }

  static async make(ws: SpreadsheetWs, ssName: string) {
    const ss = new Spreadsheet(ws, ssName);
    await ss.load();
    return ss;
  }

  /** add listeners for different events on table elements */
  private addListeners() {
    //TODO: add listeners for #clear and .cell
    // const clearButton = document.querySelector('#clear')!;
    // clearButton.addEventListener('click', this.clearSpreadsheet);

    const clearButton = document.querySelector('#clear')!;
    clearButton.addEventListener('click', this.clearSpreadsheet);
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
      cell.addEventListener('focus', this.focusCell);
      cell.addEventListener('blur', this.blurCell);
      cell.addEventListener('copy', this.copyCell);
      cell.addEventListener('paste', this.pasteCell);
    });
  }

  /** listener for a click event on #clear button */
  private readonly clearSpreadsheet = async (ev: Event) => {
    try {
      // Call the web service to clear the spreadsheet
      const clearResult = await this.ws.clear(this.ssName);
  
      // Check if the result is an error
      if (!clearResult.isOk) {
        // Display errors if there are any
        this.errors.display(clearResult.errors);
        return;
      }
  
      // If the clear request was successful, clear the content and attributes of all .cell elements
      const cells = document.querySelectorAll('.cell');
      cells.forEach((cell) => {
        cell.textContent = '';
        cell.removeAttribute('data-expr');
        cell.removeAttribute('data-value');
      });
  
      // Clear any displayed errors
      this.errors.clear();
    } catch (err) {
      // Handle any exceptions that occurred during the fetch request
      this.errors.display([new err('An error occurred while clearing the spreadsheet.')]);
    }
  };
 
  /** listener for a focus event on a spreadsheet data cell */
/** listener for a focus event on a spreadsheet data cell */
private readonly focusCell = (ev: Event) => {
  const cell = ev.currentTarget as HTMLElement;
  const expr = cell.getAttribute('data-expr');

  // Update the formula bar to show the cell's value
  const formulaBar = document.getElementById('formula-bar')!;
  formulaBar.textContent = expr !== null ? expr : '';
};


  
/** listener for a blur event on a spreadsheet data cell */
private readonly blurCell = async (ev: Event) => {
  const targetCell = ev.target as HTMLElement;
  const cellId = targetCell.id;

  try {
    // Read the content of the cell when it loses focus
    const cellContent = targetCell.textContent?.trim() || '';

    // Check if the cell content is empty
    if (cellContent === '') {
      // If the cell is empty, remove the cell's formula by calling the remove web service
      const removeResult = await this.ws.remove(this.ssName, cellId);

      // Check if the result is an error
      if (!removeResult.isOk) {
        // Display errors if there are any
        this.errors.display(removeResult.errors);
      } else {
        // If the remove request was successful, update the cell in the DOM
        targetCell.setAttribute('data-expr', '');
        targetCell.setAttribute('data-value', '');
        targetCell.classList.remove('is-copy-source');
      }
    } else {
      // If the cell is not empty, evaluate the cell's formula by calling the evaluate web service
      const evalResult = await this.ws.evaluate(this.ssName, cellId, cellContent);

      // Check if the result is an error
      if (!evalResult.isOk) {
        // Display errors if there are any
        this.errors.display(evalResult.errors);
      } else {
        // If the evaluation request was successful, update the cell in the DOM
        const updates = evalResult.val;
        targetCell.setAttribute('data-expr', cellContent);
        targetCell.setAttribute('data-value', updates[cellId].toString());
        targetCell.classList.remove('is-copy-source');
      }
    }
  } catch (err) {
    // Handle any exceptions that occurred during the fetch request
    this.errors.display([new err('An error occurred while updating the cell.')]);
  }
};

  
/** listener for a copy event on a spreadsheet data cell */
private readonly copyCell = (ev: Event) => {
  const cell = ev.currentTarget as HTMLElement;
  const cellId = cell.getAttribute('id')!;

  // Remember the cellId as the source of the copy
  this.copySourceCellId = cellId;

  // Add the 'is-copy-source' class to the source cell element
  cell.classList.add('is-copy-source');
};


  /** listener for a paste event on a spreadsheet data cell */
  private readonly pasteCell = async (ev: Event) => {
    //TODO
  };

  /** Replace entire spreadsheet with that from the web services.
   *  Specifically, for each active cell set its data-value and 
   *  data-expr attributes to the corresponding values returned
   *  by the web service and set its text content to the cell value.
   */
  /** load initial spreadsheet data into DOM */
  private async load() {
    //TODO
  }

  
  private makeEmptySS() {
    const ssDiv = document.querySelector('#ss')!;
    ssDiv.innerHTML = '';
    const ssTable = makeElement('table');
    const header = makeElement('tr');
    const clearCell = makeElement('td');
    const clear = makeElement('button', {id: 'clear', type: 'button'}, 'Clear');
    clearCell.append(clear);
    header.append(clearCell);
    const A = 'A'.charCodeAt(0);
    for (let i = 0; i < N_COLS; i++) {
      header.append(makeElement('th', {}, String.fromCharCode(A + i)));
    }
    ssTable.append(header);
    for (let i = 0; i < N_ROWS; i++) {
      const row = makeElement('tr');
      row.append(makeElement('th', {}, (i + 1).toString()));
      const a = 'a'.charCodeAt(0);
      for (let j = 0; j < N_COLS; j++) {
        const colId = String.fromCharCode(a + j);
        const id = colId + (i + 1);
        const cell = makeElement('td', {id, class: 'cell', contentEditable: 'true'});
        cell.addEventListener('focusin', this.focusCell); // Add the event listener here
        row.append(cell);
      }
      ssTable.append(row);
    }
    ssDiv.append(ssTable);
  }

}