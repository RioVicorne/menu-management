#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';

/**
 * Simple CSV fix - just escape line breaks within quoted fields
 */

function fixMenuCsvSimple() {
  const csvPath = path.join(__dirname, '../../menu.csv');
  const outputPath = path.join(__dirname, '../../menu-fixed-simple.csv');
  
  console.log('Reading menu.csv...');
  const content = fs.readFileSync(csvPath, 'utf-8');
  
  // Split into lines
  const lines = content.split('\n');
  const fixedLines: string[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (!line) {
      i++;
      continue;
    }
    
    // Check if this line starts a new week or day
    const isNewWeek = /^Tuần \d+\/ Tháng \d+/.test(line);
    const isNewDay = /^Thứ [2-7]$/.test(line);
    
    if (isNewWeek || isNewDay) {
      // This is a new row, start collecting
      let currentRow = line;
      i++;
      
      // Keep adding lines until we hit another week/day or end of file
      while (i < lines.length) {
        const nextLine = lines[i].trim();
        
        // If we hit another week/day, stop collecting
        if (/^Tuần \d+\/ Tháng \d+/.test(nextLine) || /^Thứ [2-7]$/.test(nextLine)) {
          break;
        }
        
        // If line is empty, skip it
        if (!nextLine) {
          i++;
          continue;
        }
        
        // Add this line to current row, replacing line break with space
        currentRow += ' ' + nextLine;
        i++;
      }
      
      fixedLines.push(currentRow);
    } else {
      // Skip orphaned lines
      i++;
    }
  }
  
  // Write the fixed CSV
  const fixedContent = fixedLines.join('\n');
  fs.writeFileSync(outputPath, fixedContent, 'utf-8');
  
  console.log(`Fixed CSV written to: ${outputPath}`);
  console.log(`Original lines: ${lines.length}`);
  console.log(`Fixed lines: ${fixedLines.length}`);
  
  // Show first few rows
  console.log('\nFirst 5 rows:');
  fixedLines.slice(0, 5).forEach((line, index) => {
    const preview = line.length > 100 ? line.substring(0, 100) + '...' : line;
    console.log(`${index + 1}: ${preview}`);
  });
}

if (require.main === module) {
  fixMenuCsvSimple();
}

