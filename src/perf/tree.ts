// Data Strucute implementation

// Interface needed for comparision on keys when inserting etc.
export interface KeyComparator {
    // returns 0 if equal, -1 if this key is less than b, or +1 if greater than b
    compare(b): number;

    // helper functions to infer boolean values
    isLesser(b): boolean;
    isGreater(b): boolean;
    isEqual(b): boolean;
}

// Represents each node in the tree.
// Both a key value that must implement the compartor interface, but also a value that is associated with the
// node.  This value is not used during adding and removed nodes;
export class Node<K extends KeyComparator, V> {
    private _key: K;
    private _value: V;

    // left and right child nodes (if any)
    private _left: Node<K, V> | undefined;
    private _right: Node<K, V> | undefined;

    // height of this node in the tree
    private _height: number;

    constructor(key: K, value: V) {
        this._value = value;
        this._key = key;
        this._height = 1;
    }

    isEqual(n: Node<K, V>): boolean {
        return this._key.compare(n.key) === 0;
    }

    isGreater(n: Node<K, V>): boolean {
        return this._key.compare(n.key) > 0;
    }

    isLesser(n: Node<K, V>): boolean {
        return this._key.compare(n.key) < 0;
    }

    public get height() {
        return this._height;
    }

    public set height(height: number) {
        this._height = height;
    }

    public get key() {
        return this._key;
    }

    public get value() {
        return this._value;
    }

    public get left(): Node<K, V> | undefined {
        return this._left;
    }

    public get right(): Node<K, V> | undefined {
        return this._right;
    }

    public set right(n: Node<K, V> | undefined) {
        this._right = n;
    }

    public set left(n: Node<K, V> | undefined) {
        this._left = n;
    }
}

// Class for the search tree - based on the binary search principle,
// but updated to use the AVL approach.
export class BinarySearchTree<K extends KeyComparator, V> {
    // the root node of the tree
    private root: Node<K, V> | undefined;

    // The tree has only one property which is its root node
    constructor() {}

    // wrapped height accessors to permit access to the height, but
    // allowing for cases where the node n might be undefined
    private _leftHeight(n: Node<K, V>): number {
        if (n && n.left) {
            return n.left.height;
        }
        return 0;
    }

    private _rightHeight(n: Node<K, V>): number {
        if (n && n.right) {
            return n.right.height;
        }
        return 0;
    }

    // Balance factor essential for AVL trees
    // no node => balance factor of 0
    private _nodeBalance(n: Node<K, V>): number {
        if (n) {
            return this._leftHeight(n) - this._rightHeight(n);
        }
        return 0;
    }

    // Rotate left operation of the AVL tree
    private _rotateLeft(y: Node<K, V> | undefined): Node<K, V> | undefined {
        if (y) {
            const child = y.left;
            if (child) {
                y.left = child.right;
                child.right = y;

                y.height = Math.max(this._leftHeight(y), this._rightHeight(y)) + 1;
                child.height = Math.max(this._leftHeight(child), this._rightHeight(child)) + 1;
                return child;
            } else {
                // throw errors for the conditions that *should* never occur
                throw new Error("Rotate left; supplied node's left child is undefined");
            }
        } else {
            // throw errors for the conditions that *should* never occur
            throw new Error('Rotate left; supplied node is undefined');
        }
    }

    // Rotate right operation of the AVL tree
    private _rotateRight(y: Node<K, V> | undefined): Node<K, V> | undefined {
        if (y) {
            const child = y.right;
            if (child) {
                y.right = child.left;
                child.left = y;

                y.height = Math.max(this._leftHeight(y), this._rightHeight(y)) + 1;
                child.height = Math.max(this._leftHeight(child), this._rightHeight(child)) + 1;

                return child;
            } else {
                // throw errors for the conditions that *should* never occur
                throw new Error("Rotate right; supplied node's right child is undefined");
            }
        } else {
            // throw errors for the conditions that *should* never occur
            throw new Error('Rotate right; supplied node is undefined');
        }
    }

    // Insert the key and value into a node in the tree
    // will be inserted with AVL semantics
    public avlInsert(key: K, value: V) {
        this.root = this._avlInsert(this.root, key, value);
        return this;
    }

    // Internal methods, work with the context of a node, so can be implemented recursively
    private _avlInsert(node: Node<K, V> | undefined, key: K, value: V): Node<K, V> | undefined {
        if (!node) {
            return new Node(key, value);
        }

        // standard binary tree insertion; less insert to the left, more insert to the right.
        // if it's equal return the same node, though could be argues that this is an error state
        if (key.isLesser(node.key)) {
            node.left = this._avlInsert(node.left, key, value);
        } else if (key.isGreater(node.key)) {
            node.right = this._avlInsert(node.right, key, value);
        } else {
            return node;
        }

        // recalculate the node's height, as the max of the children, plus 1
        node.height = 1 + Math.max(this._leftHeight(node), this._rightHeight(node));

        // what is the balance condition of this node
        const balance = this._nodeBalance(node);

        // left heavy
        if (balance > 1) {
            let bf = 0;
            if (node.left) {
                bf = this._nodeBalance(node.left);
            }

            if (bf == 1) {
                // just off by one, so only a single rotation required
                node = this._rotateLeft(node);
            } else {
                node.left = this._rotateRight(node.left);
                node = this._rotateLeft(node);
            }
        } else if (balance < -1) {
            //right heavy
            let bf = 0;
            if (node.right) {
                bf = this._nodeBalance(node.right);
            }

            if (bf == -1) {
                // just off by one, so only a single rotation required
                node = this._rotateRight(node);
            } else {
                const n = this._rotateLeft(node.right);
                node.right = n;

                node = this._rotateRight(node);
            }
        }

        return node;
    }

    // Prints to the console the a version of the tree
    public printTree(): void {
        const indent = 0;
        this._printTree(this.root, indent);
    }

    private _printTree(node: Node<K, V> | undefined, indent: number): void {
        if (node) {
            console.log(' '.repeat(indent) + node.key);
            this._printTree(node.left, indent + 2);
            this._printTree(node.right, indent + 2);
        }
    }

    // Traditional BST semantics for insert, i.e. this will not balance the tree
    // The insert method takes a value as parameter and inserts the value in its corresponding place within the tree
    // note iterative and not recursive
    // consider deprecated in favour of the AVL
    insert(key: K, value: V) {
        const newNode = new Node(key, value);
        if (this.root === undefined) {
            this.root = newNode;
            return this;
        }

        let current = this.root;
        while (current != undefined) {
            if (newNode.isLesser(current)) {
                if (current.left === undefined) {
                    current.left = newNode;
                    return this;
                }
                current = current.left;
            } else {
                if (current.right === undefined) {
                    current.right = newNode;
                    return this;
                }
                current = current.right;
            }
        }
    }

    // The find method takes a value as parameter and iterates through the tree looking for that value
    // If the value is found, it returns the corresponding node and if it's not, it returns undefined
    find(key: K): Node<K, V> | undefined {
        if (this.root === undefined) return undefined;
        let current: Node<K, V> | undefined = this.root;
        let found = false;

        const searchNode = new Node(key, null as V);

        while (current != undefined && !found) {
            if (searchNode.isLesser(current)) {
                current = current.left;
            } else if (searchNode.isGreater(current)) {
                current = current.right;
            } else {
                found = true;
            }
        }
        if (!found) return undefined;

        if (current) {
            return current;
        } else {
            return undefined;
        }
    }
}
