import { execSync } from 'child_process';
console.log('Deploying to Netlify...');
try {
  const output = execSync('npx netlify-cli deploy --prod --dir=build', { encoding: 'utf8' });
  console.log(output);
  const match = output.match(/(Website Draft URL|Live URL):\s*(https:\/\/[^\s]+)/);
  if (match) {
    console.log('Live URL: ' + match[2]);
  }
} catch (e) {
  console.error('Deploy failed', e);
}
