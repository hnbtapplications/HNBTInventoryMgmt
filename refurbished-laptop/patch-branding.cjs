const fs = require('fs');

let css = fs.readFileSync('src/styles.css', 'utf8');

// Update theme comment
css = css.replace(/\/\* Hertz & Bytes website-inspired theme \*\//g, '/* SandroGen Technologies Theme */');

// Update primary color
css = css.replace(/#0078d4/g, '#2b50ed');
css = css.replace(/#006cbe/g, '#1c36b8');
css = css.replace(/#003e70/g, '#0e0b38');
css = css.replace(/#38a4e8/g, '#7a2df2');

// Update login background gradient to match the new logo
css = css.replace(
  /background:linear-gradient\(145deg,#0e0b38 0%,#2b50ed 58%,#7a2df2 100%\);/,
  'background:linear-gradient(145deg, #100645 0%, #2b50ed 50%, #00c6ff 100%);'
);

fs.writeFileSync('src/styles.css', css);

let main = fs.readFileSync('src/main.jsx', 'utf8');

// Replace company name strings
main = main.replace(/>Hertz & Bytes Technologies</g, '>SandroGen Technologies<');
main = main.replace(/"HERTZ & BYTES TECHNOLOGIES"/g, '"SANDROGEN TECHNOLOGIES"');
main = main.replace(/alt="Hertz & Bytes Technologies"/g, 'alt="SandroGen Technologies"');

fs.writeFileSync('src/main.jsx', main);
console.log('Branding updated.');
