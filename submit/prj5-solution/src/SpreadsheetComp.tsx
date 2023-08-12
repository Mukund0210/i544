import React, { useState } from "react";
import SpreadsheetWs from "./ss-ws";

const [N_ROWS, N_COLS] = [10, 10];

function SpreadSheetComp({ ws, ssName, errors }: any) {
  console.log(ws, ssName);

  const [focusedCellId, setFocusedCellId] = useState("");
  const [copySrcCellId, setCopySrcCellId] = useState("");

  const clearSpreadsheet = async (ev: any) => {
    ev.stopPropagation();
    ev.preventDefault();
    const clearResult = await ws.clear(ssName);
    if (clearResult.isOk) {
      errors.clear();
      document.querySelectorAll(".cell").forEach((c) => {
        c.setAttribute("data-value", "");
        c.setAttribute("data-expr", "");
        c.textContent = "";
      });
    } else {
      errors.display(clearResult.errors);
    }
  };
  /** listener for a focus event on a spreadsheet data cell */
  const focusCell = (ev: any) => {
    console.log(132234342);
    
    ev.stopPropagation();
    const target = ev.target! as HTMLElement;
    target.textContent = target.getAttribute("data-expr");
    setFocusedCellId(target.id);
  };

  const A_CODE = "A".charCodeAt(0);
  const a_CODE = "a".charCodeAt(0);

  /** listener for a blur event on a spreadsheet data cell */
  const blurCell = async (ev: any) => {
    ev.stopPropagation();
    const target = ev.target! as HTMLElement;
    const cellId = target.id;
    const expr = target.textContent!.trim();
    const updatesResult =
      expr.length > 0
        ? await ws.evaluate(ssName!, cellId, expr)
        : await ws.remove(ssName!, cellId);
    if (updatesResult.isOk) {
      errors.clear();
      target.setAttribute("data-expr", expr);
      update(updatesResult.val);
    } else {
      target.textContent = target.getAttribute("data-value");
      errors.display(updatesResult.errors);
    }
    setFocusedCellId("");
  };

  /** update spreadsheet cells in DOM with updates */
  function update(updates: Record<string, number>) {
    for (const [cellId, value] of Object.entries(updates)) {
      if (cellId !== focusedCellId) {
        const cell = document.querySelector(`#${cellId}`)!;
        const val = value.toString();
        cell.textContent = val;
        cell.setAttribute("data-value", val);
      }
    }
  }

  function copyCell(ev: any) {
    ev.stopPropagation();
    ev.preventDefault();
    const target = ev.target! as HTMLElement;
    target.classList.add("is-copy-source");
    setCopySrcCellId(target.id);
  }

  const pasteCell = async (ev: any) => {
    ev.stopPropagation();
    ev.preventDefault();
    if (!copySrcCellId) return;
    const srcCellId = copySrcCellId;
    setCopySrcCellId("");
    const target = ev.target! as HTMLElement;
    const destCellId = target.id;
    const updatesResult = await ws.copy(ssName, destCellId, srcCellId);
    const queryResult = await ws.query(ssName, destCellId);
    if (updatesResult.isOk && queryResult.isOk) {
      errors.clear();
      update(updatesResult.val);
      target.setAttribute("data-expr", queryResult.val.expr);
      target.textContent = target.getAttribute("data-expr");
      document
        .querySelector(`#${srcCellId}`)!
        .classList.remove("is-copy-source");
    } else if (!updatesResult.isOk) {
      errors.display(updatesResult.errors);
    } else if (!queryResult.isOk) {
      errors.display(queryResult.errors);
    }
  };

  const createTableCell = (rowIndex: any, colIndex: any) => {
    const colId = String.fromCharCode(a_CODE + colIndex);
    const id = colId + (rowIndex + 1);
    return (
      <td
        key={id}
        id={id}
        className="cell"
        contentEditable="true"
        onFocus={(ev) => {
          focusCell(ev);
        }}
        onBlur={(ev) => {
          blurCell(ev);
        }}
        onCopy={(ev) => {
          copyCell(ev);
        }}
        onPaste={(ev) => {
          pasteCell(ev);
        }}
      ></td>
    );
  };

  const createTableRow = (rowIndex: any) => {
    return (
      <tr key={rowIndex}>
        <th>{rowIndex + 1}</th>
        {Array.from({ length: N_COLS }, (_, colIndex) =>
          createTableCell(rowIndex, colIndex)
        )}
      </tr>
    );
  };

  const createTable = () => {
    const tableRows = Array.from({ length: N_ROWS }, (_, rowIndex) =>
      createTableRow(rowIndex)
    );

    return (
      <table>
        <thead>
          <tr>
            <td>
              <button onClick={clearSpreadsheet} id="clear" type="button">
                Clear
              </button>
            </td>
            {Array.from({ length: N_COLS }, (_, colIndex) => (
              <th key={colIndex}>{String.fromCharCode(A_CODE + colIndex)}</th>
            ))}
          </tr>
        </thead>
        <tbody>{tableRows}</tbody>
      </table>
    );
  };

  return <div id="ss">{createTable()}</div>;
}

export default SpreadSheetComp;