import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = process.env.PORT || 8080;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname);
const CACHE_CONTROL = 'no-store, no-cache, must-revalidate';

const MIME_TYPES = {
    '.aac': 'audio/aac',
    '.avi': 'video/x-msvideo',
    '.css': 'text/css; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    '.gif': 'image/gif',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/vnd.microsoft.icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.obj': 'model/obj',
    '.otf': 'font/otf',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ts': 'application/typescript; charset=utf-8',
    '.ttf': 'font/ttf',
    '.txt': 'text/plain; charset=utf-8',
    '.wasm': 'application/wasm',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.xml': 'application/xml; charset=utf-8',
    '.zip': 'application/zip'
};

function mapPath(urlPath) {
    const normalized = path.normalize(urlPath).replace(/^([.]+[\/])+/, '');
    const absolute = path.join(ROOT_DIR, normalized);
    if (!absolute.startsWith(ROOT_DIR)) {
        const err = new Error('Forbidden');
        err.statusCode = 403;
        throw err;
    }
    return absolute;
}

function send(res, statusCode, headers, body = '') {
    res.writeHead(statusCode, headers);
    res.end(body);
}

function sendFile(res, filePath) {
    const headers = {
        'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': CACHE_CONTROL
    };
    res.writeHead(200, headers);
    fs.createReadStream(filePath).on('error', () => {
        send(res, 500, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Internal Server Error');
    }).pipe(res);
}

const server = http.createServer((req, res) => {
    if (!req.url) {
        send(res, 400, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Bad Request');
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === '/') {
        send(res, 302, { Location: '/website/' });
        return;
    }

    let targetPath;
    try {
        targetPath = mapPath(pathname);
    } catch (error) {
        send(res, error.statusCode || 500, { 'Content-Type': 'text/plain; charset=utf-8' }, error.message || 'Error');
        return;
    }

    fs.stat(targetPath, (err, stats) => {
        if (err) {
            send(res, err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' }, err.code === 'ENOENT' ? 'Not Found' : 'Internal Server Error');
            return;
        }

        if (stats.isDirectory()) {
            const needsSlash = !pathname.endsWith('/');
            if (needsSlash) {
                send(res, 301, { Location: `${pathname}/` });
                return;
            }
            const indexPath = path.join(targetPath, 'index.html');
            fs.access(indexPath, fs.constants.R_OK, (accessErr) => {
                if (accessErr) {
                    send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not Found');
                    return;
                }
                sendFile(res, indexPath);
            });
            return;
        }

        sendFile(res, targetPath);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Static server running on port ${PORT}`);
});
