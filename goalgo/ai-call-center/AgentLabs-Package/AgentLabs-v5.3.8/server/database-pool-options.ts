/** Railway / managed Postgres often require TLS even when sslmode is only in the URL. */
export function databaseNeedsSsl(connectionString: string): boolean {
  return (
    process.env.DATABASE_SSL === "true" ||
    process.env.PGSSLMODE === "require" ||
    /sslmode=require/i.test(connectionString) ||
    /\.railway\.app/i.test(connectionString) ||
    process.env.RAILWAY_ENVIRONMENT != null
  );
}

export function poolOptionsFromDatabaseUrl(connectionString: string) {
  const needsSsl = databaseNeedsSsl(connectionString);

  return {
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}
