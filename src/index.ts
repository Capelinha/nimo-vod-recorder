import { launch } from 'puppeteer-core';
import Ffmpeg from 'fluent-ffmpeg';
import { resolve } from 'path';
import axios from 'axios';
import { existsSync, mkdirSync } from 'fs';

const delay = (time: number) => new Promise<void>((res) => setTimeout(() => res(), time));

const getStreamUrl = async (streamer: string) => {
  const interval = setTimeout(async () => {
    await browser.close();
    throw new Error('URL not found!');
  }, 30000);

  const args = [
    '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"'
  ];

  const browser = await launch({ headless: true, args, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage();

  page.goto('https://www.nimo.tv/' + streamer);

  await page.setViewport({ width: 2560, height: 1440 });

  const urls = [] as string[];

  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('flv')) {
      urls.push(url.split('?')[0]);
    }
  });

  await page.waitForSelector('.nimo-player');

  await delay(10000);

  const [autoPlay] = await page.$$('.autoplay-alert__play');

  if (autoPlay) {
    autoPlay.click();
  }

  const [offline] = await page.$$('.off-live');

  if (offline) {
    await browser.close();
    clearInterval(interval);
    throw new Error('Live offline!');
  }

  await page.waitForSelector('.rate-control_list');

  const [player] = await page.$$('#nimo-player');
  await player.hover();
  await page.hover('.rate-current');
  const [item] = await page.$$('.rate-control_item');
  await item.hover();
  await item.click();

  await delay(10000);

  browser.removeAllListeners();

  const url = urls.pop();

  await browser.close();
  clearInterval(interval);

  if (url) {
    return url;
  } else {
    throw new Error('URL not found!');
  }
}

(async () => {
  while (true) {
    // const url = await getStreamUrl('locobaltar');
    const url = 'https://tx.flv.nimo.tv/live/su2399516623029rdce8d6299a7e246bfb7c47f07d636a4f.flv';
    const outputDir = '/media/mateus/Mateus/output';

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir);
    }

    let notification = false;

    try {
      await new Promise((res, rej) => Ffmpeg(url)
      .format('matroska')
      .output(resolve(outputDir, `${Date.now()}.mkv`))
      .on('end', () => res(null))
      .on('error', (error) => rej(new Error(error)))
      .on('progress', (progress) => {
        console.log('Recording... ' + progress.frames + ' -> ' + progress.timemark);
        if (progress.frames > 3593 && !notification) {
          notification = true;
          axios.post('https://discord.com/api/webhooks/900147643995549746/5cPzIyM4unJPD98DDJhezbY8tLX9CLNhhUjgRpngdNTZv7gT1mxrIIjExqZfMIbbXoO_', {
            "content": "Fala @everyone, bérou está ONLINE na Nimo.tv! https://www.nimo.tv/locobaltar"
          });
        }
      })
      .run());
    } catch (e) {
      console.log('Stream broken! ' + e);
    }

    await delay(60000);
  }
})().then(() => console.log('Success...')).catch((e) => console.error(e))

