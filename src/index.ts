#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname, parse, extname } from 'path';
import { launch } from 'puppeteer';
import { createInterface } from 'readline';
import { glob } from 'glob';

// CLI arguments
const args = process.argv.slice(2);

// Available Mermaid themes
const MERMAID_THEMES = [
    'default',
    'dark',
    'forest',
    'neutral',
    'base',
    'coder'
];

// Function to extract Mermaid diagrams from Markdown
function extractMermaidFromMarkdown(content: string): string[] {
    const mermaidBlocks: string[] = [];
    const regex = /```(?:mermaid)\s*([\s\S]*?)```/g;

    let match;
    while ((match = regex.exec(content)) !== null) {
        if (match[1]) {
            mermaidBlocks.push(match[1].trim());
        }
    }

    return mermaidBlocks;
}

// Function to complete file paths
async function completeFilePath(partialPath: string): Promise<string[]> {
    try {
        const pattern = partialPath.endsWith('/') ? `${partialPath}*` : `${partialPath}*`;
        return await glob(pattern);
    } catch (error) {
        console.error('Error completing path:', error);
        return [];
    }
}

// Function to prompt with path completion
async function promptWithPathCompletion(question: string, defaultValue: string = ''): Promise<string> {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
        completer: async (line: string) => {
            const completions = await completeFilePath(line);
            const hits = completions.filter((c) => c.startsWith(line));
            return [hits.length ? hits : completions, line];
        }
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer || defaultValue);
        });
    });
}

// Function to convert Mermaid diagram to PNG
async function convertMermaidToPng(
    inputPath: string,
    outputPath: string,
    theme: string = 'default',
    backgroundColor: string = 'white',
    scale: number = 2,
    width: number = 1920,
    height: number = 1080
): Promise<void> {
    try {
        console.log(`Converting ${inputPath} to PNG...`);

        // Read the file content
        const fileContent = readFileSync(inputPath, 'utf-8');

        // Determine if it's a Markdown file or a Mermaid file
        const fileExt = extname(inputPath).toLowerCase();
        let mermaidDiagrams: string[] = [];

        if (fileExt === '.md') {
            mermaidDiagrams = extractMermaidFromMarkdown(fileContent);
            if (mermaidDiagrams.length === 0) {
                throw new Error('No Mermaid diagrams found in the Markdown file');
            }
            console.log(`Found ${mermaidDiagrams.length} Mermaid diagram(s) in the Markdown file`);
        } else {
            mermaidDiagrams = [fileContent];
        }

        // Launch a headless browser with higher resolution
        const browser = await launch({
            headless: true,
            defaultViewport: {
                width: width,
                height: height,
                deviceScaleFactor: scale
            }
        });

        // Process each diagram
        for (let i = 0; i < mermaidDiagrams.length; i++) {
            const mermaidCode = mermaidDiagrams[i];
            const page = await browser.newPage();

            // Set viewport for high resolution
            await page.setViewport({
                width: width,
                height: height,
                deviceScaleFactor: scale
            });

            // Create HTML template with Mermaid
            const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
            <style>
              body { 
                background-color: ${backgroundColor};
                margin: 0;
                padding: 0;
              }
              #container {
                padding: 10px;
              }
            </style>
          </head>
          <body>
            <div id="container">
              <pre class="mermaid">
                ${mermaidCode}
              </pre>
            </div>
            <script>
              mermaid.initialize({
                startOnLoad: true,
                theme: '${theme}',
                securityLevel: 'loose',
                fontFamily: 'Arial',
                fontSize: 14
              });
            </script>
          </body>
        </html>
      `;

            // Set content and wait for Mermaid to render
            await page.setContent(html);
            await page.waitForSelector('.mermaid svg');

            // Get the SVG element
            const svgElement = await page.$('.mermaid svg');

            if (!svgElement) {
                throw new Error('SVG element not found');
            }

            // Get dimensions of the SVG
            const boundingBox = await svgElement.boundingBox();

            if (!boundingBox) {
                throw new Error('Could not determine SVG dimensions');
            }

            // Generate output path for multiple diagrams
            let currentOutputPath = outputPath;
            if (mermaidDiagrams.length > 1) {
                const { dir, name, ext } = parse(outputPath);
                currentOutputPath = join(dir, `${name}_${i + 1}${ext}`);
            }

            // Ensure output path ends with a valid extension
            const validOutputPath = currentOutputPath.endsWith('.png') ? currentOutputPath : `${currentOutputPath}.png`;

            // Take a screenshot of the SVG with high resolution
            await svgElement.screenshot({
                path: validOutputPath as `${string}.png`,
                omitBackground: backgroundColor === 'transparent'
            });

            console.log(`Successfully created PNG at ${validOutputPath}`);

            await page.close();
        }

        // Close the browser
        await browser.close();
    } catch (error) {
        console.error('Error converting Mermaid to PNG:', error);
        process.exit(1);
    }
}

// Function to prompt the user for input
async function prompt(question: string): Promise<string> {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

// Main function
async function main() {
    let inputPath: string;
    let outputPath: string;
    let theme = 'default';
    let backgroundColor = 'white';
    let scale = 2;
    let width = 1920;
    let height = 1080;

    // Parse command line arguments
    if (args.length >= 1 && args[0] !== undefined) {
        inputPath = args[0];
    } else {
        inputPath = await promptWithPathCompletion('Enter the path to the Mermaid or Markdown file: ');
    }

    // Validate input file
    if (!existsSync(inputPath)) {
        console.error(`Error: File ${inputPath} does not exist`);
        process.exit(1);
    }

    // Get output path
    if (args.length >= 2 && args[1] !== undefined) {
        outputPath = args[1];
    } else {
        const defaultOutput = join(process.cwd(), `${parse(inputPath).name}.png`);
        const suggestedOutput = await promptWithPathCompletion(`Enter the output PNG path (default: ${defaultOutput}): `, defaultOutput);
        outputPath = suggestedOutput || defaultOutput;
    }

    // Create directory if it doesn't exist
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    // Get theme
    if (args.length >= 3 && args[2] !== undefined) {
        theme = args[2];
    } else {
        console.log(`Available themes: ${MERMAID_THEMES.join(', ')}`);
        const themeInput = await prompt(`Enter theme [${MERMAID_THEMES.join(', ')}] (default: default): `);
        if (themeInput && MERMAID_THEMES.includes(themeInput)) {
            theme = themeInput;
        }
    }

    // Get background color
    if (args.length >= 4 && args[3] !== undefined) {
        backgroundColor = args[3];
    } else {
        const bgInput = await prompt('Enter background color (white, transparent, or hex color) [white]: ');
        if (bgInput) backgroundColor = bgInput;
    }

    // Get scale factor
    if (args.length >= 5 && args[4] !== undefined) {
        const scaleInput = args[4];
        const parsedScale = parseFloat(scaleInput);
        if (!isNaN(parsedScale) && parsedScale > 0) {
            scale = parsedScale;
        }
    } else {
        const scaleInput = await prompt('Enter scale factor (1-5) [2]: ');
        if (scaleInput) {
            const parsedScale = parseFloat(scaleInput);
            if (!isNaN(parsedScale) && parsedScale > 0) {
                scale = parsedScale;
            }
        }
    }

    // Get width
    if (args.length >= 6 && args[5] !== undefined) {
        const widthInput = args[5];
        const parsedWidth = parseInt(widthInput);
        if (!isNaN(parsedWidth) && parsedWidth > 0) {
            width = parsedWidth;
        }
    } else {
        const widthInput = await prompt('Enter width in pixels [1920]: ');
        if (widthInput) {
            const parsedWidth = parseInt(widthInput);
            if (!isNaN(parsedWidth) && parsedWidth > 0) {
                width = parsedWidth;
            }
        }
    }

    // Get height
    if (args.length >= 7 && args[6] !== undefined) {
        const heightInput = args[6];
        const parsedHeight = parseInt(heightInput);
        if (!isNaN(parsedHeight) && parsedHeight > 0) {
            height = parsedHeight;
        }
    } else {
        const heightInput = await prompt('Enter height in pixels [1080]: ');
        if (heightInput) {
            const parsedHeight = parseInt(heightInput);
            if (!isNaN(parsedHeight) && parsedHeight > 0) {
                height = parsedHeight;
            }
        }
    }

    // Convert the diagram
    await convertMermaidToPng(inputPath, outputPath, theme, backgroundColor, scale, width, height);
}

// Run the main function
main().catch(console.error); 