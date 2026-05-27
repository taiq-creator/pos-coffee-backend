import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  const regions = [
    'ap-southeast-1', // Singapore
    'ap-northeast-1', // Tokyo
    'ap-northeast-2', // Seoul
    'ap-southeast-2', // Sydney
    'us-east-1',      // N. Virginia
    'us-west-1',      // N. California
    'eu-central-1',   // Frankfurt
    'eu-west-1'       // Ireland
  ];

  const tenant = 'xwddbyiplaeureporkzm';
  const password = 'Dungmin88pos123';

  console.log('Testing regions for tenant:', tenant);

  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    console.log(`\n--- Testing region: ${region} (${host}) ---`);
    
    // Test Port 5432 (Session mode)
    const client = new Client({
      host,
      port: 5432,
      database: 'postgres',
      user: `postgres.${tenant}`,
      password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      console.log(`✅ SUCCESS connecting to ${region} on port 5432!`);
      const res = await client.query('SELECT version()');
      console.log('Version:', res.rows[0].version);
      await client.end();
      break;
    } catch (err: any) {
      console.log(`❌ FAILED on 5432: ${err.message}`);
    }

    // Test Port 6543 (Transaction mode)
    const client6543 = new Client({
      host,
      port: 6543,
      database: 'postgres',
      user: `postgres.${tenant}`,
      password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });

    try {
      await client6543.connect();
      console.log(`✅ SUCCESS connecting to ${region} on port 6543!`);
      await client6543.end();
      break;
    } catch (err: any) {
      console.log(`❌ FAILED on 6543: ${err.message}`);
    }
  }
}

test();
