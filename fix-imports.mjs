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

  // Check if CustomSelect is imported incorrectly
  if (content.includes('import { CustomSelect }')) {
    // Remove all occurrences of the import
    const importRegex = /import\s+\{\s*CustomSelect\s*\}\s+from\s+['"][^'"]+['"];?\n?/g;
    
    // We only want to remove it if it's not at the very top, but it's safer to remove all and re-add at the top
    let newContent = content.replace(importRegex, '');
    
    // Calculate correct relative path
    const relativePath = path.relative(path.dirname(filePath), './src/components/CustomSelect').replace(/\\/g, '/');
    const correctImport = `import { CustomSelect } from '${relativePath}';\n`;
    
    // Insert at the top after the first import
    const firstImportMatch = newContent.match(/^import.*?;/m);
    if (firstImportMatch) {
      const insertIndex = newContent.indexOf(firstImportMatch[0]) + firstImportMatch[0].length;
      newContent = newContent.slice(0, insertIndex) + '\n' + correctImport + newContent.slice(insertIndex);
    } else {
      newContent = correctImport + newContent;
    }

    if (content !== newContent) {
      console.log(`Fixed imports in ${filePath}`);
      fs.writeFileSync(filePath, newContent, 'utf8');
    }
  }
});
console.log('Done!');
