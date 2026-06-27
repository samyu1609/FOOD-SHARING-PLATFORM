const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\samyuktha\\.gemini\\antigravity-ide\\brain\\0d329e7c-4488-46df-9f5c-903ba694e9fc';
const destDir = 'c:\\Smart food managment1\\frontend\\src\\assets';

if (!fs.existsSync(destDir)){
    fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(
    path.join(srcDir, 'landing_bg_1782535312142.png'),
    path.join(destDir, 'landing-bg.png')
);

fs.copyFileSync(
    path.join(srcDir, 'dashboard_bg_1782535321824.png'),
    path.join(destDir, 'dashboard-bg.png')
);
console.log('Copied successfully!');
