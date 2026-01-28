import pg from 'pg'

const { Pool } = pg

let pool: pg.Pool | null = null

export function getPool(): pg.Pool {
  if (!pool) {
    const config = useRuntimeConfig()
    pool = new Pool({
      host: config.dbHost,
      port: parseInt(config.dbPort as string),
      user: config.dbUser,
      password: config.dbPassword,
      database: config.dbName,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }
  return pool
}

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const pool = getPool()
  return pool.query<T>(text, params)
}

export async function getClient(): Promise<pg.PoolClient> {
  const pool = getPool()
  return pool.connect()
}
