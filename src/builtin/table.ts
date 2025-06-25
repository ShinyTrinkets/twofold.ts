/**
 * Cleans and splits a table row string into an array of cell contents.
 * Handles extra spaces and multiple separators.
 *
 * @param rowString - The raw string for a single table row.
 * @returns An array of trimmed cell strings.
 */
export function _parseRow(rowString: string): string[] {
  // Split by the pipe character '|'
  const cells = rowString.split('|');

  // Trim whitespace from each potential cell and filter out empty strings
  // that result from leading/trailing pipes or multiple pipes together (e.g., "||")
  const cleanedCells = cells.map(cell => cell.trim()).filter(cell => cell !== '');

  return cleanedCells;
}

/**
 * Pads a string to a specific length with spaces on the right.
 *
 * @param str - The string to pad.
 * @param length - The target length.
 * @returns The padded string.
 */
function padCell(str: string, length: number): string {
  return str.padEnd(length, ' ');
}

export function asciiTable(text: string, args: Record<string, string> = {}): string | undefined {
  /**
   * Beautifies an ASCII table string into a Markdown formatted table string.
   * It aligns columns based on the widest content in each column and adds
   * the Markdown separator line. It's robust against extra spaces and pipes.
   */
  text = text.trim();
  if (!text) {
    return;
  }

  const lines = text.split('\n');
  if (lines.length === 0) {
    return;
  }

  text = ''; // Release memory

  // Parse all rows into arrays of cells
  const processedRows: string[][] = lines
    .map(_parseRow)
    // Filter out any lines that became empty after parsing (e.g., lines with only '|')
    .filter(row => row.length > 0);

  if (processedRows.length === 0) {
    return; // No valid content found
  }

  // Assume the first valid row determines the number of columns
  const numberColumns = processedRows[0].length;
  if (numberColumns === 0) {
    return; // Header row was empty or invalid
  }

  // Check if the second row is a separator row (contains only dashes, possibly with colons)
  // If so, remove it from processedRows as we'll generate our own separator
  if (processedRows.length > 1) {
    const secondRow = processedRows[1];
    const isSeparatorRow = secondRow.every(cell => /^[-:]+$/.test(cell));
    if (isSeparatorRow) {
      // Remove the separator row
      processedRows.splice(1, 1);
    }
  }

  // Calculate the maximum width for each column
  const maxWidths: number[] = new Array(numberColumns).fill(0);
  for (const row of processedRows) {
    // Only consider cells up to the number of columns defined by the header
    for (let i = 0; i < numberColumns; i++) {
      const cellContent = row[i] || ''; // Handle rows with fewer columns gracefully
      maxWidths[i] = Math.max(maxWidths[i], cellContent.length);
    }
  }

  // Ensure minimum width for Markdown separator (---)
  for (const [i, width] of maxWidths.entries()) {
    maxWidths[i] = Math.max(width, 3); // Minimum width for "---"
  }

  const outputLines: string[] = [];

  // Format Header Row
  const headerCells = processedRows[0];
  const paddedHeaderCells = headerCells
    .slice(0, numberColumns) // Take only expected number of cells
    .map((cell, i) => padCell(cell, maxWidths[i]));
  // Add empty cells if header row was shorter than expected (less likely with parsing)
  while (paddedHeaderCells.length < numberColumns) {
    paddedHeaderCells.push(padCell('', maxWidths[paddedHeaderCells.length]));
  }

  outputLines.push(`| ${paddedHeaderCells.join(' | ')} |`);

  // Format Separator Row
  const separatorCells = maxWidths.map(width => '-'.repeat(width));
  outputLines.push(`| ${separatorCells.join(' | ')} |`);

  // Format Data Rows
  for (const row of processedRows.slice(1)) {
    const paddedDataCells = row
      .slice(0, numberColumns) // Take only expected number of cells
      .map((cell, i) => padCell(cell, maxWidths[i]));
    // Add empty cells if data row is shorter than expected
    while (paddedDataCells.length < numberColumns) {
      paddedDataCells.push(padCell('', maxWidths[paddedDataCells.length]));
    }

    outputLines.push(`| ${paddedDataCells.join(' | ')} |`);
  }

  return '\n' + outputLines.join('\n') + '\n';
}
