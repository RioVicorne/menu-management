#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';

/**
 * Fix CSV formatting issues in menu.csv
 * - Properly escape multi-line content within quoted fields
 * - Ensure each day is a single CSV row
 */

function fixMenuCsv() {
  const csvPath = path.join(__dirname, '../../menu.csv');
  const outputPath = path.join(__dirname, '../../menu-fixed.csv');
  
  console.log('Reading menu.csv...');
  const content = fs.readFileSync(csvPath, 'utf-8');
  
  const lines = content.split('\n');
  const fixedLines: string[] = [];
  
  let currentRow = '';
  let inQuotedField = false;
  let quoteCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      if (currentRow.trim()) {
        fixedLines.push(currentRow.trim());
        currentRow = '';
      }
      continue;
    }
    
    // Count quotes in the line
    const lineQuoteCount = (line.match(/"/g) || []).length;
    quoteCount += lineQuoteCount;
    
    // Check if we're starting a new day (Vietnamese day names)
    const isNewDay = /^Thứ [2-7]$/.test(line);
    
    if (isNewDay && currentRow.trim() && !inQuotedField) {
      // Save the previous row and start a new one
      fixedLines.push(currentRow.trim());
      currentRow = line;
      quoteCount = lineQuoteCount;
    } else {
      // Continue building the current row
      if (currentRow) {
        // Replace line breaks with spaces within quoted fields
        if (inQuotedField) {
          currentRow += ' ' + line;
        } else {
          currentRow += ',' + line;
        }
      } else {
        currentRow = line;
      }
    }
    
    // Check if we're in a quoted field
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
  fixedLines.slice(0, 5).forEach((line, index) => {
    console.log(`${index + 1}: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
  });
}

if (require.main === module) {
  fixMenuCsv();
}

