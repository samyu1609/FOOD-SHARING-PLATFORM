const fs = require('fs');
const path = require('path');

const srcPath = 'C:\\Users\\samyuktha\\.gemini\\antigravity-ide\\brain\\0d329e7c-4488-46df-9f5c-903ba694e9fc\\media__1782539393915.png';
const destPath = 'c:\\Smart food managment1\\frontend\\src\\assets\\dashboard-bg.png';

fs.copyFileSync(srcPath, destPath);
console.log('Successfully copied new dashboard background!');
