// Load environment variables early for ts-node-dev from monorepo root
import path from 'path';
import { config } from 'dotenv';

// Resolve root .env (three levels up from this file: apps/api/src)
config({ path: path.resolve(__dirname, '../../..', '.env') });

// Now start the actual server
import './server';
