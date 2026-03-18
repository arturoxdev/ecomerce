declare module "pg" {
  export type QueryResult<Row = Record<string, unknown>> = {
    rows: Row[];
  };

  export class Pool {
    constructor(config?: {
      connectionString?: string;
    });

    query<Row = Record<string, unknown>>(
      queryText: string,
      values?: unknown[],
    ): Promise<QueryResult<Row>>;

    end(): Promise<void>;
  }
}
