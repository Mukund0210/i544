import { Result, okResult, errResult } from 'cs544-js-utils';

import * as mongo from 'mongodb';

/** All that this DAO should do is maintain a persistent map from
 *  [spreadsheetName, cellId] to an expression string.
 *
 *  Most routines return an errResult with code set to 'DB' if
 *  a database error occurs.
 */

/** return a DAO for spreadsheet ssName at URL mongodbUrl */
export async function
makeSpreadsheetDao(mongodbUrl: string, ssName: string)
  : Promise<Result<SpreadsheetDao>> 
{
  return SpreadsheetDao.make(mongodbUrl, ssName);
}



export class SpreadsheetDao {

  //TODO: add properties as necessary
  private spreadsheetName: string;
  private db: mongo.Db;
  private collectionName: string;
  

  constructor(db: mongo.Db, collectionName: string, spreadsheetName: string) {
    this.db = db;
    this.collectionName = collectionName;
    this.spreadsheetName = spreadsheetName;
  }

  //factory method
  static async make(dbUrl: string, ssName: string): Promise<Result<SpreadsheetDao>> {
    try {
      const client = await mongo.MongoClient.connect(dbUrl);
      const db = client.db();
      const collectionName = `spreadsheet_${ssName}`;
      const dao = new SpreadsheetDao(db, collectionName, ssName);
      dao.spreadsheetName = ssName; // Set the spreadsheet name
      return okResult(dao);
    } catch (error) {
      return errResult('DB', error.message);
    }
  }

  /** Release all resources held by persistent spreadsheet.
   *  Specifically, close any database connections.
   */
  async close(): Promise<Result<undefined>> {
    try {
      // Close the MongoDB client connection
      await this.db.removeUser;
      return okResult(undefined);
    } catch (error) {
      return errResult('DB', error.message);
    }
  }
  
  

  /** return name of this spreadsheet */
 getSpreadsheetName() : string {
    //TODO
    return this.spreadsheetName;
  }

  /** Set cell with id cellId to string expr. */
  /** Set cell with id cellId to string expr. */
  async setCellExpr(cellId: string, expr: string): Promise<Result<undefined>> {
    try {
      const collection = this.db.collection(this.collectionName);
      await collection.updateOne(
        { _id: { cellId, spreadsheetName: this.spreadsheetName } },
        { $set: { _id: { cellId, spreadsheetName: this.spreadsheetName }, expression: expr } },
        { upsert: true }
      );
      return okResult(undefined);
    } catch (error) {
      return errResult('DB', error.message);
    }
  }
  
  

  /** Return expr for cell cellId; return '' for an empty/unknown cell.
   */
  /** Return expr for cell cellId; return '' for an empty/unknown cell. */
async query(cellId: string): Promise<Result<string>> {
  try {
    const collection = this.db.collection(this.collectionName);
    const document = await collection.findOne({ _id: { cellId, spreadsheetName: this.spreadsheetName } });

    if (document && document.expression) {
      return okResult(document.expression);
    } else {
      return okResult('');
    }
  } catch (error) {
    return errResult('DB', error.message);
  }
}

  /** Clear contents of this spreadsheet */
/** Clear contents of this spreadsheet */
/** Clear contents of this spreadsheet */
/** Clear contents of this spreadsheet */
async clear(): Promise<Result<undefined>> {
  try {
    const collection = this.db.collection(this.collectionName);
    await collection.deleteMany({ "_id.spreadsheetName": this.spreadsheetName });
    return okResult(undefined);
  } catch (error) {
    return errResult('DB', error.message);
  }
}



  /** Remove all info for cellId from this spreadsheet. */
/** Remove all info for cellId from this spreadsheet. */
async remove(cellId: string): Promise<Result<undefined>> {
  try {
    const collection = this.db.collection(this.collectionName);
    const result = await collection.deleteOne({ _id: { cellId, spreadsheetName: this.spreadsheetName } });

    if (result.deletedCount === 1) {
      return okResult(undefined);
    } else {
      return okResult(undefined); // Alternatively, you can return an errResult indicating that the cell was not found.
    }
  } catch (error) {
    return errResult('DB', error.message);
  }
}

  /** Return array of [ cellId, expr ] pairs for all cells in this
   *  spreadsheet
   */
/** Return array of [ cellId, expr ] pairs for all cells in this spreadsheet */
/** Return array of [ cellId, expr ] pairs for all cells in this spreadsheet */
async getData(): Promise<Result<[string, string][]>> {
  try {
    const collection = this.db.collection(this.collectionName);
    const documents = await collection.find({}).toArray();
    const data: [string, string][] = [];

    for (const document of documents) {
      const cellId = document._id.toString(); // Access the cellId property correctly
      const expression = document.expression || '';
      data.push([cellId, expression]);
    }

    return okResult(data);
  } catch (error) {
    return errResult('DB', error.message);
  }
}





}