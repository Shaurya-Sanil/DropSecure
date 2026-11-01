import { runDailySweep } from './index.js';

async function main() {
  console.log('=== Running Standalone Lambda Sweep Test ===');
  try {
    const result = await runDailySweep();
    console.log('=== Sweep Execution Complete ===');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Sweep execution failed:', error);
    process.exit(1);
  }
}

main();
