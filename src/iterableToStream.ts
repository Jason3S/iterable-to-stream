import * as stream from 'stream';

// cspell:words streamable

export type Streamable = string | Buffer | Object;

export type IterableLike<T> = Iterable<T> | IterableIterator<T>;

export interface Options extends stream.ReadableOptions {
    removeEmpty?: boolean;
    /**
     * Indicate if stream.Readable.from function should be used.
     * @default true
     */
    _useNode?: boolean;
}

/**
 * Transform an iterable into a node readable stream.
 */
export function iterableToStream<T extends Streamable>(src: IterableLike<T>): stream.Readable;
export function iterableToStream<T extends Streamable, U extends Options = Options>(src: IterableLike<T>, options: U): stream.Readable;
export function iterableToStream<T extends Streamable>(src: IterableLike<T>, options: Options = { encoding: 'utf8' }): stream.Readable {
    const useNode = (options._useNode ?? true) && !!stream.Readable.from;
    const objectMode = options.objectMode ?? useNode;
    const filterFn = objectMode ? filterNullOrUndefined : filterEmptyStringOrBuffer;
    const iter = options.removeEmpty ? filterFn(src) : src;
    if (useNode) {
        return stream.Readable.from(iter, options);
    }
    return new ReadableObservableStream(iter, options);
}

class ReadableObservableStream<T> extends stream.Readable {
    private iter: Iterator<T, null | undefined | T>;

    constructor(private _source: IterableLike<T>, options: Options) {
        super(options);
    }

    _read() {
        if (!this.iter) {
            this.iter = this._source[Symbol.iterator]();
        }
        let r = this.iter.next();
        while (!r.done && this.push(r.value)) {
            r = this.iter.next();
        }
        if (r.done) {
            // since it is possible for r.value to have something meaningful, we must check.
            if (r.value) {
                this.push(r.value);
            }
            this.push(null);
        }
    }
}

function* filterEmptyStringOrBuffer<T>(src: IterableLike<T>) {
    for (const v of src) {
        if (v === undefined || v === null || (typeof v === 'string' && v === '') || (Buffer.isBuffer(v) && v.byteLength === 0)) {
            continue;
        }
        yield v;
    }
}

function* filterNullOrUndefined<T>(src: IterableLike<T>) {
    for (const v of src) {
        if (v === undefined || v === null) {
            continue;
        }
        yield v;
    }
}

export default iterableToStream;
