const { execSync } = require('child_process');

try {
  const result = execSync('npm run build', { cwd: 'c:\\Users\\Bureau\\Claude\\podcastic-1\\frontend', stdio: 'pipe' });
  console.log(result.toString());
} catch (e) {
  console.error("BUILD FAILED");
  console.error(e.stdout ? e.stdout.toString() : '');
  console.error(e.stderr ? e.stderr.toString() : '');
  console.error(e.message);
}
