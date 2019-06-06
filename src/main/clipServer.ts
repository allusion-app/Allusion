import http from 'http';

import { SERVER_PORT } from '../config';

export const setupServer = (
  onReceiveImage: (filename: string, tags: string[], imgBase64: string) => Promise<void>,
  onRequestTags: () => Promise<string[]>,
) => {
  http.createServer((req, res) => {
    // res.setHeader('Access-Control-Allow-Headers', req.headers.origin || '');
    if (req.method === 'POST') {
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
        res.end(JSON.stringify(['banana', 'apple', 'pineapple']));
      }
    }
  }).listen(SERVER_PORT, 'localhost');
};

// export function listenNativeMessaging(
//   onReceiveImage: (filename: string, tags: string[], imgBase64: string) => Promise<void>,
//   onRequestTags: () => Promise<string[]>,
// ) {
//   // From https://github.com/electron/electron/issues/8692
//   let msgBacklog = '';

//   async function appendInputString(chunk: string) {
//     msgBacklog += chunk;
//     while (msgBacklog.length > 3) {
//         const msgLength = msgBacklog.charCodeAt(0) + (msgBacklog.charCodeAt(1) << 8) +
//             (msgBacklog.charCodeAt(2) << 16) + (msgBacklog.charCodeAt(3) << 24);
//         if (msgBacklog.length < msgLength + 4) {
//           return;
//         }
//         try {
//             const body = JSON.parse(msgBacklog.substring(4, 4 + msgLength));
//             // handle received message
//             console.log(body);
//             if (body.type === 'ADD_IMAGE') {
//               await onReceiveImage(body.filename, body.tags || [], body.imgBase64);
//               send({ message: 'OK', pong: body });
//             }
//         } catch (e) {
//           console.warn('Could not parse native message');
//         }
//         msgBacklog = msgBacklog.substring(4 + msgLength);
//       }
//   }

//   function send(message: any) {
//     const msgStr = JSON.stringify(message);
//     const lengthStr = String.fromCharCode(
//         msgStr.length & 0x000000ff,
//         (msgStr.length >> 8) & 0x000000ff,
//         (msgStr.length >> 16) & 0x000000ff,
//         (msgStr.length >> 24) & 0x000000ff,
//     );
//     process.stdout.write(lengthStr + msgStr);
//   }

//   process.stdin.setEncoding('utf8');
//   process.stdin.on('data', (chunk) => {
//       appendInputString(chunk);
//   });
// };

// /**
//  * Based on https://developer.chrome.com/apps/nativeMessaging
//  * Should check/warn user that chrome should be installed
//  */
// export async function registerNativeMessaging(): Promise<void> {
//   const appId = `com.allusion.allusion`;
//   const extensionId = 'chrome-extension://gbnkipoknmhlicapmnbjaclpiiolpkno/';

//   let exePath = '';
//   if (process.platform === 'win32') {
//     exePath = SysPath.join(__dirname, '..', '..', 'Allusion.exe'); // Win
//   } else if (process.platform === 'darwin') { // Mac
//     exePath =  SysPath.join(__dirname, '..', '..', '..', 'Allusion.app');
//   } else { // Linux
//     exePath =  SysPath.join(__dirname, '..', 'Allusion');
//   }

//   // Create nmh json
//   const nmhManifest = {
//     name: appId,
//     description: 'Allusion',
//     path: exePath,
//     type: 'stdio',
//     allowed_origins: [extensionId],
//   };

//   // Register to OS
//   if (process.platform === 'win32') {
//     // Save nmh manifest json file to app directory
//     const nmhManifestPath = SysPath.join(__dirname, '..', 'nmh-manifest.json');
//     await fse.writeFile(nmhManifestPath, JSON.stringify(nmhManifest, null, 2));

//     // tslint:disable-next-line: max-line-length
//     const command = `REG ADD "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${appId}" /ve /t REG_SZ /d "${nmhManifestPath}" /f`;

//     // Add to registry
//     exec(command, (err, res) => {
//       console.log(err, res);
//       return err ? Promise.reject(err) : Promise.resolve();
//     });
//   } else {
//     const path = process.platform === 'darwin'
//       ? `/Library/Google/Chrome/NativeMessagingHosts/${appId}.json`
//       : `/etc/opt/chrome/native-messaging-hosts/${appId}.json`; // else it's linux
//     await fse.writeFile(path, JSON.stringify(nmhManifest, null, 2));
//   }
// }
