import http from 'http';

import { SERVER_PORT } from '../config';

export const setupServer = (
  onReceiveImage: (filename: string, tags: string[], imgBase64: string) => Promise<void>,
  onRequestTags: () => Promise<string[]>,
) => {
  http.createServer(async (req, res) => {
    if (req.method === 'POST') {
      // A POST request will contain an image and some metadata
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', async () => {
        try {
          const { filename, url, imgBase64 } = JSON.parse(body);
          console.log('Received file', url);

          await onReceiveImage(filename, [], imgBase64);
          res.end({ message: 'OK!' });
        } catch (e) {
          res.end(JSON.stringify(e));
        }
      });
    } else if (req.method === 'GET') {
      if (req.url && req.url.endsWith('/tags')) {
        const tags = await onRequestTags();
        res.end(JSON.stringify(tags));
      }
    }
  }).listen(SERVER_PORT, 'localhost');
};
