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
        '  -c, --count        *required* quantity of words to include in the puzzle from the file',
        '  -d, --dimensions   *required* the dimensions of the puzzle, ex `-d 20`, `-d 10x8`',
        '  -e, --extra        the hidden word of the level',
        '  -f, --file         *required* a line separated list of words to use',
        '  -h, --help         print this message and exit',
        '  -r, --rules        rules file for selecting the words to include in the puzzle',
        '  -s, --solve        add solution to the json'
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
    if (grid.length < 2) grid.push(grid[0]);
    return grid;
}

function parseFile(file, count, dimensions, rules, hiddenWord) {
    const maxLength = Math.min(dimensions[0], dimensions[1]);
    let words = fs.readFileSync(file, 'utf-8').split('\r\n');
    words = R.filter((w) => w.length <= maxLength, words);
    if (!R.isNil(rules)) {
        let set = [];
        const json = JSON.parse(fs.readFileSync(rules, 'utf-8'));
        json.forEach((r) => {
            let subset = R.filter((w) => w.length === r.size, words);
            shuffleArray(subset)
            set = R.concat(set, R.slice(0, r.count, subset));
        });
        if (set.length < count) {
            words = R.difference(words, set);
            set = R.concat(set, R.slice(0, count - set.length, words));
        }
        return set;
    } else {
        words = R.filter((word) => word != hiddenWord, words);
        shuffleArray(words);
        return R.slice(0, count, words);
    }
}

const options = [
    'b(backwards)',
    'c:(count)',
    'd:(dimensions)',
    'e:(extra)',
    'f:(file)',
    'h(help)',
    'r:(rules)',
    's(solve)'
  ].join('');
const parser = new getopt.BasicParser(options, process.argv);

let backwards = false;
let solve = false;
let count = 0;
let dimensions = [];
let file;
let rules;
let addedArgs = [];
let hiddenWord = '';

while ((option = parser.getopt()) !== undefined) {
    addedArgs.push(option.option);
    switch (option.option) {
        case 'b': backwards = true; break;
        case 'c': count = option.optarg; break;
        case 'd': dimensions = parseDimensions(option.optarg); break;
        case 'e': hiddenWord = option.optarg; break;
        case 'f': file = option.optarg; break;
        case 'r': rules = option.optarg; break;
        case 's': solve = true; break;
        case 'h': console.log(usage()); process.exit(0); break;
        default: console.error(usage()); process.exit(1); break;
    }
}

addedArgs = addedArgs.filter((o) => o === 'f' || o === 'd' || o === 'c');
if (addedArgs.length < 3) {
    console.error('Error: Required arguments missing');
    console.error(usage());
    process.exit(1);
}

const orientations = ['horizontal','vertical','diagonal','diagonalBack','diagonalUp'];
const reverseOrientations = ['horizontalBack','verticalUp','diagonalUpBack'];

const words = parseFile(file, count, dimensions, rules, hiddenWord);
if (hiddenWord != '') {
    words.push(hiddenWord);
}
const puzzle = WordFind.newPuzzle(words, {
    width: dimensions[0],
    height: dimensions[1],
    fillBlanks: true,
    orientations: (backwards) ? reverseOrientations : orientations
});

if (!puzzle) {
    console.error("Couldn't generate puzzle with the supplied settings, try again or change the settings");
    process.exit(1);
}

const json = {width: dimensions[0], height: dimensions[1], words: words, grid: puzzle}

if (hiddenWord != '') {
    words.pop();
    json.words = words;
    json.hidden = hiddenWord;
}

if (solve) {
    const solution = WordFind.solve(puzzle, words);
    json.solution = solve.found
}

console.log(JSON.stringify(json));