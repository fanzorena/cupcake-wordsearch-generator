#!/usr/bin/env node

const { WordFind } = require('./lib/wordfind')
const fs = require('fs')
const getopt = require('posix-getopt')
const R = require('ramda');

function usage() {
    return [
        'Usage: wordsearch [-f wordfile] [-d colsxrows] [-c wordcount] [options]',
        '',
        'Generate wordsearch puzzle',
        '',
        'options:',
        '  -b, --backwards    generate words backwards',
        '  -c, --count        quantity of words to include in the puzzle from the file',
        '  -d, --dimensions   the dimensions of the puzzle, ex `-d 20`, `-d 10x8`, defaults to `20x20`',
        '  -f, --file         a newline separated list of words to use, defaults to stdin',
        '  -h, --help         print this message and exit',
        '  -r, --rules        rules file for selecting the words to include in the puzzle',
    ].join('\n');
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function parseDimensions(dimensions) {
    const grid = dimensions.toString().split('x');
    console.log(grid);
    if (grid.length < 2) grid.push(grid[0]);
    return grid;
}

function parseFile(file, count, dimensions, rules) {
    const maxLength = Math.min(dimensions[0], dimensions[1]);
    let words = fs.readFileSync(file, 'utf-8').split('\r\n');
    console.log('Words loaded: ', words.length);
    words = R.filter((w) => w.length <= maxLength, words);
    console.log('Words that fit board: ', words.length);
    console.log('Words to put on board', count);
    if (!R.isNil(rules)) {
        let set = [];
        const json = JSON.parse(fs.readFileSync(rules, 'utf-8'));
        json.forEach((r) => {
            let subset = R.filter((w) => w.length === r.size, words);
            shuffleArray(subset)
            set = R.concat(set, R.slice(0, r.count, subset));
            console.log('Rule: size ', r.size, ' count ', r.count, ' words ', set.join(','));
        });
        if (set.length < count) {
            words = R.difference(words, set);
            set = R.concat(set, R.slice(0, count - set.length, words));
        }
        return set;
    } else {
        shuffleArray(words);
        return R.slice(0, count, words);
    }
}

const options = [
    'b(backwards)',
    'c:(count)',
    'd:(dimensions)',
    'f:(file)',
    'h(help)',
    'r:(rules)'
  ].join('');
const parser = new getopt.BasicParser(options, process.argv);

let backwards = false;
let count = 0;
let dimensions = [];
let file;
let rules;

while ((option = parser.getopt()) !== undefined) {
    switch (option.option) {
        case 'b': backwards = true; break;
        case 'c': count = option.optarg; break;
        case 'd': dimensions = parseDimensions(option.optarg); break;
        case 'f': file = option.optarg; break;
        case 'r': rules = option.optarg; break;
        case 'h': console.log(usage()); process.exit(0); break;
        default: console.error(usage()); process.exit(1); break;
    }
}

const orientations = ['horizontal','vertical','diagonal','diagonalBack','diagonalUp'];
const reverseOrientations = ['horizontalBack','verticalUp','diagonalUpBack'];

const words = parseFile(file, count, dimensions, rules);
const puzzle = WordFind.newPuzzle(words, {
    width: dimensions[0],
    height: dimensions[1],
    fillBlanks: true,
    orientations: (backwards) ? reverseOrientations : orientations
});
const solve = WordFind.solve(puzzle, words);
const json = {width: dimensions[0], height: dimensions[1], words: words, grid: puzzle, solution: solve.found}
console.log(JSON.stringify(json));