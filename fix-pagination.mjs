import fs from 'fs';
import path from 'path';

const srcDir = './src';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(srcDir, (filePath) => {
  if (!filePath.endsWith('.tsx')) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Find occurrences of the select element for pagination
  const selectRegex = /<select\s+value=\{itemsPerPage\}\s+onChange=\{\(e\) => \{\s+setItemsPerPage\(Number\(e\.target\.value\)\);\s+setCurrentPage\(1\);\s+\}\}\s+className="[^"]+"\s*>([\s\S]*?)<\/select>/g;

  if (selectRegex.test(content)) {
    console.log(`Fixing ${filePath}`);
    
    // add import if not there
    if (!content.includes('CustomSelect')) {
      // Calculate relative path to src/components/CustomSelect
      const relativePath = path.relative(path.dirname(filePath), './src/components/CustomSelect').replace(/\\/g, '/');
      const importStatement = `import { CustomSelect } from '${relativePath}';\n`;
      
      // Find the last import statement to insert after
      const importMatch = content.match(/import.*?;/g);
      if (importMatch) {
        const lastImport = importMatch[importMatch.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport) + lastImport.length;
        content = content.slice(0, lastImportIndex) + '\n' + importStatement + content.slice(lastImportIndex);
      } else {
        content = importStatement + content;
      }
    }
    
    // Replace the <select> with <CustomSelect>
    content = content.replace(selectRegex, (match) => {
      return `<CustomSelect
                options={['5', '10', '20', '50']}
                value={String(itemsPerPage)}
                onChange={(val) => {
                  setItemsPerPage(Number(val));
                  setCurrentPage(1);
                }}
                className="w-24"
              />`;
    });
    
    fs.writeFileSync(filePath, content, 'utf8');
  }
});
console.log('Done!');
