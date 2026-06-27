const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\samyuktha\\.gemini\\antigravity-ide\\brain\\0d329e7c-4488-46df-9f5c-903ba694e9fc';
const destDir = 'c:\\Smart food managment1\\frontend\\src\\assets';

if (!fs.existsSync(destDir)){
    fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(
    path.join(srcDir, 'media__1782535190037.jpg'),
    path.join(destDir, 'original-bg.jpg')
);
console.log('Original background image copied successfully to frontend/src/assets/original-bg.jpg!');
