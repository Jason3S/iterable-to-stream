import { expect } from 'chai';
import { Writable, WritableOptions } from 'stream';
import { loremIpsum } from 'lorem-ipsum';

import iterableToStream from './iterableToStream';
import { EventEmitter } from 'events';

describe('Validate iterableToStream', () => {
    it('Test creating a stream from an array', async () => {
        const target = new WritableDataStream();
        const document = loremIpsum({ count: 100, units: 'paragraphs' });
        const words = document.split(/\b(?=\s)/g);
        const targetStream = iterableToStream(words, { encoding: 'utf8', _useNode: false }).pipe(target);
        await streamToPromise(targetStream);
        expect(target.data.join('')).to.be.equal(document);
    });

    it('Object Mode Test creating a stream from an array', async () => {
        const target = new WritableDataStream();
        const document = loremIpsum({ count: 100, units: 'paragraphs' });
        const words = document.split(/\b(?=\s)/g);
        const targetStream = iterableToStream(words, { encoding: 'utf8', _useNode: false, objectMode: true }).pipe(target);
        await streamToPromise(targetStream);
        expect(target.data.join('')).to.be.equal(document);
    });

    it('Node.from Test creating a stream from an array', async () => {
        const target = new WritableDataStream();
        const document = loremIpsum({ count: 100, units: 'paragraphs' });
        const words = document.split(/\b(?=\s)/g);
        const targetStream = iterableToStream(words).pipe(target);
        await streamToPromise(targetStream);
        expect(target.data.join('')).to.be.equal(document);
    });

    it('Test creating a stream from an array words', async () => {
        const target = new WritableDataStream();
        const document = loremIpsum({ count: 100, units: 'words' });
        const words = iterateWords(document, '.done.');
        const targetStream = iterableToStream(words, { encoding: 'utf8', _useNode: false }).pipe(target);
        await streamToPromise(targetStream);
        expect(target.data.join('')).to.be.equal(document + '.done.');
    });

    it('Node.from Test creating a stream from an array words', async () => {
        const target = new WritableDataStream();
        const document = loremIpsum({ count: 100, units: 'words' });
        const words = iterateWords(document);
        const targetStream = iterableToStream(words).pipe(target);
        await streamToPromise(targetStream);
        expect(target.data.join('')).to.be.equal(document);
    });

    it('Node.from tests that empty values do not break the steam', async () => {
        const target = new WritableDataStream();
        const data = ['One', 'Two', 'Three', '', null, undefined, 'buffer', Buffer.from('', 'utf-8'), 'Last'];
        const targetStream = iterableToStream(data as string[], { encoding: 'utf8', removeEmpty: true }).pipe(target);
        await streamToPromise(targetStream);
        expect(target.data.join('')).to.be.equal(data.filter((a) => !!a).join(''));
    });

    it('tests that empty values do not break the steam', async () => {
        const target = new WritableDataStream();
        const data = ['One', 'Two', 'Three', '', null, undefined, 'buffer', Buffer.from('', 'utf-8'), 'Last'];
        const targetStream = iterableToStream(data as string[], { encoding: 'utf8', removeEmpty: true, _useNode: false }).pipe(target);
        await streamToPromise(targetStream);
        expect(target.data.join('')).to.be.equal(data.filter((a) => !!a).join(''));
    });

    it('tests that empty values stop the stream', async () => {
        const target = new WritableDataStream();
        const data = ['One', 'Two', 'Three', '', null, undefined, 'buffer', 'Last'];
        const targetStream = iterableToStream(data as string[], { encoding: 'utf8', _useNode: false }).pipe(target);
        await streamToPromise(targetStream);
        expect(target.data.join('')).to.be.equal(['One', 'Two', 'Three'].join(''));
    });
});

function* iterateWords(doc: string, final?: string) {
    const words = doc.split(/\b(?=\s)/g);
    yield* words;
    return final;
}

class WritableDataStream extends Writable {
    private _data: string[] = [];
    static readonly defaultOptions = { decodeStrings: false, highWaterMark: 64 };

    constructor(options: WritableOptions = WritableDataStream.defaultOptions) {
        super({ ...WritableDataStream.defaultOptions, ...options });
    }
    _write(chunk: string, encoding: string, callback: (e?: Error) => void) {
        if (encoding !== 'utf8') {
            callback(new Error(`Unknown encoding: ${encoding}`));
        }
        this._data.push(chunk.toString());
        callback();
    }

    _final(callback: Function) {
        callback();
    }

    get data() {
        return this._data;
    }
}

function streamToPromise(stream: EventEmitter): Promise<void> {
    return new Promise((resolve, reject) => {
        let resolved = false;
        let cleaned = true;

        function resolvePromise() {
            if (!resolved) {
                resolved = true;
                resolve();
            }
        }
        const endHandler = () => {
            cleanup();
            setTimeout(resolvePromise, 1);
        };
        const errorHandler = (e: Error) => {
            cleanup();
            reject(e);
        };

        listenToStream(stream);

        function listenToStream(stream: EventEmitter) {
            cleaned = false;
            stream.addListener('finish', endHandler);
            stream.addListener('close', endHandler);
            stream.addListener('end', endHandler);
            stream.addListener('error', errorHandler);
        }

        function cleanupStream(stream: EventEmitter) {
            if (cleaned) {
                return;
            }
            cleaned = true;
            stream.removeListener('finish', endHandler);
            stream.removeListener('close', endHandler);
            stream.removeListener('end', endHandler);
            stream.removeListener('error', errorHandler);
        }

        function cleanup() {
            cleanupStream(stream);
        }
    });
}
