const fs = require('fs');
const path = require('path');
const concat = require('concat-stream');
const expect = require('chai').expect;

const tdbPath = path.join(__dirname, '../data/HC09_TDB.db');
const TDBParser = require('../../streams/TDBParser');

let dbParser;

describe('TDB File unit tests', () => {
    before(function(done) {
        this.timeout(10000);
        console.time('parse');
        dbParser = new TDBParser();

        const stream = fs.createReadStream(tdbPath);

        stream.on('end', () => {
            console.timeEnd('parse');
            done();
        });

        stream
            .pipe(dbParser);
    });

    describe('header', () => {
        it('dbUnknown', () => {
            expect(dbParser.file.header.digit).to.eql(17474);
        });
        
        it('version', () => {
            expect(dbParser.file.header.version).to.eql(8);
        });
        
        it('unknown1', () => {
            expect(dbParser.file.header.unknown1).to.eql(16777216);
        });

        it('dbSize', () => {
            expect(dbParser.file.header.dbSize).to.eql(4123196);
        });

        it('zero', () => {
            expect(dbParser.file.header.zero).to.eql(0);
        });

        it('numTables', () => {
            expect(dbParser.file.header.numTables).to.eql(208);
        });

        it('unknown2', () => {
            expect(dbParser.file.header.unknown2).to.eql(2010575941);
        });
    });

    describe('definitions', () => {
        it('correct definition count', () => {
            expect(dbParser.file.definitions.length).to.equal(208);
        });

        it('AWPL', () => {
            expect(dbParser.file.definitions[0]).to.eql({
                'name': 'AWPL',
                'offset': 0
            });
        });

        it('IRST', () => {
            expect(dbParser.file.definitions[22]).to.eql({
                'name': 'IRST',
                'offset': 89316
            });
        });

        it('UQIO', () => {
            expect(dbParser.file.definitions[207]).to.eql({
                'name': 'UQIO',
                'offset': 4119976
            });
        });
    });

    describe('EOF CRC', () => {
        it('expected EOF CRC', () => {
            expect(dbParser.file.eofCrcBuffer).to.eql(Buffer.from([0x00, 0x06, 0x0A, 0x00]));
        });
    });

    describe('tables', () => {
        it('correct table count', () => {
            expect(dbParser.file.tables.length).to.eql(208);
        });

        describe('AWPL', () => {
            const tableName = 'AWPL';

            it('header', () => {
                const table = dbParser.file[tableName];
                expect(table.header).to.eql({
                    'priorCrc': 3374511333,
                    'dataAllocationType': 2,
                    'lengthBytes': 96,
                    'lengthBits': 767,
                    'zero': 0,
                    'maxRecords': 660,
                    'currentRecords': 49,
                    'unknown2': 65535,
                    'numFields': 30,
                    'indexCount': 0,
                    'zero2': 0,
                    'zero3': 0,
                    'headerCrc': 2357557338
                });
            });

            describe('field definitions', () => {
                it('correct field length', () => {
                    const table = dbParser.file[tableName];
                    expect(table.fieldDefinitions.length).to.equal(30);
                });

                it('STC1', () => {
                    const table = dbParser.file[tableName];
                    const field = table.fieldDefinitions[0];

                    expect(field.type).to.equal(3);
                    expect(field.offset).to.equal(0);
                    expect(field.name).to.equal('STC1');
                    expect(field.bits).to.equal(32);
                });

                it('CGID', () => {
                    const table = dbParser.file[tableName];
                    const field = table.fieldDefinitions[23];

                    expect(field.type).to.equal(3);
                    expect(field.offset).to.equal(708);
                    expect(field.name).to.equal('CGID');
                    expect(field.bits).to.equal(2);
                });
            });

            describe('records', () => {
                before((done) => {
                    dbParser.file[tableName].readRecords()
                        .then(() => { 
                            done(); 
                        });
                });

                it('correct number of records', () => {
                    const table = dbParser.file[tableName];
                    expect(table.records.length).to.equal(49);
                });

                it('parses first record correctly', () => {
                    const record = dbParser.file[tableName].records[0];

                    expect(record.STC1).to.equal(0);
                    expect(record.STI1).to.equal(0);
                    expect(record.STV1).to.equal(0);
                    expect(record.STC2).to.equal(0);
                    expect(record.STI2).to.equal(0);
                    expect(record.STV2).to.equal(0);
                    expect(record.STC3).to.equal(0);
                    expect(record.STI3).to.equal(0);
                    expect(record.STV3).to.equal(0);
                    expect(record.STC4).to.equal(0);
                    expect(record.STI4).to.equal(0);
                    expect(record.STV4).to.equal(0);
                    expect(record.STC5).to.equal(0);
                    expect(record.STI5).to.equal(0);
                    expect(record.STV5).to.equal(0);
                    expect(record.STC6).to.equal(0);
                    expect(record.STI6).to.equal(0);
                    expect(record.STV6).to.equal(0);
                    expect(record.STC7).to.equal(0);
                    expect(record.STI7).to.equal(0);
                    expect(record.STV7).to.equal(0);
                    expect(record.PFNA).to.equal('');
                    expect(record.PLNA).to.equal('');
                    expect(record.CGID).to.equal(0);
                    expect(record.PGID).to.equal(2);
                    expect(record.TGID).to.equal(0);
                    expect(record.SGNM).to.equal(0);
                    expect(record.SEWN).to.equal(0);
                    expect(record.PAas).to.equal(0);
                    expect(record.PAat).to.equal(0);
                });

                describe('edit records', () => {
                    it('can edit integers', () => {
                        const record = dbParser.file[tableName].records[0];
                        record.STC1 = 20;
                        expect(record.STC1).to.equal(20);

                        console.time('get integer');
                        record.fields['STC2'].value;
                        console.timeEnd('get integer');

                        console.time('set integer');
                        record.fields['STC2'].value = 25;
                        console.timeEnd('set integer');

                        expect(record.STC2).to.equal(25);
                    });

                    it('can edit integers - method #2', () => {
                        const record = dbParser.file[tableName].records[0];
                        record.fields['STC1'].value = 20;
                        expect(record.STC1).to.equal(20);
                    });

                    it('can edit strings', () => {
                        const record = dbParser.file[tableName].records[0];

                        console.time('get string');
                        record.fields['PFNA'].value
                        console.timeEnd('get string');

                        console.time('set string');
                        record.fields['PFNA'].value = 'Test';
                        console.timeEnd('set string');

                        expect(record.PFNA).to.equal('Test');
                    });
                });
            });
        });

        describe('PLRL', () => {
            const tableName = 'PLRL';

            it('header', () => {
                const table = dbParser.file[tableName];
                expect(table.header).to.eql({
                    'priorCrc': 1835962347,
                    'dataAllocationType': 26,
                    'lengthBytes': 8,
                    'lengthBits': 63,
                    'zero': 0,
                    'maxRecords': 1,
                    'currentRecords': 0,
                    'unknown2': 65535,
                    'numFields': 4,
                    'indexCount': 0,
                    'zero2': 0,
                    'zero3': 0,
                    'headerCrc': 2853884747
                });
            });

            describe('field definitions', () => {
                it('correct field length', () => {
                    const table = dbParser.file[tableName];
                    expect(table.fieldDefinitions.length).to.equal(4);
                });

                it('PGID', () => {
                    const table = dbParser.file[tableName];
                    const field = table.fieldDefinitions[0];

                    expect(field.type).to.equal(3);
                    expect(field.offset).to.equal(0);
                    expect(field.name).to.equal('PGID');
                    expect(field.bits).to.equal(15);
                });

                it('REST', () => {
                    const table = dbParser.file[tableName];
                    const field = table.fieldDefinitions[3];

                    expect(field.type).to.equal(3);
                    expect(field.offset).to.equal(26);
                    expect(field.name).to.equal('REST');
                    expect(field.bits).to.equal(6);
                });
            });
        });

        describe('PCKI', () => {
            const tableName = 'PCKI';

            it('header', () => {
                const table = dbParser.file[tableName];
                expect(table.header).to.eql({
                    'priorCrc': 1057093969,
                    'dataAllocationType': 2,
                    'lengthBytes': 36,
                    'lengthBits': 287,
                    'zero': 0,
                    'maxRecords': 352,
                    'currentRecords': 77,
                    'unknown2': 65535,
                    'numFields': 26,
                    'indexCount': 0,
                    'zero2': 0,
                    'zero3': 0,
                    'headerCrc': 605203516
                });
            });

            describe('field definitions', () => {
                it('correct field length', () => {
                    const table = dbParser.file[tableName];
                    expect(table.fieldDefinitions.length).to.equal(26);
                });

                it('cka0', () => {
                    const table = dbParser.file[tableName];
                    const field = table.fieldDefinitions[0];

                    expect(field.type).to.equal(3);
                    expect(field.offset).to.equal(8);
                    expect(field.name).to.equal('cka0');
                    expect(field.bits).to.equal(10);
                });

                it('cpya', () => {
                    const table = dbParser.file[tableName];
                    const field = table.fieldDefinitions[8];

                    expect(field.type).to.equal(2);
                    expect(field.offset).to.equal(75);
                    expect(field.name).to.equal('cpya');
                    expect(field.bits).to.equal(18);
                });
            });

            describe('records', () => {
                before((done) => {
                    dbParser.file[tableName].readRecords()
                        .then(() => { 
                            done(); 
                        });
                });

                it('correct record count', () => {
                    const records = dbParser.file[tableName].records;
                    expect(records.length).to.equal(77);
                });

                it('parses fifth record correctly', () => {
                    const record = dbParser.file[tableName].records[4];

                    expect(record.cka0).to.equal(0);
                    expect(record.PGID).to.equal(544);
                    expect(record.STKF).to.equal(0);
                    expect(record.ckfL).to.equal(0);
                    expect(record.cplN).to.equal(67);
                    expect(record.ckea).to.equal(0);
                    expect(record.ckfa).to.equal(0);
                    expect(record.ckma).to.equal(0);
                    expect(record.cpya).to.equal(31345);
                    expect(record.ckeb).to.equal(0);
                    expect(record.ckfb).to.equal(0);
                    expect(record.cktb).to.equal(1);
                    expect(record.cptb).to.equal(50);
                    expect(record.ckac).to.equal(0);
                    expect(record.ckmc).to.equal(0);
                    expect(record.ckad).to.equal(0);
                    expect(record.ckmd).to.equal(0);
                    expect(record.ckae).to.equal(0);
                    expect(record.ckme).to.equal(0);
                    expect(record.cknk).to.equal(8);
                    expect(record.cpbl).to.equal(1);
                    expect(record.ckem).to.equal(0);
                    expect(record.ckfm).to.equal(0);
                    expect(record.cpat).to.equal(727);
                    expect(record.cppt).to.equal(185);
                    expect(record.cpny).to.equal(2878);
                });
            });
        });

        describe('PLAY', () => {
            const tableName = 'PLAY';

            describe('records', () => {
                before((done) => {
                    console.time('read PLAY records');
                    dbParser.file[tableName].readRecords()
                        .then(() => {
                            console.timeEnd('read PLAY records');
                            done(); 
                        });
                });
                
                it('correct record count', () => {
                    const records = dbParser.file[tableName].records;
                    expect(records.length).to.equal(2585);
                });

                it('parses Charles Tillman', () => {
                    const record = dbParser.file[tableName].records[15];

                    expect(record.PSA0).to.equal(188);
                    expect(record.PSB0).to.equal(300);
                    expect(record.PFNA).to.equal('Charles');
                    expect(record.PLNA).to.equal('Tillman');
                    expect(record.PHTN).to.equal('Copperas Cove');
                });
            });
        });
    });
});