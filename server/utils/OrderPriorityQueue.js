/**
 * ============================================================================
 * DATA STRUCTURE & ALGORITHM (DSA) IMPLEMENTATION
 * Module: OrderPriorityQueue (Min-Heap / Priority Queue)
 * 
 * CONCEPT & PURPOSE:
 * In a high-throughput cafe like Dood Cafe, incoming kitchen orders arrive 
 * continuously across multiple channels (Takeaway, Delivery). 
 * Simple FIFO queues fail to prioritize urgent orders.
 * 
 * This Priority Queue is backed by a MIN-HEAP stored in a zero-indexed array.
 * Orders are ranked by a composite "Priority Score" (lower score = higher priority):
 *   Priority Score = Order Timestamp + Prep Time Penalty - Order Type Urgency Weight
 * 
 * TIME & SPACE COMPLEXITY:
 * - Insert (push):       O(log N)  - Sifts element up the tree
 * - Extract Next (pop):  O(log N)  - Swaps root with last element and sifts down
 * - Peek Top:            O(1)      - Direct root array access
 * - Build Heapify:       O(N)      - Bottom-up linear heap construction
 * - Space Complexity:     O(N)      - Contiguous array representation
 * ============================================================================
 */

class OrderPriorityQueue {
  /**
   * Initializes an empty Min-Heap priority queue
   */
  constructor() {
    this.heap = [];
  }

  /**
   * Computes the priority score for a given order document.
   * Lower score represents higher dispatch priority.
   * 
   * @param {Object} order - Order document containing createdAt, orderType, estimatedTime
   * @returns {number} Priority score timestamp
   */
  static calculatePriorityScore(order) {
    const createdAtMs = new Date(order.createdAt || Date.now()).getTime();
    const prepTimeMs = (order.estimatedTime || 15) * 60 * 1000;

    // Urgency Weights (in milliseconds subtracted from target time)
    // Takeaway gets top priority, followed by Delivery.
    const urgencyWeights = {
      'takeaway': 5 * 60 * 1000,
    };

    const weight = urgencyWeights[order.orderType] || 0;
    return createdAtMs + prepTimeMs - weight;
  }

  /**
   * Returns the parent index of a node
   */
  #getParentIndex(i) {
    return Math.floor((i - 1) / 2);
  }

  /**
   * Returns left child index of a node
   */
  #getLeftChildIndex(i) {
    return 2 * i + 1;
  }

  /**
   * Returns right child index of a node
   */
  #getRightChildIndex(i) {
    return 2 * i + 2;
  }

  /**
   * Swaps two elements in the array
   */
  #swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  /**
   * Sifts an element UP to restore Min-Heap invariant
   * Time Complexity: O(log N)
   */
  #siftUp(index) {
    let current = index;
    while (
      current > 0 &&
      this.heap[current].priorityScore < this.heap[this.#getParentIndex(current)].priorityScore
    ) {
      const parent = this.#getParentIndex(current);
      this.#swap(current, parent);
      current = parent;
    }
  }

  /**
   * Sifts an element DOWN to restore Min-Heap invariant
   * Time Complexity: O(log N)
   */
  #siftDown(index) {
    let current = index;
    const length = this.heap.length;

    while (this.#getLeftChildIndex(current) < length) {
      let smallestChild = this.#getLeftChildIndex(current);
      const rightChild = this.#getRightChildIndex(current);

      if (
        rightChild < length &&
        this.heap[rightChild].priorityScore < this.heap[smallestChild].priorityScore
      ) {
        smallestChild = rightChild;
      }

      if (this.heap[current].priorityScore <= this.heap[smallestChild].priorityScore) {
        break;
      }

      this.#swap(current, smallestChild);
      current = smallestChild;
    }
  }

  /**
   * Inserts a new order into the priority queue
   * Time Complexity: O(log N)
   * 
   * @param {Object} order - Order document
   */
  insert(order) {
    const priorityScore = OrderPriorityQueue.calculatePriorityScore(order);
    const node = { order, priorityScore };
    this.heap.push(node);
    this.#siftUp(this.heap.length - 1);
  }

  /**
   * Removes and returns the highest priority order from the queue
   * Time Complexity: O(log N)
   * 
   * @returns {Object|null} The highest priority order document, or null if empty
   */
  extractMin() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop().order;

    const minOrder = this.heap[0].order;
    this.heap[0] = this.heap.pop();
    this.#siftDown(0);
    return minOrder;
  }

  /**
   * Peeks at the highest priority order without removing it
   * Time Complexity: O(1)
   * 
   * @returns {Object|null}
   */
  peek() {
    return this.heap.length > 0 ? this.heap[0].order : null;
  }

  /**
   * Builds a Min-Heap in-place from an arbitrary array of orders
   * Time Complexity: O(N) linear build
   * 
   * @param {Array<Object>} orders - Array of order documents
   */
  buildHeap(orders) {
    this.heap = orders.map((order) => ({
      order,
      priorityScore: OrderPriorityQueue.calculatePriorityScore(order),
    }));

    // Start from last non-leaf node and sift down
    const startIdx = Math.floor(this.heap.length / 2) - 1;
    for (let i = startIdx; i >= 0; i--) {
      this.#siftDown(i);
    }
  }

  /**
   * Returns all scheduled orders in priority sequence
   * Time Complexity: O(N log N)
   * 
   * @returns {Array<Object>} Sorted list of orders by priority
   */
  toSortedArray() {
    const tempQueue = new OrderPriorityQueue();
    // Clone heap entries
    tempQueue.heap = this.heap.map((item) => ({ ...item }));
    const result = [];
    while (tempQueue.size() > 0) {
      result.push(tempQueue.extractMin());
    }
    return result;
  }

  /**
   * Returns current size of the queue
   * @returns {number}
   */
  size() {
    return this.heap.length;
  }
}

module.exports = OrderPriorityQueue;
