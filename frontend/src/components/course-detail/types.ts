import type { FlashcardSeedItem, McqSeedItem } from '../../services/notes.service'

export type Tab = 'files' | 'flashcards' | 'mcq'

export const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

export const formatRelativeDate = (iso: string) => {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
    if (days === 0) return 'Today'
    if (days === 1) return '1 day ago'
    return `${days} days ago`
}

export const pickRandom = <T,>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
}

export const DISPLAY_COUNT = 3

export const SAMPLE_FLASHCARDS: FlashcardSeedItem[] = [
    {
        question: 'What does Big-O notation describe?',
        answer:   'Big-O notation describes the upper bound of an algorithm\'s time or space complexity as the input size grows, focusing on the dominant term and ignoring constants.',
    },
    {
        question: 'What is the difference between a stack and a queue?',
        answer:   'A stack follows LIFO — the last element added is the first removed. A queue follows FIFO — the first element added is the first removed.',
    },
    {
        question: 'What is a closure in programming?',
        answer:   'A closure is a function that retains access to variables from its outer scope even after that outer function has finished executing.',
    },
    {
        question: 'What is a binary search tree?',
        answer:   'A BST is a tree where each node\'s left subtree contains only nodes with values less than the node, and the right subtree only nodes with greater values.',
    },
    {
        question: 'What is recursion?',
        answer:   'Recursion is when a function calls itself with a smaller input until it reaches a base case that stops the calls.',
    },
    {
        question: 'What is the difference between a process and a thread?',
        answer:   'A process is an independent program with its own memory space. A thread is a lighter unit within a process that shares memory with other threads.',
    },
]

export const SAMPLE_MCQS: McqSeedItem[] = [
    {
        question:      'Which data structure uses LIFO ordering?',
        options:       ['Queue', 'Stack', 'Linked List', 'Binary Tree'],
        correctOption: 1,
        explanation:   'A stack is LIFO — elements are pushed and popped from the same end.',
        difficulty:    'easy',
    },
    {
        question:      'What is the time complexity of binary search?',
        options:       ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'],
        correctOption: 2,
        explanation:   'Binary search halves the search space each step, giving O(log n).',
        difficulty:    'medium',
    },
    {
        question:      'Which is NOT a principle of OOP?',
        options:       ['Encapsulation', 'Polymorphism', 'Compilation', 'Inheritance'],
        correctOption: 2,
        explanation:   'The four OOP principles are Encapsulation, Abstraction, Inheritance, and Polymorphism.',
        difficulty:    'medium',
    },
    {
        question:      'What does DFS stand for?',
        options:       ['Data First Search', 'Depth First Search', 'Direct File System', 'Dynamic Function Stack'],
        correctOption: 1,
        explanation:   'DFS stands for Depth First Search — it explores as far as possible before backtracking.',
        difficulty:    'easy',
    },
    {
        question:      'Which sorting algorithm has O(n log n) average case?',
        options:       ['Bubble Sort', 'Insertion Sort', 'Merge Sort', 'Selection Sort'],
        correctOption: 2,
        explanation:   'Merge sort consistently achieves O(n log n) by dividing and merging.',
        difficulty:    'medium',
    },
    {
        question:      'What is a deadlock?',
        options:       ['A memory leak', 'Two processes waiting on each other indefinitely', 'A crashed thread', 'An infinite loop'],
        correctOption: 1,
        explanation:   'A deadlock occurs when two or more processes are each waiting for the other to release a resource.',
        difficulty:    'hard',
    },
]
