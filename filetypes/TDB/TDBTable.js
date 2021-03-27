const TDBField = require('./TDBField');
const TDBRecord = require('./TDBRecord');
const { BitView } = require('bit-buffer');
const TDBHuffmanField = require('./TDBHuffmanField');
const huffmanTreeParser = require('../../services/huffmanTreeParser');

class TDBTable {
    constructor() {
        this[Symbol.toStringTag] = 'TDBTable';

        this._name = '';
        this._offset = 0;
        this._header = {};
        this._fieldDefinitions = [];
        this._records = [];
        this._headerBuffer = null;
        this._fieldDefinitionBuffer = null;
        this._dataBuffer = null;
        this._huffmanBufferOffset = -1;
        this._huffmanTreeBuffer = null;
        this._indexBuffer = null;
    };

    get name() {
        return this._name;
    };

    set name(name) {
        this._name = name;
    };

    get offset() {
        return this._offset;
    };

    set offset(offset) {
        this._offset = offset;
    };

    get header() {
        return this._header;
    };

    set header(header) {
        this._header = header;
    };

    get fieldDefinitions() {
        return this._fieldDefinitions;
    };

    set fieldDefinitions(fieldDefinitions) {
        this._fieldDefinitions = fieldDefinitions;
    };

    get records() {
        return this._records.filter((record) => { 
            return record.isPopulated;
        });
    };

    set records(records) {
        this._records = records;
    };

    get dataBuffer() {
        return this._dataBuffer;
    };

    set dataBuffer(buffer) {
        this._dataBuffer = buffer;
    };

    get headerBuffer() {
        return this._headerBuffer;
    };

    set headerBuffer(buffer) {
        this._headerBuffer = buffer;
    };

    get fieldDefinitionBuffer() {
        return this._fieldDefinitionBuffer;
    };

    set fieldDefinitionBuffer(buffer) {
        this._fieldDefinitionBuffer = buffer;
    };

    get huffmanBufferOffset() {
        return this._huffmanBufferOffset;
    };

    get huffmanTreeBuffer() {
        return this._huffmanTreeBuffer;
    };

    get indexBuffer() {
        return this._indexBuffer;
    };

    set indexBuffer(buf) {
        this._indexBuffer = buf;
    };

    readRecords() {
        return new Promise((resolve, reject) => {
            let huffmanTreeBuffer;
            let huffmanRoot = null;

            if (this.header.dataAllocationType === 66) {
                this._huffmanBufferOffset = this.header.lengthBytes * this.header.maxRecords;
                huffmanTreeBuffer = this._dataBuffer.slice(this._huffmanBufferOffset);
                huffmanRoot = huffmanTreeParser.parseTree(huffmanTreeBuffer);
                this._huffmanTreeBuffer = huffmanTreeBuffer;
            }

            let numberOfRecordsAllocatedInFile = this.header.maxRecords;

            if (this.header.dataAllocationType !== 2 && this.header.dataAllocationType !== 6) {
                numberOfRecordsAllocatedInFile = this.header.currentRecords;
            }

            let records = [];
            for (let i = 0; i < numberOfRecordsAllocatedInFile; i++) {
                let record = new TDBRecord();

                if ((i+1) > this.header.currentRecords) {
                    record.isPopulated = false;
                }

                const recordBuf = this._dataBuffer.slice((this.header.lengthBytes * i), (this.header.lengthBytes * i) + this.header.lengthBytes);
                record.recordBuffer = recordBuf;

                const recordBitArray = new BitView(recordBuf, recordBuf.byteOffset);
                recordBitArray.bigEndian = true;

                for (let j = 0; j < this.fieldDefinitions.length; j++) {
                    const definition = this.fieldDefinitions[j];

                    let field;

                    if (definition.type === 13 || definition.type === 14) {
                        field = new TDBHuffmanField();
                    }
                    else {
                        field = new TDBField();
                    }

                    field.definition = definition;
                    field.raw = recordBuf;
                    field.rawBits = recordBitArray;

                    if (field.definition.type === 13 || field.definition.type === 14) {
                        const offset = field.offset;
                        field.huffmanTreeRoot = huffmanRoot;

                        const offsetLength = field.definition.type === 13 ? 1 : 2;
                        field.offsetLength = offsetLength;
                        field.huffmanValueLength = huffmanTreeBuffer.readUIntBE(offset, offsetLength);
                        field.huffmanEncodedBuffer = huffmanTreeBuffer.slice(offset);

                        // shorten last record's buffer
                        if (i === 0) {
                            this._huffmanTreeBuffer = this._huffmanTreeBuffer.slice(0, offset);
                        }
                        else if (i > 0) {
                            let previousRecord = records[i-1].fields[field.definition.name];
                            previousRecord.huffmanEncodedBuffer = previousRecord.huffmanEncodedBuffer.slice(0, (offset - previousRecord.offset));
                        }
                    }

                    field.isChanged = false;
                    record.fields[field.name] = field;
                }
                
                records.push(new Proxy(record, {
                    get: function (target, prop, receiver) {
                        return record.fields[prop] !== undefined ? record.fields[prop].value : record[prop] !== undefined ? record[prop] : null;
                    },
                    set: function (target, prop, receiver) {
                        if (record.fields[prop] !== undefined) {
                            record.fields[prop].value = receiver;
                        }
                        else {
                            record[prop] = receiver;
                        }

                        return true;
                    }
                }));
            }

            this.records = records;
            resolve(records);
        });
    };
};

module.exports = TDBTable;