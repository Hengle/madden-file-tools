const fs = require('fs');
const TDBParser = require('../streams/TDBParser');
const TDBWriter = require('../streams/TDBWriter');

class HC09Helper {
    constructor() {
        this._filePath = null;
        this._file = null;
        this._dataStart = 0;
    };

    load(filePath) {
        const self = this;
        this._filePath = filePath;

        return new Promise((resolve, reject) => {
            const stream = fs.createReadStream(filePath);
            self._parser = new TDBParser();

            stream.on('end', () => {
                self._file = self._parser.file;
                resolve(self._file);
            });
            
            stream
                .pipe(self._parser);
        });
    };

    save(outputFile) {
        const self = this;

        return new Promise((resolve, reject) => {
            const saveDestination = outputFile ? outputFile : this._filePath;
    
            const stream = fs.createWriteStream(saveDestination, { flags: 'r+', start: self._dataStart });
            const writer = new TDBWriter(this._file);

            stream.on('close', () => {
                resolve();
            });
    
            writer
                .pipe(stream);
        });
    };

    get filePath() {
        return this._filePath;
    };

    set filePath(fileName) {
        this._filePath = fileName;
    };

    get file() {
        return this._file;
    };
};

module.exports = HC09Helper;