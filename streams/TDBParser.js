const TDBFile = require('../filetypes/TDB/TDBFile');
const TDBField = require('../filetypes/TDB/TDBField');
const TDBTable = require('../filetypes/TDB/TDBTable');
const utilService = require('../services/utilService');
const TDBRecord = require('../filetypes/TDB/TDBRecord');
const FileParser = require('../filetypes/abstract/FileParser');

const FIELD_TYPE_STRING = 0;
const FIELD_TYPE_BINARY = 1;
const FIELD_TYPE_SINT = 2;
const FIELD_TYPE_UINT = 3;
const FIELD_TYPE_FLOAT = 4;

class TDBParser extends FileParser {
    constructor() {
        super();
        this.file = new TDBFile();
        this.bytes(0x18, this._onHeader);
    };

    _onHeader(buf) {
        const header = {
            'digit': buf.readUInt16BE(0),
            'version': buf.readUInt16BE(2),
            'unknown1': buf.readUInt32BE(4),
            'dbSize': buf.readUInt32BE(8),
            'zero': buf.readUInt32BE(12),
            'numTables': buf.readUInt32BE(16),
            'unknown2': buf.readUInt32BE(20)
        }

        this.file.header = header;

        this.bytes((header.numTables * 0x8), this._onDefinitions);
    };

    _onDefinitions(buf) {
        let definitions = [];

        for (let i = 0; i < this.file.header.numTables; i++) {
            const nameIndex = i*8;
            const offsetIndex = (i*8)+4;

            const nameBackwards = buf.toString('utf8', nameIndex, offsetIndex);
            const name = reverseString(nameBackwards);

            definitions.push({
                'name': name,
                'offset': buf.readUInt32BE(offsetIndex),
            });
        }

        this.file.definitions = definitions;
        this.tableDataStart = this.currentBufferIndex;

        this.bytes(0x28, this._onTableHeader);
    };

    _onTableHeader(buf) {
        const table = new TDBTable();

        const tableOffset = this.currentBufferIndex - (this.tableDataStart + 0x28);
        const tableDefinition = this.file.definitions.find((def) => {
            return def.offset === tableOffset;
        });

        table.name = tableDefinition.name;

        table.header = {
            'priorCrc': buf.readUInt32BE(0),
            'dataAllocationType': buf.readUInt32BE(4),
            'lengthBytes': buf.readUInt32BE(8),
            'lengthBits': buf.readUInt32BE(12),
            'zero': buf.readUInt32BE(16),
            'maxRecords': buf.readUInt16BE(20),
            'currentRecords': buf.readUInt16BE(22),
            'unknown2': buf.readUInt32BE(24),
            'numFields': buf.readUInt8(28),
            'indexCount': buf.readUInt8(29),
            'zero2': buf.readUInt16BE(30),
            'zero3': buf.readUInt32BE(32),
            'headerCrc': buf.readUInt32BE(36)
        };

        if (table.header.lengthBytes > 0) {
            this.bytes(table.header.numFields * 0x10, (buf) => {
                this._onTableFieldDefinitions(buf, table);
            });
        }
        else {
            this.skipBytes(Infinity);
        }
    };

    _onTableFieldDefinitions(buf, table) {
        const fieldDefinitions = [];

        for (let i = 0; i < table.header.numFields; i++) {
            fieldDefinitions.push({
                'type': buf.readUInt32BE(i*0x10),
                'offset': buf.readUInt32BE((i*0x10) + 4),
                'name': reverseString(buf.toString('utf8', (i*0x10) + 8, (i*0x10) + 12)),
                'bits': buf.readUInt32BE((i*0x10) + 12)
            });
        }

        table.fieldDefinitions = fieldDefinitions;

        let numberOfBytesToReadNext = table.header.lengthBytes * table.header.currentRecords;

        switch(table.header.dataAllocationType) {
            case 2:
            case 6:
                numberOfBytesToReadNext = table.header.lengthBytes * table.header.maxRecords;
                break;
            default:
                break;
        }

        if (numberOfBytesToReadNext > 0) {
            this.bytes(numberOfBytesToReadNext, (buf) => {
                this._onTableRecords(buf, table);
            });
        }
        else {
            this._onTableComplete(table);
        }
    };

    _onTableRecords(buf, table) {
        let numberOfRecordsAllocatedInFile = table.header.maxRecords;

        if (table.header.dataAllocationType !== 2 && table.header.dataAllocationType !== 6) {
            numberOfRecordsAllocatedInFile = table.header.currentRecords;
        }

        let records = [];
        for (let i = 0; i < numberOfRecordsAllocatedInFile; i++) {
            let record = new TDBRecord();

            if ((i+1) > table.header.currentRecords) {
                record.isPopulated = false;
            }

            const recordBuf = buf.slice((table.header.lengthBytes * i), (table.header.lengthBytes * i) + table.header.lengthBytes);
            const recordBitArray = utilService.getBitArray(recordBuf);

            let fields = [];
            for (let j = 0; j < table.fieldDefinitions.length; j++) {
                let field = new TDBField();
                field.definition = table.fieldDefinitions[j];

                switch (field.definition.type) {
                    case FIELD_TYPE_STRING:
                        field.value = recordBuf.toString('utf8', (field.definition.offset/8), (field.definition.offset + field.definition.bits)/8).replace(/\0/g, '');
                        break;
                    case FIELD_TYPE_BINARY:
                        field.value = recordBuf.slice((field.definition.offset/8), (field.definition.offset + field.definition.bits)/8);
                        break;
                    case FIELD_TYPE_SINT:
                    case FIELD_TYPE_UINT:
                    case FIELD_TYPE_FLOAT:
                    default:
                        field.value = utilService.bin2dec(recordBitArray.slice(field.definition.offset, field.definition.offset + field.definition.bits));
                        break;
                }

                fields.push(field);
            }
            
            record.fields = fields;
            records.push(record);
        }

        table.records = records;
        this._onTableComplete(table);
    };

    _onTableComplete(table) {
        this.file.addTable(table);
        this.bytes(0x28, this._onTableHeader);
    };
};

module.exports = TDBParser;

function reverseString(str) {
    return str.split('').reverse().join('');
};