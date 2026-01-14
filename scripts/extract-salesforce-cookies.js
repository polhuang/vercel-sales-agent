// Extract Salesforce Cookies Script
// Run this in Chrome DevTools Console while logged into vercel.my.salesforce.com
//
// Instructions:
// 1. Log into https://vercel.my.salesforce.com in Chrome
// 2. Press F12 to open DevTools
// 3. Go to Console tab
// 4. Paste this entire script and press Enter
// 5. The script will copy a command to your clipboard
// 6. Paste and run the command in your terminal

(function() {
  const cookies = document.cookie.split('; ').reduce((acc, cookie) => {
    const [name, value] = cookie.split('=');
    acc[name] = value;
    return acc;
  }, {});

  // Extract key cookies
  const sid = cookies.sid || '';
  const oid = cookies.oid || '';
  const clientSrc = cookies.clientSrc || '';
  const sid_Client = cookies.sid_Client || '';
  const disco = cookies.disco || '';

  // Build command
  let command = './salesforce-login.sh';
  
  if (sid) command += ` --sid '${sid}'`;
  if (oid) command += ` --oid '${oid}'`;
  if (clientSrc) command += ` --client-src '${clientSrc}'`;
  if (sid_Client) command += ` --sid-client '${sid_Client}'`;
  if (disco) command += ` --disco '${disco}'`;

  // Copy to clipboard
  const textarea = document.createElement('textarea');
  textarea.value = command;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);

  console.log('✅ Command copied to clipboard!');
  console.log('');
  console.log('Run this in your terminal:');
  console.log(command);
  console.log('');
  console.log('Cookie values found:');
  console.log('  sid:', sid ? '✓ Found' : '✗ Missing');
  console.log('  oid:', oid ? '✓ Found' : '✗ Missing');
  console.log('  clientSrc:', clientSrc ? '✓ Found' : '✗ Missing');
  console.log('  sid_Client:', sid_Client ? '✓ Found' : '✗ Missing');
  console.log('  disco:', disco ? '✓ Found' : '✗ Missing');
})();
