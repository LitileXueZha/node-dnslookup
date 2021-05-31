/**
 * Multiple task
 */
class DNSLookupPool {
    constructor(size) {
        const dummyTask = new ListNode();

        this.queue = dummyTask;
        this.size = size;
        /** Running task quantity */
        this.runnings = 0;
        this.lastTaskNode = dummyTask;
    }

    /**
     * One task done
     */
    free() {
        if (this.runnings > 0) {
            this.runnings -= 1;
        }

        if (!this.queue.next) {
            return false;
        }

        const taskNode = this.queue.next;
        const task = taskNode.val;

        task();
        // Remove the runned task
        this.queue = taskNode;
        return true;
    }

    submit(task) {
        if (this.runnings < this.size) {
            this.runnings += 1;
            task();
            return;
        }

        const taskNode = new ListNode(task);

        this.lastTaskNode.next = taskNode;
        this.lastTaskNode = taskNode;
    }
}

function ListNode(val, next) {
    this.val = val;
    this.next = next;
}

module.exports = DNSLookupPool;
