const HuffmanNode = require('../filetypes/TDB/HuffmanNode');
const HuffmanLeaf = require('../filetypes/TDB/HuffmanLeafNode');

let huffmanTreeParser = {};

huffmanTreeParser.parseTree = (buf) => {
    // given an entire tree buffer, create the tree data structure and return its root

    let previousQueue = [];
    let nextQueue = [];
    let currentIndex = 0;

    const rootNode = new HuffmanNode(0);
    previousQueue.push(rootNode);

    while (previousQueue.length > 0) {
        const node = previousQueue.shift();

        for (let i = 0; i <= 1; i++) {
            let newNode;

            const index = buf.readUInt8(currentIndex);
            const value = buf.readUInt8(currentIndex + 1);
    
            if (index === 0) {
                newNode = new HuffmanLeaf(value);
            }
            else {
                newNode = new HuffmanNode(index);
            }

            if (i === 0) {
                node.left = newNode;
            }
            else {
                node.right = newNode;
            }
    
            currentIndex += 2;
        }

        if (node.right instanceof HuffmanNode) {
            nextQueue.push(node.right);
        }
        if (node.left instanceof HuffmanNode) {
            nextQueue.push(node.left);
        }

        if (previousQueue.length === 0 && nextQueue.length > 0) {
            const swapQueue = previousQueue;
            previousQueue = nextQueue;
            nextQueue = swapQueue;
        }
    }

    return rootNode;
};

huffmanTreeParser.decodeBufferFromRoot = (buf, root) => {
    // Given a buffer to decode and a Huffman root node, decode the text inside the buffer.
    let decodedResult = '';
    let currentByteIndex = 0;
    let currentNode = root;

    while (currentByteIndex < buf.length) {
        let currentByte = buf.readUInt8(currentByteIndex);

        if (currentByte === 0) {
            break;
        }

        for (let i = 0; i <= 7; i++) {
            const currentBit = (currentByte & 0x80) >> 7;
            let nodeToLookAt;

            if (currentBit === 0) {
                nodeToLookAt = currentNode.left;
            }
            else {
                nodeToLookAt = currentNode.right;
            }

            if (nodeToLookAt instanceof HuffmanLeaf) {
                decodedResult += String.fromCharCode(nodeToLookAt.value);
                currentNode = root;
            }
            else {
                currentNode = nodeToLookAt;
            }

            currentByte = (currentByte << 1) & 0xFF;
        }

        currentByteIndex += 1;
    }

    return decodedResult;
};

module.exports = huffmanTreeParser;