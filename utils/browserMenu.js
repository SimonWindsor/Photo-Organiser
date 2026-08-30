const fs = require('fs/promises');
const path = require('path');
const readline = require('readline');

const REVERSE = '\x1b[7m'; // Revsese text and background colour for selected text
const RESET = '\x1b[0m'; // Resets text and background colour to default

function getFolder(dir) {
  return new Promise(async (resolve) => {
    let currentDir = dir;
    let folders = await getInnerFolders(currentDir);
    let selectedIndex = 0; // For currently selected folder
    let scrollOffset = 0; // For scolling when more than 10 folders

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    function cleanup() {
      process.stdin.setRawMode(false);
      process.stdin.off('keypress', handleKeyPress);
      process.stdin.pause();
    }

    async function handleKeyPress(str, key) {
      if (key.name === 'up') {
        if (selectedIndex > 0) selectedIndex--;
        if (selectedIndex < scrollOffset) scrollOffset--;
      }

      if (key.name === 'down') {
        if (selectedIndex < folders.length - 1) selectedIndex++;
        if (selectedIndex >= scrollOffset + 10) scrollOffset++;
      }

      if (key.name === 'return' && folders[selectedIndex]) {
        currentDir = path.join(currentDir, folders[selectedIndex]);
        folders = await getInnerFolders(currentDir);

        selectedIndex = 0;
        scrollOffset = 0;
      }

      if (key.name === 'b') {
        currentDir = path.dirname(currentDir);
        folders = await getInnerFolders(currentDir);

        selectedIndex = 0;
        scrollOffset = 0;
      }

      if (key.name === 's') {
        cleanup();
        resolve(currentDir);
        return;
      }

      if (key.name === 'n') {
        console.clear();
        process.stdin.setRawMode(false);
        
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        rl.question('What would you like to name your new folder? ',
          async (name) => {
            await fs.mkdir(path.join(currentDir, name));
            
            folders = await getInnerFolders(currentDir);
            selectedIndex = 0;
            scrollOffset = 0;
            
            rl.close();
            process.stdin.setRawMode(true);
            process.stdin.resume();
            
            renderBrowser(currentDir, folders, selectedIndex, scrollOffset);
          }
        );

        return;
      }

      if (key.name === 'x') {
        cleanup();
        resolve(null);
        return;
      }
      
      renderBrowser(currentDir, folders, selectedIndex, scrollOffset);
    };

    process.stdin.on('keypress', handleKeyPress);
    renderBrowser(currentDir, folders, selectedIndex, scrollOffset);
  })
}

async function getInnerFolders(dir) {
  const innerFolders = await(fs.readdir(dir, { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name); 

  return innerFolders;
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
  console.log('Navigation:  ↑ ↓ | Open Folder: ENTER')
  console.log('(B)ack | (S)elect Folder | (N)ew Folder | E(X)it');
}

module.exports = { 
  getFolder
};