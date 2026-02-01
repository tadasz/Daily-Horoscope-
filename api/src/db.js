import pg from 'pg';
import config from './config.js';

const pool = new pg.Pool({ connectionString: config.db });

export const query = (text, params) => pool.query(text, params);
export default pool;
