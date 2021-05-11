import * as stream from 'stream';

// cspell:words streamable

export type Streamable = string | Buffer;

export type IterableLike<T> = Iterable<T> | IterableIterator<T>;

interface ReadableOptions {
    highWaterMark?: number;
    encoding?: string | 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'latin1' | 'binary' | 'hex';
    objectMode?: boolean;
    autoDestroy?: boolean;
}

export interface Options extends ReadableOptions {
    removeEmpty?: boolean;
}

/**
 * Transform an iterable into a node readable stream.
 */
export function iterableToStream<T extends Streamable>(src: IterableLike<T>): stream.Readable;
export function iterableToStream<T extends Streamable, U extends Options = Options>(src: IterableLike<T>, options: U): stream.Readable;
export function iterableToStream<T extends Streamable>(src: IterableLike<T>, options: Options = { encoding: 'utf8' }): stream.Readable {
    return new ReadableObservableStream(src, options);
}

class ReadableObservableStream<T> extends stream.Readable {
    private iter: Iterator<T, null | undefined | T>;
    private removeEmpty: boolean;

    constructor(private _source: IterableLike<T>, options: Options) {
        super(options);
        this.removeEmpty = options.removeEmpty ?? false;
    }

    _read() {
        if (!this.iter) {
            this.iter = this._source[Symbol.iterator]();
        }
        let r = this.iter.next();
        while (!r.done && this.pushValue(r.value)) {
            r = this.iter.next();
        }
        if (r.done) {
            // since it is possible for r.value to have something meaningful, we must check.
            if (r.value) {
                this.pushValue(r.value);
            }
            this.push(null);
        }
    }

    /**
     * Push values into the stream iff they are not empty.
     * @param v value to push if possible.
     * @returns true if more values can be pushed.
     */
    private pushValue(v: T | null | undefined): boolean {
        if (!this.removeEmpty) {
            return this.push(v);
        }
        return (
            v === undefined ||
            v === null ||
            (typeof v === 'string' && v === '') ||
            (Buffer.isBuffer(v) && v.byteLength === 0) ||
            this.push(v)
        );
    }
}

export default iterableToStream;
