const exifr = require('exifr'); // For obtaining photo metadata
const ffmpeg = require('fluent-ffmpeg'); // For working with videos
const fs = require('fs/promises');
const path = require('path');
const readline = require('readline');
const { getFolder } = require('./utils/browserMenu.js')

const configPath = path.join(__dirname, 'config.json');

// Main function - initialises config and displays menu on run
async function main () {
  const config = await loadConfig();
  showMenu(config);
}

// For obtaining cofig- i.e stored folder paths for photo organising
async function loadConfig() {
  const configText = await fs.readFile(configPath, 'utf8');
  return JSON.parse(configText);
}

// For saving selected folder paths
async function saveConfig(config) {
  await fs.writeFile(
    configPath,
    JSON.stringify(config, null, 2)
  );
}

// Gets data taken from video metadata
async function getVideoTakenDate(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const creation = metadata?.format?.tags?.creation_time;
      resolve(creation ? new Date(creation) : null);
    });
  });
}

/* Gets date taken from metadata, calls getVideoTakenDate()
  if unable to do so (most likely a video)
*/
async function getTakenDate(filePath) {
  // This should work if an image
  try {
    const { DateTimeOriginal } = await exifr.parse(filePath);
    if (DateTimeOriginal instanceof Date && !isNaN(DateTimeOriginal)) {
       return DateTimeOriginal;
    }
  } catch (err) {
    console.error(err);
    console.log(`${filePath} may not be an image`)
  }

  // This should work for videos
  try {
    const videoDate = await getVideoTakenDate(filePath);
    if (videoDate instanceof Date && !isNaN(videoDate)) {
      return videoDate;
    }
  } catch (err) {
    console.error(err);
  }

  // Fallback if date not obtained
  return null;
}

// Gets date modified - for moving files with unknown taken dates
async function getModifiedDate(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtime;
  } catch (err) {
    console.error(err);
    return null
  }
}

// Obtain all files, log them and return them
async function getFiles(dir) {
  const allFiles = await fs.readdir(dir, { withFileTypes: true });
  const files = allFiles
    .filter(file => file.isFile())
    .map(file => file.name);

  console.log(`Number of files to be organised: ${files.length}
    \nThe files are as follows:\n${files}`);

  return files;
}

// For moving files into date folders
async function moveFile(dir, date, file, filePath) {
  try {
    // Obtain year and month from Date object and put in according folder
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const monthDir = path.join(dir, String(year), `${year}-${month}`);
    await fs.mkdir(monthDir, { recursive: true });
    const destPath = path.join(monthDir, file)
    await fs.rename(filePath, destPath);
    console.log(`${file} moved to ${monthDir}`);
    console.log(''); // Blank line for next file
  } catch (err) {
    console.error(err);
  }
}

/* The main organiser function - calls above functions to get dates organise
  photos into a year/year-month folder system. Files are moved to "unknown
  dates" folder if dates are not obtained from meta data
*/
async function organisePhotos(config) {
  const sourceDir = path.resolve(__dirname, config.sourcePath);
  const destinationDir  = path.resolve(__dirname, config.destinationPath);
  const fallBackDir = path.join(destinationDir , 'unknown dates');

  const files = await getFiles(sourceDir);
  
  for(const file of files) {
    try {
      const filePath = path.join(sourceDir, file);
      const date = await getTakenDate(filePath);
      console.log(date);

      // If no date, put them in "unknown dates" folder
      if (!date) {
        console.log(`NO DATE FOR ${file}`);
        await fs.mkdir(fallBackDir, { recursive: true});
        const destPath = path.join(fallBackDir, file);
        await fs.rename(filePath, destPath);
        continue;
      }
      
      await moveFile(destinationDir, date, file, filePath);
    } catch (err) {
      console.error(`CAN'T PROCESS ${file}: ${err}`)
    }
  }
};

// Allows files from "unknown dates" folder to be moved based on date modified
async function organiseUnknown(config) {
  const destinationDir  = path.resolve(__dirname, config.destinationPath);
  const unknownDir = path.resolve(destinationDir , 'unknown dates');

  const files = await getFiles(unknownDir);

  for (const file of files) {
    try {
      const filePath = path.join(unknownDir, file);
      const date = await getModifiedDate(filePath);

      // If no date, leave them in "unknown dates" folder
      if (!date) {
        console.log(`NO DATE FOR ${file}`);
        continue;
      }

      await moveFile(destinationDir, date, file, filePath);
    } catch (err) {
      console.error(`CAN'T PROCESS ${file}: ${err}`)
    }
  }
}

// FOr displaying basic operations menu
function showMenu(config) {
  /* Input/output handler which is Created in this function as  menu options
    will require it to be closed. It can reopen here when menu returns
  */
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`Pick an Option:
    1. Move all files in base folder into dated folders based on metadata (date taken)
    2. Move files in "unknown dates" folder based on their date modifed
    3. Select source folder for photos to be organised
    4. Select destination folder for organised photos
    5. Show current source/destination folders
    6. Move organised folders back to source folder
    7. Exit
    `, async (selection) => {
    switch(selection.trim()) {
      case '1':
        rl.close();
        await organisePhotos(config);
        break;
      
      case '2':
        rl.close();
        await organiseUnknown(config);
        break;
      
      case '3': {
        rl.close();
        const sourceFolder = await getFolder('D:\\');
        console.clear();

        if (sourceFolder) {
          config.sourcePath = sourceFolder;
          await saveConfig(config);
        }

        break;
      }
      
      case '4': {
        rl.close();
        const destinationFolder = await getFolder('D:\\');
        console.clear();

        if (destinationFolder) {
          config.destinationPath = destinationFolder;
          await saveConfig(config);
        }

        break;
      }
      
      case '5': {
        rl.close();
        console.log(`Source directory: ${config.sourcePath}`);
        console.log(`Desintation directory: ${config.destinationPath}`);
        break;
      }

      case '6': {
        rl.close()
        // will code shortly
        break;
      }

      case '7':
        console.log('Exiting program. Goodbye.');
        rl.close();
        return;
      default:
        console.log('Invalid selection');
    }
    showMenu(config);        
  });
}

main();


