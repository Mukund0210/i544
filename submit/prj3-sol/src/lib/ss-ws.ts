import cors from 'cors';
import Express from 'express';
import bodyparser from 'body-parser';
import assert from 'assert';
import STATUS from 'http-status';

import { Result, okResult, errResult, Err, ErrResult } from 'cs544-js-utils';

import { SpreadsheetServices as SSServices, SpreadsheetServices } from 'cs544-prj2-sol';

import { SelfLink, SuccessEnvelope, ErrorEnvelope }
  from './response-envelopes.js';
import { Updates } from 'cs544-prj2-sol/dist/lib/spreadsheet.js';

export type App = Express.Application;


export function makeApp(ssServices: SSServices, base = '/api')
  : App
{
  const app = Express();
  app.locals.ssServices = ssServices;
  app.locals.base = base;
  setupRoutes(app);
  return app;
}

/******************************** Routing ******************************/

const CORS_OPTIONS = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204,
  exposedHeaders: 'Location',
};

function setupRoutes(app: Express.Application) {
  const base = app.locals.base;
  app.use(cors(CORS_OPTIONS));  //will be explained towards end of course
  app.use(Express.json());  //all request bodies parsed as JSON.

  //routes for individual cells
  //TODO
  app.get(`${base}/:ssName/:cellId`, getCellHandler);
  app.patch(`${base}/:ssName/:cellId`, setCellHandler);
  // app.patch(`${base}/:ssName/:cellId/copy`, copyCellHandler);
  app.patch('/api/:SS_NAME/:CELL_ID', copyCellHandler(app));
  app.delete(`${base}/:ssName/:cellId`, deleteCellHandler);
  app.delete(`${base}/:ssName`, clearSpreadsheetHandler);
  app.put(`${base}/:ssName`, loadSpreadsheetHandler);
  app.get(`${base}/:ssName`, getSpreadsheetHandler);

  //routes for entire spreadsheets
  //TODO

  //generic handlers: must be last
  app.use(make404Handler(app));
  app.use(makeErrorsHandler(app));
}

/* A handler can be created by calling a function typically structured as
   follows:

   function makeOPHandler(app: Express.Application) {
     return async function(req: Express.Request, res: Express.Response) {
       try {
         const { ROUTE_PARAM1, ... } = req.params; //if needed
         const { QUERY_PARAM1, ... } = req.query;  //if needed
	 VALIDATE_IF_NECESSARY();
	 const SOME_RESULT = await app.locals.ssServices.OP(...);
	 if (!SOME_RESULT.isOk) throw SOME_RESULT;
         res.json(selfResult(req, SOME_RESULT.val));
       }
       catch(err) {
         const mapped = mapResultErrors(err);
         res.status(mapped.status).json(mapped);
       }
     };
   }
*/

/****************** Handlers for Spreadsheet Cells *********************/

//TODO
// Handlers for Spreadsheet Cells
async function getCellHandler(req: Express.Request, res: Express.Response) {
  try {
    const { ssName, cellId } = req.params;

    // Access the 'SpreadsheetServices' instance from app.locals.ssServices
    const ssServices: SpreadsheetServices = req.app.locals.ssServices;

    // Call the 'query' method of the 'SpreadsheetServices' to get the cell's information
    const result = await ssServices.query(ssName, cellId);

    // Check if the result is successful
    if (!result.isOk) {
      // If there's an error, throw it to be caught by the catch block
      throw result;
    }

    // If the result is successful, create the success envelope with the cell's information
    const cellInfo = result.val;
    const successEnvelope: SuccessEnvelope<{ expr: string, value: number }> = selfResult(req, cellInfo);

    // Send the success envelope in the response
    res.json(successEnvelope);
  } catch (err) {
    // If there's an error, map it to the appropriate error envelope
    const mapped = mapResultErrors(err);
    res.status(mapped.status).json(mapped);
  }
}



async function setCellHandler(req: Express.Request, res: Express.Response) {
  try {
    const { ssName, cellId } = req.params;
    const { expr } = req.query;

    // Access the 'SpreadsheetServices' instance from app.locals.ssServices
    const ssServices: SpreadsheetServices = req.app.locals.ssServices;

    // Call the 'evaluate' method of the 'SpreadsheetServices' to update the expression for the cell
    const result = await ssServices.evaluate(ssName, cellId, expr as string);

    // Check if the result is successful
    if (!result.isOk) {
      // If there's an error, throw it to be caught by the catch block
      throw result;
    }

    // If the result is successful, create the success envelope with the affected cells information
    const affectedCells = result.val;
    const successEnvelope: SuccessEnvelope<{ [cellId: string]: number }> = selfResult(req, affectedCells);

    // Send the success envelope in the response
    res.json(successEnvelope);
  } catch (err) {
    // If there's an error, map it to the appropriate error envelope
    const mapped = mapResultErrors(err);
    res.status(mapped.status).json(mapped);
  }
}


function copyCellHandler(app: App) {
  return async function (req: Express.Request, res: Express.Response) {
    try {
      const { SS_NAME, CELL_ID } = req.params;
      const { srcCellId } = req.query;

      // Validate the query parameters
      if (!srcCellId || typeof srcCellId !== 'string') {
        throw new Error('Invalid query parameter: srcCellId is required and must be a string.');
      }

      const ssServices: SpreadsheetServices = app.locals.ssServices;
      const result: Result<{ [cellId: string]: number }> = await ssServices.copy(SS_NAME, CELL_ID, srcCellId);

      if (!result.isOk) {
        throw result;
      }

      res.json(selfResult(req, result.val));
    } catch (err) {
      const mapped = mapResultErrors(err);
      res.status(mapped.status).json(mapped);
    }
  };
}


async function deleteCellHandler(req: Express.Request, res: Express.Response) {
  try {
    const { ssName, cellId } = req.params;

    // Access the 'SpreadsheetServices' instance from app.locals.ssServices
    const ssServices: SpreadsheetServices = req.app.locals.ssServices;

    // Call the 'remove' method of the 'SpreadsheetServices' to delete the cell
    const result = await ssServices.remove(ssName, cellId);

    // Check if the result is successful
    if (!result.isOk) {
      // If there's an error, throw it to be caught by the catch block
      throw result;
    }

    // If the result is successful, create the success envelope with the affected cells information
    const affectedCells = result.val;
    const successEnvelope: SuccessEnvelope<{ [cellId: string]: number }> = selfResult(req, affectedCells);

    // Send the success envelope in the response
    res.json(successEnvelope);
  } catch (err) {
    // If there's an error, map it to the appropriate error envelope
    const mapped = mapResultErrors(err);
    res.status(mapped.status).json(mapped);
  }
}

async function clearSpreadsheetHandler(req: Express.Request, res: Express.Response) {
  try {
    const { ssName } = req.params;

    // Access the 'SpreadsheetServices' instance from app.locals.ssServices
    const ssServices: SpreadsheetServices = req.app.locals.ssServices;

    // Call the 'clear' method of the 'SpreadsheetServices' to clear the spreadsheet
    const result = await ssServices.clear(ssName);

    // Check if the result is successful
    if (!result.isOk) {
      // If there's an error, throw it to be caught by the catch block
      throw result;
    }

    // If the result is successful, create the success envelope with undefined as the result
    const successEnvelope: SuccessEnvelope<undefined> = selfResult(req, undefined);

    // Send the success envelope in the response
    res.json(successEnvelope);
  } catch (err) {
    // If there's an error, map it to the appropriate error envelope
    const mapped = mapResultErrors(err);
    res.status(mapped.status).json(mapped);
  }
}

async function loadSpreadsheetHandler(req: Express.Request, res: Express.Response) {
  try {
    const { ssName } = req.params;
    const { body } = req;

    // Validate the request body to ensure it's an array of [string, string] pairs
    if (!Array.isArray(body) || !body.every((pair) => Array.isArray(pair) && pair.length === 2)) {
      const error = new Error('Request body must be an array of [string, string] pairs.');
      throw error;
    }

    // Access the 'SpreadsheetServices' instance from app.locals.ssServices
    const ssServices: SpreadsheetServices = req.app.locals.ssServices;

    // Call the 'load' method of the 'SpreadsheetServices' to load the spreadsheet
    const result = await ssServices.load(ssName, body);

    // Check if the result is successful
    if (!result.isOk) {
      // If there's an error, throw it to be caught by the catch block
      throw result;
    }

    // If the result is successful, create the success envelope with undefined as the result
    const successEnvelope: SuccessEnvelope<undefined> = selfResult(req, undefined);

    // Send the success envelope in the response
    res.json(successEnvelope);
  } catch (err) {
    // If there's an error, map it to the appropriate error envelope
    const mapped = mapResultErrors(err);
    res.status(mapped.status).json(mapped);
  }
}

async function getSpreadsheetHandler(req: Express.Request, res: Express.Response) {
  try {
    const { ssName } = req.params;

    // Access the 'SpreadsheetServices' instance from app.locals.ssServices
    const ssServices: SpreadsheetServices = req.app.locals.ssServices;

    // Call the 'dump' method of the 'SpreadsheetServices' to get all non-deleted cells
    const result = await ssServices.dump(ssName);

    // Check if the result is successful
    if (!result.isOk) {
      // If there's an error, throw it to be caught by the catch block
      throw result;
    }

    // If the result is successful, create the success envelope with the cell data as the result
    const cellData = result.val;
    const successEnvelope: SuccessEnvelope<[string, string][]> = selfResult(req, cellData);

    // Send the success envelope in the response
    res.json(successEnvelope);
  } catch (err) {
    // If there's an error, map it to the appropriate error envelope
    const mapped = mapResultErrors(err);
    res.status(mapped.status).json(mapped);
  }
}
// Handler for getting cell details



/**************** Handlers for Complete Spreadsheets *******************/

//TODO

/*************************** Generic Handlers **************************/

/** Default handler for when there is no route for a particular method
 *  and path.
  */
function make404Handler(app: Express.Application) {
  return async function(req: Express.Request, res: Express.Response) {
    const message = `${req.method} not supported for ${req.originalUrl}`;
    const result = {
      status: STATUS.NOT_FOUND,
      errors: [	{ options: { code: 'NOT_FOUND' }, message, }, ],
    };
    res.status(404).json(result);
  };
}


/** Ensures a server error results in nice JSON sent back to client
 *  with details logged on console.
 */ 
function makeErrorsHandler(app: Express.Application) {
  return async function(err: Error, req: Express.Request, res: Express.Response,
			next: Express.NextFunction) {
    const message = err.message ?? err.toString();
    const result = {
      status: STATUS.INTERNAL_SERVER_ERROR,
      errors: [ { options: { code: 'INTERNAL' }, message } ],
    };
    res.status(STATUS.INTERNAL_SERVER_ERROR as number).json(result);
    console.error(result.errors);
  };
}


/************************* HATEOAS Utilities ***************************/

/** Return original URL for req */
function requestUrl(req: Express.Request) {
  return `${req.protocol}://${req.get('host')}${req.originalUrl}`;
}

function selfHref(req: Express.Request, id: string = '') {
  const url = new URL(requestUrl(req));
  return url.pathname + (id ? `/${id}` : url.search);
}

function selfResult<T>(req: Express.Request, result: T,
		       status: number = STATUS.OK)
  : SuccessEnvelope<T>
{
  return { isOk: true,
	   status,
	   links: { self: { href: selfHref(req), method: req.method } },
	   result,
	 };
}


 
/*************************** Mapping Errors ****************************/

//map from domain errors to HTTP status codes.  If not mentioned in
//this map, an unknown error will have HTTP status BAD_REQUEST.
const ERROR_MAP: { [code: string]: number } = {
  EXISTS: STATUS.CONFLICT,
  NOT_FOUND: STATUS.NOT_FOUND,
  BAD_REQ: STATUS.BAD_REQUEST,
  AUTH: STATUS.UNAUTHORIZED,
  DB: STATUS.INTERNAL_SERVER_ERROR,
  INTERNAL: STATUS.INTERNAL_SERVER_ERROR,
}

/** Return first status corresponding to first options.code in
 *  errors, but SERVER_ERROR dominates other statuses.  Returns
 *  BAD_REQUEST if no code found.
 */
function getHttpStatus(errors: Err[]) : number {
  let status: number = 0;
  for (const err of errors) {
    if (err instanceof Err) {
      const code = err?.options?.code;
      const errStatus = (code !== undefined) ? ERROR_MAP[code] : -1;
      if (errStatus > 0 && status === 0) status = errStatus;
      if (errStatus === STATUS.INTERNAL_SERVER_ERROR) status = errStatus;
    }
  }
  return status !== 0 ? status : STATUS.BAD_REQUEST;
}

/** Map domain/internal errors into suitable HTTP errors.  Return'd
 *  object will have a "status" property corresponding to HTTP status
 *  code.
 */
function mapResultErrors(err: Error|ErrResult) : ErrorEnvelope {
  const errors = (err instanceof Error) 
    ? [ new Err(err.message ?? err.toString(), { code: 'UNKNOWN' }), ]
    : err.errors;
  const status = getHttpStatus(errors);
  if (status === STATUS.SERVER_ERROR)  console.error(errors);
  return { isOk: false, status, errors, };
} 
