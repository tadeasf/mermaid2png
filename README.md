# mermaid2png

A command-line tool to convert Mermaid diagrams to high-resolution PNG images.

## Features

- Convert `.mmd` files to PNG images
- Extract and convert Mermaid diagrams from Markdown (`.md`) files
- High-resolution output with configurable scaling
- Multiple theme options (default, dark, forest, neutral, base, coder)
- Custom background colors (including transparent)
- Path completion for easier file selection
- Multiple diagram extraction from a single Markdown file

## Installation

### Prerequisites

- [Bun](https://bun.sh) runtime (v1.2.17 or later)

### Install from source

```bash
# Clone the repository
git clone https://github.com/tadeasf/mermaid2png.git
cd mermaid2png

# Install dependencies
bun install

# Make the script executable
chmod +x ./src/index.ts

# Optional: Create a symlink to use it globally
sudo ln -s "$(pwd)/src/index.ts" /usr/local/bin/mermaid2png
```

### Install as a global package

```bash
# Install directly from the repository
bun install -g github:tadeasf/mermaid2png

# Or install from the local directory
cd mermaid2png
bun run install-global
```

### Compile as a standalone executable

```bash
# Clone the repository
git clone https://github.com/tadeasf/mermaid2png.git
cd mermaid2png

# Install dependencies
bun install

# Compile the executable
bun run compile

# The executable will be created as 'mermaid2png' in the current directory
# Move it to a directory in your PATH to use it globally
sudo mv mermaid2png /usr/local/bin/
```

## Usage

### Basic Usage

```bash
# Convert a Mermaid file to PNG
bun run src/index.ts path/to/diagram.mmd

# Or if you installed it globally
mermaid2png path/to/diagram.mmd
```

### Command Line Arguments

```
mermaid2png <input-file> [output-file] [theme] [background-color] [scale] [width] [height]
```

- `input-file`: Path to a Mermaid (`.mmd`) or Markdown (`.md`) file
- `output-file`: (Optional) Path for the output PNG file
- `theme`: (Optional) Mermaid theme (default, dark, forest, neutral, base, coder)
- `background-color`: (Optional) Background color (white, transparent, or hex color)
- `scale`: (Optional) Scale factor for resolution (default: 2)
- `width`: (Optional) Width in pixels (default: 1920)
- `height`: (Optional) Height in pixels (default: 1080)

### Interactive Mode

If you run the tool without arguments, it will prompt you for each parameter with helpful defaults:

```bash
bun run src/index.ts
```

## Examples

### Convert a Mermaid file with default settings

```bash
mermaid2png flowchart.mmd
```

### Convert with custom theme and background

```bash
mermaid2png flowchart.mmd output.png dark transparent
```

### Convert with high resolution

```bash
mermaid2png flowchart.mmd output.png default white 4 3840 2160
```

### Extract diagrams from Markdown

```bash
mermaid2png document.md
```

## Mermaid Themes

The tool supports the following Mermaid themes:
- `default`: Standard light theme
- `dark`: Dark background theme
- `forest`: Green-based theme
- `neutral`: Balanced color theme
- `base`: Minimal theme
- `coder`: Developer-friendly theme

## License

[MIT](LICENSE)
