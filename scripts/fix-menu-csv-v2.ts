#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';

/**
 * Fix CSV formatting issues in menu.csv - Version 2
 * - Properly handle multi-line content within quoted fields
 * - Preserve the structure while fixing line breaks
 */

function fixMenuCsvV2() {
  const csvPath = path.join(__dirname, '../../menu.csv');
  const outputPath = path.join(__dirname, '../../menu-fixed-v2.csv');
  
  console.log('Reading menu.csv...');
  const content = fs.readFileSync(csvPath, 'utf-8');
  
  const lines = content.split('\n');
  const fixedLines: string[] = [];
  
  let currentRow = '';
  let inQuotedField = false;
  let fieldCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      if (currentRow.trim()) {
        fixedLines.push(currentRow.trim());
        currentRow = '';
        fieldCount = 0;
      }
      continue;
    }
    
    // Check if this is a new week/day row
    const isNewWeek = /^Tuần \d+\/ Tháng \d+/.test(line);
    const isNewDay = /^Thứ [2-7]$/.test(line);
    
    if ((isNewWeek || isNewDay) && currentRow.trim() && !inQuotedField) {
      // Save the previous row
      fixedLines.push(currentRow.trim());
      currentRow = line;
      fieldCount = (line.match(/,/g) || []).length + 1;
    } else {
      // Continue building the current row
      if (currentRow) {
        if (inQuotedField) {
          // We're inside a quoted field, replace line break with space
          currentRow += ' ' + line;
        } else {
          // We're outside quoted fields, this is likely a new field
          currentRow += ',' + line;
          fieldCount++;
        }
      } else {
        currentRow = line;
        fieldCount = (line.match(/,/g) || []).length + 1;
      }
    }
    
    // Check if we're in a quoted field by counting quotes
    const quoteCount = (currentRow.match(/"/g) || []).length;
    inQuotedField = quoteCount % 2 === 1;
  }
  
  // Add the last row if it exists
  if (currentRow.trim()) {
    fixedLines.push(currentRow.trim());
  }
  
  // Write the fixed CSV
  const fixedContent = fixedLines.join('\n');
  fs.writeFileSync(outputPath, fixedContent, 'utf-8');
  
  console.log(`Fixed CSV written to: ${outputPath}`);
  console.log(`Original lines: ${lines.length}`);
  console.log(`Fixed lines: ${fixedLines.length}`);
  
  // Show a sample of the fixed content
  console.log('\nSample of fixed content:');
  fixedLines.slice(0, 10).forEach((line, index) => {
    const preview = line.length > 150 ? line.substring(0, 150) + '...' : line;
    console.log(`${index + 1}: ${preview}`);
  });
  
  // Count rows by type
  const weekRows = fixedLines.filter(line => /^Tuần \d+\/ Tháng \d+/.test(line)).length;
  const dayRows = fixedLines.filter(line => /^Thứ [2-7]$/.test(line)).length;
  
  console.log(`\nRow counts:`);
  console.log(`- Week headers: ${weekRows}`);
  console.log(`- Day rows: ${dayRows}`);
}

if (require.main === module) {
  fixMenuCsvV2();
}

