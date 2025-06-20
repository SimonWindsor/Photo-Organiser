const exifr = require('exifr'); // For obtaining photo metadata
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs/promises');
const path = require('path');

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
  // This will work if an image
  try {
    const { DateTimeOriginal } = await exifr.parse(filePath);
    if (DateTimeOriginal) return DateTimeOriginal;
  } catch (err) {
    console.error('err');
    console.log(`${filePath} is probably a video`)
  }

  // This will work for videos
  try {
    const videoDate = await getVideoTakenDate(filePath);
    if (videoDate) return videoDate;
  } catch (err) {
    console.error(err);
  }

  // Fallback if date not obtained
  return null;
}

(async () => {
  const baseDir = path.resolve(__dirname, './../');
  const fallBackDir = path.join(baseDir, 'unknown dates');

  // Obtain all files (filtering photoorg.js) are log them
  const allFiles = await fs.readdir(baseDir, { withFileTypes: true });
  const files = allFiles
    .filter(file => file.isFile())
    .map(file => file.name);

  console.log(`Number of files to be organised: ${files.length}
    \nThe files are as follows:\n`);
  
  for(const file of files) {
    try {
      const filePath = path.join(baseDir, file);
      const date = await getTakenDate(filePath)

      // If no date, put them in "unknown dates" folder
      if (!date) {
        console.log(`NO DATE FOR ${file}`);
        await fs.mkdir(fallBackDir, { recursive: true});
        const destPath = path.join(fallBackDir, file);
        await fs.rename(filePath, destPath);
        continue;
      }
      
      // Obtain year and month from Date object and put in according folder
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const monthDir = path.join(baseDir, String(year), `${year}-${month}`);
      await fs.mkdir(monthDir, { recursive: true});
      const destPath = path.join(monthDir, file)
      await fs.rename(filePath, destPath);
      console.log(`${file} moved to ${monthDir}`);
      console.log(''); // Blank line for next file
    } catch (err) {
      console.error(`CAN'T PROCESS ${file}: ${err}`)
    }
  }
})();