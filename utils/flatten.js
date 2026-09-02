const fs = require('fs/promises');
const path = require('path');

const baseDir = path.resolve(__dirname, './'); // needs to be global

async function getFolders(dir) {
  const allFolders = (await fs.readdir(dir, { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  return allFolders;
}

async function moveFiles(folderDir) {
  const allFiles = (await fs.readdir(folderDir, { withFileTypes: true }))
    .filter(entry => entry.isFile())
    .map(entry => entry.name);

  for (const file of allFiles) {
    const filePath = path.join(folderDir, file);
    destPath = path.join(baseDir, file);
    await fs.rename(filePath, destPath)
    console.log(`${file} moved`)
  }
}

async function flattenFolders(dir) {
  const folderArr = await getFolders(dir);

  for (const folder of folderArr) {
    const currentDir = path.join(dir, folder);
    console.log(`Now checking: ${currentDir}`)
    await moveFiles(currentDir);
    await flattenFolders(currentDir);
    await fs.rmdir(currentDir);
    console.log(`${currentDir} now deleted`);
  }
}

(async () => {
  await flattenFolders(baseDir);
})()