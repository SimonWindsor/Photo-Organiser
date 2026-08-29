const path = require('path');
const readline = require('readline');

const REVERSE = '\x1b[7m'; // Revsese text and background colour for selected text
const RESET = '\x1b[0m'; // Resets text and background colour to default

async function getFolder(currentDir) {
  let selectedIndex = 0; // For currently selected folder
  let scrollOffset = 0; // For scolling when more than 10 folders

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  process.stdin.on('keypress', (str, key) => {
    if (key.name === 'down') {

    }

    if (key.name === 'down') {
      
    }

    if (key.name === 'down') {
      
    }

    if (key.name === 'down') {
      
    }
  });

  return selectedPath;
}

function renderBrowser(currentDir, folders, selectedIndex, scrollOffset) {
  console.clear();
  console.log(`Current path: ${currentDir}\n`);
  console.log('SELECT FOLDER:');
  console.log('_'.repeat(80));

  for (let i = scrollOffset; i < scrollOffset + 10 ; i++) {
    const folder = folders[i] || '';

    const text = folder
      .slice(0, 76)
      .padEnd(76, ' ');

    i === selectedIndex
      ? console.log(`| ${REVERSE}${text}${RESET} |`)
      : console.log(`| ${text} |`)
  }

  console.log('_'.repeat(80));
  console.log('Navigation:  ↑ ↓   Open Folder: ENTER')
  console.log('(B)ack | (S)elect Folder | (N)ew Folder | E(X)it');
}

module.exports = { 
  getFolder
};