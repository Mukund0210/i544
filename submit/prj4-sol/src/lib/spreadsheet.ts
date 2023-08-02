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
private readonly focusCell = (ev: Event) => {
  const cell = ev.currentTarget as HTMLTableCellElement;
  const expr = cell.getAttribute('data-expr');
  if (expr !== null) {
    cell.textContent = expr;
  }
};

  
/** listener for a blur event on a spreadsheet data cell */
private readonly blurCell = async (ev: Event) => {
  // Get the target cell element
  const cellElement = ev.currentTarget as HTMLElement;

  // Get the cell ID from the element's ID attribute
  const cellId = cellElement.id;

  // Get the trimmed content of the cell
  const trimmedContent = cellElement.textContent?.trim() || '';

  // Check if the content is empty
  if (trimmedContent === '') {
    try {
      // Call the web service to remove the cell if its content is empty
      const removeResult = await this.ws.remove(this.ssName, cellId);

      // Check if the result is an error
      if (!removeResult.isOk) {
        // Display errors if there are any
        this.errors.display(removeResult.errors);
      }
    } catch (err) {
      // Handle any exceptions that occurred during the fetch request
      this.errors.display([new err('An error occurred while removing the cell.')]);
    }
  } else {
    try {
      // Call the web service to evaluate the cell with the new content
      const evaluateResult = await this.ws.evaluate(this.ssName, cellId, trimmedContent);

      // Check if the result is an error
      if (!evaluateResult.isOk) {
        // Display errors if there are any
        this.errors.display(evaluateResult.errors);
      } else {
        // Update the cell with the new expression and value
        const updates = evaluateResult.val;
        for (const cell in updates) {
          // Update the cell's data-expr attribute and text content with the evaluated expression
          const cellElement = document.getElementById(cell);
          if (cellElement) {
            cellElement.setAttribute('data-expr', trimmedContent);
            cellElement.textContent = updates[cell].toString();
          }
        }
      }
    } catch (err) {
      // Handle any exceptions that occurred during the fetch request
      this.errors.display([new err('An error occurred while evaluating the cell.')]);
    }
  }
};

  
/** listener for a copy event on a spreadsheet data cell */
private readonly copyCell = (ev: Event) => {
  // Get the event target, which should be the cell element
  const cellElement = ev.target as HTMLElement;

  // Get the cellId of the cell being copied
  const cellId = cellElement.id;

  // Add the 'is-copy-source' class to the cell element to indicate visually it is the source cell
  cellElement.classList.add('is-copy-source');

  // Remember the cellId in an instance variable to use it later
  this.focusedCellId = cellId;

  // Prevent the default copy behavior (e.g., copying to the clipboard)
  ev.preventDefault();
};

/** listener for a paste event on a spreadsheet data cell */
private readonly pasteCell = async (ev: Event) => {
  const cell = ev.currentTarget as HTMLTableCellElement;
  const destinationCellId = cell.id;
  const sourceCellId = this.focusedCellId;
  
  try {
    // Call the copy web service with destinationCellId and sourceCellId
    const copyResult = await this.ws.copy(this.ssName, destinationCellId, sourceCellId);

    // Check if the result is an error
    if (!copyResult.isOk) {
      // Display errors if there are any
      this.errors.display(copyResult.errors);
      return;
    }

    // If the copy request was successful, update the affected cells
    const updates = copyResult.val;
    for (const [cellId, value] of Object.entries(updates)) {
      const cellToUpdate = document.getElementById(cellId) as HTMLTableCellElement;
      cellToUpdate.textContent = value.toString();
    }

    // Clear any displayed errors
    this.errors.clear();
  } catch (err) {
    // Handle any exceptions that occurred during the fetch request
    this.errors.display([new err('An error occurred while pasting the cell.')]);
  }
};



  /** Replace entire spreadsheet with that from the web services.
   *  Specifically, for each active cell set its data-value and 
   *  data-expr attributes to the corresponding values returned
   *  by the web service and set its text content to the cell value.
   */
/** load initial spreadsheet data into DOM */
private async load() {
  try {
    // Call the web service to get the spreadsheet data
    const dumpResult = await this.ws.dumpWithValues(this.ssName);

    // Check if the result is an error
    if (!dumpResult.isOk) {
      // Display errors if there are any
      this.errors.display(dumpResult.errors);
      return;
    }

    // If the request was successful, update the spreadsheet cells in the DOM
    const dumpData = dumpResult.val;
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell) => {
      const cellId = cell.getAttribute('id');
      const cellData = dumpData.find(([id]) => id === cellId);

      if (cellData) {
        // Set data-expr and data-value attributes
        const [, expr, value] = cellData;
        cell.setAttribute('data-expr', expr);
        cell.setAttribute('data-value', value.toString());
        cell.textContent = value.toString();
      } else {
        // Clear the cell if no data is available
        cell.removeAttribute('data-expr');
        cell.removeAttribute('data-value');
        cell.textContent = '';
      }
    });

    // Clear any displayed errors
    this.errors.clear();
  } catch (err) {
    // Handle any exceptions that occurred during the fetch request
    this.errors.display([new err('An error occurred while loading the spreadsheet.')]);
  }
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
	const cell =
	  makeElement('td', {id, class: 'cell', contentEditable: 'true'});
	row.append(cell);
      }
      ssTable.append(row);
    }
    ssDiv.append(ssTable);
  }

}