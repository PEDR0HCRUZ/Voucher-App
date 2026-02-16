import { customAlphabet } from "nanoid"

// Exclude confusing characters: 0/O, 1/I/L
const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
const generateLoginId = customAlphabet(alphabet, 6)

export { generateLoginId }
