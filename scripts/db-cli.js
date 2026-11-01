import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const instanceId = 'i-0372236ae7e369b5c';
const queryArg = process.argv.slice(2).join(' ').trim();

function runSqlOnEc2(sql, title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));

  const payload = {
    InstanceIds: [instanceId],
    DocumentName: 'AWS-RunShellScript',
    Parameters: {
      commands: [`/usr/local/bin/dropsecure-db -c "${sql.replace(/"/g, '\\"')}"`],
    },
  };

  const tempJson = path.join(process.cwd(), 'temp_cli_cmd.json');
  fs.writeFileSync(tempJson, JSON.stringify(payload, null, 2));

  try {
    const sendOutput = execSync(`aws ssm send-command --cli-input-json "file://${tempJson}" --output json`, {
      encoding: 'utf-8',
    });
    const parsed = JSON.parse(sendOutput);
    const commandId = parsed.Command.CommandId;

    // Wait for SSM invocation
    let completed = false;
    let attempts = 0;
    while (!completed && attempts < 10) {
      execSync('powershell -Command "Start-Sleep -Milliseconds 1500"');
      attempts++;
      try {
        const invOutput = execSync(
          `aws ssm get-command-invocation --command-id "${commandId}" --instance-id "${instanceId}" --output json`,
          { encoding: 'utf-8' }
        );
        const inv = JSON.parse(invOutput);
        if (inv.Status === 'Success' || inv.Status === 'Failed') {
          completed = true;
          if (inv.StandardOutputContent) {
            console.log(inv.StandardOutputContent);
          }
          if (inv.StandardErrorContent) {
            console.error(inv.StandardErrorContent);
          }
        }
      } catch {
        // continue polling
      }
    }
  } catch (err) {
    console.error('Execution error:', err.message);
  } finally {
    if (fs.existsSync(tempJson)) {
      fs.unlinkSync(tempJson);
    }
  }
}

if (queryArg) {
  runSqlOnEc2(queryArg, `Custom SQL Query: ${queryArg}`);
} else {
  console.log('============================================================');
  console.log('      DropSecure AWS Live Cloud Database Inspector          ');
  console.log('   Target: dropsecure-postgres (Amazon RDS ap-south-1)      ');
  console.log('============================================================');

  runSqlOnEc2('\\dt', '1. Database Relations / Tables in RDS');
  runSqlOnEc2('SELECT name, email, role, room_number FROM users ORDER BY role, name;', '2. Campus Users & Roles (users table)');
  runSqlOnEc2('SELECT tracking_code, carrier, status, otp_attempts, created_at FROM parcels ORDER BY created_at DESC LIMIT 5;', '3. Recent Registered Parcels (parcels table)');
  runSqlOnEc2('SELECT action, actor_id, details, created_at FROM audit_log ORDER BY created_at DESC LIMIT 5;', '4. Security Audit Trail (audit_log table)');
}
