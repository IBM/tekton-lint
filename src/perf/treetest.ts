import { IndexRange } from './node.js';
import { BinarySearchTree } from './tree.js';

const tree = new BinarySearchTree<IndexRange, number>();

const getRandomInt = (min, max) => {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
};

const shuffle = (array) => {
    return array.sort(() => Math.random() - 0.5);
};

let irs = 1;
const nodes: IndexRange[] = [];
for (let x = 1; x < 179; x++) {
    const gapLength = getRandomInt(10, 100);
    nodes.push(new IndexRange(irs, irs + gapLength));
    irs = irs + gapLength + 1;
}

// nodes.push(new IndexRange(1, 11));
// nodes.push(new IndexRange(100, 110));
// nodes.push(new IndexRange(78, 88));

shuffle(nodes).forEach((n) => {
    tree.avlInsert(n, 1);
});
console.log(`--------------------------`);
tree.printTree();
