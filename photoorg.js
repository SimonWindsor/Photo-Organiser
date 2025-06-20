const exifr = require('exifr'); // For obtaining photo metadata
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs/promises');
const path = require('path');
const readline = require('readline');

// Input/output handler
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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
    console.error('err');
    console.log(`${filePath} is probably a video`)
  }

  // This dhould work for videos
  try {
    const videoDate = await getVideoTakenDate(filePath);
    if (videoDate instanceof Date && !isNaN(videoDate)) {
      return parsed;
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

// FOr moving files into date folders
async function moveFile(dir, date, file, filePath) {
  try{
    // Obtain year and month from Date object and put in according folder
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const monthDir = path.join(dir, String(year), `${year}-${month}`);
    await fs.mkdir(monthDir, { recursive: true});
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
async function organisePhotos() {
  const baseDir = path.resolve(__dirname, './../');
  const fallBackDir = path.join(baseDir, 'unknown dates');

  const files = await getFiles(baseDir);
  
  for(const file of files) {
    try {
      const filePath = path.join(baseDir, file);
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
      
      await moveFile(baseDir, date, file, filePath);
    } catch (err) {
      console.error(`CAN'T PROCESS ${file}: ${err}`)
    }
  }
};

// Allows files from "unknown dates" folder to be moved based on date modified
async function organiseUnknown() {
  const baseDir = path.resolve(__dirname, './../');
  const unknownDir = path.resolve(baseDir, 'unknown dates');

  const files = await getFiles(unknownDir);

  for (file of files) {
    try {
      const filePath = path.join(unknownDir, file);
      const date = await getModifiedDate(filePath);

      // If no date, leave them in "unknown dates" folder
      if (!date) {
        console.log(`NO DATE FOR ${file}`);
        continue;
      }

      await moveFile(baseDir, date, file, filePath);
    } catch (err) {
      console.error(`CAN'T PROCESS ${file}: ${err}`)
    }
  }
}

(async () => {
  rl.question(`Pick an Option
    1. Move all files in base folder into dated folders based on metadata (date taken)
    2. Move files in "unknown dates" folder based on their sate modifed
    3. Exit
    `, (selection) => {
      switch(selection.trim()) {
        case '1':
          organisePhotos();
          rl.close();
          break;
        case '2':
          organiseUnknown();
          rl.close();
          break;
        case '3':
          running = false;
          rl.close();
          process.exit();
        default:
          console.log('Invalid selection');
          rl.close();
      }
  });
})()


