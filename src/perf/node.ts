import { KeyComparator } from './tree.js';

export class IndexRange implements KeyComparator {
    public start: number;
    public end: number;

    constructor(start: number, end?: number) {
        this.start = start;
        this.end = end ? end : start;
    }
    public isQuery() {
        return this.start == this.end;
    }

    public toString(): string {
        return `[${this.start}-${this.end}]`;
    }

    public compare(other: IndexRange): number {
        if (this.isQuery()) {
            if (this.start >= other.start && this.start <= other.end) {
                return 0;
            }
        }

        if (other.isQuery()) {
            if (other.start >= this.start && other.start <= this.end) {
                return 0;
            }
        }

        if (this.start > other.end) {
            // goes to the right as larger
            return 1;
        } else if (this.end <= other.start) {
            return -1;
        }

        // which should in theory never happen
        return 0;
    }

    isEqual(key: IndexRange): boolean {
        return this.compare(key) === 0;
    }

    isGreater(key: IndexRange): boolean {
        return this.compare(key) > 0;
    }

    isLesser(key: IndexRange): boolean {
        return this.compare(key) < 0;
    }
}

export class Result {
    public lineNumber: number;
    public columnOffset: number;

    constructor(lineNumber: number, columnOffset: number) {
        this.lineNumber = lineNumber;
        this.columnOffset = columnOffset;
    }

    public isEqual(r: Result): boolean {
        return this.lineNumber == r.lineNumber && this.columnOffset == r.columnOffset;
    }

    public toString(): string {
        return `Ln ${this.lineNumber} Col ${this.columnOffset}`;
    }
}

export class LineNode {
    public indexRange: IndexRange;
    public value: number;

    constructor(indexRange, value: number) {
        this.indexRange = indexRange;
        this.value = value;
    }

    public isQuery() {
        return this.indexRange.isQuery();
    }

    public compare(other: LineNode): number {
        return this.indexRange.compare(other.indexRange);
    }

    public toString(): string {
        return `${this.indexRange} @ ${this.value}`;
    }
}
