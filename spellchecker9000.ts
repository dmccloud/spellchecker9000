#!/usr/bin/env ts-node

import * as fs from "fs";
import * as readline from "readline";
import { distance } from "fastest-levenshtein";

if (process.argv.length !== 4) {
  console.log(
    "Usage: ./spellchecker9000.ts <dictionary_path> <file_to_check_path>"
  );
  process.exit(1);
}

const dictionaryPath = process.argv[2];
const fileToCheckPath = process.argv[3];

const loadDictionary = (path: string): Promise<Set<string>> => {
  const words = new Set<string>();
  const fileStream = fs.createReadStream(path, { encoding: "utf-8" });

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity, // this always consider /r/n as a single line break
  });

  return new Promise((resolve, reject) => {
    rl.on("line", (line) => {
      words.add(line.trim().toLowerCase());
    })
      .on("close", () => {
        resolve(words);
      })
      .on("error", (err) => {
        reject(err);
      });
  });
};

const checkSpelling = async (dictionary: Set<string>, path: string) => {
  const fileStream = fs.createReadStream(path, { encoding: "utf-8" });

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const misspelledWords = new Set<string>();

  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber += 1;
    const words = line.split(/\s+/); // split on any whitespace
    words.forEach((word, index) => {
      if (word.match(/\b[A-Z][a-z]*\b/)) return; // attempting to catch proper nouns 😅

      const cleanWord = word.toLowerCase().replace(/[^a-z]/gi, ""); // remove non-alphabetic characters

      if (cleanWord.length === 0) return; // skip empty strings (e.g. multiple spaces between words)
      if (cleanWord === "a" || cleanWord === "i") return; // skip single letter words (a, i)

      if (!dictionary.has(cleanWord)) {
        misspelledWords.add(cleanWord);
        console.log(
          `Misspelled word: "${word}" at line ${lineNumber} column ${index + 1}`
        );
        console.log(line);

        // suggestion
        let minVal = Infinity;
        const suggestions = Array.from(dictionary).reduce((acc, curr) => {
          // find the min distance of any word in the dictionary
          // return all words that have that same min distance
          // in an array
          const dist = distance(cleanWord, curr);
          if (dist < minVal) {
            minVal = dist;
            acc = [curr];
          } else if (dist === minVal) {
            acc.push(curr);
          }
          return acc;
        }, []);

        console.log("Suggestions:", suggestions);
      }
    });
  }
};

const main = async () => {
  try {
    const dictionary = await loadDictionary(dictionaryPath);
    await checkSpelling(dictionary, fileToCheckPath);
  } catch (error) {
    console.error("Error:", error);
  }
};

main();
