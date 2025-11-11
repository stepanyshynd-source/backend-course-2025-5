const http = require('http');
const fs = require('fs');
const superagent = require('superagent');
const { program } = require('commander');

program
  .requiredOption('-h, --host <host>', 'адреса сервера')
  .requiredOption('-p, --port <port>', 'порт сервера')
  .requiredOption('-c, --cache <dir>', 'шлях до директорії з кешем')
  .parse(process.argv);

const options = program.opts();
const host = options.host;
const port = Number(options.port);
const cacheDir = options.cache;

fs.mkdirSync(cacheDir, { recursive: true });

const server = http.createServer(async (req, res) => {
  const code = req.url.slice(1);

  if (!code) {
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }

  const filePath = `${cacheDir}/${code}.jpg`;
  if (req.method === 'GET') {
    try {
      const data = await fs.promises.readFile(filePath);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'image/jpeg');
      res.end(data);
      return;
    } catch (err) {
      if (err.code !== 'ENOENT') {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }
    }

    try {
      const response = await superagent
        .get(`https://http.cat/${code}`)
        .responseType('arraybuffer');

      const imageBuffer = response.body;
      await fs.promises.writeFile(filePath, imageBuffer);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'image/jpeg');
      res.end(imageBuffer);
    } catch (err) {
      res.statusCode = 404;
      res.end('Not Found');
    }

    return;
  }

  if (req.method === 'PUT') {
    const chunks = [];

    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', async () => {
      const body = Buffer.concat(chunks);

      try {
        await fs.promises.writeFile(filePath, body);
        res.statusCode = 201;
        res.end('Created');
      } catch (err) {
        res.statusCode = 404;
        res.end('Not Found');
      }
    });

    return;
  }

  if (req.method === 'DELETE') {
    try {
      await fs.promises.unlink(filePath);
      res.statusCode = 200;
      res.end('Deleted');
    } catch (err) {
      res.statusCode = 404;
      res.end('Not Found');
    }
    return;
  }
  res.statusCode = 405;
  res.end('Method not allowed');
});
server.listen(port, host);
